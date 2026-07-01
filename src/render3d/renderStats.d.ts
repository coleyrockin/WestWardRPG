export function createFrameTimingSampler(opts?: { sampleSize?: number }): {
  sample(now: number): void;
  summary(): {
    sampleCount: number;
    lastMs: number | null;
    avgMs: number | null;
    minMs: number | null;
    maxMs: number | null;
    fps: number | null;
  };
};

export function collectSceneStats(scene: any): {
  meshCount: number;
  instancedMeshCount: number;
  materialCount: number;
  geometryCount: number;
  textureCount: number;
  shadowCasterCount: number;
  shadowReceiverCount: number;
  visibleObjectCount: number;
  sceneObjectCount: number;
};

export function createRenderStatsProbe(opts?: any): () => any;
