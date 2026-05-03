import { deriveAttributeEffects, normalizeCharacterIdentity } from "./characterIdentity.js";

const REGION_LABELS = {
  frontier: "Frontier",
  ashfall: "Ashfall",
  ironlantern: "Iron Lantern",
};

const REGION_ITEMS = {
  frontier: { common: "Wood", refine: "Ashglass", rareArmor: "ash_mask", rareWeapon: "axe" },
  ashfall: { common: "Heat Resin", refine: "Scrap Coil", rareArmor: "salvage_gloves", rareWeapon: "hammer" },
  ironlantern: { common: "Lantern Filament", refine: "Cipher Lens", rareArmor: "lantern_charm", rareWeapon: "spear" },
};

const SOURCE_BASE = {
  poi_cache: { gold: 24, commonCount: 1, refineCount: 1, gearChance: 0.32 },
  poi_camp: { gold: 18, commonCount: 2, refineCount: 0, gearChance: 0.22 },
  mini_boss: { gold: 70, commonCount: 2, refineCount: 2, gearChance: 0.72 },
  resource_find: { gold: 4, commonCount: 1, refineCount: 0, gearChance: 0.08 },
};

export function createInitialLootState() {
  return {
    recentDrops: [],
    totalDrops: 0,
    gearFinds: 0,
  };
}

export function normalizeLootState(source = {}) {
  const recentDrops = Array.isArray(source?.recentDrops)
    ? source.recentDrops
      .filter((drop) => drop && typeof drop === "object")
      .slice(0, 8)
      .map((drop) => ({
        source: typeof drop.source === "string" ? drop.source : "unknown",
        regionId: typeof drop.regionId === "string" ? drop.regionId : "frontier",
        summary: typeof drop.summary === "string" ? drop.summary : "Loot found",
      }))
    : [];
  return {
    recentDrops,
    totalDrops: Number.isFinite(source?.totalDrops) ? Math.max(0, Math.floor(source.totalDrops)) : 0,
    gearFinds: Number.isFinite(source?.gearFinds) ? Math.max(0, Math.floor(source.gearFinds)) : 0,
  };
}

function addItem(items, name, count) {
  if (!name || !Number.isFinite(count) || count <= 0) return;
  items[name] = (items[name] || 0) + Math.floor(count);
}

export function rollLootDrop({ source = "resource_find", regionId = "frontier", playerLevel = 1, identity = null, rng = Math.random } = {}) {
  const table = REGION_ITEMS[regionId] || REGION_ITEMS.frontier;
  const sourceBase = SOURCE_BASE[source] || SOURCE_BASE.resource_find;
  const safeIdentity = normalizeCharacterIdentity(identity);
  const effects = deriveAttributeEffects(safeIdentity);
  const loreBonus = (effects.loreDiscoveryPct || 0) / 100;
  const loreFindBonus = loreBonus * 6;
  const levelBonus = Math.max(0, Math.floor(playerLevel / 3));
  const items = {};

  addItem(items, table.common, sourceBase.commonCount);
  if (sourceBase.refineCount > 0) addItem(items, table.refine, sourceBase.refineCount);
  if (source === "resource_find" && regionId === "frontier") addItem(items, "Stone", 1);

  const gear = { armorPieces: [], weaponFamilyTokens: [] };
  const gearRoll = rng();
  if (gearRoll < sourceBase.gearChance + loreFindBonus) {
    if (gearRoll < 0.18 + loreBonus * 5) {
      gear.weaponFamilyTokens.push(table.rareWeapon);
    } else {
      gear.armorPieces.push(table.rareArmor);
    }
  }

  const gold = Math.max(0, Math.round(sourceBase.gold + levelBonus * 3 + (rng() * 6)));
  const regionLabel = REGION_LABELS[regionId] || REGION_LABELS.frontier;
  const itemLine = Object.entries(items).map(([name, count]) => `${count} ${name}`).join(", ");
  const gearLine = [
    ...gear.armorPieces.map((id) => `armor:${id}`),
    ...gear.weaponFamilyTokens.map((id) => `weapon:${id}`),
  ].join(", ");

  return {
    source,
    regionId,
    gold,
    items,
    gear,
    summary: `${regionLabel} ${source.replaceAll("_", " ")}: +${gold}g${itemLine ? `, ${itemLine}` : ""}${gearLine ? `, ${gearLine}` : ""}`,
  };
}

function pushUnique(list, value) {
  if (!value || list.includes(value)) return false;
  list.push(value);
  return true;
}

export function applyLootDropToState({ lootState, inventory, progression, drop }) {
  const safeLoot = normalizeLootState(lootState);
  Object.assign(lootState, safeLoot);
  const equipment = progression.equipment || {};
  if (!Array.isArray(equipment.ownedArmorPieces)) equipment.ownedArmorPieces = [];
  if (!Array.isArray(equipment.weaponFamilyTokens)) equipment.weaponFamilyTokens = [];

  for (const [name, count] of Object.entries(drop.items || {})) {
    inventory[name] = Math.max(0, Math.floor(inventory[name] || 0)) + Math.max(0, Math.floor(count || 0));
  }

  let gearFinds = 0;
  for (const pieceId of drop.gear?.armorPieces || []) {
    if (pushUnique(equipment.ownedArmorPieces, pieceId)) gearFinds += 1;
  }
  for (const familyId of drop.gear?.weaponFamilyTokens || []) {
    if (pushUnique(equipment.weaponFamilyTokens, familyId)) gearFinds += 1;
  }

  lootState.totalDrops += 1;
  lootState.gearFinds += gearFinds;
  lootState.recentDrops.unshift({
    source: drop.source,
    regionId: drop.regionId,
    summary: drop.summary,
  });
  lootState.recentDrops = lootState.recentDrops.slice(0, 8);
  progression.equipment = equipment;
  return { gold: Math.max(0, Math.floor(drop.gold || 0)), gearFinds };
}
