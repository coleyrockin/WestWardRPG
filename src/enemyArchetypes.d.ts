export const ENEMY_ARCHETYPES: Record<string, any>;
export function listEnemyArchetypes(): string[];
export function chooseEnemyType(level: number, weatherKind: string, roll?: number): string;
export function createEnemyStats(type: string, level: number): any;
export function createEnemyCombatProfile(enemy: any, playerLevel: number): any;
