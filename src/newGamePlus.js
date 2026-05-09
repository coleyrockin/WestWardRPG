// New Game+ system. Carries forward progression.upgradePoints, weaponTier,
// armorMods, skill branches, and cosmetic identity items. Resets quests,
// inventory, regions, and world state. Enemy HP scales with ngPlusLevel.

export const NG_PLUS_ENEMY_HP_MULT = 0.25; // +25% HP per NG+ level

export function isNewGamePlusEligible(runStats) {
  return Boolean(runStats?.victory);
}

// Extract what to carry forward from the current save payload.
export function extractCarryForward(progression, player) {
  return {
    ngPlusLevel: ((progression?.ngPlusLevel || 0) + 1),
    upgradePoints: Math.max(0, Math.floor(progression?.upgradePoints || 0)),
    skillTree: progression?.skillTree ? { ...progression.skillTree } : {},
    weaponTier: progression?.equipment?.weaponTier || "Common",
    armorMods: Array.isArray(progression?.equipment?.armorMods) ? [...progression.equipment.armorMods] : [],
    traits: Array.isArray(progression?.traits) ? [...progression.traits] : [],
    originId: progression?.identity?.originId || "exiled_marshal",
    goldBonus: Math.floor((player?.gold || 0) * 0.25), // 25% of final gold carries over
  };
}

// Apply carried-forward state to a fresh progression object.
export function applyCarryForward(progression, carry) {
  if (!carry || !progression) return progression;
  progression.ngPlusLevel = carry.ngPlusLevel || 0;
  progression.upgradePoints = (progression.upgradePoints || 0) + (carry.upgradePoints || 0);
  if (carry.skillTree && typeof carry.skillTree === "object") {
    progression.skillTree = { ...progression.skillTree, ...carry.skillTree };
  }
  if (carry.traits && Array.isArray(carry.traits)) {
    progression.traits = [...new Set([...(progression.traits || []), ...carry.traits])];
  }
  if (progression.equipment && carry.weaponTier) {
    progression.equipment.weaponTier = carry.weaponTier;
  }
  if (progression.equipment && Array.isArray(carry.armorMods)) {
    progression.equipment.armorMods = carry.armorMods;
  }
  if (progression.identity && carry.originId) {
    progression.identity.originId = carry.originId;
  }
  return progression;
}

// Enemy HP multiplier for the current NG+ level.
export function resolveNgPlusHpMult(ngPlusLevel = 0) {
  if (ngPlusLevel <= 0) return 1.0;
  return 1.0 + ngPlusLevel * NG_PLUS_ENEMY_HP_MULT;
}
