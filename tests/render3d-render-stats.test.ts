import { describe, expect, it } from "vitest";
import {
  collectSceneStats,
  createFrameTimingSampler,
  createRenderStatsProbe,
} from "../src/render3d/renderStats.js";

function makeScene(nodes: any[]) {
  return {
    traverse(fn: (node: any) => void) {
      for (const node of nodes) fn(node);
    },
  };
}

describe("renderStats", () => {
  it("samples frame timing as avg ms and fps", () => {
    const timing = createFrameTimingSampler({ sampleSize: 3 });
    timing.sample(0);
    timing.sample(16);
    timing.sample(34);
    timing.sample(50);

    const summary = timing.summary();
    expect(summary.sampleCount).toBe(3);
    expect(summary.lastMs).toBe(16);
    expect(summary.avgMs).toBeCloseTo((16 + 18 + 16) / 3, 4);
    expect(summary.fps).toBeGreaterThan(50);
  });

  it("counts meshes, instancing, materials, textures, shadows, and visibility", () => {
    const tex = { isTexture: true };
    const matA = { map: tex };
    const matB = {};
    const geo = {};
    const scene = makeScene([
      { visible: true },
      { isMesh: true, visible: true, geometry: geo, material: matA, castShadow: true, receiveShadow: true },
      { isInstancedMesh: true, visible: false, geometry: geo, material: [matA, matB], castShadow: false },
    ]);

    const stats = collectSceneStats(scene as any);
    expect(stats.meshCount).toBe(2);
    expect(stats.instancedMeshCount).toBe(1);
    expect(stats.materialCount).toBe(2);
    expect(stats.geometryCount).toBe(1);
    expect(stats.textureCount).toBe(1);
    expect(stats.shadowCasterCount).toBe(1);
    expect(stats.shadowReceiverCount).toBe(1);
    expect(stats.visibleObjectCount).toBe(2);
    expect(stats.sceneObjectCount).toBe(3);
  });

  it("returns the full debug stats shape while preserving legacy aliases", () => {
    const timing = createFrameTimingSampler();
    timing.sample(0);
    timing.sample(20);
    const probe = createRenderStatsProbe({
      scene: makeScene([
        { isMesh: true, visible: true, geometry: {}, material: {}, castShadow: true },
      ]) as any,
      renderer: {
        info: {
          render: { calls: 12, triangles: 345 },
          memory: { geometries: 9, textures: 4 },
          programs: [{}, {}],
        },
      } as any,
      backend: "webgl",
      reducedFidelity: true,
      frameTiming: timing,
      getPlayerPosition: () => ({ x: 9.5, z: 8.5 }),
    });

    const stats = probe();
    expect(stats.backend).toBe("webgl");
    expect(stats.reducedFidelity).toBe(true);
    expect(stats.drawCalls).toBe(12);
    expect(stats.calls).toBe(12);
    expect(stats.triangles).toBe(345);
    expect(stats.geometries).toBe(9);
    expect(stats.textures).toBe(4);
    expect(stats.meshCount).toBe(1);
    expect(stats.meshes).toBe(1);
    expect(stats.materialCount).toBe(1);
    expect(stats.shadowCasterCount).toBe(1);
    expect(stats.shadowCasters).toBe(1);
    expect(stats.visibleObjectCount).toBe(1);
    expect(stats.sceneObjectCount).toBe(1);
    expect(stats.frame?.avgMs).toBe(20);
    expect(stats.player).toEqual({ x: 9.5, z: 8.5 });
  });
});
