import { describe, it, expect } from "vitest";
import { canAttack, canDodge, resolveNextComboStep, resolveStaminaRegenRate, isInSwingArc, resolveEnemyStagger, BASE_COMBOS, DODGE_STAMINA_COST } from "../src/combatProcessor.js";

function makePlayer(overrides = {}) {
  return { stamina: 100, attackCooldown: 0, chargeAttackWindup: 0, blocking: false, guardBroken: false, dodgeCooldown: 0, ...overrides };
}

describe("combatProcessor — canAttack", () => {
  it("returns true when player is ready", () => {
    expect(canAttack(makePlayer())).toBe(true);
  });

  it("returns false when attackCooldown > 0", () => {
    expect(canAttack(makePlayer({ attackCooldown: 0.3 }))).toBe(false);
  });

  it("returns false when charging", () => {
    expect(canAttack(makePlayer({ chargeAttackWindup: 0.5 }))).toBe(false);
  });

  it("returns false when stamina below minimum", () => {
    expect(canAttack(makePlayer({ stamina: 3 }))).toBe(false);
  });

  it("respects custom minStamina", () => {
    expect(canAttack(makePlayer({ stamina: 5 }), 4)).toBe(true);
    expect(canAttack(makePlayer({ stamina: 3 }), 4)).toBe(false);
  });
});

describe("combatProcessor — canDodge", () => {
  it("returns true when ready", () => {
    expect(canDodge(makePlayer({ stamina: DODGE_STAMINA_COST }))).toBe(true);
  });

  it("returns false when dodgeCooldown > 0", () => {
    expect(canDodge(makePlayer({ dodgeCooldown: 0.3 }))).toBe(false);
  });

  it("returns false when guard broken", () => {
    expect(canDodge(makePlayer({ guardBroken: true }))).toBe(false);
  });

  it("returns false when stamina too low", () => {
    expect(canDodge(makePlayer({ stamina: DODGE_STAMINA_COST - 1 }))).toBe(false);
  });
});

describe("combatProcessor — resolveNextComboStep", () => {
  it("resets to 1 when comboWindow is 0", () => {
    expect(resolveNextComboStep(2, 0)).toBe(1);
  });

  it("advances step while window is open", () => {
    expect(resolveNextComboStep(1, 0.5)).toBe(2);
    expect(resolveNextComboStep(2, 0.5)).toBe(3);
  });

  it("wraps back to 1 after last step", () => {
    expect(resolveNextComboStep(BASE_COMBOS.length, 0.5)).toBe(1);
  });
});

describe("combatProcessor — resolveStaminaRegenRate", () => {
  it("returns positive regen for idle player", () => {
    const rate = resolveStaminaRegenRate(makePlayer());
    expect(rate).toBeGreaterThan(0);
  });

  it("returns lower regen when blocking", () => {
    const idle = resolveStaminaRegenRate(makePlayer());
    const blocking = resolveStaminaRegenRate(makePlayer({ blocking: true }));
    expect(blocking).toBeLessThan(idle);
  });

  it("returns much lower regen when guard broken", () => {
    const idle = resolveStaminaRegenRate(makePlayer());
    const broken = resolveStaminaRegenRate(makePlayer({ guardBroken: true }));
    expect(broken).toBeLessThan(idle * 0.5);
  });

  it("applies staminaRegenBonus from mods", () => {
    const base = resolveStaminaRegenRate(makePlayer());
    const boosted = resolveStaminaRegenRate(makePlayer(), { staminaRegenBonus: 0.25 });
    expect(boosted).toBeGreaterThan(base);
  });
});

describe("combatProcessor — isInSwingArc", () => {
  it("returns true for target directly in front", () => {
    expect(isInSwingArc(0, 0, 0, 1.5, 0, 2, Math.PI)).toBe(true);
  });

  it("returns false for target outside reach", () => {
    expect(isInSwingArc(0, 0, 0, 3, 0, 2, Math.PI)).toBe(false);
  });

  it("returns false for target behind player", () => {
    expect(isInSwingArc(0, 0, 0, -1.5, 0, 2, 0.5)).toBe(false);
  });
});

describe("combatProcessor — resolveEnemyStagger", () => {
  it("returns positive knockback and stagger", () => {
    const combo = BASE_COMBOS[0];
    const result = resolveEnemyStagger(20, combo, {});
    expect(result.knockback).toBeGreaterThan(0);
    expect(result.stagger).toBeGreaterThan(0);
  });

  it("armored enemies have reduced stagger", () => {
    const combo = BASE_COMBOS[0];
    const unarmored = resolveEnemyStagger(20, combo, {});
    const armored = resolveEnemyStagger(20, combo, { armorRating: 5 });
    expect(armored.knockback).toBeLessThan(unarmored.knockback);
  });
});
