import { describe, it, expect } from "vitest";
import { updateWeather, createInitialWeather } from "../src/weatherSystem.js";

describe("weatherSystem", () => {
  it("createInitialWeather returns valid weather state", () => {
    const w = createInitialWeather();
    expect(w.kind).toBe("clear");
    expect(w.rain).toBe(0);
    expect(w.timer).toBeGreaterThan(0);
  });

  it("updateWeather decrements timer", () => {
    const w = createInitialWeather();
    const before = w.timer;
    updateWeather(w, "frontier", 1.0);
    expect(w.timer).toBeLessThan(before);
  });

  it("updateWeather rolls new kind when timer expires", () => {
    const w = { ...createInitialWeather(), timer: 0.01 };
    updateWeather(w, "frontier", 1.0);
    // Timer should have reset to a positive value
    expect(w.timer).toBeGreaterThan(0);
  });

  it("updateWeather produces valid kind for each region", () => {
    const validKinds = new Set(["clear", "mist", "rain", "storm", "sandstorm", "heatwave", "neon_rain"]);
    for (const region of ["frontier", "ashfall", "ironlantern"]) {
      const w = { ...createInitialWeather(), timer: 0.001 };
      for (let i = 0; i < 20; i++) {
        updateWeather(w, region, 1.0);
        expect(validKinds.has(w.kind)).toBe(true);
        w.timer = 0.001;
      }
    }
  });

  it("updateWeather interpolates rain/fog/wind toward targets", () => {
    const w = { ...createInitialWeather(), kind: "storm", rain: 0, fog: 0, wind: 0, timer: 100, lightning: 0 };
    updateWeather(w, "frontier", 0.1);
    expect(w.rain).toBeGreaterThan(0);
    expect(w.fog).toBeGreaterThan(0);
  });

  it("lightning can trigger during storm", () => {
    const w = { ...createInitialWeather(), kind: "storm", rain: 0.8, fog: 0.3, wind: 0.5, timer: 100, lightning: 0 };
    let triggered = false;
    // Run enough frames that statistically lightning must trigger (P(miss 2000) ≈ 0)
    for (let i = 0; i < 2000; i++) {
      w.lightning = 0;
      updateWeather(w, "frontier", 0.1); // larger dt → higher probability
      if (w.lightning > 0) { triggered = true; break; }
    }
    expect(triggered).toBe(true);
  });
});
