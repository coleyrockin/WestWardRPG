import { describe, it, expect } from "vitest";
// @ts-expect-error — JS module, no types
import { waveHeight, createWaterMaterial, createWater } from "../src/game/world/water.js";

describe("water", () => {
  it("wave height is finite and bounded to ±0.08", () => {
    for (let i = 0; i < 50; i++) {
      const h = waveHeight(i * 0.7, i * 1.3, i * 0.11);
      expect(Number.isFinite(h)).toBe(true);
      expect(Math.abs(h)).toBeLessThanOrEqual(0.0801);
    }
  });

  it("wave height is deterministic per (x,y,t)", () => {
    expect(waveHeight(3, 4, 1.5)).toBeCloseTo(waveHeight(3, 4, 1.5), 12);
  });

  it("builds a water material with the time + skyTint uniforms wired", () => {
    const { material, uniforms } = createWaterMaterial();
    expect(material.isMeshBasicNodeMaterial).toBe(true);
    expect(material.transparent).toBe(true);
    expect(material.positionNode).toBeTruthy();
    expect(material.colorNode).toBeTruthy();
    expect(uniforms.time).toBeTruthy();
    expect(uniforms.skyTint.value.isColor).toBe(true);
  });

  it("builds a segmented surface mesh", () => {
    const { mesh } = createWater({ width: 13, height: 5.5 });
    expect(mesh.isMesh).toBe(true);
    expect(mesh.geometry.parameters.widthSegments).toBeGreaterThan(1);
  });
});
