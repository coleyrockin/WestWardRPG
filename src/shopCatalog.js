// Pure vendor shop catalog — no DOM, no THREE.
//
// Economy knob: sell price ≈ 40% of buy price where both exist. This is the
// deficit-biased spread. Tighten it by raising the ratio; widen it (more
// punishing) by lowering it. The spread is intentionally asymmetric — the
// player cannot recoup buy price by reselling, so spending is a real loss.
//
// All item names are the exact canonical names from inventoryState.js.
// buy: null  → vendor does not sell this item (sell-only row).
// sell: null → vendor does not buy this item (buy-only row; rare).

const SELL_RATIO = 0.4; // sell ≈ 40% of buy — deficit-biased baseline

// Dustward Frontier shops:
//   "merchant"    → Reverend Quill's general store (Dustward Frontier)
//   "tradingPost" → Eastwater Ranch trading post (slightly better salvage prices)
export const SHOP_CATALOGS = Object.freeze({
  merchant: Object.freeze([
    // Consumable — both buy and sell
    { item: "Potion",            buy: 14,   sell: 6   },
    // Materials the player finds on the road — buy-price exists so the player
    // can restock if they burned a cache pull, but sell is the main loop.
    { item: "Stone",             buy: 5,    sell: 2   },
    { item: "Wood",              buy: 6,    sell: 2   },
    { item: "Slime Core",        buy: null, sell: 5   },
    { item: "Iron Ore",          buy: 8,    sell: 3   },
    { item: "Scrap Coil",        buy: null, sell: 4   },
    { item: "Ashglass",          buy: null, sell: 3   },
    { item: "Crystal Shard",     buy: null, sell: 8   },
    { item: "Map Scrap",         buy: null, sell: 2   },
  ]),

  // Eastwater Ranch trading post — ranch-flavored, salvage-forward identity.
  // Overlapping catalog but better sell prices on salvage items (their niche).
  // Does not stock Wood/Stone (town supplies, not ranch trade).
  tradingPost: Object.freeze([
    { item: "Potion",            buy: 16,   sell: 6   },
    { item: "Slime Core",        buy: null, sell: 7   },  // +2 vs merchant
    { item: "Scrap Coil",        buy: null, sell: 6   },  // +2 vs merchant
    { item: "Ashglass",          buy: null, sell: 5   },  // +2 vs merchant
    { item: "Iron Ore",          buy: 9,    sell: 4   },
    { item: "Crystal Shard",     buy: null, sell: 10  },  // +2 vs merchant
    { item: "Heat Resin",        buy: null, sell: 5   },  // ranch-specific
    { item: "Worn Badge",        buy: null, sell: 3   },  // bounty salvage
    { item: "Map Scrap",         buy: null, sell: 3   },
  ]),
});

// Resolved set of known vendor ids — used for rejection guards.
const KNOWN_VENDORS = new Set(Object.keys(SHOP_CATALOGS));

// Index: vendorId → Map<itemName, row>
function buildIndex(vendorId) {
  const map = new Map();
  for (const row of SHOP_CATALOGS[vendorId]) {
    map.set(row.item, row);
  }
  return map;
}

const CATALOG_INDEX = Object.fromEntries(
  Object.keys(SHOP_CATALOGS).map((id) => [id, buildIndex(id)]),
);

// buildShopView({ vendorId, inventory, gold })
//   → { vendorId, rows: [{ item, buy, sell, owned, canBuy, canSell }] }
//
// Pure read — no mutation. Caller provides inventory as { [name]: count } and
// gold as a number. canBuy requires buy price available AND player can afford it.
// canSell requires sell price available AND player owns ≥1.
export function buildShopView({ vendorId, inventory = {}, gold = 0 } = {}) {
  const catalog = SHOP_CATALOGS[vendorId];
  if (!catalog) {
    return { vendorId, rows: [] };
  }
  const g = Math.max(0, Math.floor(Number.isFinite(gold) ? gold : 0));
  const rows = catalog.map((row) => {
    const owned = Math.max(0, Math.floor(Number.isFinite(inventory[row.item]) ? inventory[row.item] : 0));
    return {
      item: row.item,
      buy: row.buy,
      sell: row.sell,
      owned,
      canBuy: row.buy != null && g >= row.buy,
      canSell: row.sell != null && owned > 0,
    };
  });
  return { vendorId, rows };
}

// applyTrade({ vendorId, item, mode /* "buy" | "sell" */, inventory, gold })
//   → { ok, goldDelta, itemDelta, reason }
//
// Pure validation — returns deltas, never mutates. goldDelta is negative for a
// buy (player spends) and positive for a sell (player earns). itemDelta is the
// inverse (+1 buy, -1 sell). Callers apply deltas via grantGold / inventory
// mutations.
export function applyTrade({ vendorId, item, mode, inventory = {}, gold = 0 } = {}) {
  if (!KNOWN_VENDORS.has(vendorId)) {
    return { ok: false, goldDelta: 0, itemDelta: 0, reason: `Unknown vendor: ${vendorId}` };
  }
  const row = CATALOG_INDEX[vendorId].get(item);
  if (!row) {
    return { ok: false, goldDelta: 0, itemDelta: 0, reason: `Item not in ${vendorId} catalog: ${item}` };
  }
  const g = Math.max(0, Math.floor(Number.isFinite(gold) ? gold : 0));
  const owned = Math.max(0, Math.floor(Number.isFinite(inventory[item]) ? inventory[item] : 0));

  if (mode === "buy") {
    if (row.buy == null) {
      return { ok: false, goldDelta: 0, itemDelta: 0, reason: `${item} is not available for purchase at ${vendorId}` };
    }
    if (g < row.buy) {
      return { ok: false, goldDelta: 0, itemDelta: 0, reason: `Not enough gold (have ${g}, need ${row.buy})` };
    }
    return { ok: true, goldDelta: -row.buy, itemDelta: 1, reason: null };
  }

  if (mode === "sell") {
    if (row.sell == null) {
      return { ok: false, goldDelta: 0, itemDelta: 0, reason: `${item} cannot be sold at ${vendorId}` };
    }
    if (owned <= 0) {
      return { ok: false, goldDelta: 0, itemDelta: 0, reason: `No ${item} in inventory` };
    }
    return { ok: true, goldDelta: row.sell, itemDelta: -1, reason: null };
  }

  return { ok: false, goldDelta: 0, itemDelta: 0, reason: `Unknown trade mode: ${mode}` };
}
