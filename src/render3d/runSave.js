// Frontier ironman save adapter.
//
// Thin wrapper over the generic save machinery in savePersistence.js. The 3D
// opening loop is an *ironman run*: a single dedicated slot, autosave on-event +
// periodic, and death seals the run (mode:"sealed") instead of deleting it.
//
// This module owns ONLY the 3D run's payload schema + slot isolation. It reuses
// savePersistence's envelope/FNV-1a hash/IndexedDB/backup-rotation/quota recovery
// verbatim (writeSave/readSave accept an arbitrary slot key). It deliberately does
// NOT go through the Canvas saveMigration.js (that backfills dozens of Canvas-only
// fields — wrong shape for this path).
//
// Determinism note: the run snapshots its state today. The `seed`/`inputLogTail`
// fields are carried forward so a future step can reconstruct the run purely from
// (seed, input-log) — they are unused on resume right now.

import { writeSave, readSave } from "../savePersistence.js";

export const RUN_SLOT = "frontier-ironman";
export const RUN_SCHEMA = "frontier-run";
// v2: adds `game` — the RPG state slice (player gold/xp/level, inventory,
// progression, job board, loot, npc memory) from render3d/gameState.js.
export const RUN_VERSION = 2;

// Strip view-layer fields off a loopState snapshot, keeping only what must persist.
// (createLoopStateMachine().state returns the persistent fields PLUS derived view
// fields like objectiveText/activePrompt — those are recomputed on load.)
function pickLoopState(loopState) {
  const src = loopState || {};
  return {
    phase: src.phase || "spawn",
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
// payload (never touches the Canvas saveMigration chain).
export function migrateRunPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  if (payload.schema !== RUN_SCHEMA) return null;
  if (!Number.isFinite(payload.version) || payload.version > RUN_VERSION) return null;
  if (payload.version < 2) {
    // v1 → v2: no game slice existed. `game: null` makes the loader build a
    // fresh state and reconcile it against the saved loop phase
    // (gameState.reconcileWithLoopPhase), so old runs keep their progress.
    return { ...payload, version: RUN_VERSION, game: null };
  }
  return payload;
}

// Load the ironman run. Returns the migrated payload, or null when there is no
// valid save (missing / corrupt / wrong schema / IDB unavailable).
export async function loadRun() {
  let result;
  try {
    result = await readSave(RUN_SLOT);
  } catch {
    return null;
  }
  if (!result || !result.ok) return null;
  return migrateRunPayload(result.payload);
}

// Persist the run payload to the dedicated slot (inherits backup rotation + quota
// recovery from savePersistence). Returns the stored envelope.
export async function writeRun(payload) {
  return writeSave(RUN_SLOT, payload);
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
