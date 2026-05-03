export const DAY_LENGTH_SECONDS: number;
export const PHASES: Record<string, { start: number; end: number; label: string }>;
export const PHASE_TINT: Record<string, { r: number; g: number; b: number; brightness: number }>;
export const PHASE_SPAWN: Record<string, { hostileMult: number; patrolMult: number }>;

export function resolvePhase(timeOfDay: number): string;
export function resolvePhaseTint(timeOfDay: number): { r: number; g: number; b: number; brightness: number };
export function resolveSpawnModifier(timeOfDay: number): { hostileMult: number; patrolMult: number; activePhase: string };
export function advanceTimeOfDay(world: any, dt: number, dayLength?: number): number;
export function ensureWorldTimeDefaults(world: any): void;
export function formatPhaseLabel(timeOfDay: number): string;
