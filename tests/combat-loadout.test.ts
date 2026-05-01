import { describe, it, expect } from "vitest";
import {
  resolveCombatProgression,
  applySwingLoadout,
  resolveIncomingDamage,
  getSprintModifier,
} from "../src/combatLoadout.js";
import { createInitialNarrativeState } from "../src/decisionEngine.js";

describe("combatLoadout", () => {
  it("maps faction reputation to a combat doctrine", () => {
    const state = createInitialNarrativeState();
    state.factionRep.civicCouncil = 18;
    const profile = resolveCombatProgression(state, 5);
    expect(profile.styleId).toBe("civicBulwark");
  });

  it("unlocks perks at level tiers", () => {
    const state = createInitialNarrativeState();
    const profile = resolveCombatProgression(state, 9);
    expect(profile.perks).toEqual(expect.arrayContaining(["weatheredGrip", "counterweight", "peoplePulse"]));
  });

  it("applies weather and solidarity modifiers to swing profile", () => {
    const profile = resolveCombatProgression(createInitialNarrativeState(), 10);
    const swing = applySwingLoadout(
      { damage: 20, stamina: 10, arc: 0.9, cooldown: 0.2, duration: 0.3, reach: 2, lunge: 0.1, knock: 0.2 },
      profile,
      { weatherKind: "storm", solidarityVsStatus: 25 },
    );
    expect(swing.stamina).toBeGreaterThan(0);
    expect(swing.damage).toBeGreaterThanOrEqual(20);
  });

  it("returns reduced incoming damage when blocking", () => {
    const profile = resolveCombatProgression(createInitialNarrativeState(), 6);
    const mitigated = resolveIncomingDamage(20, profile, { blocked: true });
    expect(mitigated.blocked).toBeLessThan(mitigated.glancing);
  });

  it("exposes sprint multiplier from doctrine", () => {
    const profile = resolveCombatProgression(createInitialNarrativeState(), 4);
    expect(getSprintModifier(profile)).toBeGreaterThan(0.8);
  });
});
