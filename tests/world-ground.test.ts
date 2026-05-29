import { describe, it, expect } from "vitest";
// @ts-expect-error — JS module, no types
import { valueNoise2, createGroundMaterial } from "../src/game/world/ground.js";

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
  });
});
