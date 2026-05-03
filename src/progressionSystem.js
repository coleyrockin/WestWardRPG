import { createInitialCharacterIdentity } from "./characterIdentity.js";
import {
  ARMOR_PIECES,
  WEAPON_FAMILIES,
  normalizeGearState,
  resolveArmorSlotEffects,
  resolveWeaponFamilyEffects,
} from "./gearCrafting.js";

const SKILL_BRANCHES = ["survival", "combat", "influence"];

export const WEAPON_TIERS = ["Common", "Refined", "Relic"];

export const ARMOR_MODIFIERS = {
  stamina_regen: { id: "stamina_regen", label: "Stamina Regen", staminaRegenBonus: 1.25 },
  block_efficiency: { id: "block_efficiency", label: "Block Efficiency", blockEfficiencyBonus: 0.1 },
  weather_resistance: { id: "weather_resistance", label: "Weather Resistance", weatherPenaltyReduction: 0.45 },
};

export const IDEOLOGY_TRAITS = {
  freedom_strider: {
    id: "freedom_strider",
    axis: "controlVsFreedom",
    threshold: -12,
    passive: "Dodge stamina cost reduced.",
  },
  order_keeper: {
    id: "order_keeper",
    axis: "controlVsFreedom",
    threshold: 12,
    passive: "Block window is more forgiving.",
  },
  truthseeker: {
    id: "truthseeker",
    axis: "truthVsComfort",
    threshold: 12,
    passive: "Quest breadcrumb details increase.",
  },
  commons_guard: {
    id: "commons_guard",
    axis: "solidarityVsStatus",
    threshold: 12,
    passive: "Allies boost stamina recovery.",
  },
};

export function createInitialProgressionState() {
  return {
    upgradePoints: 0,
    skillTree: {
      survival: 0,
      combat: 0,
      influence: 0,
    },
    equipment: normalizeGearState(),
    identity: createInitialCharacterIdentity(),
    traits: [],
  };
}

export const MAX_SKILLS_PER_BRANCH = 5;

export function listSkillBranches() {
  return SKILL_BRANCHES.slice();
}

export function canUnlockSkill(progression, branch, maxPerBranch = MAX_SKILLS_PER_BRANCH) {
  if (!SKILL_BRANCHES.includes(branch)) return false;
  if ((progression.skillTree[branch] || 0) >= maxPerBranch) return false;
  return progression.upgradePoints > 0;
}

export function unlockSkill(progression, branch) {
  if (!canUnlockSkill(progression, branch)) return false;
  progression.upgradePoints -= 1;
  progression.skillTree[branch] = (progression.skillTree[branch] || 0) + 1;
  return true;
}

export function upgradeWeaponTier(progression) {
  progression.equipment = normalizeGearState(progression.equipment);
  const idx = WEAPON_TIERS.indexOf(progression.equipment.weaponTier);
  if (idx < 0 || idx >= WEAPON_TIERS.length - 1) return false;
  progression.equipment.weaponTier = WEAPON_TIERS[idx + 1];
  return true;
}

export function addArmorModifier(progression, modifierId) {
  progression.equipment = normalizeGearState(progression.equipment);
  if (!ARMOR_MODIFIERS[modifierId]) return false;
  if (progression.equipment.armorMods.includes(modifierId)) return false;
  progression.equipment.armorMods.push(modifierId);
  return true;
}

export function equipWeaponFamily(progression, familyId) {
  if (!WEAPON_FAMILIES[familyId]) return false;
  progression.equipment = normalizeGearState(progression.equipment);
  if (progression.equipment.weaponFamily === familyId) return false;
  progression.equipment.weaponFamily = familyId;
  return true;
}

export function equipArmorPiece(progression, pieceId) {
  const piece = ARMOR_PIECES[pieceId];
  if (!piece) return false;
  progression.equipment = normalizeGearState(progression.equipment);
  if (progression.equipment.armorSlots[piece.slot] === piece.id) return false;
  progression.equipment.armorSlots[piece.slot] = piece.id;
  return true;
}

export function resolveIdeologyTraits(narrativeState) {
  const traits = [];
  for (const trait of Object.values(IDEOLOGY_TRAITS)) {
    const axisValue = narrativeState?.thematicAxes?.[trait.axis] || 0;
    if (trait.threshold >= 0 && axisValue >= trait.threshold) traits.push(trait.id);
    else if (trait.threshold < 0 && axisValue <= trait.threshold) traits.push(trait.id);
  }
  return traits;
}

export function buildProgressionModifiers(progression) {
  const equipment = normalizeGearState(progression.equipment);
  const identity = progression.identity;
  const weapon = resolveWeaponFamilyEffects(equipment, identity);
  const armor = resolveArmorSlotEffects(equipment, identity);
  const mods = {
    staminaRegenBonus: 0,
    blockEfficiencyBonus: 0,
    weatherPenaltyReduction: 0,
    weaponDamageMult: 1,
    weaponStaminaMult: weapon.staminaMult * armor.staminaCostMult,
    weaponReachMult: weapon.reachMult,
    weaponStaggerBonus: weapon.staggerBonus,
    armorWeight: armor.totalWeight,
    repairCostMult: armor.repairCostMult,
    refineCostMult: armor.refineCostMult,
    craftingYieldPct: armor.craftingYieldPct,
  };
  mods.staminaRegenBonus += armor.staminaRegenBonus || 0;
  mods.blockEfficiencyBonus += armor.blockEfficiencyBonus || 0;
  mods.weatherPenaltyReduction += armor.weatherPenaltyReduction || 0;
  for (const modId of equipment.armorMods || []) {
    const mod = ARMOR_MODIFIERS[modId];
    if (!mod) continue;
    mods.staminaRegenBonus += mod.staminaRegenBonus || 0;
    mods.blockEfficiencyBonus += mod.blockEfficiencyBonus || 0;
    mods.weatherPenaltyReduction += mod.weatherPenaltyReduction || 0;
  }
  const tier = equipment.weaponTier;
  if (tier === "Refined") mods.weaponDamageMult = 1.08;
  if (tier === "Relic") mods.weaponDamageMult = 1.16;
  mods.weaponDamageMult = Number((mods.weaponDamageMult * weapon.damageMult).toFixed(2));
  mods.weaponStaminaMult = Number(mods.weaponStaminaMult.toFixed(2));
  return mods;
}
