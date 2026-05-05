const INITIAL_INVENTORY = {
  "Crystal Shard": 0,
  Wood: 0,
  Stone: 0,
  Potion: 2,
  "Slime Core": 0,
  Ashglass: 0,
  "Scrap Coil": 0,
  "Heat Resin": 0,
  "Lantern Filament": 0,
  "Cipher Lens": 0,
  "Pressurized Ink": 0,
  "Map Scrap": 0,
  "Worn Badge": 0,
  "Sealed Note": 0,
  "Iron Ore": 0,
  "Miner Helmet": 0,
};

const ROUTINE_RESOURCE_NAMES = new Set([
  "Crystal Shard",
  "Wood",
  "Stone",
  "Potion",
  "Slime Core",
  "Ashglass",
  "Scrap Coil",
  "Heat Resin",
  "Lantern Filament",
  "Cipher Lens",
  "Pressurized Ink",
  "Iron Ore",
]);

function cleanCount(value) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : null;
}

export function createInitialInventoryState() {
  return { ...INITIAL_INVENTORY };
}

export function normalizeInventoryState(inventory = {}) {
  const next = createInitialInventoryState();
  if (!inventory || typeof inventory !== "object" || Array.isArray(inventory)) {
    return next;
  }
  for (const [name, value] of Object.entries(inventory)) {
    if (typeof name !== "string" || !name.trim()) continue;
    const count = cleanCount(value);
    if (count === null || count <= 0) {
      if (!(name in next)) delete next[name];
      continue;
    }
    next[name] = count;
  }
  return next;
}

export function getNotableInventorySummary(inventory = {}) {
  const normalized = normalizeInventoryState(inventory);
  const items = Object.entries(normalized)
    .filter(([name, count]) => count > 0 && !ROUTINE_RESOURCE_NAMES.has(name))
    .map(([name, count]) => ({
      name,
      count,
      line: `${count} ${name}`,
    }));

  return {
    count: items.length,
    items,
    line: items.length > 0 ? items.map((item) => item.line).join(", ") : "No notable story loot yet.",
  };
}
