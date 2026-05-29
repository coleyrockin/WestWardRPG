import { describe, it, expect } from "vitest";
// @ts-expect-error — JS module, no types
import { createNprMaterial, celGradientMap, fresnelRimNode } from "../src/game/renderer/materials/nprMaterial.js";

// Structure tests for the NPR uber-material builder. Pure: it constructs Three
// node materials in node (no renderer/GPU) and we assert the graph is wired the
// way the look depends on. Pixel fidelity is covered by the golden-image gate.

describe("NPR uber-material", () => {
  it("builds a toon (cel) material with flat shading and the shared gradient map", () => {
    const mat = createNprMaterial("#caa66c");
    expect(mat.isMeshToonNodeMaterial).toBe(true);
    expect(mat.flatShading).toBe(true);
    // hard-stepped cel ramp, sampled without interpolation
    expect(mat.gradientMap).toBeTruthy();
    expect(mat.gradientMap.minFilter).toBe(1003); // THREE.NearestFilter
    expect(mat.gradientMap.magFilter).toBe(1003);
  });

  it("carries base color through", () => {
    const mat = createNprMaterial("#4a8a2e");
    expect(mat.color.getHexString()).toBe("4a8a2e");
  });

  it("always attaches an emissive node (rim light) even with no emissive color", () => {
    const plain = createNprMaterial("#3a2718");
    expect(plain.emissiveNode).toBeTruthy();
    const glowing = createNprMaterial("#ffcf7a", { emissive: "#ffb030", emissiveIntensity: 2.2 });
    expect(glowing.emissiveNode).toBeTruthy();
  });

  it("passes transparency + opacity through", () => {
    const mat = createNprMaterial("#ddd5c8", { transparent: true, opacity: 0.3 });
    expect(mat.transparent).toBe(true);
    expect(mat.opacity).toBeCloseTo(0.3);
  });

  it("shares one cached gradient-map instance across materials", () => {
    expect(celGradientMap()).toBe(celGradientMap());
    expect(createNprMaterial("#111").gradientMap).toBe(createNprMaterial("#222").gradientMap);
  });

  it("exposes a Fresnel rim node factory", () => {
    expect(fresnelRimNode(2.5)).toBeTruthy();
  });
});
