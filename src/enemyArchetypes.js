export const ENEMY_ARCHETYPES = {
  slime: {
    label: "Slime",
    hp: 48,
    speed: 1.35,
    reach: 1.22,
    baseDamage: 7,
    damageVariance: 6,
    color: "#6be873",
    behavior: "balanced",
  },
  charger: {
    label: "Railboar Charger",
    hp: 62,
    speed: 1.9,
    reach: 1.15,
    baseDamage: 10,
    damageVariance: 7,
    color: "#f2b063",
    behavior: "charge",
  },
  spitter: {
    label: "Mist Spitter",
    hp: 38,
    speed: 1.15,
    reach: 2.1,
    baseDamage: 8,
    damageVariance: 5,
    color: "#8fc9ff",
    behavior: "ranged",
  },
  brute: {
    label: "Sump Brute",
    hp: 94,
    speed: 0.94,
    reach: 1.35,
    baseDamage: 13,
    damageVariance: 6,
    color: "#c98e8e",
    behavior: "tank",
  },
};

export function listEnemyArchetypes() {
  return Object.keys(ENEMY_ARCHETYPES);
}

export function chooseEnemyType(level, weatherKind, roll = Math.random()) {
  if (level < 3) return "slime";
  if (level < 5) return roll < 0.78 ? "slime" : "charger";
  if (weatherKind === "mist") return roll < 0.45 ? "spitter" : roll < 0.75 ? "slime" : "charger";
  if (weatherKind === "storm") return roll < 0.34 ? "brute" : roll < 0.64 ? "charger" : "slime";
  return roll < 0.5 ? "slime" : roll < 0.76 ? "charger" : roll < 0.92 ? "spitter" : "brute";
}

export function createEnemyStats(type, level) {
  const archetype = ENEMY_ARCHETYPES[type] || ENEMY_ARCHETYPES.slime;
  const levelScale = Math.max(1, level);
  return {
    type,
    label: archetype.label,
    color: archetype.color,
    behavior: archetype.behavior,
    maxHp: Math.round(archetype.hp + levelScale * 4.5),
    hp: Math.round(archetype.hp + levelScale * 4.5),
    speed: archetype.speed + Math.min(0.55, levelScale * 0.04),
    attackReach: archetype.reach,
    baseDamage: archetype.baseDamage + Math.floor(levelScale * 0.4),
    damageVariance: archetype.damageVariance,
  };
}

export function createEnemyCombatProfile(enemy, playerLevel) {
  const archetype = ENEMY_ARCHETYPES[enemy.type] || ENEMY_ARCHETYPES.slime;
  const aggression = archetype.behavior === "charge" ? 1.25 : archetype.behavior === "ranged" ? 0.82 : 1;
  const pacing = archetype.behavior === "tank" ? 1.4 : 1;
  return {
    pursuitRange: 8.8 + Math.min(3.2, playerLevel * 0.24 * aggression),
    attackRange: enemy.attackReach || archetype.reach,
    cooldownFactor: pacing,
  };
}
