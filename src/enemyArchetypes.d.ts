export const ENEMY_ARCHETYPES: Record<string, any>;
export const BEHAVIOR_TUNING: Record<string, any>;
export function listEnemyArchetypes(): string[];
export function chooseEnemyType(level: number, weatherKind: string, roll?: number): string;
export function createEnemyStats(type: string, level: number): any;
export function getBehaviorTuning(behavior: string): any;
export function resolveBehaviorMove(enemy: any, ctx: any): any;
export function createEnemyCombatProfile(enemy: any, playerLevel: number): any;
