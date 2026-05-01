import { describe, it, expect } from "vitest";
import {
  chooseEnemyType,
  createEnemyStats,
  createEnemyCombatProfile,
  listEnemyArchetypes,
  resolveBehaviorMove,
  getBehaviorTuning,
} from "../src/enemyArchetypes.js";

describe("enemyArchetypes", () => {
  it("lists all flagship archetypes", () => {
    const types = listEnemyArchetypes();
    expect(types).toEqual(expect.arrayContaining(["slime", "charger", "spitter", "brute", "suppressor", "skirmisher", "shield_brute"]));
  });

  it("keeps low-level spawns conservative", () => {
    expect(chooseEnemyType(1, "clear", 0.99)).toBe("slime");
  });

  it("escalates archetypes by level and weather", () => {
    expect(chooseEnemyType(6, "storm", 0.2)).toBe("brute");
    expect(chooseEnemyType(6, "mist", 0.2)).toBe("spitter");
    expect(chooseEnemyType(7, "sandstorm", 0.2)).toBe("skirmisher");
    expect(chooseEnemyType(7, "neon_rain", 0.2)).toBe("suppressor");
  });

  it("generates scaled stats by level", () => {
    const low = createEnemyStats("charger", 2);
    const high = createEnemyStats("charger", 8);
    expect(high.maxHp).toBeGreaterThan(low.maxHp);
    expect(high.baseDamage).toBeGreaterThanOrEqual(low.baseDamage);
  });

  it("builds combat profile from archetype behavior", () => {
    const brute = createEnemyStats("brute", 6);
    const profile = createEnemyCombatProfile(brute, 6);
    expect(profile.attackRange).toBeGreaterThan(1);
    expect(profile.cooldownFactor).toBeGreaterThan(1);
  });

  it("ranged behavior kites away when player is too close", () => {
    const enemy: any = { behavior: "ranged" };
    const move = resolveBehaviorMove(enemy, { nx: 1, ny: 0, distance: 1, dt: 0.016 });
    expect(move.mx).toBeLessThan(0);
  });

  it("flank behavior produces sideways motion", () => {
    const enemy: any = { behavior: "flank" };
    const move = resolveBehaviorMove(enemy, { nx: 1, ny: 0, distance: 4, dt: 0.016 });
    expect(Math.abs(move.my)).toBeGreaterThan(0.3);
  });

  it("charge behavior winds up before dashing", () => {
    const enemy: any = { behavior: "charge" };
    const ctx = { nx: 1, ny: 0, distance: 4, dt: 0.1 };
    const first = resolveBehaviorMove(enemy, ctx);
    expect(first.speedMult).toBeLessThan(1);
    for (let i = 0; i < 8; i++) resolveBehaviorMove(enemy, ctx);
    const dashing = resolveBehaviorMove(enemy, ctx);
    expect(dashing.speedMult).toBeGreaterThan(1.2);
  });

  it("tank behavior is slower than baseline", () => {
    expect(getBehaviorTuning("tank").speedMult).toBeLessThan(1);
    expect(getBehaviorTuning("balanced").speedMult).toBe(1);
  });

  it("falls back to balanced for unknown behaviors", () => {
    const enemy: any = { behavior: "unknown_behavior_label" };
    const move = resolveBehaviorMove(enemy, { nx: 1, ny: 0, distance: 4, dt: 0.016 });
    expect(move.mx).toBeCloseTo(1);
    expect(move.my).toBeCloseTo(0);
    expect(move.speedMult).toBe(1);
  });
});
