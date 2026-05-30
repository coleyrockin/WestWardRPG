import { describe, it, expect } from "vitest";
// @ts-expect-error — JS module, no types
import { valueNoise2, groundFbm, reliefMask, groundHeight, createGroundMaterial } from "../src/game/world/ground.js";

describe("ground", () => {
  it("value noise stays in [0,1] and is deterministic", () => {
    for (let i = 0; i < 60; i++) {
      const n = valueNoise2(i * 1.7, i * -0.9);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(1);
    }
    expect(valueNoise2(3.2, 4.8)).toBeCloseTo(valueNoise2(3.2, 4.8), 12);
  });

  it("value noise varies across space (not constant)", () => {
    const a = valueNoise2(1.2, 9.4);
    const b = valueNoise2(40.1, -22.3);
    expect(Math.abs(a - b)).toBeGreaterThan(0.001);
  });

  it("builds a toon ground material with a varied colour node", () => {
    const mat = createGroundMaterial();
    expect(mat.isMeshToonNodeMaterial).toBe(true);
    expect(mat.colorNode).toBeTruthy();
    expect(mat.gradientMap).toBeTruthy();
    expect(mat.positionNode).toBeTruthy(); // relief displacement
  });
});

describe("ground relief — FBM field", () => {
  it("stays in [0,1] across the world", () => {
    for (let x = -10; x < 30; x += 3) {
      for (let z = -5; z < 25; z += 3) {
        const v = groundFbm(x, z);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("ground relief — mask", () => {
  it("is 0 in the road/play corridor (z near 8.9)", () => {
    expect(reliefMask(8.9)).toBeCloseTo(0, 6);
    expect(reliefMask(9.5)).toBeCloseTo(0, 6); // spawn row
  });

  it("is 0 in the south marsh basin (z >= 12.5)", () => {
    expect(reliefMask(13)).toBeCloseTo(0, 6);
    expect(reliefMask(16)).toBeCloseTo(0, 6);
  });

  it("ramps up on the framing flanks (north town / far field)", () => {
    expect(reliefMask(2)).toBeGreaterThan(0.5);
    expect(reliefMask(-1)).toBeGreaterThan(0.8);
  });

  it("stays within [0,1] everywhere", () => {
    for (let z = -5; z < 25; z += 0.5) {
      const m = reliefMask(z);
      expect(m).toBeGreaterThanOrEqual(0);
      expect(m).toBeLessThanOrEqual(1);
    }
  });
});

describe("ground relief — height field", () => {
  it("is flat (0) in the gameplay corridor so props don't float", () => {
    expect(groundHeight(9.5, 8.5)).toBeCloseTo(0, 6); // spawn
    expect(groundHeight(12.35, 8.55)).toBeCloseTo(0, 6); // job board
  });

  it("is flat (0) in the marsh basin so terrain never pokes through water", () => {
    expect(groundHeight(17, 16)).toBeCloseTo(0, 6); // water centre
    expect(groundHeight(14, 16.2)).toBeCloseTo(0, 6); // marsh snag
  });

  it("has real relief on the flanks", () => {
    let maxAbs = 0;
    for (let x = -1; x < 29; x += 1.3) maxAbs = Math.max(maxAbs, Math.abs(groundHeight(x, 2)));
    expect(maxAbs).toBeGreaterThan(0.05);
  });

  it("is bounded by the amplitude and deterministic", () => {
    for (let x = -10; x < 30; x += 1.1) {
      for (let z = -5; z < 25; z += 1.1) {
        expect(Math.abs(groundHeight(x, z))).toBeLessThanOrEqual(0.4 + 1e-6);
      }
    }
    expect(groundHeight(5.5, 2.0)).toBe(groundHeight(5.5, 2.0));
  });
});
