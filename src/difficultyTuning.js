// Difficulty tuning — pure module.
//
// Three discrete difficulties multiplicatively scale enemy HP, enemy
// damage, and player loot/gold yield. Persisted on `state.world.difficulty`.

export const DIFFICULTY_LEVELS = ["beginner", "standard", "hard"];

export const DIFFICULTY_PROFILES = {
  beginner: {
    label: "Beginner",
    enemyHpMult: 0.7,
    enemyDamageMult: 0.7,
    rewardMult: 1.1,
    description: "Enemies hit softer and fall faster. Recommended for first runs.",
  },
  standard: {
    label: "Standard",
    enemyHpMult: 1.0,
    enemyDamageMult: 1.0,
    rewardMult: 1.0,
    description: "Default tuning. The frontier as designed.",
  },
  hard: {
    label: "Hard",
    enemyHpMult: 1.5,
    enemyDamageMult: 1.35,
    rewardMult: 1.2,
    description: "Enemies hit harder and survive longer; rewards scale up.",
  },
};

export function isDifficultyId(id) {
  return DIFFICULTY_LEVELS.includes(id);
}

export function resolveDifficultyProfile(id) {
  return DIFFICULTY_PROFILES[id] || DIFFICULTY_PROFILES.standard;
}

export function ensureDifficultyDefaults(world) {
  if (!world || typeof world !== "object") return "standard";
  if (!isDifficultyId(world.difficulty)) {
    world.difficulty = "standard";
  }
  return world.difficulty;
}

export function setDifficulty(world, id) {
  if (!world || typeof world !== "object") return null;
  if (!isDifficultyId(id)) return null;
  world.difficulty = id;
  return id;
}

export function cycleDifficulty(world, dir = 1) {
  ensureDifficultyDefaults(world);
  const idx = DIFFICULTY_LEVELS.indexOf(world.difficulty);
  const next = (idx + (dir > 0 ? 1 : -1) + DIFFICULTY_LEVELS.length) % DIFFICULTY_LEVELS.length;
  world.difficulty = DIFFICULTY_LEVELS[next];
  return world.difficulty;
}

// Helper for spawn / damage / reward callsites.
export function getEnemyHpMultiplier(world) {
  return resolveDifficultyProfile(world?.difficulty).enemyHpMult;
}

export function getEnemyDamageMultiplier(world) {
  return resolveDifficultyProfile(world?.difficulty).enemyDamageMult;
}

export function getRewardMultiplier(world) {
  return resolveDifficultyProfile(world?.difficulty).rewardMult;
}
