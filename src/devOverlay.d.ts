export interface DevMetrics {
  fps: number; frameTime: number; particleCount: number; gridBuckets: number;
  activeEnemies: number; statusEffects: string; ambientDrone: string;
  postFxEnabled: boolean; ngPlusLevel: number; fogDiscovery: number;
}
export function createDevMetrics(): DevMetrics;
export function tickDevMetrics(metrics: DevMetrics, dt: number): void;
export function drawDevOverlay(ctx: CanvasRenderingContext2D, metrics: DevMetrics): void;
