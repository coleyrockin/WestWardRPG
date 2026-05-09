import { describe, it, expect } from "vitest";
import { resolveRegionInfluence, resolveInfluenceSpawnMult, resolveInfluenceRouteTint } from "../src/influenceMap.js";

describe("influenceMap — resolveRegionInfluence", () => {
  it("returns values between 0 and 1 for all factions", () => {
    const inf = resolveRegionInfluence("frontier", { civicCouncil: 50, workersGuild: -20, marketCartel: 0 });
    for (const v of Object.values(inf)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("high civic-council rep → higher civic influence in frontier", () => {
    const high = resolveRegionInfluence("frontier", { civicCouncil: 100, workersGuild: 0, marketCartel: 0 });
    const low  = resolveRegionInfluence("frontier", { civicCouncil: -100, workersGuild: 0, marketCartel: 0 });
    expect(high.civicCouncil).toBeGreaterThan(low.civicCouncil);
  });

  it("unknown region falls back to frontier weights", () => {
    const inf = resolveRegionInfluence("nowhere" as any, {});
    expect(typeof inf.civicCouncil).toBe("number");
  });
});

describe("influenceMap — resolveInfluenceSpawnMult", () => {
  it("returns a multiplier in expected range", () => {
    const mult = resolveInfluenceSpawnMult("frontier", { civicCouncil: 0, workersGuild: 0, marketCartel: 0 });
    expect(mult).toBeGreaterThan(0);
    expect(mult).toBeLessThanOrEqual(1.5);
  });

  it("high civic-council rep in frontier reduces hostile spawn mult", () => {
    const high = resolveInfluenceSpawnMult("frontier", { civicCouncil: 100, workersGuild: 0, marketCartel: 0 });
    const low  = resolveInfluenceSpawnMult("frontier", { civicCouncil: -100, workersGuild: 0, marketCartel: 0 });
    expect(high).toBeLessThan(low);
  });

  it("high workers-guild rep in ashfall reduces hostile spawn mult", () => {
    const high = resolveInfluenceSpawnMult("ashfall", { civicCouncil: 0, workersGuild: 100, marketCartel: 0 });
    const low  = resolveInfluenceSpawnMult("ashfall", { civicCouncil: 0, workersGuild: -100, marketCartel: 0 });
    expect(high).toBeLessThan(low);
  });

  it("high market-cartel rep in ironlantern increases spawn mult", () => {
    const high = resolveInfluenceSpawnMult("ironlantern", { civicCouncil: 0, workersGuild: 0, marketCartel: 100 });
    const low  = resolveInfluenceSpawnMult("ironlantern", { civicCouncil: 0, workersGuild: 0, marketCartel: -100 });
    expect(high).toBeGreaterThan(low);
  });
});

describe("influenceMap — resolveInfluenceRouteTint", () => {
  it("returns an rgba string", () => {
    const tint = resolveInfluenceRouteTint("frontier", { civicCouncil: 80, workersGuild: 0, marketCartel: 0 });
    expect(tint).toMatch(/^rgba\(/);
  });

  it("dominant faction determines tint color channel", () => {
    const civic = resolveInfluenceRouteTint("frontier", { civicCouncil: 100, workersGuild: -100, marketCartel: -100 });
    const guild = resolveInfluenceRouteTint("ashfall", { civicCouncil: -100, workersGuild: 100, marketCartel: -100 });
    expect(civic).not.toBe(guild);
  });
});
