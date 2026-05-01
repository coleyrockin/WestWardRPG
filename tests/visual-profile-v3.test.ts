import { describe, it, expect } from "vitest";
import { buildVisualMood } from "../src/visualProfile.js";

describe("visualProfile v3", () => {
  const weather = {
    kind: "sandstorm",
    rain: 0.2,
    fog: 0.4,
    wind: 0.6,
    lightning: 0.1,
  };

  it("applies biome grading for ashfall", () => {
    const mood = buildVisualMood({
      weather,
      chapterIndex: 1,
      day: 0.5,
      qualitySetting: "balanced",
      biome: "ashfall",
    });
    expect(mood.skyTint.r).toBeGreaterThan(mood.skyTint.b);
    expect(mood.weatherHazardTint).toBeTruthy();
    expect(mood.dynamicLightStrength).toBeGreaterThan(0);
  });

  it("applies biome grading for ironlantern", () => {
    const mood = buildVisualMood({
      weather: { ...weather, kind: "neon_rain" },
      chapterIndex: 2,
      day: 0.3,
      qualitySetting: "cinematic",
      biome: "ironlantern",
    });
    expect(mood.skyTint.b).toBeGreaterThan(mood.skyTint.r);
    expect(mood.contrastBoost).toBeGreaterThanOrEqual(1);
    expect(mood.rainDepthStrength).toBeGreaterThan(0);
  });
});
