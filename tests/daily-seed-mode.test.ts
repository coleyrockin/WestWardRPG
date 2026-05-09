import { describe, it, expect, beforeEach } from "vitest";
import { todaysSeedString, dailyRand, resolveScoreMultiplier, computeDailyScore, submitDailyScore, getLeaderboard, getTodaysPersonalBest, clearLeaderboard, CHALLENGE_FLAGS } from "../src/dailySeedMode.js";

describe("dailySeedMode — seed", () => {
  it("todaysSeedString returns YYYY-MM-DD format", () => {
    const s = todaysSeedString();
    expect(s).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("dailyRand returns [0,1) and is deterministic", () => {
    const a = dailyRand("2026-05-09", "spawn");
    const b = dailyRand("2026-05-09", "spawn");
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(1);
  });

  it("dailyRand returns different values for different sub-seeds", () => {
    const a = dailyRand("2026-05-09", "spawn");
    const b = dailyRand("2026-05-09", "event");
    expect(a).not.toBe(b);
  });
});

describe("dailySeedMode — challenge flags", () => {
  it("CHALLENGE_FLAGS has ironman, noShop, noSkill, noCompanion", () => {
    expect(CHALLENGE_FLAGS.ironman).toBeTruthy();
    expect(CHALLENGE_FLAGS.noShop).toBeTruthy();
    expect(CHALLENGE_FLAGS.noSkill).toBeTruthy();
    expect(CHALLENGE_FLAGS.noCompanion).toBeTruthy();
  });

  it("resolveScoreMultiplier returns 1 with no flags", () => {
    expect(resolveScoreMultiplier({})).toBeCloseTo(1.0);
  });

  it("resolveScoreMultiplier returns >1 with ironman enabled", () => {
    expect(resolveScoreMultiplier({ ironman: true })).toBeGreaterThan(1);
  });

  it("stacking flags multiplies scoreMult", () => {
    const one = resolveScoreMultiplier({ ironman: true });
    const two = resolveScoreMultiplier({ ironman: true, noShop: true });
    expect(two).toBeGreaterThan(one);
  });
});

describe("dailySeedMode — score", () => {
  it("computeDailyScore applies base formula", () => {
    const score = computeDailyScore({ kills: 10, gold: 50, chapterReached: 2 }, {});
    expect(score).toBe(10 * 5 + 50 + 2 * 100);
  });

  it("computeDailyScore applies challenge multiplier", () => {
    const base = computeDailyScore({ kills: 10, gold: 50, chapterReached: 1 }, {});
    const hard = computeDailyScore({ kills: 10, gold: 50, chapterReached: 1 }, { ironman: true });
    expect(hard).toBeGreaterThan(base);
  });

  it("computeDailyScore handles missing runStats gracefully", () => {
    expect(() => computeDailyScore()).not.toThrow();
    expect(computeDailyScore()).toBe(100); // chapterReached defaults to 1
  });
});

describe("dailySeedMode — leaderboard", () => {
  beforeEach(() => clearLeaderboard());

  it("starts empty", () => {
    expect(getLeaderboard()).toEqual([]);
  });

  it("submits and retrieves a score", () => {
    submitDailyScore("2026-05-09", 420, {});
    const board = getLeaderboard();
    expect(board).toHaveLength(1);
    expect(board[0].score).toBe(420);
    expect(board[0].date).toBe("2026-05-09");
  });

  it("getTodaysPersonalBest returns 0 with no entries", () => {
    expect(getTodaysPersonalBest("2026-05-09")).toBe(0);
  });

  it("getTodaysPersonalBest returns best score for today", () => {
    submitDailyScore("2026-05-09", 100, {});
    submitDailyScore("2026-05-09", 300, {});
    submitDailyScore("2026-05-09", 200, {});
    expect(getTodaysPersonalBest("2026-05-09")).toBe(300);
  });

  it("clearLeaderboard empties all entries", () => {
    submitDailyScore("2026-05-09", 100, {});
    clearLeaderboard();
    expect(getLeaderboard()).toEqual([]);
  });
});
