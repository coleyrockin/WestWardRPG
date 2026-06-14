import { describe, it, expect } from "vitest";
// @ts-expect-error — JS module, no types
import { waveHeight, flowOffset, bandQuantize, createWaterMaterial, createWater } from "../src/game/world/water.js";

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

  it("reduced (WebGL2) water is a flat 1×1 quad with no vertex-wave node", () => {
    const { mesh, material } = (() => {
      const w = createWater({ width: 20, height: 6, reduced: true });
      return { mesh: w.mesh, material: w.mesh.material };
    })();
    expect(mesh.geometry.parameters.widthSegments).toBe(1);
    expect(mesh.geometry.parameters.heightSegments).toBe(1);
    expect(material.positionNode).toBeFalsy(); // no per-frame vertex displacement
    expect(material.colorNode).toBeTruthy(); // still cel-shaded + fresnel
  });
});

describe("water — flowOffset (directional flow)", () => {
  it("is static with zero flow", () => {
    expect(flowOffset(5, 3, 0)).toBe(5);
    expect(flowOffset(5, 99, 0)).toBe(5);
  });

  it("advances monotonically with time along the flow component", () => {
    const a = flowOffset(0, 1, 0.5);
    const b = flowOffset(0, 2, 0.5);
    const c = flowOffset(0, 3, 0.5);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
    expect(flowOffset(0, 4, -0.5)).toBeLessThan(0); // negative flow drifts the other way
  });
});

describe("water — bandQuantize (cel banding)", () => {
  it("passes through unchanged when bands < 2 (continuous marsh default)", () => {
    expect(bandQuantize(0.37, 0)).toBe(0.37);
    expect(bandQuantize(0.37, 1)).toBe(0.37);
  });

  it("snaps to n flat steps for bands >= 2", () => {
    // 3 bands → levels {0, 1/3, 2/3}
    expect(bandQuantize(0.1, 3)).toBeCloseTo(0, 6);
    expect(bandQuantize(0.5, 3)).toBeCloseTo(1 / 3, 6);
    expect(bandQuantize(0.9, 3)).toBeCloseTo(2 / 3, 6);
  });

  it("is non-decreasing and clamps out-of-range input", () => {
    let prev = -1;
    for (let i = 0; i <= 20; i++) {
      const q = bandQuantize(i / 20, 4);
      expect(q).toBeGreaterThanOrEqual(prev);
      prev = q;
    }
    expect(bandQuantize(-5, 3)).toBe(0); // clamped low → floor band
    expect(bandQuantize(5, 3)).toBe(1); // clamped to 1.0 → top boundary level
  });
});

describe("water — per-body material params", () => {
  it("builds a banded, flowing river material without error", () => {
    const { material, uniforms } = createWaterMaterial({ bands: 3, flow: [0.4, 0.2], waveAmp: 0.05 });
    expect(material.isMeshBasicNodeMaterial).toBe(true);
    expect(material.positionNode).toBeTruthy();
    expect(material.colorNode).toBeTruthy();
    expect(uniforms.time).toBeTruthy();
  });

  it("honors a custom opacity (deeper ocean/reservoir)", () => {
    const { material } = createWaterMaterial({ opacity: 0.9 });
    expect(material.opacity).toBe(0.9);
  });
});
