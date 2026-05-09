import { describe, it, expect } from "vitest";
import { resolveCurrentSeason, advanceCalendarDay, resolveSeasonModifiers, resolveSeasonLabel, SEASON_CYCLE, SEASONS } from "../src/seasonalEvents.js";

describe("seasonalEvents — resolveCurrentSeason", () => {
  it("returns a valid season name", () => {
    for (let day = 0; day < SEASON_CYCLE * 4; day++) {
      expect(SEASONS).toContain(resolveCurrentSeason(day));
    }
  });

  it("cycles through all 4 seasons over 4×SEASON_CYCLE days", () => {
    const seen = new Set<string>();
    for (let day = 0; day < SEASON_CYCLE * 4; day++) {
      seen.add(resolveCurrentSeason(day));
    }
    expect(seen.size).toBe(4);
  });

  it("same day always returns same season", () => {
    expect(resolveCurrentSeason(14)).toBe(resolveCurrentSeason(14));
  });
});

describe("seasonalEvents — advanceCalendarDay", () => {
  it("increments calendarDay when timer exceeds threshold", () => {
    const world: any = { calendarDay: 0, calendarDayTimer: 0 };
    advanceCalendarDay(world, 300); // 300s > 240s per day
    expect(world.calendarDay).toBe(1);
  });

  it("does not increment calendarDay before threshold", () => {
    const world: any = { calendarDay: 0, calendarDayTimer: 0 };
    advanceCalendarDay(world, 10);
    expect(world.calendarDay).toBe(0);
  });

  it("handles null world gracefully", () => {
    expect(() => advanceCalendarDay(null, 1)).not.toThrow();
  });
});

describe("seasonalEvents — resolveSeasonModifiers", () => {
  it("returns modifier object with required fields", () => {
    const mods = resolveSeasonModifiers("summer", "frontier");
    expect(typeof mods.spawnMult).toBe("number");
    expect(typeof mods.visibilityMod).toBe("number");
    expect(typeof mods.vendorBonus).toBe("boolean");
  });

  it("summer frontier has vendor bonus", () => {
    const mods = resolveSeasonModifiers("summer", "frontier");
    expect(mods.vendorBonus).toBe(true);
  });

  it("summer ashfall has higher spawn multiplier", () => {
    const normal = resolveSeasonModifiers("spring", "ashfall");
    const hot = resolveSeasonModifiers("summer", "ashfall");
    expect(hot.spawnMult).toBeGreaterThan(normal.spawnMult);
  });

  it("winter ironlantern has lower spawn multiplier (blackout)", () => {
    const mods = resolveSeasonModifiers("winter", "ironlantern");
    expect(mods.spawnMult).toBeLessThan(1.0);
  });
});

describe("seasonalEvents — resolveSeasonLabel", () => {
  it("returns a non-empty label string", () => {
    const label = resolveSeasonLabel(0);
    expect(typeof label).toBe("string");
    expect(label.length).toBeGreaterThan(0);
  });

  it("label includes day number", () => {
    const label = resolveSeasonLabel(5);
    expect(label).toMatch(/Day \d+/);
  });
});
