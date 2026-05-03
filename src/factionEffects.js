// Faction reputation effects — pure module.
//
// Maps existing factionRep (-100..100) values into concrete, gameplay-visible
// modifiers: shop price multipliers, smith tier-up gates, and patrol density.
// Three discrete tiers per faction make HUD readouts clear.

export const FACTION_TIERS = [
  { min: -100, max: -25, id: "hostile", label: "Hostile" },
  { min: -24, max: 24, id: "neutral", label: "Neutral" },
  { min: 25, max: 100, id: "allied", label: "Allied" },
];

export const FACTION_NAMES = {
  civicCouncil: "Civic Council",
  workersGuild: "Workers' Guild",
  marketCartel: "Market Cartel",
};

export function resolveFactionTier(value) {
  const v = typeof value === "number" && isFinite(value) ? value : 0;
  if (v <= -25) return "hostile";
  if (v >= 25) return "allied";
  return "neutral";
}

// Shop prices scale with marketCartel rep.
// allied: -15%, neutral: ±0, hostile: +30%.
export function resolveShopPriceMultiplier(factionRep) {
  const tier = resolveFactionTier(factionRep?.marketCartel || 0);
  if (tier === "allied") return 0.85;
  if (tier === "hostile") return 1.3;
  return 1.0;
}

// Smith tier-up gates by workersGuild rep.
// Common→Refined: any rep
// Refined→Relic:  workersGuild ≥ 0
// Tier-3 (future): workersGuild ≥ 25
export function canSmithUpgradeWeapon(factionRep, currentTier) {
  const guild = factionRep?.workersGuild || 0;
  if (currentTier === "Common") return true; // base upgrade always allowed
  if (currentTier === "Refined") return guild >= 0;
  return guild >= 25; // future tiers
}

// Patrol density modifier from civicCouncil rep.
// allied: friendly patrols help vs enemies (multiplier > 1 for support spawns)
// hostile: patrols turn on the player (effective enemy density up)
export function resolvePatrolModifier(factionRep) {
  const tier = resolveFactionTier(factionRep?.civicCouncil || 0);
  if (tier === "allied") return { friendlyMult: 1.4, hostileMult: 0.85 };
  if (tier === "hostile") return { friendlyMult: 0.5, hostileMult: 1.25 };
  return { friendlyMult: 1.0, hostileMult: 1.0 };
}

export function resolveAllFactionEffects(factionRep) {
  return {
    shopPriceMult: resolveShopPriceMultiplier(factionRep),
    patrol: resolvePatrolModifier(factionRep),
    tiers: {
      civicCouncil: resolveFactionTier(factionRep?.civicCouncil || 0),
      workersGuild: resolveFactionTier(factionRep?.workersGuild || 0),
      marketCartel: resolveFactionTier(factionRep?.marketCartel || 0),
    },
  };
}
