import { describe, expect, it } from "vitest";
import {
  deathCollapse,
  hitFlash,
  idleBob,
  interactGlow,
  rewardPop,
  stagger,
  walkBob,
} from "../src/render3d/animationHelpers.js";

function fakeMesh() {
  return {
    position: { x: 0, y: 1, z: 0 },
    scale: { y: 1 },
    material: { emissiveIntensity: 0.5 },
    userData: {},
  };
}

describe("render3d animation helpers", () => {
  it("idleBob mutates position.y from a remembered base", () => {
    const mesh = fakeMesh();
    idleBob(mesh, Math.PI / 6, 0.1);
    expect(mesh.position.y).not.toBe(1);
    idleBob(mesh, 0, 0.1);
    expect(mesh.position.y).toBeCloseTo(1);
  });

  it("walkBob raises the mesh with a speed-scaled gait", () => {
    const mesh = fakeMesh();
    walkBob(mesh, Math.PI / 16, 1);
    expect(mesh.position.y).toBeGreaterThan(1);
  });

  it("interactGlow and hitFlash update emissive intensity", () => {
    const mesh = fakeMesh();
    interactGlow(mesh, 0);
    expect(mesh.material.emissiveIntensity).toBeGreaterThan(0.5);
    hitFlash(mesh, 4);
    expect(mesh.material.emissiveIntensity).toBe(4);
  });

  it("stagger moves along a supplied direction", () => {
    const mesh = fakeMesh();
    stagger(mesh, { x: 1, z: -1 }, 1);
    expect(mesh.position.x).toBeGreaterThan(0);
    expect(mesh.position.z).toBeLessThan(0);
  });

  it("deathCollapse reduces scale.y but keeps a visible sliver", () => {
    const mesh = fakeMesh();
    deathCollapse(mesh, 1);
    expect(mesh.scale.y).toBeCloseTo(0.02);
  });

  it("rewardPop records a DOM-overlay friendly reward descriptor", () => {
    const scene: { userData: { rewardPops?: any[] } } = { userData: {} };
    const pop = rewardPop(scene, { x: 1, y: 2, z: 3 }, "+1 Map Scrap");
    expect(pop).toEqual({
      kind: "rewardPop",
      text: "+1 Map Scrap",
      position: { x: 1, y: 2, z: 3 },
    });
    expect(scene.userData.rewardPops).toEqual([pop]);
  });
});
