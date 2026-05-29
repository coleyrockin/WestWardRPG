import { describe, it, expect } from "vitest";
// @ts-expect-error — JS module, no types
import { CYCLE_KEYS, createWorldClock, tickClock, keyToDayTime, dayTimeToKey, pinClock, cycleClock } from "../src/game/world/worldClock.js";

describe("worldClock", () => {
  it("defaults to dusk (1/3), unpaused", () => {
    const c = createWorldClock();
    expect(c.dayTime).toBeCloseTo(1 / 3, 6);
    expect(c.paused).toBe(false);
  });

  it("advances by dt*speed and wraps at 1", () => {
    const c = createWorldClock({ dayTime: 0.9, speed: 1, paused: false });
    tickClock(c, 0.2);
    expect(c.dayTime).toBeCloseTo(0.1, 6); // 1.1 wrapped
  });

  it("holds when paused or given bad dt", () => {
    const c = createWorldClock({ dayTime: 0.5, speed: 1, paused: true });
    tickClock(c, 0.3);
    expect(c.dayTime).toBeCloseTo(0.5, 6);
    c.paused = false;
    tickClock(c, NaN);
    expect(c.dayTime).toBeCloseTo(0.5, 6);
  });

  it("maps keys ↔ dayTime and back", () => {
    expect(keyToDayTime("goldenHour")).toBeCloseTo(0, 6);
    expect(keyToDayTime("dusk")).toBeCloseTo(1 / 3, 6);
    expect(keyToDayTime("night")).toBeCloseTo(2 / 3, 6);
    expect(dayTimeToKey(0.02)).toBe("goldenHour");
    expect(dayTimeToKey(0.34)).toBe("dusk");
    expect(dayTimeToKey(0.66)).toBe("night");
    expect(dayTimeToKey(0.98)).toBe("goldenHour"); // wraps to nearest
  });

  it("pinning a key pauses + jumps", () => {
    const c = createWorldClock({ paused: false });
    pinClock(c, "night");
    expect(c.dayTime).toBeCloseTo(2 / 3, 6);
    expect(c.paused).toBe(true);
  });

  it("cycles through the keys in order", () => {
    const c = createWorldClock();
    expect(cycleClock(c)).toBe("night"); // dusk -> night
    expect(cycleClock(c)).toBe("goldenHour"); // night -> goldenHour
    expect(cycleClock(c)).toBe("dusk"); // goldenHour -> dusk
    expect([...CYCLE_KEYS]).toEqual(["goldenHour", "dusk", "night"]);
  });
});
