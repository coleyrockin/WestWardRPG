export const RUN_SLOT: string;
export const RUN_SCHEMA: string;
export const RUN_VERSION: number;
/** Save-load timeout (ms). A timeout or a thrown readSave makes loadRun REJECT
 *  (load failed, existing save may be unread) — distinct from a resolved null
 *  (genuinely empty / unmigratable, safe to start fresh). */
export const LOAD_TIMEOUT_MS: number;

export interface RunLoopState {
  phase: string;
  /** Active mission id (e.g. "dust_to_dust"); persisted so a resumed run reopens at
   *  the right mission beat instead of defaulting to "spawn". */
  activeMission: string | null;
  boardChoice: string | null;
  routeBeats: Record<string, boolean>;
  inventoryPreview: Record<string, number>;
  completedInteractions: string[];
  encounterState: Record<string, any>;
}

export interface RunPayload {
  schema: string;
  version: number;
  savedAt: number;
  mode: "playing" | "sealed";
  seed: number;
  inputLogTail: any[];
  runRules: { permadeath: boolean; saveScummable: boolean };
  time: number;
  player: { x: number; z: number; yaw: number };
  loopState: RunLoopState;
  world: { dayTime: number; weatherKind: string; poisDiscovered: string[] };
  runStats: {
    startedAt: number;
    endedAt: number | null;
    cause: string | null;
    victory: boolean;
    phaseReached: string;
  };
  // v2: RPG state slice (gameState.buildGameSaveSlice); null on fresh/v1 runs.
  game: Record<string, any> | null;
}

export interface RunContext {
  mode?: string;
  seed?: number;
  inputLogTail?: any[];
  time?: number;
  player?: { x?: number; z?: number; yaw?: number };
  loopState?: Record<string, any>;
  world?: { dayTime?: number; weatherKind?: string; poisDiscovered?: string[] };
  runStats?: Record<string, any>;
  game?: Record<string, any> | null;
}

/** Overlay the live encounter (encounter.getState(): playerHp + hits) onto the
 *  phase-FSM encounterState before persisting. The FSM never records mid-fight
 *  slime hits or live playerHp, so this is what makes a wounded, mid-fight quit
 *  resume at the correct slime HP + player HP. Pure, non-mutating. */
export function overlayLiveEncounterState(
  snapEncounterState: Record<string, any> | null | undefined,
  live: { playerHp?: number; hits?: number } | null | undefined,
): Record<string, any>;
export function buildRunPayload(ctx?: RunContext, now?: number): RunPayload;
export function migrateRunPayload(payload: any): RunPayload | null;
/** Load the ironman run.
 *  - Resolves a migrated payload for a valid save.
 *  - Resolves null ONLY for a genuinely empty slot (readSave reason "missing") or an
 *    ok read whose payload is unmigratable (foreign/stale schema → safe fresh start).
 *  - On a corrupt primary (hash/validation failure) recovers the most recent valid
 *    backup and resolves THAT; rejects if no valid backup exists.
 *  - Rejects on timeout, thrown read, db-unavailable, or any other unreadable failure
 *    reason — a failed read is NOT an empty slot, so boot suppresses overwriting. */
export function loadRun(): Promise<RunPayload | null>;
export function writeRun(payload: RunPayload): Promise<any>;
export function sealRun(payload: RunPayload, cause?: string, now?: number): Promise<RunPayload>;
export function clearRun(): Promise<any>;
