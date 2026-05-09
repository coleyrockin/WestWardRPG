import { describe, it, expect } from "vitest";
import { isNewGamePlusEligible, extractCarryForward, applyCarryForward, resolveNgPlusHpMult, NG_PLUS_ENEMY_HP_MULT } from "../src/newGamePlus.js";

describe("newGamePlus — eligibility", () => {
  it("eligible when runStats.victory is true", () => {
    expect(isNewGamePlusEligible({ victory: true })).toBe(true);
  });

  it("not eligible when runStats.victory is false", () => {
    expect(isNewGamePlusEligible({ victory: false })).toBe(false);
  });

  it("not eligible when runStats is null", () => {
    expect(isNewGamePlusEligible(null)).toBe(false);
  });
});

describe("newGamePlus — carry-forward extraction", () => {
  const progression = {
    ngPlusLevel: 0,
    upgradePoints: 5,
    skillTree: { combat: 2 },
    equipment: { weaponTier: "Refined", armorMods: ["endurance"] },
    traits: ["grit"],
    identity: { originId: "ash_salvager" },
  };
  const player = { gold: 200 };

  it("increments ngPlusLevel", () => {
    const carry = extractCarryForward(progression, player);
    expect(carry.ngPlusLevel).toBe(1);
  });

  it("carries forward upgradePoints, weaponTier, armorMods, traits, originId", () => {
    const carry = extractCarryForward(progression, player);
    expect(carry.upgradePoints).toBe(5);
    expect(carry.weaponTier).toBe("Refined");
    expect(carry.armorMods).toContain("endurance");
    expect(carry.traits).toContain("grit");
    expect(carry.originId).toBe("ash_salvager");
  });

  it("carries 25% of player gold", () => {
    const carry = extractCarryForward(progression, player);
    expect(carry.goldBonus).toBe(50);
  });
});

describe("newGamePlus — apply carry-forward", () => {
  it("applies ngPlusLevel and upgradePoints to fresh progression", () => {
    const prog: any = { upgradePoints: 0, skillTree: {}, traits: [], equipment: {}, identity: {} };
    applyCarryForward(prog, { ngPlusLevel: 2, upgradePoints: 3, skillTree: { combat: 1 }, traits: ["iron"], armorMods: [], originId: "frontier_hand" });
    expect(prog.ngPlusLevel).toBe(2);
    expect(prog.upgradePoints).toBe(3);
  });

  it("merges traits without duplicates", () => {
    const prog = { upgradePoints: 0, skillTree: {}, traits: ["iron"], equipment: {}, identity: {} };
    applyCarryForward(prog, { traits: ["iron", "grit"], upgradePoints: 0, skillTree: {}, armorMods: [], originId: null, ngPlusLevel: 1 });
    expect(prog.traits.filter((t: string) => t === "iron")).toHaveLength(1);
    expect(prog.traits).toContain("grit");
  });

  it("handles null carry gracefully", () => {
    const prog = { upgradePoints: 5, skillTree: {}, traits: [], equipment: {}, identity: {} };
    applyCarryForward(prog, null);
    expect(prog.upgradePoints).toBe(5);
  });
});

describe("newGamePlus — HP multiplier", () => {
  it("returns 1.0 for level 0", () => {
    expect(resolveNgPlusHpMult(0)).toBeCloseTo(1.0);
  });

  it("returns 1 + N * 0.25 for level N", () => {
    expect(resolveNgPlusHpMult(1)).toBeCloseTo(1 + NG_PLUS_ENEMY_HP_MULT);
    expect(resolveNgPlusHpMult(2)).toBeCloseTo(1 + 2 * NG_PLUS_ENEMY_HP_MULT);
  });
});
