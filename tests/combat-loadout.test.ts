import { describe, it, expect } from "vitest";
import {
  resolveCombatProgression,
  applySwingLoadout,
  resolveIncomingDamage,
  getSprintModifier,
  resolveMovesetForWeapon,
  applyMovesetGeometry,
  MOVESET_DEFINITIONS,
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

describe("combatLoadout — movesets", () => {
  it("resolves moveset id from weapon tier", () => {
    expect(resolveMovesetForWeapon("Common")).toBe("light");
    expect(resolveMovesetForWeapon("Refined")).toBe("heavy");
    expect(resolveMovesetForWeapon("Relic")).toBe("spear");
    expect(resolveMovesetForWeapon("Mystery")).toBe("light");
  });

  it("light has wider arc and shorter reach than heavy", () => {
    const base = { arc: 1, reach: 2, staggerBonus: 0 };
    const light = applyMovesetGeometry(base, "Common");
    const heavy = applyMovesetGeometry(base, "Refined");
    expect(light.arc).toBeGreaterThan(heavy.arc);
    expect(heavy.reach).toBeGreaterThan(light.reach);
  });

  it("spear has the longest reach and the narrowest arc", () => {
    const base = { arc: 1, reach: 2 };
    const light = applyMovesetGeometry(base, "Common");
    const spear = applyMovesetGeometry(base, "Relic");
    expect(spear.reach).toBeGreaterThan(light.reach);
    expect(spear.arc).toBeLessThan(light.arc);
  });

  it("heavy adds stagger bonus", () => {
    const base = { arc: 1, reach: 2, staggerBonus: 0 };
    const heavy = applyMovesetGeometry(base, "Refined");
    expect(heavy.staggerBonus).toBeGreaterThan(0);
    expect(heavy.staggerBonus).toBe(MOVESET_DEFINITIONS.heavy.staggerBonus);
  });

  it("preserves the original swing properties additively", () => {
    const base = { arc: 1, reach: 2, damage: 17, stamina: 10, cooldown: 0.2, duration: 0.3 };
    const out = applyMovesetGeometry(base, "Common");
    expect(out.damage).toBe(17);
    expect(out.stamina).toBe(10);
    expect(out.cooldown).toBe(0.2);
    expect(out.movesetId).toBe("light");
  });
});
