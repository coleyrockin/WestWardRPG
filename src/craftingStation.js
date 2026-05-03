import { ARMOR_PIECES, WEAPON_FAMILIES, normalizeGearState } from "./gearCrafting.js";
import { equipArmorPiece, equipWeaponFamily } from "./progressionSystem.js";
import { deriveAttributeEffects, normalizeCharacterIdentity } from "./characterIdentity.js";

export function createInitialWorkstationState() {
  return {
    level: 1,
    craftsCompleted: 0,
    preparedUpgrade: null,
  };
}

export function normalizeWorkstationState(source = {}) {
  return {
    level: Number.isFinite(source?.level) ? Math.max(1, Math.min(3, Math.floor(source.level))) : 1,
    craftsCompleted: Number.isFinite(source?.craftsCompleted) ? Math.max(0, Math.floor(source.craftsCompleted)) : 0,
    preparedUpgrade: typeof source?.preparedUpgrade === "string" ? source.preparedUpgrade : null,
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

export function getAvailableCraftingActions(context = {}) {
  const inventory = context.inventory || {};
  const progression = context.progression || {};
  const equipment = normalizeGearState(progression.equipment);
  const actions = [];

  if (canAfford(inventory, { Wood: 2, Stone: 1 })) {
    actions.push({ id: "craft_potion", label: "Craft Potion", description: "2 Wood + 1 Stone." });
  }
  if ((equipment.ownedArmorPieces || []).includes("salvage_gloves") && equipment.armorSlots?.hands !== "salvage_gloves") {
    actions.push({ id: "fit_salvage_gloves", label: "Fit Salvage Gloves", description: "Equip owned Craft gloves." });
  }
  for (const familyId of equipment.weaponFamilyTokens || []) {
    const family = WEAPON_FAMILIES[familyId];
    if (family && equipment.weaponFamily !== familyId) {
      actions.push({ id: `fit_weapon_${familyId}`, label: `Fit ${family.label}`, description: `Spend ${family.label} token and change weapon family.` });
    }
  }
  if (canAfford(inventory, { Ashglass: 2, "Scrap Coil": 1 }) && context.house?.workstation?.preparedUpgrade !== "refine_weapon") {
    actions.push({ id: "prepare_refine_kit", label: "Prepare Refine Kit", description: "2 Ashglass + 1 Scrap Coil." });
  }
  const upgrade = nextWorkstationUpgrade(context.house?.workstation);
  if (upgrade && canAfford(inventory, upgrade.costs)) {
    actions.push({ id: `upgrade_workstation_${upgrade.level}`, label: upgrade.label, description: upgrade.description });
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
    inventory.Potion = count(inventory, "Potion") + 1 + bonus;
    incrementWorkstation(house);
    return { ok: true, message: bonus ? "Crafted 2 Potions with a Craft yield bonus." : "Crafted 1 Potion.", inventory, progression, house };
  }

  if (actionId === "fit_salvage_gloves") {
    if (!(progression.equipment.ownedArmorPieces || []).includes("salvage_gloves")) {
      return { ok: false, message: "No Salvage Gloves owned.", inventory, progression, house };
    }
    equipArmorPiece(progression, "salvage_gloves");
    incrementWorkstation(house);
    return { ok: true, message: `Fitted ${ARMOR_PIECES.salvage_gloves.label}.`, inventory, progression, house };
  }

  if (actionId === "prepare_refine_kit") {
    const costs = { Ashglass: 2, "Scrap Coil": 1 };
    if (house.workstation.preparedUpgrade === "refine_weapon") {
      return { ok: false, message: "A refine kit is already prepared.", inventory, progression, house };
    }
    if (!canAfford(inventory, costs)) return { ok: false, message: "Workbench needs 2 Ashglass and 1 Scrap Coil.", inventory, progression, house };
    spend(inventory, costs);
    house.workstation.preparedUpgrade = "refine_weapon";
    incrementWorkstation(house);
    return { ok: true, message: "Prepared a refine kit for the next weapon upgrade.", inventory, progression, house };
  }

  if (actionId.startsWith("fit_weapon_")) {
    const familyId = actionId.replace("fit_weapon_", "");
    const tokens = progression.equipment.weaponFamilyTokens || [];
    const family = WEAPON_FAMILIES[familyId];
    if (!family || !tokens.includes(familyId)) {
      return { ok: false, message: "No matching weapon-family token owned.", inventory, progression, house };
    }
    equipWeaponFamily(progression, familyId);
    progression.equipment.weaponFamilyTokens = tokens.filter((token) => token !== familyId);
    incrementWorkstation(house);
    return { ok: true, message: `Fitted ${family.label} weapon family.`, inventory, progression, house };
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
