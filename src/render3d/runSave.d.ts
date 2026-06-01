export const RUN_SLOT: string;
export const RUN_SCHEMA: string;
export const RUN_VERSION: number;

export interface RunLoopState {
  phase: string;
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
  world: { dayTime: number; weatherKind: string };
  runStats: {
    startedAt: number;
    endedAt: number | null;
    cause: string | null;
    victory: boolean;
    phaseReached: string;
  };
}

export interface RunContext {
  mode?: string;
  seed?: number;
  inputLogTail?: any[];
  time?: number;
  player?: { x?: number; z?: number; yaw?: number };
  loopState?: Record<string, any>;
  world?: { dayTime?: number; weatherKind?: string };
  runStats?: Record<string, any>;
}

export function buildRunPayload(ctx?: RunContext, now?: number): RunPayload;
export function migrateRunPayload(payload: any): RunPayload | null;
export function loadRun(): Promise<RunPayload | null>;
export function writeRun(payload: RunPayload): Promise<any>;
export function sealRun(payload: RunPayload, cause?: string, now?: number): Promise<RunPayload>;
