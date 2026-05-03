export const FACTION_TIERS: Array<{ min: number; max: number; id: string; label: string }>;
export const FACTION_NAMES: Record<string, string>;

export function resolveFactionTier(value: number): string;
export function resolveShopPriceMultiplier(factionRep: any): number;
export function canSmithUpgradeWeapon(factionRep: any, currentTier: string): boolean;
export function resolvePatrolModifier(factionRep: any): { friendlyMult: number; hostileMult: number };
export function resolveAllFactionEffects(factionRep: any): {
  shopPriceMult: number;
  patrol: { friendlyMult: number; hostileMult: number };
  tiers: Record<string, string>;
};
