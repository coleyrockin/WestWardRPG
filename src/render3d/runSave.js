// Frontier ironman save adapter.
//
// Thin wrapper over the generic save machinery in savePersistence.js. The 3D
// opening loop is an *ironman run*: a single dedicated slot, autosave on-event +
// periodic, and death seals the run (mode:"sealed") instead of deleting it.
//
// This module owns ONLY the 3D run's payload schema + slot isolation. It reuses
// savePersistence's envelope/FNV-1a hash/IndexedDB/backup-rotation/quota recovery
// verbatim (writeSave/readSave accept an arbitrary slot key). The payload shape is
// owned here (see migrateRunPayload below) — there is no separate migration module.
//
// Determinism note: the run snapshots its state today. The `seed`/`inputLogTail`
// fields are carried forward so a future step can reconstruct the run purely from
// (seed, input-log) — they are unused on resume right now.

import {
  writeSave,
  readSave,
  deleteSave,
  findMostRecentValidBackup,
} from "../savePersistence.js";
import { GRAVESIDE_SPAWN } from "./frontierLayout.js";

// readSave failure reasons that mean the PRIMARY envelope is corrupt but the slot's
// backups may still be intact (a byte-flip / truncation / double-write / stale-shape
// primary). validateEnvelope emits exactly these — see savePersistence.validateEnvelope.
// On any of them loadRun tries backup recovery before declaring the load failed.
const CORRUPTION_REASONS = new Set([
  "hash-mismatch",
  "unknown-storage-version",
  "missing-savedAt",
  "missing-payload",
  "missing-hash",
  "missing-payload-version",
  "bad-payload-version",
  "payload-version-mismatch",
]);

export const RUN_SLOT = "frontier-ironman";
export const RUN_SCHEMA = "frontier-run";
// v2: adds `game` — the RPG state slice (player gold/xp/level, inventory,
// progression, job board, loot, npc memory) from render3d/gameState.js.
// v3: the graveside relocated to the open range — funeral/implant positions
// stored by v2 are stale and re-pin the player to the old "clogged closet", so
// migrateRunPayload resets those beats back to GRAVESIDE_SPAWN.
export const RUN_VERSION = 3;

// Strip view-layer fields off a loopState snapshot, keeping only what must persist.
// (createLoopStateMachine().state returns the persistent fields PLUS derived view
// fields like objectiveText/activePrompt — those are recomputed on load.)
function pickLoopState(loopState) {
  const src = loopState || {};
  return {
    phase: src.phase || "spawn",
    activeMission: src.activeMission ?? null,
    boardChoice: src.boardChoice ?? null,
    routeBeats: { ...(src.routeBeats || {}) },
    inventoryPreview: { ...(src.inventoryPreview || {}) },
    completedInteractions: [...(src.completedInteractions || [])],
    encounterState: { ...(src.encounterState || {}) },
  };
}

// Overlay the LIVE encounter onto the phase-FSM encounterState before persisting.
// The first-road loop FSM (phaseState.js) only ever writes slimeHits 0 (slime_appeared)
// or 3 (defeat_slime) and never touches playerHp during the fight — so its snapshot
// alone LOSES a mid-fight quit's real progress (a 2-hit slime saves as slimeHits:0 →
// resume re-fights it from full while the kill ledger already credited the strikes).
// The encounter system is the source of truth: it exposes live `playerHp` and `hits`.
// We overlay BOTH (only when finite) so a wounded, mid-fight resume restores the real
// state. Pure + non-mutating; `live` is encounter.getState() (or null when no fight).
export function overlayLiveEncounterState(snapEncounterState, live) {
  const out = { ...(snapEncounterState || {}) };
  if (Number.isFinite(live?.playerHp)) out.playerHp = live.playerHp;
  if (Number.isFinite(live?.hits)) out.slimeHits = live.hits;
  return out;
}

// Build the full run payload from a live context object. `now` is injectable for
// deterministic tests. The payload MUST carry a numeric `version` — savePersistence
// reads it into the envelope's payloadVersion and validates the round-trip.
export function buildRunPayload(ctx = {}, now = Date.now()) {
  const {
    mode = "playing",
    seed = 0,
    inputLogTail = [],
    time = 0,
    player = {},
    loopState = {},
    world = {},
    runStats = {},
    game = null,
  } = ctx;
  const loop = pickLoopState(loopState);
  return {
    schema: RUN_SCHEMA,
    version: RUN_VERSION,
    savedAt: Number.isFinite(now) ? now : Date.now(),
    mode,
    seed,
    inputLogTail: [...inputLogTail],
    runRules: { permadeath: true, saveScummable: false },
    time,
    player: { x: player.x ?? 0, z: player.z ?? 0, yaw: player.yaw ?? 0 },
    loopState: loop,
    world: {
      dayTime: Number.isFinite(world.dayTime) ? world.dayTime : 0,
      weatherKind: world.weatherKind ?? "clear",
      // Region/POI discovery. Additive + backward-compatible: pre-existing saves
      // (no field) restore as []. Persisted here so discovery survives resume the
      // moment markPOIDiscovered is wired (today the source array is still empty).
      poisDiscovered: Array.isArray(world.poisDiscovered) ? [...world.poisDiscovered] : [],
    },
    // RPG slice (gameState.buildGameSaveSlice). Stored as-is; the loader runs
    // it through hydrateGameState (per-module normalize*) on resume.
    game: game && typeof game === "object" ? game : null,
    runStats: {
      startedAt: runStats.startedAt ?? (Number.isFinite(now) ? now : Date.now()),
      endedAt: runStats.endedAt ?? null,
      cause: runStats.cause ?? null,
      victory: runStats.victory ?? false,
      phaseReached: runStats.phaseReached ?? loop.phase,
    },
  };
}

// Forward-compat migration shim. Rejects anything that isn't a frontier-run
// payload; this run's payload schema lives entirely in this module.
export function migrateRunPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  if (payload.schema !== RUN_SCHEMA) return null;
  if (!Number.isFinite(payload.version) || payload.version > RUN_VERSION) return null;
  let out = payload;
  if (out.version < 2) {
    // v1 → v2: no game slice existed. `game: null` makes the loader build a
    // fresh state and reconcile it against the saved loop phase
    // (gameState.reconcileWithLoopPhase), so old runs keep their progress.
    out = { ...out, version: 2, game: null };
  }
  if (out.version < 3) {
    // v2 → v3: the graveside moved out to the open range. A position stored during
    // the funeral/implant cold-open now points at the old "clogged closet", so reset
    // those beats to the canonical graveside spawn. Every other phase keeps its
    // saved position untouched (run progress is preserved).
    const staleFuneral = out.loopState?.phase === "funeral" || out.loopState?.phase === "implant";
    out = {
      ...out,
      version: RUN_VERSION,
      player: staleFuneral
        ? { x: GRAVESIDE_SPAWN.x, z: GRAVESIDE_SPAWN.z, yaw: GRAVESIDE_SPAWN.yaw }
        : out.player,
    };
  }
  return out;
}

// How long to wait for the IndexedDB read before declaring the load FAILED.
// 8000ms: real IndexedDB reads complete well under this except under severe device
// load. The old 1000ms was far too aggressive — a single slow read tripped the
// timeout, the caller read that as "no save", and the first autosave clobbered the
// ironman slot. A failed/timed-out load now RE-THROWS so the caller can tell
// "load FAILED" (existing save may be unread — must not overwrite) from "empty slot"
// (null — safe to start fresh).
export const LOAD_TIMEOUT_MS = 8000;

// Load the ironman run.
//   - Resolves to a migrated payload when a valid save exists.
//   - Resolves to null ONLY for a genuinely empty slot (readSave reason "missing") OR
//     an ok read whose payload is unmigratable (a foreign/stale schema → safe fresh start).
//   - On a CORRUPT primary (hash-mismatch / validation failure) it first tries to RECOVER
//     the most recent valid backup and resolves THAT; if no valid backup exists it REJECTS
//     (so boot suppresses writes rather than clobbering a hand-recoverable primary).
//   - REJECTS (re-throws) on a timeout, a thrown readSave, a db-unavailable result, or any
//     other unreadable/unknown failure reason — a failed read is NOT an empty slot. The
//     caller must treat a rejection as "load failed" and suppress overwriting, so an
//     existing-but-unread (or backup-recoverable) save is never clobbered by a fresh session.
export async function loadRun() {
  let result;
  try {
    const readPromise = readSave(RUN_SLOT);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Save load timed out")), LOAD_TIMEOUT_MS)
    );
    result = await Promise.race([readPromise, timeoutPromise]);
  } catch (err) {
    // Timeout or a thrown readSave: the read FAILED — an existing save may simply be
    // unread. Re-throw so the boot can guard against overwriting it. (Do NOT collapse
    // this to null; that's what destroyed real runs under load.)
    console.warn("[runSave] readSave failed or timed out — load FAILED (not empty)", err);
    throw err;
  }
  if (result && result.ok) {
    // A stale/corrupt-but-PARSEABLE payload (an old build's save shape) must NEVER kill
    // boot — migrate throwing here took startSpike down with it and the game never
    // reached the title screen. Fall back to a fresh run instead.
    try {
      return migrateRunPayload(result.payload);
    } catch (err) {
      console.warn("[runSave] unreadable save payload — starting fresh", err);
      return null;
    }
  }
  // !ok read. Classify the reason — only a genuine empty slot is a safe fresh start.
  const reason = result?.reason;
  if (reason === "missing") return null;
  if (CORRUPTION_REASONS.has(reason)) {
    // The PRIMARY is corrupt but a backup may still be valid. Try to recover the most
    // recent valid backup and restore it as the live primary. If we find one, resume on
    // it; if not, the run is unrecoverable here — REJECT so boot suppresses writes (a
    // fresh session must not autosave over a slot the player could recover by hand).
    let recovered = null;
    try {
      recovered = await findMostRecentValidBackup(RUN_SLOT);
    } catch (err) {
      console.warn("[runSave] backup recovery failed for corrupt primary", err);
      recovered = null;
    }
    if (recovered && recovered.ok) {
      console.warn(`[runSave] primary save corrupt (${reason}) — recovered a valid backup`);
      try {
        return migrateRunPayload(recovered.payload);
      } catch (err) {
        console.warn("[runSave] recovered backup unmigratable — starting fresh", err);
        return null;
      }
    }
    throw new Error(`Save corrupt (${reason}) and no valid backup to recover`);
  }
  // db-unavailable or any other unreadable/unknown failure reason: NOT an empty slot.
  // Re-throw so boot sets saveLoadFailed and suppresses writes.
  console.warn(`[runSave] readSave returned an unreadable result (${reason}) — load FAILED (not empty)`);
  throw new Error(`Save read failed (${reason ?? "unknown"})`);
}

// Persist the run payload to the dedicated slot (inherits backup rotation + quota
// recovery from savePersistence). Returns the stored envelope.
export async function writeRun(payload) {
  return writeSave(RUN_SLOT, payload);
}

// Wipe the ironman slot entirely — primary + all backups. Used by "Begin a New
// Run" so a fresh run can't be contaminated by a stale position resurrected from
// a rotated backup. Swallows errors: clearing must never block starting over.
export async function clearRun() {
  try {
    return await deleteSave(RUN_SLOT);
  } catch (err) {
    console.warn("[runSave] clearRun failed (continuing fresh anyway)", err);
    return null;
  }
}

// Seal the run on death: flip mode to "sealed" and stamp runStats. Writes to the
// SAME slot (never deletes) so the sealed run persists until the player starts over.
export async function sealRun(payload, cause = "unknown", now = Date.now()) {
  const stamp = Number.isFinite(now) ? now : Date.now();
  const sealed = {
    ...payload,
    schema: RUN_SCHEMA,
    version: RUN_VERSION,
    mode: "sealed",
    savedAt: stamp,
    runStats: {
      ...(payload?.runStats || {}),
      startedAt: payload?.runStats?.startedAt ?? stamp,
      endedAt: stamp,
      cause,
      victory: false,
      phaseReached: payload?.loopState?.phase || payload?.runStats?.phaseReached || "spawn",
    },
  };
  await writeRun(sealed);
  return sealed;
}
