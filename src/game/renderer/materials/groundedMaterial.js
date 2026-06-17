// Naturalistic (PBR) material — the grounded "Red Dead-lite" half of the Westward
// believability pass (docs/superpowers/specs/2026-06-16-westward-believability-pass-design.md).
//
// The town pivots OFF the cel/ink NPR look: this builds a MeshStandardNodeMaterial
// (real roughness/metalness microfacet response + soft lighting) instead of the
// MeshToonNodeMaterial cel gradient ramp, so weathered timber reads as weathered
// timber and rusted metal as rusted metal under the golden-hour key. Ink outlines
// are dropped globally (postStacks edgeStrength → 0), so this material carries no
// NPR signature at all.
//
// Same (hex, opts) surface contract as createNprMaterial — a drop-in for the town
// builders' `standard()` wrapper — but it actually honours roughness/metalness
// (the toon factory accepted and ignored them). Authored via the node material so
// one graph runs on the WebGPURenderer's WebGPU and WebGL2 backends.

import * as THREE from "three";
import { MeshStandardNodeMaterial } from "three/webgpu";

const col = (hex) => new THREE.Color(hex);

const groundedCache = new Map();

export function clearGroundedCache() {
  groundedCache.clear();
}

// opts: { roughness, metalness, emissive, emissiveIntensity, transparent, opacity,
//         flatShading, map, normalMap, roughnessMap }
// Defaults to a weathered, matte, non-metal surface (timber/plaster/dirt). Callers
// override per material kind: rusted metal (lower roughness + metalness), glass,
// or an emissive neon/lamp. A painted/normal map switches to smooth normals so the
// texture detail isn't flattened by faceting.
export function createGroundedMaterial(hex, opts = {}) {
  const {
    roughness = 0.85,
    metalness = 0.0,
    emissive = null,
    emissiveIntensity = 1.0,
    transparent = false,
    opacity = 1.0,
    flatShading = true,
    map = null,
    normalMap = null,
    roughnessMap = null,
  } = opts;

  // Faceted low-poly read by default; textured/normal-mapped surfaces keep smooth
  // normals so the map's detail survives (mirrors createNprMaterial's rule).
  const resolvedFlatShading = (map || normalMap) ? (opts.flatShading ?? false) : flatShading;
  const k = (t) => (t ? (t.uuid || t.id || "tex") : "null");
  const cacheKey = [
    hex, roughness, metalness, emissive, emissiveIntensity, transparent, opacity,
    resolvedFlatShading, k(map), k(normalMap), k(roughnessMap),
  ].join("_");

  const cached = groundedCache.get(cacheKey);
  if (cached) return cached;

  const mat = new MeshStandardNodeMaterial({
    color: col(hex),
    roughness,
    metalness,
    transparent,
    opacity,
  });
  mat.flatShading = resolvedFlatShading;
  if (map) mat.map = map;
  if (normalMap) mat.normalMap = normalMap;
  if (roughnessMap) mat.roughnessMap = roughnessMap;
  if (emissive) {
    mat.emissive = col(emissive);
    mat.emissiveIntensity = emissiveIntensity;
  }

  groundedCache.set(cacheKey, mat);
  return mat;
}
