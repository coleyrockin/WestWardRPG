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

// Capstone perks — gated by attribute threshold + faction allegiance.
// These unlock at level 5 of a skill branch AND a secondary condition.
export const CAPSTONE_PERKS = [
  {
    id: "iron_constitution",
    label: "Iron Constitution",
    description: "+30 max HP. Guard-break recovery 40% faster.",
    branch: "survival",
    branchLevel: 5,
    attributeReq: { grit: 7 },
    factionReq: null,
    effects: { maxHpBonus: 30, guardBreakRecoveryMult: 0.6 },
  },
  {
    id: "perfect_form",
    label: "Perfect Form",
    description: "Perfect parry and perfect dodge windows +50ms.",
    branch: "combat",
    branchLevel: 5,
    attributeReq: { might: 6 },
    factionReq: null,
    effects: { perfectWindowBonus: 0.05 },
  },
  {
    id: "guild_network",
    label: "Guild Network",
    description: "Workers Guild prices -20%. Bonus XP from all jobs.",
    branch: "influence",
    branchLevel: 5,
    attributeReq: { speech: 6 },
    factionReq: { workersGuild: 20 },
    effects: { guildDiscountMult: 0.8, jobXpBonus: 0.25 },
  },
  {
    id: "cartel_leverage",
    label: "Cartel Leverage",
    description: "Market Cartel prices -25%. Gold from kills +10%.",
    branch: "influence",
    branchLevel: 5,
    attributeReq: { cunning: 6 },
    factionReq: { marketCartel: 20 },
    effects: { cartelDiscountMult: 0.75, killGoldBonus: 0.1 },
  },
  {
    id: "dust_runner",
    label: "Dust Runner",
    description: "Movement speed +15% in Ashfall. Status effect durations -20% when imposed on you.",
    branch: "survival",
    branchLevel: 4,
    attributeReq: { grit: 6, cunning: 5 },
    factionReq: null,
    effects: { ashfallSpeedBonus: 0.15, statusDurationReduction: 0.2 },
  },
];

export function getUnlockedCapstonePerkIds(progression, factionRep = {}) {
  if (!progression) return [];
  const tree = progression.skillTree || {};
  const identity = progression.identity || {};
  const attrs = identity.attributes || {};
  return CAPSTONE_PERKS
    .filter((p) => {
      if ((tree[p.branch] || 0) < p.branchLevel) return false;
      for (const [attr, min] of Object.entries(p.attributeReq || {})) {
        if ((attrs[attr] || 0) < min) return false;
      }
      for (const [faction, min] of Object.entries(p.factionReq || {})) {
        if ((factionRep[faction] || 0) < min) return false;
      }
      return true;
    })
    .map((p) => p.id);
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
