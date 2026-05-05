import { describe, expect, it } from "vitest";
import {
  normalizeDynamicLight,
  parseLightColor,
  resolveDynamicLightAtPoint,
  selectDynamicLights,
} from "../src/dynamicLights.js";

describe("dynamicLights", () => {
  it("parses shorthand and full hex colors", () => {
    expect(parseLightColor("#fd8")).toEqual({ r: 255, g: 221, b: 136 });
    expect(parseLightColor("#8fc8ff")).toEqual({ r: 143, g: 200, b: 255 });
  });

  it("normalizes valid lights and rejects invalid positions", () => {
    expect(normalizeDynamicLight({ x: 1, y: 2, radius: 5, intensity: 2 })?.intensity).toBe(1);
    expect(normalizeDynamicLight({ x: Number.NaN, y: 2 })).toBeNull();
  });

  it("selects the strongest nearby lights up to a cap", () => {
    const lights = [
      { id: "far", x: 50, y: 50, radius: 4, intensity: 0.8 },
      { id: "near-low", x: 1, y: 0, radius: 3, intensity: 0.3 },
      { id: "near-high", x: 0.5, y: 0, radius: 5, intensity: 0.8 },
    ];
    const selected = selectDynamicLights(lights, { x: 0, y: 0 }, { maxLights: 2 });

    expect(selected.map((light) => light.id)).toContain("near-high");
    expect(selected).toHaveLength(2);
  });

  it("returns inactive lighting outside every radius", () => {
    const light = normalizeDynamicLight({ x: 0, y: 0, radius: 2, intensity: 1, color: "#ffd77b" });
    const result = resolveDynamicLightAtPoint({ x: 5, y: 5 }, [light], { time: 0, strength: 1 });

    expect(result.active).toBe(false);
    expect(result.alpha).toBe(0);
  });

  it("blends overlapping lights into one overlay color", () => {
    const lights = selectDynamicLights([
      { x: 0, y: 0, radius: 5, intensity: 0.8, color: "#ff0000" },
      { x: 1, y: 0, radius: 5, intensity: 0.8, color: "#0000ff" },
    ], { x: 0, y: 0 });
    const result = resolveDynamicLightAtPoint({ x: 0.5, y: 0 }, lights, { time: 0, strength: 1 });

    expect(result.active).toBe(true);
    expect(result.alpha).toBeGreaterThan(0.5);
    expect(result.r).toBeGreaterThan(60);
    expect(result.b).toBeGreaterThan(60);
    expect(result.style).toMatch(/^rgba\(/);
  });
});
