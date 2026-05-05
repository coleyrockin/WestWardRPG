import { describe, it, expect } from "vitest";
import {
  DIFFICULTY_LEVELS,
  DIFFICULTY_PROFILES,
  isDifficultyId,
  resolveDifficultyProfile,
  ensureDifficultyDefaults,
  setDifficulty,
  cycleDifficulty,
  getEnemyHpMultiplier,
  getEnemyDamageMultiplier,
  getRewardMultiplier,
} from "../src/difficultyTuning.js";

describe("difficultyTuning — definitions", () => {
  it("exposes three levels", () => {
    expect(DIFFICULTY_LEVELS).toEqual(["beginner", "standard", "hard"]);
  });

  it("each level has a profile", () => {
    for (const id of DIFFICULTY_LEVELS) {
      const p = DIFFICULTY_PROFILES[id];
      expect(p.label.length).toBeGreaterThan(0);
      expect(typeof p.enemyHpMult).toBe("number");
      expect(typeof p.enemyDamageMult).toBe("number");
      expect(typeof p.rewardMult).toBe("number");
    }
  });

  it("beginner is easier than hard on every axis", () => {
    expect(DIFFICULTY_PROFILES.beginner.enemyHpMult).toBeLessThan(DIFFICULTY_PROFILES.hard.enemyHpMult);
    expect(DIFFICULTY_PROFILES.beginner.enemyDamageMult).toBeLessThan(DIFFICULTY_PROFILES.hard.enemyDamageMult);
  });

  it("hard rewards more than beginner", () => {
    expect(DIFFICULTY_PROFILES.hard.rewardMult).toBeGreaterThan(DIFFICULTY_PROFILES.beginner.rewardMult);
  });

  it("standard is exactly 1.0 on combat axes", () => {
    expect(DIFFICULTY_PROFILES.standard.enemyHpMult).toBe(1.0);
    expect(DIFFICULTY_PROFILES.standard.enemyDamageMult).toBe(1.0);
    expect(DIFFICULTY_PROFILES.standard.rewardMult).toBe(1.0);
  });
});

describe("difficultyTuning — id helpers", () => {
  it("isDifficultyId rejects unknown ids", () => {
    expect(isDifficultyId("beginner")).toBe(true);
    expect(isDifficultyId("nightmare")).toBe(false);
    expect(isDifficultyId(undefined as any)).toBe(false);
  });

  it("resolveDifficultyProfile defaults to standard for unknown id", () => {
    expect(resolveDifficultyProfile("nightmare")).toBe(DIFFICULTY_PROFILES.standard);
  });
});

describe("difficultyTuning — world state", () => {
  it("ensureDifficultyDefaults seeds standard on missing world.difficulty", () => {
    const w: any = {};
    expect(ensureDifficultyDefaults(w)).toBe("standard");
    expect(w.difficulty).toBe("standard");
  });

  it("ensureDifficultyDefaults preserves a valid existing value", () => {
    const w: any = { difficulty: "hard" };
    expect(ensureDifficultyDefaults(w)).toBe("hard");
  });

  it("ensureDifficultyDefaults rewrites garbage to standard", () => {
    const w: any = { difficulty: "garbage" };
    ensureDifficultyDefaults(w);
    expect(w.difficulty).toBe("standard");
  });

  it("setDifficulty updates world.difficulty", () => {
    const w: any = {};
    setDifficulty(w, "hard");
    expect(w.difficulty).toBe("hard");
  });

  it("setDifficulty returns null for unknown ids", () => {
    const w: any = { difficulty: "standard" };
    expect(setDifficulty(w, "nightmare")).toBeNull();
    expect(w.difficulty).toBe("standard");
  });

  it("cycleDifficulty walks forward through the list", () => {
    const w: any = { difficulty: "standard" };
    expect(cycleDifficulty(w, 1)).toBe("hard");
    expect(cycleDifficulty(w, 1)).toBe("beginner");
    expect(cycleDifficulty(w, 1)).toBe("standard");
  });

  it("cycleDifficulty walks backward when dir is negative", () => {
    const w: any = { difficulty: "standard" };
    expect(cycleDifficulty(w, -1)).toBe("beginner");
  });
});

describe("difficultyTuning — multipliers", () => {
  it("multipliers come from world.difficulty", () => {
    const w: any = { difficulty: "hard" };
    expect(getEnemyHpMultiplier(w)).toBe(DIFFICULTY_PROFILES.hard.enemyHpMult);
    expect(getEnemyDamageMultiplier(w)).toBe(DIFFICULTY_PROFILES.hard.enemyDamageMult);
    expect(getRewardMultiplier(w)).toBe(DIFFICULTY_PROFILES.hard.rewardMult);
  });

  it("multipliers default to standard for missing world", () => {
    expect(getEnemyHpMultiplier(null as any)).toBe(1.0);
    expect(getEnemyDamageMultiplier(undefined as any)).toBe(1.0);
    expect(getRewardMultiplier({} as any)).toBe(1.0);
  });
});
