import { describe, expect, it } from "vitest";
import { createInitialCharacterIdentity, normalizeCharacterIdentity } from "../src/characterIdentity.js";
import {
  ARMOR_PIECES,
  DEFAULT_ARMOR_SLOTS,
  WEAPON_FAMILIES,
  buildGearSummary,
  normalizeGearState,
  resolveArmorSlotEffects,
  resolveCraftingEconomy,
  resolveWeaponFamilyEffects,
} from "../src/gearCrafting.js";

describe("gearCrafting", () => {
  it("normalizes weapon families, armor slots, mods, and affixes", () => {
    const gear = normalizeGearState({
      weaponTier: "Relic",
      weaponFamily: "missing",
      armorMods: ["stamina_regen"],
      armorSlots: { body: "iron_duster", feet: "missing_piece", unknown: "ash_mask" },
      affixes: ["searing"],
    });

    expect(gear.weaponTier).toBe("Relic");
    expect(gear.weaponFamily).toBe("saber");
    expect(gear.armorMods).toEqual(["stamina_regen"]);
    expect(gear.affixes).toEqual(["searing"]);
    expect(gear.armorSlots.body).toBe("iron_duster");
    expect(gear.armorSlots.feet).toBe(DEFAULT_ARMOR_SLOTS.feet);
    expect(gear.armorSlots).not.toHaveProperty("unknown");
  });

  it("lets Might make heavy weapon families less exhausting and more damaging", () => {
    const hammer = normalizeGearState({ weaponFamily: "hammer" });
    const weak = normalizeCharacterIdentity({ attributes: { might: 1, grit: 2, craft: 2 } });
    const strong = normalizeCharacterIdentity({ attributes: { might: 8, grit: 2, craft: 2 } });

    const weakEffects = resolveWeaponFamilyEffects(hammer, weak);
    const strongEffects = resolveWeaponFamilyEffects(hammer, strong);

    expect(WEAPON_FAMILIES.hammer.weight).toBeGreaterThan(WEAPON_FAMILIES.saber.weight);
    expect(strongEffects.staminaMult).toBeLessThan(weakEffects.staminaMult);
    expect(strongEffects.damageMult).toBeGreaterThan(weakEffects.damageMult);
  });

  it("lets Grit absorb armor weight", () => {
    const armored = normalizeGearState({ armorSlots: { body: "iron_duster", feet: "trail_boots" } });
    const lowGrit = normalizeCharacterIdentity({ attributes: { grit: 1 } });
    const highGrit = normalizeCharacterIdentity({ attributes: { grit: 8 } });

    const lowEffects = resolveArmorSlotEffects(armored, lowGrit);
    const highEffects = resolveArmorSlotEffects(armored, highGrit);

    expect(ARMOR_PIECES.iron_duster.weight).toBeGreaterThan(ARMOR_PIECES.travel_duster.weight);
    expect(lowEffects.totalWeight).toBeGreaterThan(0);
    expect(highEffects.staminaCostMult).toBeLessThan(lowEffects.staminaCostMult);
  });

  it("lets Craft lower repair/refine costs and improve crafting yield", () => {
    const lowCraft = normalizeCharacterIdentity({ attributes: { craft: 1 } });
    const highCraft = createInitialCharacterIdentity("ash_salvager");

    const lowEconomy = resolveCraftingEconomy(lowCraft);
    const highEconomy = resolveCraftingEconomy(highCraft);

    expect(highEconomy.repairCostMult).toBeLessThan(lowEconomy.repairCostMult);
    expect(highEconomy.refineCostMult).toBeLessThan(lowEconomy.refineCostMult);
    expect(highEconomy.craftingYieldPct).toBeGreaterThan(lowEconomy.craftingYieldPct);
  });

  it("builds a readable gear summary for sheets and automation state", () => {
    const gear = normalizeGearState({
      weaponTier: "Refined",
      weaponFamily: "spear",
      armorSlots: { body: "iron_duster", feet: "trail_boots" },
    });
    const summary = buildGearSummary(gear, createInitialCharacterIdentity("ash_salvager"));

    expect(summary.weaponLine).toContain("Refined Spear");
    expect(summary.armorLine).toContain("Iron Duster");
    expect(summary.armorWeight).toBeGreaterThan(0);
    expect(summary.economyLine).toContain("yield");
  });
});
