// NPR uber-material — the surface half of WestWard's "moving graphic novel"
// look (docs/roadmap.md §3, Bet 1). Authored in TSL so one graph runs on the
// WebGPURenderer's WebGPU and WebGL2 backends alike.
//
// Two signatures layered on a shadow-receiving toon base:
//   1. Cel banding — MeshToonNodeMaterial quantizes N·L through a hard 3-step
//      gradient map (NearestFilter, no interpolation) for flat painted bands
//      that still respond to the live palette sun + shadows.
//   2. Fresnel rim — a view-dependent edge term added to emissive so silhouettes
//      separate from the dark, like inked highlights on a panel.
// flatShading keeps the faceted low-poly read. This is a drop-in for the old
// MeshStandardMaterial factory: same (hex, opts) surface params.

import * as THREE from "three";
import { MeshToonNodeMaterial } from "three/webgpu";
import {
  vec3,
  float,
  dot,
  pow,
  normalize,
  saturate,
  transformedNormalView,
  positionViewDirection,
  texture,
  uv,
} from "three/tsl";

const col = (hex) => new THREE.Color(hex);

// Shared gradient maps for every NPR surface, cached per ramp (the old cache
// ignored `steps` after the first call — custom ramps silently got the default).
//
// Ramp history:
//   [55,100,255] → 55 (≈21%) shadow band × dark albedos crushed faces to near-black (murk).
//   [100,160,255] → safe floor; bands separated but shadows felt light / low drama.
//   [85,145,255] → "cel3": hard 3-step inked-panel banding (NearestFilter) — the
//                  original graphic-novel look, kept for stylized one-offs.
//   HYBRID_RAMP_STEPS (5 steps + LinearFilter) → current default: "soft-quantized
//   Lambert". Lighting reads continuous — sun shadows and form shading actually
//   land instead of being swallowed between three hard bands — while the step
//   structure keeps a painterly identity. The realistic-leaning hybrid pivot.
export const HYBRID_RAMP_STEPS = [60, 105, 150, 200, 255];
const gradientMaps = new Map();
export function celGradientMap(steps = HYBRID_RAMP_STEPS) {
  const key = steps.join(",");
  const cached = gradientMaps.get(key);
  if (cached) return cached;
  const data = Uint8Array.from(steps);
  const tex = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
  // 3-step ramps stay hard-edged (NearestFilter, classic cel); wider ramps blend
  // between steps (LinearFilter) so shading reads continuous.
  const filter = steps.length <= 3 ? THREE.NearestFilter : THREE.LinearFilter;
  tex.minFilter = filter;
  tex.magFilter = filter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  gradientMaps.set(key, tex);
  return tex;
}

// Fresnel edge factor in [0,1]: ~0 facing the camera, ~1 at grazing silhouettes.
export function fresnelRimNode(power = 3.0) {
  const ndv = saturate(dot(normalize(transformedNormalView), normalize(positionViewDirection)));
  return ndv.oneMinus().pow(power);
}

// Build the emissive node = constant base glow (slime/lamp/beacon) + rim light.
function emissiveNodeFor({ emissive, emissiveIntensity, rimColor, rimPower, rimStrength }) {
  const base = emissive
    ? (() => {
        const c = col(emissive);
        return vec3(c.r, c.g, c.b).mul(emissiveIntensity);
      })()
    : vec3(0, 0, 0);
  const rc = col(rimColor);
  const rim = vec3(rc.r, rc.g, rc.b).mul(fresnelRimNode(rimPower)).mul(rimStrength);
  return base.add(rim);
}

// Drop-in replacement for the old `standard(hex, opts)` factory.
// opts: { emissive, emissiveIntensity, transparent, opacity, flatShading,
//         rimColor, rimPower, rimStrength, map }
// `map` (a THREE.Texture) is the painted albedo: sampled via TSL texture(uv) and
// tinted by hex, then run through the cel ramp (textured cel — proven on the
// WebGL2 backend). Flat-colour assets omit it and are unchanged. roughness/
// metalness are accepted and ignored (toon has no microfacet term).
export function createNprMaterial(hex, opts = {}) {
  const {
    emissive = null,
    emissiveIntensity = 1.0,
    transparent = false,
    opacity = 1.0,
    flatShading = true,
    rimColor = "#9fb4ff",
    rimPower = 2.8,     // wider silhouette coverage (was 3.5 — too tight, missed wide-angle edges)
    rimStrength = 0.45, // eased from 1.0 — real shadows + the 5-step ramp now do
                        // silhouette separation; full-strength rim read as a glow outline

    map = null,
  } = opts;

  const mat = new MeshToonNodeMaterial({
    color: col(hex),
    gradientMap: celGradientMap(),
    transparent,
    opacity,
  });
  // Textured assets keep their own smooth normals; flat-colour dressing stays faceted.
  mat.flatShading = map ? (opts.flatShading ?? false) : flatShading;
  if (map) {
    const c = col(hex);
    mat.colorNode = texture(map, uv()).mul(vec3(c.r, c.g, c.b));
  }
  mat.emissiveNode = emissiveNodeFor({ emissive, emissiveIntensity, rimColor, rimPower, rimStrength });
  return mat;
}
