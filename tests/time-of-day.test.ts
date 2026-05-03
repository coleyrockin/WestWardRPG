import { describe, it, expect } from "vitest";
import {
  DAY_LENGTH_SECONDS,
  PHASES,
  PHASE_TINT,
  PHASE_SPAWN,
  resolvePhase,
  resolvePhaseTint,
  resolveSpawnModifier,
  advanceTimeOfDay,
  ensureWorldTimeDefaults,
  formatPhaseLabel,
} from "../src/timeOfDay.js";

describe("timeOfDay — phase resolver", () => {
  it("dawn at start of day", () => expect(resolvePhase(0.0)).toBe("dawn"));
  it("day at midday", () => expect(resolvePhase(0.4)).toBe("day"));
  it("dusk in late afternoon", () => expect(resolvePhase(0.7)).toBe("dusk"));
  it("night near end of day", () => expect(resolvePhase(0.9)).toBe("night"));

  it("wraps negative values into [0,1)", () => {
    expect(resolvePhase(-0.1)).toBe("night");
  });

  it("wraps values > 1 (cycle continues)", () => {
    expect(resolvePhase(2.4)).toBe("day");
  });

  it("handles non-finite input as 0", () => {
    expect(resolvePhase(NaN)).toBe("dawn");
    expect(resolvePhase(Infinity)).toBe("dawn");
  });
});

describe("timeOfDay — tint LUT", () => {
  it("day tint is neutral", () => {
    const t = resolvePhaseTint(0.4);
    expect(t.r).toBeCloseTo(1.0, 1);
    expect(t.brightness).toBeCloseTo(1.0, 1);
  });

  it("night is dark and blue-shifted", () => {
    const t = resolvePhaseTint(0.9);
    expect(t.brightness).toBeLessThan(0.7);
    expect(t.b).toBeGreaterThan(t.r);
  });

  it("dusk leans warm", () => {
    const t = resolvePhaseTint(0.66);
    expect(t.r).toBeGreaterThan(t.b);
  });

  it("crossfades smoothly between phases", () => {
    const t1 = resolvePhaseTint(0.6); // day
    const t2 = resolvePhaseTint(0.62); // first frame of dusk
    // Late-day blends toward dusk, brightness should be dipping
    expect(t2.brightness).toBeLessThanOrEqual(t1.brightness + 0.01);
  });
});

describe("timeOfDay — spawn modifiers", () => {
  it("night doubles hostile spawn density", () => {
    const m = resolveSpawnModifier(0.9);
    expect(m.hostileMult).toBeGreaterThanOrEqual(1.5);
    expect(m.activePhase).toBe("night");
  });

  it("day suppresses hostiles and boosts patrols", () => {
    const m = resolveSpawnModifier(0.4);
    expect(m.hostileMult).toBeLessThanOrEqual(1.0);
    expect(m.patrolMult).toBeGreaterThanOrEqual(1.0);
  });
});

describe("timeOfDay — advanceTimeOfDay", () => {
  it("advances by dt / DAY_LENGTH per second", () => {
    const w: any = { timeOfDay: 0 };
    advanceTimeOfDay(w, DAY_LENGTH_SECONDS / 4); // 1/4 day
    expect(w.timeOfDay).toBeCloseTo(0.25, 4);
  });

  it("wraps around midnight", () => {
    const w: any = { timeOfDay: 0.95 };
    advanceTimeOfDay(w, DAY_LENGTH_SECONDS * 0.1); // +0.1
    expect(w.timeOfDay).toBeCloseTo(0.05, 4);
  });

  it("returns 0 for null world", () => {
    expect(advanceTimeOfDay(null, 5)).toBe(0);
  });

  it("ensureWorldTimeDefaults seeds an empty world", () => {
    const w: any = {};
    ensureWorldTimeDefaults(w);
    expect(typeof w.timeOfDay).toBe("number");
    expect(w.timeOfDay).toBeGreaterThanOrEqual(0);
    expect(w.timeOfDay).toBeLessThan(1);
  });

  it("ensureWorldTimeDefaults preserves an existing valid value", () => {
    const w: any = { timeOfDay: 0.5 };
    ensureWorldTimeDefaults(w);
    expect(w.timeOfDay).toBe(0.5);
  });

  it("ensureWorldTimeDefaults replaces NaN with default", () => {
    const w: any = { timeOfDay: NaN };
    ensureWorldTimeDefaults(w);
    expect(isFinite(w.timeOfDay)).toBe(true);
  });
});

describe("timeOfDay — formatPhaseLabel", () => {
  it("returns user-facing label", () => {
    expect(formatPhaseLabel(0.4)).toBe("Day");
    expect(formatPhaseLabel(0.9)).toBe("Night");
  });
});

describe("timeOfDay — invariants", () => {
  it("PHASES partition [0,1) without gaps", () => {
    expect(PHASES.dawn.start).toBe(0);
    expect(PHASES.dawn.end).toBe(PHASES.day.start);
    expect(PHASES.day.end).toBe(PHASES.dusk.start);
    expect(PHASES.dusk.end).toBe(PHASES.night.start);
    expect(PHASES.night.end).toBe(1);
  });

  it("PHASE_TINT and PHASE_SPAWN cover all four phases", () => {
    for (const k of ["dawn", "day", "dusk", "night"]) {
      expect(PHASE_TINT[k]).toBeTruthy();
      expect(PHASE_SPAWN[k]).toBeTruthy();
    }
  });
});
