import { describe, it, expect } from "vitest";
// @ts-expect-error — JS module, no types
import { goldenHourEnvPixels } from "../src/render3d/envLight.js";

// luma of an RGBA pixel at row y (any x — the gradient is uniform per row)
const rowLuma = (px: Float32Array, w: number, y: number) => {
  const i = y * w * 4;
  return 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
};

describe("goldenHourEnvPixels — the IBL gradient", () => {
  it("returns w*h*4 finite, non-negative RGBA floats with alpha 1", () => {
    const w = 16, h = 8;
    const px = goldenHourEnvPixels(w, h);
    expect(px.length).toBe(w * h * 4);
    for (let i = 0; i < px.length; i++) {
      expect(Number.isFinite(px[i])).toBe(true);
      expect(px[i]).toBeGreaterThanOrEqual(0);
    }
    for (let p = 3; p < px.length; p += 4) expect(px[p]).toBe(1); // alpha
  });

  it("is uniform across each row (longitude carries no variation)", () => {
    const w = 16, h = 8;
    const px = goldenHourEnvPixels(w, h);
    for (let y = 0; y < h; y++) {
      const base = y * w * 4;
      for (let x = 1; x < w; x++) {
        const i = base + x * 4;
        expect(px[i]).toBeCloseTo(px[base], 6);     // R
        expect(px[i + 1]).toBeCloseTo(px[base + 1], 6); // G
        expect(px[i + 2]).toBeCloseTo(px[base + 2], 6); // B
      }
    }
  });

  it("peaks at the horizon band and is dimmest at the nadir (ground)", () => {
    const w = 4, h = 9;
    const px = goldenHourEnvPixels(w, h);
    const zenith = rowLuma(px, w, 0);
    const horizon = rowLuma(px, w, (h - 1) / 2); // middle row ≈ horizon
    const nadir = rowLuma(px, w, h - 1);
    expect(horizon).toBeGreaterThan(zenith); // golden sun band is brightest
    expect(horizon).toBeGreaterThan(nadir);
    expect(zenith).toBeGreaterThan(nadir);    // sky brighter than ground bounce
  });

  it("is warm — red dominates blue everywhere except the neutral ground", () => {
    const w = 4, h = 8;
    const px = goldenHourEnvPixels(w, h);
    for (let y = 0; y < h - 1; y++) { // skip the near-neutral nadir row
      const i = y * w * 4;
      expect(px[i]).toBeGreaterThan(px[i + 2]); // R > B → warm
    }
  });

  it("handles a degenerate single-row height without NaN", () => {
    const px = goldenHourEnvPixels(2, 1);
    expect(px.length).toBe(8);
    for (const v of px) expect(Number.isFinite(v)).toBe(true);
  });
});
