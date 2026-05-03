import { describe, it, expect } from "vitest";
import {
  equipArmorPiece,
  equipWeaponFamily,
  createInitialProgressionState,
  unlockSkill,
  upgradeWeaponTier,
  addArmorModifier,
  buildProgressionModifiers,
  resolveIdeologyTraits,
} from "../src/progressionSystem.js";
import { createInitialCharacterIdentity } from "../src/characterIdentity.js";
import { createInitialNarrativeState } from "../src/decisionEngine.js";

describe("progressionSystem", () => {
  it("unlocks skills when upgrade points are available", () => {
    const progression = createInitialProgressionState();
    progression.upgradePoints = 2;
    const ok = unlockSkill(progression, "combat");
    expect(ok).toBe(true);
    expect(progression.skillTree.combat).toBe(1);
    expect(progression.upgradePoints).toBe(1);
  });

  it("advances weapon tiers in order", () => {
    const progression = createInitialProgressionState();
    expect(upgradeWeaponTier(progression)).toBe(true);
    expect(progression.equipment.weaponTier).toBe("Refined");
    expect(upgradeWeaponTier(progression)).toBe(true);
    expect(progression.equipment.weaponTier).toBe("Relic");
    expect(upgradeWeaponTier(progression)).toBe(false);
  });

  it("applies armor modifiers to progression bonuses", () => {
    const progression = createInitialProgressionState();
    addArmorModifier(progression, "stamina_regen");
    addArmorModifier(progression, "weather_resistance");
    const mods = buildProgressionModifiers(progression);
    expect(mods.staminaRegenBonus).toBeGreaterThan(0);
    expect(mods.weatherPenaltyReduction).toBeGreaterThan(0);
  });

  it("applies weapon families and armor slots to progression modifiers", () => {
    const progression = createInitialProgressionState();
    progression.identity = createInitialCharacterIdentity("ash_salvager");

    expect(equipWeaponFamily(progression, "spear")).toBe(true);
    expect(equipArmorPiece(progression, "iron_duster")).toBe(true);
    expect(equipWeaponFamily(progression, "missing")).toBe(false);
    expect(equipArmorPiece(progression, "missing")).toBe(false);

    const mods = buildProgressionModifiers(progression);
    expect(progression.equipment.weaponFamily).toBe("spear");
    expect(progression.equipment.armorSlots.body).toBe("iron_duster");
    expect(mods.weaponReachMult).toBeGreaterThan(1);
    expect(mods.armorWeight).toBeGreaterThan(0);
    expect(mods.refineCostMult).toBeLessThan(1);
  });

  it("resolves ideology traits from narrative axes", () => {
    const narrative = createInitialNarrativeState();
    narrative.thematicAxes.controlVsFreedom = -20;
    narrative.thematicAxes.truthVsComfort = 18;
    const traits = resolveIdeologyTraits(narrative);
    expect(traits).toEqual(expect.arrayContaining(["freedom_strider", "truthseeker"]));
  });
});
