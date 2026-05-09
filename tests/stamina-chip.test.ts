import { describe, it, expect } from "vitest";
import { resolveIncomingDamage, applyBlockStaminaChip, resolveCombatProgression, resolveGuardBreakState } from "../src/combatLoadout.js";

function makeNarrative() {
  return { thematicAxes: { controlVsFreedom: 0, truthVsComfort: 0, solidarityVsStatus: 0 }, factionRep: {}, npcAffinity: {} };
}

describe("stamina chip — resolveIncomingDamage", () => {
  it("includes staminaChip in result", () => {
    const prog = resolveCombatProgression(makeNarrative(), 1);
    const result = resolveIncomingDamage(20, prog, { blocked: true });
    expect(typeof result.staminaChip).toBe("number");
    expect(result.staminaChip).toBeGreaterThan(0);
  });

  it("staminaChip is lower than blocked damage", () => {
    const prog = resolveCombatProgression(makeNarrative(), 1);
    const result = resolveIncomingDamage(20, prog, { blocked: true });
    expect(result.staminaChip).toBeLessThan(result.blocked);
  });
});

describe("stamina chip — applyBlockStaminaChip", () => {
  it("reduces player stamina by chip amount", () => {
    const player = { stamina: 80, guardBroken: false, guardBrokenTimer: 0 };
    applyBlockStaminaChip(player, 10);
    expect(player.stamina).toBe(70);
  });

  it("returns false when stamina stays above zero", () => {
    const player = { stamina: 80, guardBroken: false, guardBrokenTimer: 0 };
    const broke = applyBlockStaminaChip(player, 10);
    expect(broke).toBe(false);
  });

  it("returns true and sets guardBroken when stamina hits zero", () => {
    const player = { stamina: 5, guardBroken: false, guardBrokenTimer: 0 };
    const broke = applyBlockStaminaChip(player, 10);
    expect(broke).toBe(true);
    expect(player.guardBroken).toBe(true);
    expect(player.stamina).toBe(0);
  });

  it("sets guardBrokenTimer when guard breaks", () => {
    const player = { stamina: 3, guardBroken: false, guardBrokenTimer: 0 };
    applyBlockStaminaChip(player, 10);
    expect(player.guardBrokenTimer).toBeGreaterThan(0);
  });
});
