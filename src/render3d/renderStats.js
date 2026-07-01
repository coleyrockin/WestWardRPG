function collectMaterials(material, out) {
  if (!material) return;
  if (Array.isArray(material)) {
    for (const item of material) collectMaterials(item, out);
    return;
  }
  out.add(material);
}

function collectTexturesFromMaterial(material, out) {
  if (!material) return;
  if (Array.isArray(material)) {
    for (const item of material) collectTexturesFromMaterial(item, out);
    return;
  }
  for (const value of Object.values(material)) {
    if (value?.isTexture) out.add(value);
  }
}

export function createFrameTimingSampler({ sampleSize = 120 } = {}) {
  const frames = [];
  let lastNow = null;
  let lastMs = null;

  return {
    sample(now) {
      if (!Number.isFinite(now)) return;
      if (lastNow !== null) {
        lastMs = Math.max(0, now - lastNow);
        frames.push(lastMs);
        if (frames.length > sampleSize) frames.shift();
      }
      lastNow = now;
    },
    summary() {
      if (!frames.length) {
        return { sampleCount: 0, lastMs, avgMs: null, minMs: null, maxMs: null, fps: null };
      }
      let sum = 0;
      let min = Infinity;
      let max = -Infinity;
      for (const ms of frames) {
        sum += ms;
        min = Math.min(min, ms);
        max = Math.max(max, ms);
      }
      const avgMs = sum / frames.length;
      return {
        sampleCount: frames.length,
        lastMs,
        avgMs,
        minMs: min,
        maxMs: max,
        fps: avgMs > 0 ? 1000 / avgMs : null,
      };
    },
  };
}

export function collectSceneStats(scene) {
  const materials = new Set();
  const geometries = new Set();
  const textures = new Set();
  const counts = {
    meshCount: 0,
    instancedMeshCount: 0,
    materialCount: 0,
    geometryCount: 0,
    textureCount: 0,
    shadowCasterCount: 0,
    shadowReceiverCount: 0,
    visibleObjectCount: 0,
    sceneObjectCount: 0,
  };

  if (!scene || typeof scene.traverse !== "function") return counts;

  scene.traverse((node) => {
    counts.sceneObjectCount += 1;
    if (node.visible !== false) counts.visibleObjectCount += 1;

    const isMesh = !!(node.isMesh || node.isSkinnedMesh || node.isInstancedMesh);
    if (!isMesh) return;

    counts.meshCount += 1;
    if (node.isInstancedMesh) counts.instancedMeshCount += 1;
    if (node.castShadow) counts.shadowCasterCount += 1;
    if (node.receiveShadow) counts.shadowReceiverCount += 1;
    if (node.geometry) geometries.add(node.geometry);
    collectMaterials(node.material, materials);
    collectTexturesFromMaterial(node.material, textures);
  });

  counts.materialCount = materials.size;
  counts.geometryCount = geometries.size;
  counts.textureCount = textures.size;
  return counts;
}

export function createRenderStatsProbe({
  scene,
  renderer,
  backend = "unknown",
  reducedFidelity = false,
  frameTiming = null,
  getPlayerPosition = null,
} = {}) {
  return () => {
    const renderInfo = renderer?.info?.render || {};
    const memoryInfo = renderer?.info?.memory || {};
    const sceneStats = collectSceneStats(scene);
    const frame = frameTiming && typeof frameTiming.summary === "function"
      ? frameTiming.summary()
      : null;
    const player = typeof getPlayerPosition === "function" ? getPlayerPosition() : null;
    const drawCalls = renderInfo.calls ?? null;
    const triangles = renderInfo.triangles ?? null;
    const geometries = memoryInfo.geometries ?? sceneStats.geometryCount;
    const textures = memoryInfo.textures ?? sceneStats.textureCount;

    return {
      backend,
      reducedFidelity: !!reducedFidelity,
      frame,
      fpsEstimateOrFrameMs: frame?.fps ?? frame?.avgMs ?? null,
      drawCalls,
      triangles,
      geometries,
      textures,
      meshCount: sceneStats.meshCount,
      materialCount: sceneStats.materialCount,
      instancedMeshCount: sceneStats.instancedMeshCount,
      shadowCasterCount: sceneStats.shadowCasterCount,
      visibleObjectCount: sceneStats.visibleObjectCount,
      sceneObjectCount: sceneStats.sceneObjectCount,
      programs: renderer?.info?.programs?.length ?? null,
      player: player ? { x: player.x, z: player.z } : null,

      // Legacy aliases used by older scripts and smoke gates.
      calls: drawCalls,
      meshes: sceneStats.meshCount,
      materials: sceneStats.materialCount,
      instancedMeshes: sceneStats.instancedMeshCount,
      shadowCasters: sceneStats.shadowCasterCount,
    };
  };
}
