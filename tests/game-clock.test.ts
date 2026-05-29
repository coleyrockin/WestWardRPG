import { describe, it, expect } from "vitest";
import { createClock, advanceClock, DEFAULT_FIXED_DT } from "../src/game/clock.js";

describe("clock — fixed-timestep accumulator", () => {
  it("defaults to a 60 Hz step", () => {
    expect(createClock().fixedDt).toBeCloseTo(DEFAULT_FIXED_DT, 10);
  });

  it("runs one step per fixed interval and carries the remainder", () => {
    const c = createClock(0.1);
    const r = advanceClock(c, 0.25);
    expect(r.steps).toBe(2);
    expect(r.clock.accumulator).toBeCloseTo(0.05, 10);
    expect(r.clock.tick).toBe(2);
  });

  it("banks sub-step time without advancing", () => {
    const c = createClock(0.1);
    const r = advanceClock(c, 0.05);
    expect(r.steps).toBe(0);
    expect(r.clock.accumulator).toBeCloseTo(0.05, 10);
  });

  it("clamps the backlog to maxSteps (no spiral of death)", () => {
    const c = createClock(0.1);
    const r = advanceClock(c, 100, 5);
    expect(r.steps).toBe(5);
    expect(r.clock.accumulator).toBe(0);
  });

  it("ignores non-positive frame dt", () => {
    const c = createClock(0.1);
    expect(advanceClock(c, 0).steps).toBe(0);
    expect(advanceClock(c, -1).steps).toBe(0);
  });
});
