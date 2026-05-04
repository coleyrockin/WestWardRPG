import { ARMOR_PIECES, WEAPON_BRANCHES, WEAPON_FAMILIES, normalizeGearState } from "./gearCrafting.js";
import { equipArmorPiece, equipWeaponFamily } from "./progressionSystem.js";
import { deriveAttributeEffects, normalizeCharacterIdentity } from "./characterIdentity.js";

export function createInitialWorkstationState() {
  return {
    level: 1,
    craftsCompleted: 0,
    preparedUpgrade: null,
    stationProjects: [],
  };
}

export function normalizeWorkstationState(source = {}) {
  return {
    level: Number.isFinite(source?.level) ? Math.max(1, Math.min(3, Math.floor(source.level))) : 1,
    craftsCompleted: Number.isFinite(source?.craftsCompleted) ? Math.max(0, Math.floor(source.craftsCompleted)) : 0,
    preparedUpgrade: typeof source?.preparedUpgrade === "string" ? source.preparedUpgrade : null,
    stationProjects: Array.isArray(source?.stationProjects) ? [...new Set(source.stationProjects.filter((project) => typeof project === "string"))] : [],
  };
}

export const WORKSTATION_UPGRADES = {
  2: {
    level: 2,
    label: "Upgrade Workbench II",
    description: "8 Wood + 4 Stone. Adds a sturdier field bench.",
    costs: { Wood: 8, Stone: 4 },
  },
  3: {
    level: 3,
    label: "Upgrade Workbench III",
    description: "12 Wood + 6 Stone + 2 Scrap Coil. Adds a smithing corner.",
    costs: { Wood: 12, Stone: 6, "Scrap Coil": 2 },
  },
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function count(inventory, key) {
  return Math.max(0, Math.floor(inventory?.[key] || 0));
}

function canAfford(inventory, costs) {
  return Object.entries(costs).every(([key, value]) => count(inventory, key) >= value);
}

function missingCosts(inventory, costs) {
  const missing = {};
  for (const [key, value] of Object.entries(costs)) {
    const need = Math.max(0, Math.floor(value) - count(inventory, key));
    if (need > 0) missing[key] = need;
  }
  return missing;
}

function formatMissing(missing) {
  const entries = Object.entries(missing);
  if (entries.length === 0) return null;
  return `missing ${entries.map(([key, value]) => `${value} ${key}`).join(", ")}`;
}

function spend(inventory, costs) {
  for (const [key, value] of Object.entries(costs)) {
    inventory[key] = Math.max(0, count(inventory, key) - value);
  }
}

function incrementWorkstation(house) {
  house.workstation = normalizeWorkstationState(house.workstation);
  house.workstation.craftsCompleted += 1;
}

function nextWorkstationUpgrade(workstation) {
  const level = normalizeWorkstationState(workstation).level;
  return WORKSTATION_UPGRADES[level + 1] || null;
}

function refineKitCosts(workstation) {
  return normalizeWorkstationState(workstation).level >= 2
    ? { Ashglass: 1, "Scrap Coil": 1 }
    : { Ashglass: 2, "Scrap Coil": 1 };
}

export function describeWorkstationState(workstation = {}) {
  const state = normalizeWorkstationState(workstation);
  const benefits = ["basic crafting"];
  if (state.level >= 2) benefits.push("Workbench II: +1 potion output, cheaper refine kits");
  if (state.level >= 3) benefits.push("Map table: regional survey projects");
  const projectLabels = {
    region_map: "Region Map",
  };
  const projects = state.stationProjects.map((project) => projectLabels[project] || project);
  return {
    level: state.level,
    stationLine: `Workbench level ${state.level}`,
    benefits,
    benefitLine: benefits.join(" / "),
    projectsLine: projects.length ? projects.join(" / ") : "No station projects",
    nextUpgrade: nextWorkstationUpgrade(state),
  };
}

export function getAvailableCraftingActions(context = {}) {
  return getCraftingActionCatalog(context).filter((action) => action.available);
}

export function getCraftingActionCatalog(context = {}) {
  const inventory = context.inventory || {};
  const progression = context.progression || {};
  const equipment = normalizeGearState(progression.equipment);
  const workstation = normalizeWorkstationState(context.house?.workstation);
  const actions = [];

  const potionCosts = { Wood: 2, Stone: 1 };
  const potionMissing = missingCosts(inventory, potionCosts);
  actions.push({
    id: "craft_potion",
    label: "Craft Potion",
    description: workstation.level >= 2 ? "2 Wood + 1 Stone. Workbench II yields 2." : "2 Wood + 1 Stone.",
    costs: potionCosts,
    missing: potionMissing,
    available: Object.keys(potionMissing).length === 0,
    blockedReason: formatMissing(potionMissing),
  });

  for (const pieceId of equipment.ownedArmorPieces || []) {
    const piece = ARMOR_PIECES[pieceId];
    if (piece && equipment.armorSlots?.[piece.slot] !== pieceId) {
      actions.push({ id: `equip_armor_${pieceId}`, label: `Equip ${piece.label}`, description: `Fit owned ${piece.label} in ${piece.slot} slot.`, available: true, missing: {}, blockedReason: null });
    }
  }
  for (const familyId of equipment.weaponFamilyTokens || []) {
    const family = WEAPON_FAMILIES[familyId];
    if (family && equipment.weaponFamily !== familyId) {
      actions.push({ id: `fit_weapon_${familyId}`, label: `Fit ${family.label}`, description: `Use owned ${family.label} token unlock to change weapon family.`, available: true, missing: {}, blockedReason: null });
    }
  }

  const branch = WEAPON_BRANCHES[equipment.weaponFamily];
  if (branch && !equipment.weaponBranches?.[branch.familyId]) {
    const branchMissing = missingCosts(inventory, branch.costs);
    actions.push({
      id: `unlock_weapon_branch_${branch.familyId}`,
      label: `Unlock ${branch.label}`,
      description: `${branch.role} Costs ${Object.entries(branch.costs).map(([key, value]) => `${value} ${key}`).join(", ")}.`,
      costs: branch.costs,
      missing: branchMissing,
      available: Object.keys(branchMissing).length === 0,
      blockedReason: formatMissing(branchMissing),
    });
  }

  const refineCosts = refineKitCosts(workstation);
  const refineMissing = missingCosts(inventory, refineCosts);
  const refineBlocked = workstation.preparedUpgrade === "refine_weapon"
    ? "A refine kit is already prepared."
    : formatMissing(refineMissing);
  actions.push({
    id: "prepare_refine_kit",
    label: "Prepare Refine Kit",
    description: workstation.level >= 2 ? "1 Ashglass + 1 Scrap Coil." : "2 Ashglass + 1 Scrap Coil.",
    costs: refineCosts,
    missing: refineMissing,
    available: !refineBlocked,
    blockedReason: refineBlocked,
  });

  if (!workstation.stationProjects.includes("region_map")) {
    const mapCosts = { "Cipher Lens": 1, "Pressurized Ink": 1 };
    const mapMissing = missingCosts(inventory, mapCosts);
    const mapBlocked = workstation.level < 3
      ? "Workbench III map table required."
      : formatMissing(mapMissing);
    actions.push({
      id: "draft_region_map",
      label: "Draft Region Map",
      description: "1 Cipher Lens + 1 Pressurized Ink.",
      costs: mapCosts,
      missing: mapMissing,
      available: !mapBlocked,
      blockedReason: mapBlocked,
    });
  }

  const upgrade = nextWorkstationUpgrade(context.house?.workstation);
  if (upgrade) {
    const upgradeMissing = missingCosts(inventory, upgrade.costs);
    actions.push({
      id: `upgrade_workstation_${upgrade.level}`,
      label: upgrade.label,
      description: upgrade.description,
      costs: upgrade.costs,
      missing: upgradeMissing,
      available: Object.keys(upgradeMissing).length === 0,
      blockedReason: formatMissing(upgradeMissing),
    });
  }
  return actions;
}

export function resolveCraftingAction(actionId, context = {}, options = {}) {
  const inventory = clone(context.inventory || {});
  const progression = clone(context.progression || {});
  progression.equipment = normalizeGearState(progression.equipment);
  const house = clone(context.house || {});
  house.workstation = normalizeWorkstationState(house.workstation);
  const identity = normalizeCharacterIdentity(progression.identity);
  const rng = options.rng || Math.random;

  if (actionId === "craft_potion") {
    const costs = { Wood: 2, Stone: 1 };
    if (!canAfford(inventory, costs)) return { ok: false, message: "Workbench needs 2 Wood and 1 Stone.", inventory, progression, house };
    spend(inventory, costs);
    const effects = deriveAttributeEffects(identity);
    const bonus = rng() < (effects.craftingYieldPct || 0) / 100 ? 1 : 0;
    const baseYield = house.workstation.level >= 2 ? 2 : 1;
    inventory.Potion = count(inventory, "Potion") + baseYield + bonus;
    incrementWorkstation(house);
    if (house.workstation.level >= 2) {
      return { ok: true, message: bonus ? "Workbench II crafted 3 Potions with a Craft yield bonus." : "Workbench II crafted 2 Potions.", inventory, progression, house };
    }
    return { ok: true, message: bonus ? "Crafted 2 Potions with a Craft yield bonus." : "Crafted 1 Potion.", inventory, progression, house };
  }

  if (actionId.startsWith("equip_armor_")) {
    const pieceId = actionId.replace("equip_armor_", "");
    const piece = ARMOR_PIECES[pieceId];
    if (!piece || !(progression.equipment.ownedArmorPieces || []).includes(pieceId)) {
      return { ok: false, message: "No matching armor piece owned.", inventory, progression, house };
    }
    equipArmorPiece(progression, pieceId);
    incrementWorkstation(house);
    return { ok: true, message: `Equipped ${piece.label}.`, inventory, progression, house };
  }

  if (actionId === "prepare_refine_kit") {
    const costs = refineKitCosts(house.workstation);
    if (house.workstation.preparedUpgrade === "refine_weapon") {
      return { ok: false, message: "A refine kit is already prepared.", inventory, progression, house };
    }
    if (!canAfford(inventory, costs)) return { ok: false, message: "Workbench needs 2 Ashglass and 1 Scrap Coil.", inventory, progression, house };
    spend(inventory, costs);
    house.workstation.preparedUpgrade = "refine_weapon";
    incrementWorkstation(house);
    return { ok: true, message: "Prepared a refine kit for the next weapon upgrade.", inventory, progression, house };
  }

  if (actionId === "draft_region_map") {
    const costs = { "Cipher Lens": 1, "Pressurized Ink": 1 };
    if (house.workstation.level < 3) {
      return { ok: false, message: "Workbench III map table required.", inventory, progression, house };
    }
    if (house.workstation.stationProjects.includes("region_map")) {
      return { ok: false, message: "Region map already drafted.", inventory, progression, house };
    }
    if (!canAfford(inventory, costs)) {
      return { ok: false, message: "Map table needs 1 Cipher Lens and 1 Pressurized Ink.", inventory, progression, house };
    }
    spend(inventory, costs);
    house.workstation.stationProjects.push("region_map");
    incrementWorkstation(house);
    return { ok: true, message: "Drafted a Region Map at the map table.", inventory, progression, house };
  }

  if (actionId.startsWith("fit_weapon_")) {
    const familyId = actionId.replace("fit_weapon_", "");
    const tokens = progression.equipment.weaponFamilyTokens || [];
    const family = WEAPON_FAMILIES[familyId];
    if (!family || !tokens.includes(familyId)) {
      return { ok: false, message: "No matching weapon-family token owned.", inventory, progression, house };
    }
    equipWeaponFamily(progression, familyId);
    progression.equipment.weaponFamilyTokens = tokens;
    incrementWorkstation(house);
    return { ok: true, message: `Fitted ${family.label} weapon family.`, inventory, progression, house };
  }

  if (actionId.startsWith("unlock_weapon_branch_")) {
    const familyId = actionId.replace("unlock_weapon_branch_", "");
    const branch = WEAPON_BRANCHES[familyId];
    if (!branch || progression.equipment.weaponFamily !== familyId) {
      return { ok: false, message: "Weapon branch does not match the fitted family.", inventory, progression, house };
    }
    if (progression.equipment.weaponBranches?.[familyId]) {
      return { ok: false, message: `${branch.label} is already unlocked.`, inventory, progression, house };
    }
    if (!canAfford(inventory, branch.costs)) {
      return { ok: false, message: `${branch.label} branch needs more materials.`, inventory, progression, house };
    }
    spend(inventory, branch.costs);
    progression.equipment.weaponBranches = {
      ...(progression.equipment.weaponBranches || {}),
      [familyId]: true,
    };
    incrementWorkstation(house);
    return { ok: true, message: `Unlocked ${branch.label} branch for ${WEAPON_FAMILIES[familyId].label}.`, inventory, progression, house };
  }

  if (actionId.startsWith("upgrade_workstation_")) {
    const level = Number(actionId.replace("upgrade_workstation_", ""));
    const upgrade = WORKSTATION_UPGRADES[level];
    if (!upgrade || level !== house.workstation.level + 1) {
      return { ok: false, message: "Workbench cannot jump to that level.", inventory, progression, house };
    }
    if (!canAfford(inventory, upgrade.costs)) {
      return { ok: false, message: `${upgrade.label} needs more materials.`, inventory, progression, house };
    }
    spend(inventory, upgrade.costs);
    house.workstation.level = level;
    incrementWorkstation(house);
    return { ok: true, message: `Workbench upgraded to level ${level}.`, inventory, progression, house };
  }

  return { ok: false, message: "Unknown crafting action.", inventory, progression, house };
}
