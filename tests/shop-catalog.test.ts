import { describe, expect, it } from "vitest";
import {
  SHOP_CATALOGS,
  buildShopView,
  applyTrade,
} from "../src/shopCatalog.js";
import { createInitialInventoryState } from "../src/inventoryState.js";

// Canonical item names from inventoryState.js — used to validate catalog integrity.
const KNOWN_ITEM_NAMES = new Set(Object.keys(createInitialInventoryState()));

describe("shopCatalog — catalog integrity", () => {
  it("SHOP_CATALOGS has merchant and tradingPost keys", () => {
    expect(Object.keys(SHOP_CATALOGS)).toContain("merchant");
    expect(Object.keys(SHOP_CATALOGS)).toContain("tradingPost");
  });

  it("every catalog item name is a real inventoryState name", () => {
    for (const [vendorId, rows] of Object.entries(SHOP_CATALOGS)) {
      for (const row of rows as any[]) {
        expect(
          KNOWN_ITEM_NAMES.has(row.item),
          `"${row.item}" in ${vendorId} catalog is not a known inventory name`,
        ).toBe(true);
      }
    }
  });

  it("sell/buy spread ≤ 45% where both exist (sell ≤ 45% of buy)", () => {
    for (const [vendorId, rows] of Object.entries(SHOP_CATALOGS)) {
      for (const row of rows as any[]) {
        if (row.buy != null && row.sell != null) {
          const ratio = row.sell / row.buy;
          expect(
            ratio,
            `${vendorId} "${row.item}": sell/buy ratio ${ratio.toFixed(2)} exceeds 0.45`,
          ).toBeLessThanOrEqual(0.45);
        }
      }
    }
  });

  it("every row has at least one non-null price (buy or sell)", () => {
    for (const [vendorId, rows] of Object.entries(SHOP_CATALOGS)) {
      for (const row of rows as any[]) {
        expect(
          row.buy != null || row.sell != null,
          `${vendorId} "${row.item}" has both buy and sell null`,
        ).toBe(true);
      }
    }
  });

  it("Potion appears in both catalogs with a buy price", () => {
    const merchantPotion = (SHOP_CATALOGS.merchant as any[]).find((r) => r.item === "Potion");
    const tpPotion = (SHOP_CATALOGS.tradingPost as any[]).find((r) => r.item === "Potion");
    expect(merchantPotion?.buy).toBeGreaterThan(0);
    expect(tpPotion?.buy).toBeGreaterThan(0);
  });
});

describe("buildShopView", () => {
  it("returns empty rows for unknown vendor", () => {
    const view = buildShopView({ vendorId: "ghost", inventory: {}, gold: 100 });
    expect(view.rows).toHaveLength(0);
    expect(view.vendorId).toBe("ghost");
  });

  it("canBuy is true only when gold >= buy price and buy is non-null", () => {
    const view = buildShopView({ vendorId: "merchant", inventory: {}, gold: 13 });
    const potionRow = view.rows.find((r) => r.item === "Potion");
    expect(potionRow).toBeDefined();
    // Potion buy = 14; gold = 13 → can't buy
    expect(potionRow?.canBuy).toBe(false);

    const viewRich = buildShopView({ vendorId: "merchant", inventory: {}, gold: 14 });
    const potionRich = viewRich.rows.find((r) => r.item === "Potion");
    expect(potionRich?.canBuy).toBe(true);
  });

  it("canBuy is false for sell-only rows regardless of gold", () => {
    const view = buildShopView({ vendorId: "merchant", inventory: {}, gold: 9999 });
    const slimeRow = view.rows.find((r) => r.item === "Slime Core");
    expect(slimeRow).toBeDefined();
    expect(slimeRow?.buy).toBeNull();
    expect(slimeRow?.canBuy).toBe(false);
  });

  it("canSell is true only when sell is non-null and owned > 0", () => {
    const viewEmpty = buildShopView({ vendorId: "merchant", inventory: {}, gold: 0 });
    const slimeRowEmpty = viewEmpty.rows.find((r) => r.item === "Slime Core");
    expect(slimeRowEmpty?.canSell).toBe(false);

    const viewOwned = buildShopView({ vendorId: "merchant", inventory: { "Slime Core": 2 }, gold: 0 });
    const slimeRowOwned = viewOwned.rows.find((r) => r.item === "Slime Core");
    expect(slimeRowOwned?.owned).toBe(2);
    expect(slimeRowOwned?.canSell).toBe(true);
  });

  it("owned reflects inventory count correctly", () => {
    const view = buildShopView({
      vendorId: "merchant",
      inventory: { "Potion": 3, "Stone": 5 },
      gold: 50,
    });
    const potionRow = view.rows.find((r) => r.item === "Potion");
    const stoneRow = view.rows.find((r) => r.item === "Stone");
    expect(potionRow?.owned).toBe(3);
    expect(stoneRow?.owned).toBe(5);
  });

  it("tradingPost has Heat Resin row; merchant does not", () => {
    const merchantView = buildShopView({ vendorId: "merchant", inventory: {}, gold: 0 });
    const tpView = buildShopView({ vendorId: "tradingPost", inventory: {}, gold: 0 });
    expect(merchantView.rows.find((r) => r.item === "Heat Resin")).toBeUndefined();
    expect(tpView.rows.find((r) => r.item === "Heat Resin")).toBeDefined();
  });
});

describe("applyTrade — rejection table", () => {
  it("rejects unknown vendor", () => {
    const result = applyTrade({ vendorId: "ghost", item: "Potion", mode: "buy", inventory: {}, gold: 100 });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/unknown vendor/i);
    expect(result.goldDelta).toBe(0);
    expect(result.itemDelta).toBe(0);
  });

  it("rejects item not in catalog", () => {
    const result = applyTrade({ vendorId: "merchant", item: "Pressurized Ink", mode: "sell", inventory: { "Pressurized Ink": 1 }, gold: 0 });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/not in/i);
  });

  it("rejects buy when gold short by 1", () => {
    // Potion buy = 14
    const result = applyTrade({ vendorId: "merchant", item: "Potion", mode: "buy", inventory: {}, gold: 13 });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/not enough gold/i);
  });

  it("rejects sell when owned = 0", () => {
    const result = applyTrade({ vendorId: "merchant", item: "Slime Core", mode: "sell", inventory: {}, gold: 0 });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/no slime core/i);
  });

  it("rejects buy on a sell-only item", () => {
    const result = applyTrade({ vendorId: "merchant", item: "Slime Core", mode: "buy", inventory: {}, gold: 9999 });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/not available for purchase/i);
  });

  it("rejects unknown mode", () => {
    const result = applyTrade({ vendorId: "merchant", item: "Potion", mode: "barter" as any, inventory: {}, gold: 100 });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/unknown trade mode/i);
  });
});

describe("applyTrade — happy paths", () => {
  it("buy: goldDelta = -buy price, itemDelta = +1", () => {
    // Potion buy = 14
    const result = applyTrade({ vendorId: "merchant", item: "Potion", mode: "buy", inventory: {}, gold: 14 });
    expect(result.ok).toBe(true);
    expect(result.goldDelta).toBe(-14);
    expect(result.itemDelta).toBe(1);
    expect(result.reason).toBeNull();
  });

  it("sell: goldDelta = +sell price, itemDelta = -1", () => {
    // Slime Core sell = 5 at merchant
    const result = applyTrade({ vendorId: "merchant", item: "Slime Core", mode: "sell", inventory: { "Slime Core": 1 }, gold: 0 });
    expect(result.ok).toBe(true);
    expect(result.goldDelta).toBe(5);
    expect(result.itemDelta).toBe(-1);
    expect(result.reason).toBeNull();
  });

  it("tradingPost pays better sell price on Slime Core than merchant", () => {
    const merchant = applyTrade({ vendorId: "merchant", item: "Slime Core", mode: "sell", inventory: { "Slime Core": 1 }, gold: 0 });
    const tradingPost = applyTrade({ vendorId: "tradingPost", item: "Slime Core", mode: "sell", inventory: { "Slime Core": 1 }, gold: 0 });
    expect(merchant.ok).toBe(true);
    expect(tradingPost.ok).toBe(true);
    expect(tradingPost.goldDelta).toBeGreaterThan(merchant.goldDelta);
  });

  it("does not mutate inventory or gold inputs", () => {
    const inventory = { Potion: 2 };
    const gold = 50;
    applyTrade({ vendorId: "merchant", item: "Potion", mode: "buy", inventory, gold });
    expect(inventory).toEqual({ Potion: 2 });
    // gold is a primitive — pass-by-value, can't be mutated
  });
});
