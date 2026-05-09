import { describe, it, expect } from "vitest";
import { resolvePatrolStance, resolvePatrolDescriptor, resolvePatrolDensityMult, PATROL_FACTION } from "../src/patrolSystem.js";

describe("patrolSystem — stance", () => {
  it("returns 'allied' when faction rep is high", () => {
    expect(resolvePatrolStance("frontier", { civicCouncil: 50 })).toBe("allied");
  });

  it("returns 'hostile' when faction rep is very negative", () => {
    expect(resolvePatrolStance("frontier", { civicCouncil: -50 })).toBe("hostile");
  });

  it("returns 'neutral' when rep is between thresholds", () => {
    expect(resolvePatrolStance("frontier", { civicCouncil: 0 })).toBe("neutral");
  });

  it("covers all three regions", () => {
    for (const region of ["frontier", "ashfall", "ironlantern"]) {
      const stance = resolvePatrolStance(region, {});
      expect(["allied", "neutral", "hostile"]).toContain(stance);
    }
  });

  it("PATROL_FACTION maps all three regions", () => {
    expect(PATROL_FACTION.frontier).toBeTruthy();
    expect(PATROL_FACTION.ashfall).toBeTruthy();
    expect(PATROL_FACTION.ironlantern).toBeTruthy();
  });
});

describe("patrolSystem — descriptor", () => {
  it("returns a descriptor with required fields", () => {
    const d = resolvePatrolDescriptor("frontier", { civicCouncil: 30 });
    expect(typeof d.factionId).toBe("string");
    expect(typeof d.label).toBe("string");
    expect(typeof d.stance).toBe("string");
    expect(typeof d.color).toBe("string");
    expect(typeof d.suppressRadiusTiles).toBe("number");
    expect(typeof d.engagesPlayer).toBe("boolean");
  });

  it("allied patrol has non-zero suppress radius and does not engage", () => {
    const d = resolvePatrolDescriptor("frontier", { civicCouncil: 50 });
    expect(d.suppressRadiusTiles).toBeGreaterThan(0);
    expect(d.engagesPlayer).toBe(false);
  });

  it("hostile patrol engages player and has zero suppress radius", () => {
    const d = resolvePatrolDescriptor("frontier", { civicCouncil: -50 });
    expect(d.engagesPlayer).toBe(true);
    expect(d.suppressRadiusTiles).toBe(0);
  });
});

describe("patrolSystem — density multiplier", () => {
  it("allied patrol reduces spawn density", () => {
    const mult = resolvePatrolDensityMult("frontier", { civicCouncil: 50 });
    expect(mult).toBeLessThan(1.0);
  });

  it("hostile patrol increases spawn density", () => {
    const mult = resolvePatrolDensityMult("frontier", { civicCouncil: -50 });
    expect(mult).toBeGreaterThan(1.0);
  });

  it("neutral patrol has multiplier of 1.0", () => {
    const mult = resolvePatrolDensityMult("frontier", { civicCouncil: 0 });
    expect(mult).toBeCloseTo(1.0);
  });
});
