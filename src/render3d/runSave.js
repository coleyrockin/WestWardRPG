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

import { writeSave, readSave, deleteSave } from "../savePersistence.js";
import { GRAVESIDE_SPAWN } from "./frontierLayout.js";

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

// Load the ironman run. Returns the migrated payload, or null when there is no
// valid save (missing / corrupt / wrong schema / IDB unavailable).
export async function loadRun() {
  let result;
  try {
    const readPromise = readSave(RUN_SLOT);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Save load timed out")), 1000)
    );
    result = await Promise.race([readPromise, timeoutPromise]);
  } catch (err) {
    console.warn("[runSave] readSave failed or timed out", err);
    return null;
  }
  if (!result || !result.ok) return null;
  // A stale/corrupt payload (an old build's save shape) must NEVER kill boot —
  // migrate throwing here took startSpike down with it and the game never
  // reached the title screen. Fall back to a fresh run instead.
  try {
    return migrateRunPayload(result.payload);
  } catch (err) {
    console.warn("[runSave] unreadable save payload — starting fresh", err);
    return null;
  }
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
