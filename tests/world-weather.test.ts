import { describe, it, expect } from "vitest";
// @ts-expect-error — JS module, no types
import { WEATHER_KINDS, resolveWeather, nextWeatherKind } from "../src/game/world/weather.js";

describe("weather", () => {
  it("clear has no rain and only faint dust", () => {
    const w = resolveWeather({ kind: "clear", wind: 0.15 });
    expect(w.kind).toBe("clear");
    expect(w.rain).toBe(0);
    expect(w.lightning).toBe(0);
    expect(w.dust).toBeGreaterThan(0);
  });

  it("dust raises dust + a little fog, no rain", () => {
    const w = resolveWeather({ kind: "dust" });
    expect(w.dust).toBeGreaterThan(0.5);
    expect(w.rain).toBe(0);
    expect(w.fogBoost).toBeGreaterThan(0);
  });

  it("storm brings rain + lightning, and honors an explicit rain value", () => {
    expect(resolveWeather({ kind: "storm" }).rain).toBeGreaterThan(0);
    expect(resolveWeather({ kind: "storm" }).lightning).toBeGreaterThan(0);
    expect(resolveWeather({ kind: "storm", rain: 0.9 }).rain).toBeCloseTo(0.9, 6);
  });

  it("falls back to clear on unknown kind and clamps wind", () => {
    expect(resolveWeather({ kind: "blizzard" }).kind).toBe("clear");
    expect(resolveWeather({ wind: 5 }).wind).toBe(1);
    expect(resolveWeather({ wind: -2 }).wind).toBe(0);
  });

  it("cycles clear → dust → storm → clear", () => {
    expect([...WEATHER_KINDS]).toEqual(["clear", "dust", "storm"]);
    expect(nextWeatherKind("clear")).toBe("dust");
    expect(nextWeatherKind("dust")).toBe("storm");
    expect(nextWeatherKind("storm")).toBe("clear");
  });

  it("windSpeed scales up the cycle: clear < dust < storm (R1 motion/audio driver)", () => {
    const clear = resolveWeather({ kind: "clear" }).windSpeed;
    const dust = resolveWeather({ kind: "dust" }).windSpeed;
    const storm = resolveWeather({ kind: "storm" }).windSpeed;
    expect(clear).toBe(1);
    expect(dust).toBeGreaterThan(clear);
    expect(storm).toBeGreaterThan(dust);
  });
});
