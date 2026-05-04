import { deriveAttributeEffects, normalizeCharacterIdentity } from "./characterIdentity.js";

export const WEAPON_FAMILIES = {
  saber: {
    id: "saber",
    label: "Saber",
    weaponName: "Frontier Saber",
    role: "Balanced dueling blade.",
    weight: 2,
    damageMult: 1,
    staminaMult: 1,
    reachMult: 1,
    staggerBonus: 0,
  },
  axe: {
    id: "axe",
    label: "Axe",
    weaponName: "Split-Iron Axe",
    role: "Heavier chops with better stagger.",
    weight: 4,
    damageMult: 1.1,
    staminaMult: 1.1,
    reachMult: 0.95,
    staggerBonus: 0.07,
  },
  spear: {
    id: "spear",
    label: "Spear",
    weaponName: "Rail Spear",
    role: "Longer reach, lighter hit.",
    weight: 3,
    damageMult: 0.96,
    staminaMult: 1.04,
    reachMult: 1.16,
    staggerBonus: 0.02,
  },
  hammer: {
    id: "hammer",
    label: "Hammer",
    weaponName: "Foundry Hammer",
    role: "Slow, costly, brutal stagger.",
    weight: 6,
    damageMult: 1.18,
    staminaMult: 1.18,
    reachMult: 0.9,
    staggerBonus: 0.14,
  },
};

export const WEAPON_BRANCHES = {
  saber: {
    familyId: "saber",
    label: "Precision",
    role: "Cleaner duels with less stamina bleed.",
    costs: { "Crystal Shard": 2, Ashglass: 1 },
    damageBonus: 0.04,
    staminaBonus: -0.04,
    reachBonus: 0,
    staggerBonus: 0.01,
  },
  axe: {
    familyId: "axe",
    label: "Cleave",
    role: "Wider pressure and harder multi-target chops.",
    costs: { Wood: 4, Stone: 2, Ashglass: 1 },
    damageBonus: 0.03,
    staminaBonus: 0.01,
    reachBonus: 0.02,
    staggerBonus: 0.04,
  },
  spear: {
    familyId: "spear",
    label: "Control",
    role: "More reach and steadier spacing.",
    costs: { "Scrap Coil": 1, Wood: 2, Stone: 1 },
    damageBonus: 0.01,
    staminaBonus: -0.02,
    reachBonus: 0.08,
    staggerBonus: 0.03,
  },
  hammer: {
    familyId: "hammer",
    label: "Breaker",
    role: "Guard-break identity with heavier stagger.",
    costs: { Ashglass: 2, Stone: 4, "Scrap Coil": 1 },
    damageBonus: 0.02,
    staminaBonus: 0.02,
    reachBonus: 0,
    staggerBonus: 0.09,
  },
};

export const ARMOR_SLOT_IDS = ["head", "body", "hands", "feet", "trinket"];

export const ARMOR_PIECES = {
  ash_mask: {
    id: "ash_mask",
    slot: "head",
    label: "Ash Mask",
    weight: 1,
    weatherPenaltyReduction: 0.08,
  },
  travel_duster: {
    id: "travel_duster",
    slot: "body",
    label: "Travel Duster",
    weight: 2,
    blockEfficiencyBonus: 0.02,
    weatherPenaltyReduction: 0.05,
  },
  iron_duster: {
    id: "iron_duster",
    slot: "body",
    label: "Iron Duster",
    weight: 5,
    staminaPenalty: 0.08,
    blockEfficiencyBonus: 0.09,
    weatherPenaltyReduction: 0.12,
  },
  salvage_gloves: {
    id: "salvage_gloves",
    slot: "hands",
    label: "Salvage Gloves",
    weight: 1,
    craftingYieldPct: 4,
    repairDiscountPct: 3,
  },
  trail_boots: {
    id: "trail_boots",
    slot: "feet",
    label: "Trail Boots",
    weight: 1,
    staminaRegenBonus: 0.08,
  },
  lantern_charm: {
    id: "lantern_charm",
    slot: "trinket",
    label: "Lantern Charm",
    weight: 0,
    loreDiscoveryPct: 3,
    refineDiscountPct: 2,
  },
};

export const DEFAULT_ARMOR_SLOTS = {
  head: null,
  body: "travel_duster",
  hands: null,
  feet: "trail_boots",
  trinket: null,
};

const WEAPON_TIERS = new Set(["Common", "Refined", "Relic"]);

function cloneArray(source) {
  return Array.isArray(source) ? source.filter((item) => typeof item === "string") : [];
}

function uniqueStrings(source) {
  return [...new Set(cloneArray(source))];
}

function roundHundredths(value) {
  return Number(value.toFixed(2));
}

function normalizeArmorSlots(source = {}) {
  const next = { ...DEFAULT_ARMOR_SLOTS };
  if (!source || typeof source !== "object") return next;
  for (const slotId of ARMOR_SLOT_IDS) {
    const pieceId = source[slotId];
    if (pieceId === null) {
      next[slotId] = null;
      continue;
    }
    const piece = ARMOR_PIECES[pieceId];
    if (piece && piece.slot === slotId) {
      next[slotId] = piece.id;
    }
  }
  return next;
}

function normalizeWeaponBranches(source = {}) {
  const next = {};
  if (!source || typeof source !== "object") return next;
  for (const familyId of Object.keys(WEAPON_BRANCHES)) {
    if (source[familyId] === true) next[familyId] = true;
  }
  return next;
}

export function normalizeGearState(equipment = {}) {
  const source = equipment && typeof equipment === "object" ? equipment : {};
  const tier = WEAPON_TIERS.has(source.weaponTier) ? source.weaponTier : "Common";
  const weaponFamily = WEAPON_FAMILIES[source.weaponFamily] ? source.weaponFamily : "saber";
  return {
    ...source,
    weaponTier: tier,
    weaponFamily,
    armorMods: cloneArray(source.armorMods),
    armorSlots: normalizeArmorSlots(source.armorSlots),
    affixes: cloneArray(source.affixes),
    ownedArmorPieces: uniqueStrings(source.ownedArmorPieces),
    weaponFamilyTokens: uniqueStrings(source.weaponFamilyTokens),
    weaponBranches: normalizeWeaponBranches(source.weaponBranches),
  };
}

function attributes(identity) {
  return normalizeCharacterIdentity(identity).attributes;
}

export function resolveWeaponFamilyEffects(equipment, identity) {
  const gear = normalizeGearState(equipment);
  const family = WEAPON_FAMILIES[gear.weaponFamily] || WEAPON_FAMILIES.saber;
  const branch = resolveWeaponBranchState(gear);
  const attrs = attributes(identity);
  const heftPenalty = Math.max(0, family.weight - WEAPON_FAMILIES.saber.weight) * 0.015;
  const mightRelief = Math.min(0.18, Math.max(0, attrs.might - 2) * 0.025);
  const craftHandling = Math.min(0.08, Math.max(0, attrs.craft - 3) * 0.012);
  const mightDamage = Math.max(0, attrs.might - 4) * 0.012;

  return {
    familyId: family.id,
    label: family.label,
    weaponName: family.weaponName,
    role: family.role,
    weight: family.weight,
    damageMult: roundHundredths(family.damageMult + mightDamage + (branch.unlocked ? branch.effects.damageBonus : 0)),
    staminaMult: roundHundredths(Math.max(0.82, Math.min(1.35, family.staminaMult + heftPenalty - mightRelief - craftHandling + (branch.unlocked ? branch.effects.staminaBonus : 0)))),
    reachMult: roundHundredths(family.reachMult + (branch.unlocked ? branch.effects.reachBonus : 0)),
    staggerBonus: roundHundredths(family.staggerBonus + (branch.unlocked ? branch.effects.staggerBonus : 0)),
    branch,
  };
}

export function resolveWeaponBranchState(equipment) {
  const gear = normalizeGearState(equipment);
  const branch = WEAPON_BRANCHES[gear.weaponFamily] || WEAPON_BRANCHES.saber;
  const unlocked = Boolean(gear.weaponBranches?.[branch.familyId]);
  return {
    ...branch,
    unlocked,
    effects: {
      damageBonus: branch.damageBonus,
      staminaBonus: branch.staminaBonus,
      reachBonus: branch.reachBonus,
      staggerBonus: branch.staggerBonus,
    },
    line: unlocked
      ? `${branch.label} unlocked: ${branch.role}`
      : `${branch.label} locked: ${Object.entries(branch.costs).map(([key, value]) => `${value} ${key}`).join(", ")}`,
  };
}

function listArmorPieces(equipment) {
  const gear = normalizeGearState(equipment);
  return ARMOR_SLOT_IDS
    .map((slotId) => ARMOR_PIECES[gear.armorSlots[slotId]])
    .filter(Boolean);
}

export function resolveCraftingEconomy(identity, extra = {}) {
  const attrs = attributes(identity);
  const craftBonus = Math.max(0, attrs.craft - 2);
  const repairDiscountPct = Math.min(28, craftBonus * 3 + (extra.repairDiscountPct || 0));
  const refineDiscountPct = Math.min(22, craftBonus * 2.5 + (extra.refineDiscountPct || 0));
  const craftingYieldPct = Math.min(45, Math.max(0, (deriveAttributeEffects(identity).craftingYieldPct || 0) + craftBonus * 2 + (extra.craftingYieldPct || 0)));

  return {
    repairCostMult: roundHundredths(Math.max(0.72, 1 - repairDiscountPct / 100)),
    refineCostMult: roundHundredths(Math.max(0.78, 1 - refineDiscountPct / 100)),
    craftingYieldPct: Math.round(craftingYieldPct),
  };
}

export function resolveCraftingCostMultiplier(identity, kind = "repair") {
  const economy = resolveCraftingEconomy(identity);
  return kind === "refine" ? economy.refineCostMult : economy.repairCostMult;
}

export function resolveArmorSlotEffects(equipment, identity) {
  const pieces = listArmorPieces(equipment);
  const attrs = attributes(identity);
  const totals = {
    totalWeight: 0,
    staminaPenalty: 0,
    staminaRegenBonus: 0,
    blockEfficiencyBonus: 0,
    weatherPenaltyReduction: 0,
    repairDiscountPct: 0,
    refineDiscountPct: 0,
    craftingYieldPct: 0,
    loreDiscoveryPct: 0,
  };

  for (const piece of pieces) {
    totals.totalWeight += piece.weight || 0;
    totals.staminaPenalty += piece.staminaPenalty || 0;
    totals.staminaRegenBonus += piece.staminaRegenBonus || 0;
    totals.blockEfficiencyBonus += piece.blockEfficiencyBonus || 0;
    totals.weatherPenaltyReduction += piece.weatherPenaltyReduction || 0;
    totals.repairDiscountPct += piece.repairDiscountPct || 0;
    totals.refineDiscountPct += piece.refineDiscountPct || 0;
    totals.craftingYieldPct += piece.craftingYieldPct || 0;
    totals.loreDiscoveryPct += piece.loreDiscoveryPct || 0;
  }

  const weightPenalty = Math.max(0, totals.totalWeight - 2) * 0.025;
  const gritRelief = Math.min(0.2, Math.max(0, attrs.grit - 2) * 0.025);
  const staminaCostMult = roundHundredths(Math.max(0.88, Math.min(1.35, 1 + weightPenalty + totals.staminaPenalty - gritRelief)));
  const economy = resolveCraftingEconomy(identity, totals);

  return {
    pieces,
    totalWeight: totals.totalWeight,
    staminaCostMult,
    staminaRegenBonus: roundHundredths(totals.staminaRegenBonus),
    blockEfficiencyBonus: roundHundredths(totals.blockEfficiencyBonus),
    weatherPenaltyReduction: roundHundredths(totals.weatherPenaltyReduction),
    repairCostMult: economy.repairCostMult,
    refineCostMult: economy.refineCostMult,
    craftingYieldPct: economy.craftingYieldPct,
    loreDiscoveryPct: totals.loreDiscoveryPct,
  };
}

export function buildGearSummary(equipment, identity) {
  const gear = normalizeGearState(equipment);
  const weapon = resolveWeaponFamilyEffects(gear, identity);
  const armor = resolveArmorSlotEffects(gear, identity);
  const armorLabels = armor.pieces.map((piece) => piece.label);
  return {
    weaponFamilyId: weapon.familyId,
    weaponLine: `${gear.weaponTier} ${weapon.label}`,
    weaponName: weapon.weaponName,
    armorLine: armorLabels.length > 0 ? armorLabels.join(" / ") : "No armor fitted",
    armorWeight: armor.totalWeight,
    handlingLine: `stamina x${roundHundredths(weapon.staminaMult * armor.staminaCostMult)} / reach x${weapon.reachMult}`,
    branchLine: weapon.branch.line,
    economyLine: `${armor.craftingYieldPct}% yield / repair x${armor.repairCostMult} / refine x${armor.refineCostMult}`,
    weapon,
    armor,
  };
}

export function buildGearInventorySummary(equipment) {
  const gear = normalizeGearState(equipment);
  const ownedArmor = (gear.ownedArmorPieces || [])
    .map((pieceId) => ARMOR_PIECES[pieceId])
    .filter(Boolean);
  const equippedArmorIds = new Set(Object.values(gear.armorSlots).filter(Boolean));
  const weaponTokens = (gear.weaponFamilyTokens || [])
    .map((familyId) => WEAPON_FAMILIES[familyId])
    .filter(Boolean);

  const armorLabels = ownedArmor.map((piece) => `${piece.label} ${equippedArmorIds.has(piece.id) ? "equipped" : "owned"}`);
  const tokenLabels = weaponTokens.map((family) => `${family.label} token`);

  return {
    ownedArmorCount: ownedArmor.length,
    weaponTokenCount: weaponTokens.length,
    ownedArmorLine: armorLabels.length ? armorLabels.join(" / ") : "No earned armor pieces",
    weaponTokenLine: tokenLabels.length ? tokenLabels.join(" / ") : "No weapon-family tokens",
    ownedArmor: ownedArmor.map((piece) => ({ id: piece.id, slot: piece.slot, label: piece.label, equipped: equippedArmorIds.has(piece.id) })),
    weaponTokens: weaponTokens.map((family) => ({ id: family.id, label: family.label })),
  };
}
