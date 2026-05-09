export interface CombatSubtitleState { queue: any[]; ttl: number; current: any }
export declare const COMBAT_EVENTS: Record<string, { label: string; color: string; duration: number }>;
export function createCombatSubtitleState(): CombatSubtitleState;
export function recordCombatEvent(state: CombatSubtitleState, type: string): void;
export function tickCombatSubtitles(state: CombatSubtitleState, dt: number): void;
export function drawCombatSubtitles(ctx: CanvasRenderingContext2D, state: CombatSubtitleState, w: number, h: number): void;
export function playCombatAudioCue(audioCtx: AudioContext | null | undefined, type: string): void;
