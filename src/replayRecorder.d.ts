export interface ReplaySession { version: number; seed: number; startedAt: number; events: any[] }
export function createReplaySession(seed?: number): ReplaySession;
export function recordInputEvent(session: ReplaySession | null, type: string, code: string, dx?: number): void;
export function finalizeReplay(session: ReplaySession | null, runStats?: any): any;
export function saveReplayLocally(replay: any): void;
export function loadLastReplay(): any;
export function exportReplayBlob(replay: any): Blob | null;
export function getReplaySummary(replay: any): any;
