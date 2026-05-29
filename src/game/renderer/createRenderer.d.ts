import type { WebGPURenderer } from "three/webgpu";

export type RendererBackend = "webgpu" | "webgl";

export interface CreateRendererOptions {
  preserveDrawingBuffer?: boolean;
  pixelRatioCap?: number;
  forceWebGL?: boolean;
  antialias?: boolean;
}

export interface CreatedRenderer {
  renderer: WebGPURenderer;
  backend: RendererBackend;
}

export function webgpuAvailable(): boolean;
export function createRenderer(
  canvas: HTMLCanvasElement,
  opts?: CreateRendererOptions,
): Promise<CreatedRenderer>;
export function resolveBackend(renderer: WebGPURenderer): RendererBackend;
