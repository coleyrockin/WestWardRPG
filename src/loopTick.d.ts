export function tickExpiringMessages<T extends { ttl: number }>(messages: T[], dt: number): T[];
export function tickPlayerCooldowns<T extends Record<string, number>>(player: T, dt: number): T;
export function tickFloatingTexts<T extends { life: number; wy: number }>(floatingTexts: T[], dt: number): T[];
export function resolveRespawnDelay(totalDensity: number, rng?: () => number): number;
