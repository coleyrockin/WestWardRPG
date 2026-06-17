import { describe, it, expect } from "vitest";
// @ts-expect-error — three types aren't resolved under the test tsconfig
import * as THREE from "three";
// @ts-expect-error — JS module, no types
import { createGroundedMaterial, clearGroundedCache } from "../src/game/renderer/materials/groundedMaterial.js";

// Structure tests for the naturalistic (PBR) material builder — the grounded
// "Red Dead-lite" half of the Westward believability pass. Same (hex, opts)
// interface as createNprMaterial so town builders swap factories without changing
// call sites, but it constructs a MeshStandardNodeMaterial with real
// roughness/metalness instead of the cel gradient ramp. Pure: builds node
// materials in node (no renderer/GPU). Pixel fidelity is the golden-image gate's job.

describe("grounded (PBR) material", () => {
  it("builds a MeshStandardNodeMaterial (no cel gradient map)", () => {
    const mat = createGroundedMaterial("#8a6a44");
    expect(mat.isMeshStandardNodeMaterial).toBe(true);
    expect(mat.gradientMap == null).toBe(true); // not toon — no cel banding
  });

  it("carries base color through", () => {
    const mat = createGroundedMaterial("#4a8a2e");
    expect(mat.color.getHexString()).toBe("4a8a2e");
  });

  it("defaults to a weathered/matte surface (high roughness, non-metal)", () => {
    const mat = createGroundedMaterial("#8a6a44");
    expect(mat.roughness).toBeGreaterThan(0.7);
    expect(mat.metalness).toBe(0);
  });

  it("applies real roughness/metalness overrides (rusted-metal path)", () => {
    const mat = createGroundedMaterial("#6b5a4a", { roughness: 0.55, metalness: 0.4 });
    expect(mat.roughness).toBeCloseTo(0.55);
    expect(mat.metalness).toBeCloseTo(0.4);
  });

  it("supports emissive neon/lamp glow (color + intensity)", () => {
    const plain = createGroundedMaterial("#3a2718");
    expect(plain.emissiveIntensity).toBeCloseTo(1);
    const neon = createGroundedMaterial("#111111", { emissive: "#ff2d6a", emissiveIntensity: 2.2 });
    expect(neon.emissive.getHexString()).toBe("ff2d6a");
    expect(neon.emissiveIntensity).toBeCloseTo(2.2);
  });

  it("passes transparency + opacity through", () => {
    const mat = createGroundedMaterial("#ddd5c8", { transparent: true, opacity: 0.3 });
    expect(mat.transparent).toBe(true);
    expect(mat.opacity).toBeCloseTo(0.3);
  });

  it("stays faceted flat-colour when no texture is supplied", () => {
    const mat = createGroundedMaterial("#8a6a44");
    expect(mat.flatShading).toBe(true);
    expect(mat.map == null).toBe(true);
  });

  it("wires albedo / normal / roughness maps and smooths when textured", () => {
    const tex = () => {
      const t = new THREE.DataTexture(new Uint8Array([200, 150, 100, 255]), 1, 1);
      t.needsUpdate = true;
      return t;
    };
    const albedo = tex();
    const normal = tex();
    const rough = tex();
    const mat = createGroundedMaterial("#ffffff", { map: albedo, normalMap: normal, roughnessMap: rough });
    expect(mat.map).toBe(albedo);
    expect(mat.normalMap).toBe(normal);
    expect(mat.roughnessMap).toBe(rough);
    expect(mat.flatShading).toBe(false); // textured surfaces keep smooth normals
  });

  it("caches and shares identical material instances; differs on params", () => {
    clearGroundedCache();
    const a = createGroundedMaterial("#8a6a44", { roughness: 0.8 });
    const b = createGroundedMaterial("#8a6a44", { roughness: 0.8 });
    expect(a).toBe(b);
    const c = createGroundedMaterial("#8a6a44", { roughness: 0.5 });
    expect(a).not.toBe(c);
  });
});
