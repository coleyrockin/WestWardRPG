import { describe, expect, it } from "vitest";
import { createInitialCharacterIdentity } from "../src/characterIdentity.js";
import {
  applyLootDropToState,
  createInitialLootState,
  normalizeLootState,
  rollLootDrop,
} from "../src/lootSystem.js";

describe("lootSystem", () => {
  it("rolls deterministic regional POI loot with an injectable rng", () => {
    const identity = createInitialCharacterIdentity("lantern_defector");
    const drop = rollLootDrop({
      source: "poi_cache",
      regionId: "ironlantern",
      playerLevel: 4,
      identity,
      rng: () => 0.1,
    });

    expect(drop.source).toBe("poi_cache");
    expect(drop.regionId).toBe("ironlantern");
    expect(drop.gold).toBeGreaterThan(0);
    expect(Object.keys(drop.items)).toContain("Cipher Lens");
    expect(drop.gear.armorPieces.length + drop.gear.weaponFamilyTokens.length).toBeGreaterThan(0);
    expect(drop.summary).toContain("Iron Lantern");
  });

  it("makes Lore improve rare gear findings without making drops random in tests", () => {
    const lowLore = createInitialCharacterIdentity("exiled_marshal");
    const highLore = createInitialCharacterIdentity("lantern_defector");

    const lowDrop = rollLootDrop({ source: "resource_find", regionId: "ironlantern", identity: lowLore, rng: () => 0.42 });
    const highDrop = rollLootDrop({ source: "resource_find", regionId: "ironlantern", identity: highLore, rng: () => 0.42 });

    expect(lowDrop.gear.weaponFamilyTokens).toEqual([]);
    expect(highDrop.gear.weaponFamilyTokens).toContain("spear");
  });

  it("applies loot to inventory, equipment unlocks, and loot history", () => {
    const lootState = createInitialLootState();
    const inventory = { Potion: 0, Ashglass: 0 };
    const progression = { equipment: { ownedArmorPieces: [], weaponFamilyTokens: [] } };
    const drop = {
      source: "mini_boss",
      regionId: "ashfall",
      gold: 25,
      items: { Ashglass: 2 },
      gear: { armorPieces: ["salvage_gloves"], weaponFamilyTokens: ["hammer"] },
      summary: "test drop",
    };

    const applied = applyLootDropToState({ lootState, inventory, progression, drop });

    expect(applied.gold).toBe(25);
    expect(inventory.Ashglass).toBe(2);
    expect(progression.equipment.ownedArmorPieces).toContain("salvage_gloves");
    expect(progression.equipment.weaponFamilyTokens).toContain("hammer");
    expect(lootState.recentDrops[0].summary).toBe("test drop");
  });

  it("normalizes saved loot state safely", () => {
    const state = normalizeLootState({ recentDrops: [{ summary: "old" }], totalDrops: 2, gearFinds: "bad" });
    expect(state.recentDrops).toHaveLength(1);
    expect(state.totalDrops).toBe(2);
    expect(state.gearFinds).toBe(0);
  });
});
