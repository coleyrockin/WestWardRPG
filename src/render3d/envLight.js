// Golden-hour image-based lighting (IBL) for the Westward Believability Pass.
//
// The town pivoted to naturalistic PBR (MeshStandardNodeMaterial), but the scene
// had ONLY analytic lights (one hemisphere + three directional). PBR metals have
// no diffuse term — with no environment to reflect they read dark/black, and even
// dielectric surfaces miss the soft ambient specular that sells "real". This adds
// a cheap golden-hour environment so metals gleam and every PBR surface picks up
// indirect light keyed to the warm sky.
//
// Source is a tiny procedural vertical gradient (warm zenith → bright golden
// horizon → cool dim ground bounce), prefiltered once through PMREMGenerator into
// a roughness-aware CubeUV map and assigned to scene.environment. A smooth
// gradient carries no high-frequency detail, so the small source is invisible
// after prefiltering — the cheapest IBL that still reads as golden hour.
//
// One node graph runs on both the WebGPU and WebGL2 backends (the renderer's two
// paths), so the env lands on the owner's WebGPU machine and the WebGL2 capture
// alike. Install is awaited at boot BEFORE the first rendered frame so the
// deterministic ?visual golden capture always sees the same env.

import * as THREE from "three";
import { PMREMGenerator } from "three/webgpu";

// Golden-hour gradient stops in LINEAR RGB (HDR — horizon may exceed 1 so the sun
// band drives a real specular pop). t = 0 at the zenith (sky overhead), t = 1 at
// the nadir (ground straight down); the brightest warm band sits at the horizon.
const ZENITH = [0.85, 0.72, 0.55]; // warm high sky
const HORIZON = [1.18, 0.82, 0.5]; // golden-hour sun band (brightest, >1 = HDR)
const NADIR = [0.16, 0.15, 0.16]; // cool, dim ground bounce

const lerp = (a, b, k) => a + (b - a) * k;

// Pure: the RGBA float pixels of the equirect gradient, row-major, length w*h*4.
// Equirect latitude runs top→bottom over the rows, so the gradient varies with
// row only (longitude is uniform → a smooth sky dome). Alpha is 1.
export function goldenHourEnvPixels(w, h) {
  const px = new Float32Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const t = h === 1 ? 0 : y / (h - 1); // 0 = zenith row, 1 = nadir row
    let r, g, b;
    if (t <= 0.5) {
      const k = t / 0.5; // zenith → horizon
      r = lerp(ZENITH[0], HORIZON[0], k);
      g = lerp(ZENITH[1], HORIZON[1], k);
      b = lerp(ZENITH[2], HORIZON[2], k);
    } else {
      const k = (t - 0.5) / 0.5; // horizon → nadir
      r = lerp(HORIZON[0], NADIR[0], k);
      g = lerp(HORIZON[1], NADIR[1], k);
      b = lerp(HORIZON[2], NADIR[2], k);
    }
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 1;
    }
  }
  return px;
}

// Build the equirect DataTexture (float, HDR-capable) from the gradient. Small by
// design — PMREM prefiltering blurs away any size limit on a smooth gradient.
export function buildGoldenHourEnvTexture(w = 16, h = 8) {
  const tex = new THREE.DataTexture(goldenHourEnvPixels(w, h), w, h, THREE.RGBAFormat, THREE.FloatType);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.wrapS = THREE.RepeatWrapping; // longitude wraps
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.NoColorSpace; // env data is already linear
  tex.needsUpdate = true;
  return tex;
}

// Async: prefilter the gradient and assign it to scene.environment. Awaited at
// boot so the env is live before the first frame. Defensive — a PMREM failure on
// any backend logs and degrades to no-IBL (the pre-pass behaviour) rather than
// breaking boot. Returns the PMREM RenderTarget (or null on failure) for disposal.
export async function installGoldenHourEnv(scene, renderer, opts = {}) {
  const intensity = opts.intensity ?? 0.9;
  let pmrem = null;
  let src = null;
  try {
    src = buildGoldenHourEnvTexture();
    pmrem = new PMREMGenerator(renderer);
    // Sync prefilter: createRenderer already awaited renderer.init(), so the
    // device is ready and the deprecated async variant isn't needed.
    const rt = pmrem.fromEquirectangular(src);
    scene.environment = rt.texture;
    scene.environmentIntensity = intensity;
    return rt;
  } catch (err) {
    console.warn("[envLight] golden-hour IBL install failed; continuing without an env map", err);
    return null;
  } finally {
    if (src) src.dispose();
    if (pmrem) pmrem.dispose();
  }
}
