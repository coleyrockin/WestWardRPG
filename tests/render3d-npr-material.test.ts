import { describe, it, expect } from "vitest";
// @ts-expect-error — three types aren't resolved under the test tsconfig
import * as THREE from "three";
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
    // hybrid 5-step ramp, blended between steps (soft-quantized Lambert)
    expect(mat.gradientMap).toBeTruthy();
    expect(mat.gradientMap.image.width).toBe(5);
    expect(mat.gradientMap.minFilter).toBe(1006); // THREE.LinearFilter
    expect(mat.gradientMap.magFilter).toBe(1006);
  });

  it("keeps the classic 3-step cel ramp available, hard-edged, per-ramp cached", () => {
    const cel3 = celGradientMap([85, 145, 255]);
    expect(cel3.image.width).toBe(3);
    expect(cel3.minFilter).toBe(1003); // THREE.NearestFilter — classic cel stays crisp
    expect(cel3).not.toBe(celGradientMap()); // distinct from the hybrid default
    expect(cel3).toBe(celGradientMap([85, 145, 255])); // cached per steps key
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

  it("caches and shares identical material instances", () => {
    const mat1 = createNprMaterial("#caa66c", { opacity: 0.5 });
    const mat2 = createNprMaterial("#caa66c", { opacity: 0.5 });
    expect(mat1).toBe(mat2);

    const matDifferent = createNprMaterial("#caa66c", { opacity: 0.8 });
    expect(mat1).not.toBe(matDifferent);
  });

  it("exposes a Fresnel rim node factory", () => {
    expect(fresnelRimNode(2.5)).toBeTruthy();
  });

  it("stays faceted flat-colour when no map is supplied", () => {
    const mat = createNprMaterial("#caa66c");
    expect(mat.flatShading).toBe(true);
    expect(mat.colorNode == null).toBe(true); // no albedo override
  });

  it("uses a painted albedo map when supplied (textured cel, smooth by default)", () => {
    const tex = new THREE.DataTexture(new Uint8Array([200, 150, 100, 255]), 1, 1);
    tex.needsUpdate = true;
    const mat = createNprMaterial("#ffffff", { map: tex });
    expect(mat.colorNode).toBeTruthy(); // texture(uv) graph wired in
    expect(mat.flatShading).toBe(false); // textured assets keep smooth normals
    expect(mat.isMeshToonNodeMaterial).toBe(true); // still cel-banded
  });
});
