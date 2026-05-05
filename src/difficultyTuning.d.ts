export const DIFFICULTY_LEVELS: string[];
export const DIFFICULTY_PROFILES: Record<string, {
  label: string;
  enemyHpMult: number;
  enemyDamageMult: number;
  rewardMult: number;
  description: string;
}>;

export function isDifficultyId(id: string): boolean;
export function resolveDifficultyProfile(id: string): typeof DIFFICULTY_PROFILES[string];
export function ensureDifficultyDefaults(world: any): string;
export function setDifficulty(world: any, id: string): string | null;
export function cycleDifficulty(world: any, dir?: number): string;
export function getEnemyHpMultiplier(world: any): number;
export function getEnemyDamageMultiplier(world: any): number;
export function getRewardMultiplier(world: any): number;
