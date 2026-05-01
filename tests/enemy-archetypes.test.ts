import { describe, it, expect } from "vitest";
import {
  chooseEnemyType,
  createEnemyStats,
  createEnemyCombatProfile,
  listEnemyArchetypes,
} from "../src/enemyArchetypes.js";

describe("enemyArchetypes", () => {
  it("lists all flagship archetypes", () => {
    const types = listEnemyArchetypes();
    expect(types).toEqual(expect.arrayContaining(["slime", "charger", "spitter", "brute"]));
  });

  it("keeps low-level spawns conservative", () => {
    expect(chooseEnemyType(1, "clear", 0.99)).toBe("slime");
  });

  it("escalates archetypes by level and weather", () => {
    expect(chooseEnemyType(6, "storm", 0.2)).toBe("brute");
    expect(chooseEnemyType(6, "mist", 0.2)).toBe("spitter");
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
});
