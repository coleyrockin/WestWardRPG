import { describe, expect, it } from "vitest";
import {
  createInitialInventoryState,
  getNotableInventorySummary,
  normalizeInventoryState,
} from "../src/inventoryState.js";

describe("inventoryState", () => {
  it("seeds authored story loot keys so POI rewards are visible and save-safe", () => {
    const inventory = createInitialInventoryState();

    expect(inventory).toMatchObject({
      "Map Scrap": 0,
      "Worn Badge": 0,
      "Sealed Note": 0,
      "Iron Ore": 0,
      "Miner Helmet": 0,
    });
  });

  it("preserves unknown positive item counts instead of dropping story loot", () => {
    const inventory = normalizeInventoryState({
      Potion: 1,
      "Map Scrap": 2,
      "Sunken Coach Letter": 1,
      "Broken Thing": -3,
      "Bad Count": Number.NaN,
    });

    expect(inventory.Potion).toBe(1);
    expect(inventory["Map Scrap"]).toBe(2);
    expect(inventory["Sunken Coach Letter"]).toBe(1);
    expect(inventory["Broken Thing"]).toBeUndefined();
    expect(inventory["Bad Count"]).toBeUndefined();
  });

  it("summarizes notable story loot without listing routine resources", () => {
    const summary = getNotableInventorySummary({
      Wood: 9,
      Potion: 2,
      "Map Scrap": 2,
      "Worn Badge": 1,
      "Sunken Coach Letter": 1,
    });

    expect(summary.items.map((item) => item.name)).toEqual([
      "Map Scrap",
      "Worn Badge",
      "Sunken Coach Letter",
    ]);
    expect(summary.line).toContain("2 Map Scrap");
    expect(summary.line).toContain("Sunken Coach Letter");
  });
});
