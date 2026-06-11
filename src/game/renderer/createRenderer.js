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
// browsers often leave `navigator.gpu` undefined; automated Chromium can expose
// `navigator.gpu` but hang during adapter init. Playwright/CI therefore forces
// the WebGL2 backend so render smoke and screenshot proof cannot stall on a
// browser-process GPU probe.
export function webgpuAvailable() {
  return typeof navigator !== "undefined" && !!navigator.gpu && navigator.webdriver !== true;
}

// Create + initialise the renderer. Async because WebGPURenderer must `init()`
// (device/adapter acquisition + backend selection) before its first render.
// Returns the renderer plus the resolved backend string so callers/tests can
// assert which path is live.
export async function createRenderer(canvas, opts = {}) {
  const {
    preserveDrawingBuffer = false,
    // Caps the full post stack (Sobel+bloom+godrays+AO+grade+grain) fragment
    // cost on HiDPI. Dropped 1.5 → 1.25 for the open-range world: ≈ −31% more
    // fragments with no perceptible NPR-look loss (cel/ink are low-frequency);
    // stability/input-latency on big displays beats sub-pixel crispness.
    pixelRatioCap = 1.25,
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

  // init() acquires the GPU device / selects the backend. If BOTH WebGPU and the
  // WebGL2 fallback fail (no GL context, blacklisted driver, lost device), surface
  // a readable message instead of a silent blank canvas, then rethrow so the
  // caller's catch can log it.
  try {
    await renderer.init();
  } catch (err) {
    if (typeof document !== "undefined" && document.body) {
      const msg = document.createElement("div");
      msg.style.cssText =
        "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;" +
        "padding:2rem;text-align:center;font:600 16px system-ui,sans-serif;color:#e8c8a0;" +
        "background:#1a1226;z-index:9999";
      msg.textContent =
        "WestWard couldn't start the 3D renderer — your browser or GPU may not support WebGL2/WebGPU.";
      document.body.appendChild(msg);
    }
    throw err;
  }

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
