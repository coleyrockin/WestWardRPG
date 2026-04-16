import { describe, it, expect } from "vitest";
import { clamp, lerp, toChannel, computeAtmosphere } from "../atmosphere.ts";

describe("clamp", () => {
  it("returns value when inside range", () => {
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });

  it("clamps below min", () => {
    expect(clamp(-1, 0, 1)).toBe(0);
  });

  it("clamps above max", () => {
    expect(clamp(2, 0, 1)).toBe(1);
  });

  it("handles negative ranges", () => {
    expect(clamp(-5, -10, -1)).toBe(-5);
    expect(clamp(0, -10, -1)).toBe(-1);
  });
});

describe("lerp", () => {
  it("returns a at t=0", () => {
    expect(lerp(10, 20, 0)).toBe(10);
  });

  it("returns b at t=1", () => {
    expect(lerp(10, 20, 1)).toBe(20);
  });

  it("returns midpoint at t=0.5", () => {
    expect(lerp(10, 20, 0.5)).toBe(15);
  });

  it("extrapolates past t=1", () => {
    expect(lerp(0, 10, 2)).toBe(20);
  });
});

describe("toChannel", () => {
  it("floors fractional values", () => {
    expect(toChannel(128.9)).toBe(128);
  });

  it("clamps to 0..255", () => {
    expect(toChannel(-50)).toBe(0);
    expect(toChannel(999)).toBe(255);
  });

  it("keeps in-range integers", () => {
    expect(toChannel(200)).toBe(200);
  });
});

describe("computeAtmosphere", () => {
  it("produces a darker sky at night (day=0) with no weather", () => {
    const { skyTop, skyBottom, stormShade } = computeAtmosphere(0, 0, 0);
    expect(stormShade).toBe(0);
    expect(skyTop.r).toBeLessThan(50);
    expect(skyTop.g).toBeLessThan(50);
    expect(skyBottom.b).toBeGreaterThan(skyTop.b);
  });

  it("produces a bright sky at noon (day=1) with no weather", () => {
    const { skyTop, skyBottom, stormShade } = computeAtmosphere(1, 0, 0);
    expect(stormShade).toBe(0);
    expect(skyTop.b).toBeGreaterThan(200);
    expect(skyBottom.b).toBeGreaterThan(200);
  });

  it("darkens sky when rain increases", () => {
    const clear = computeAtmosphere(1, 0, 0);
    const rainy = computeAtmosphere(1, 1, 0);
    expect(rainy.stormShade).toBeGreaterThan(clear.stormShade);
    expect(rainy.skyTop.r).toBeLessThan(clear.skyTop.r);
  });

  it("darkens sky when fog increases", () => {
    const clear = computeAtmosphere(1, 0, 0);
    const foggy = computeAtmosphere(1, 0, 1);
    expect(foggy.stormShade).toBeGreaterThan(clear.stormShade);
  });

  it("clamps out-of-range inputs without throwing", () => {
    const negative = computeAtmosphere(-5, -5, -5);
    const huge = computeAtmosphere(99, 99, 99);
    expect(negative.stormShade).toBe(0);
    expect(huge.stormShade).toBeCloseTo(0.52, 5);
    for (const v of [negative.skyTop, negative.skyBottom, huge.skyTop, huge.skyBottom]) {
      expect(v.r).toBeGreaterThanOrEqual(0);
      expect(v.r).toBeLessThanOrEqual(255);
      expect(v.g).toBeGreaterThanOrEqual(0);
      expect(v.g).toBeLessThanOrEqual(255);
      expect(v.b).toBeGreaterThanOrEqual(0);
      expect(v.b).toBeLessThanOrEqual(255);
    }
  });

  it("is deterministic for identical inputs", () => {
    const a = computeAtmosphere(0.4, 0.3, 0.2);
    const b = computeAtmosphere(0.4, 0.3, 0.2);
    expect(a).toEqual(b);
  });

  it("returns all channels as integers in valid range", () => {
    for (let day = 0; day <= 1; day += 0.25) {
      for (let rain = 0; rain <= 1; rain += 0.5) {
        for (let fog = 0; fog <= 1; fog += 0.5) {
          const { skyTop, skyBottom } = computeAtmosphere(day, rain, fog);
          for (const v of [skyTop.r, skyTop.g, skyTop.b, skyBottom.r, skyBottom.g, skyBottom.b]) {
            expect(Number.isInteger(v)).toBe(true);
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThanOrEqual(255);
          }
        }
      }
    }
  });
});
