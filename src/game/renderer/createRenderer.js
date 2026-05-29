// Backend-adaptive renderer factory for the WestWard 3D engine.
//
// The signature non-photorealistic look is authored once in TSL (Three Shading
// Language), which only runs on `WebGPURenderer`. That renderer picks a backend
// automatically: real WebGPU when the browser exposes `navigator.gpu`, and its
// WebGL2 backend everywhere else (older GPUs, itch.io offline, and — critically —
// the headless SwiftShader CI harness, which has no WebGPU adapter). Authoring in
// TSL therefore targets *both* backends from a single material graph, satisfying
// the roadmap's "WebGPU + WebGL2 fallback" bet (docs/roadmap.md §3, Bet 3).
//
// This is a thin shell: it constructs and configures the renderer and reports
// which backend it landed on. No scene/material/look logic lives here.

import * as THREE from "three";
import { WebGPURenderer } from "three/webgpu";

// True when a real WebGPU adapter is reachable. SwiftShader headless and older
// browsers leave `navigator.gpu` undefined, so we force the WebGL2 backend there
// rather than paying for a failing async adapter probe.
export function webgpuAvailable() {
  return typeof navigator !== "undefined" && !!navigator.gpu;
}

// Create + initialise the renderer. Async because WebGPURenderer must `init()`
// (device/adapter acquisition + backend selection) before its first render.
// Returns the renderer plus the resolved backend string so callers/tests can
// assert which path is live.
export async function createRenderer(canvas, opts = {}) {
  const {
    preserveDrawingBuffer = false,
    pixelRatioCap = 2,
    forceWebGL = !webgpuAvailable(),
    antialias = true,
  } = opts;

  const renderer = new WebGPURenderer({
    canvas,
    antialias,
    forceWebGL,
    // Lets the spike-compare script grab a frame between RAF ticks; cheap on a
    // single dev/spike route.
    ...(preserveDrawingBuffer ? { preserveDrawingBuffer: true } : {}),
  });

  const width = typeof window !== "undefined" ? window.innerWidth : 1280;
  const height = typeof window !== "undefined" ? window.innerHeight : 720;
  const ratio = typeof window !== "undefined" ? window.devicePixelRatio : 1;
  renderer.setPixelRatio(Math.min(ratio || 1, pixelRatioCap));
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  await renderer.init();

  return { renderer, backend: resolveBackend(renderer) };
}

// "webgpu" | "webgl" — read after init() resolves the backend.
export function resolveBackend(renderer) {
  const backend = renderer && renderer.backend;
  if (backend && (backend.isWebGPUBackend || /webgpu/i.test(backend.constructor?.name || ""))) {
    return "webgpu";
  }
  return "webgl";
}
