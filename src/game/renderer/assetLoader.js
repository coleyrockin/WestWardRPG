// glTF asset pipeline for the WestWard 3D engine (docs/roadmap.md §P1 asset
// pipeline). Models are authored in Blender, exported as .glb to public/models/,
// and served same-origin by Vite — so GLTFLoader's fetch is covered by the
// strict CSP `connect-src 'self'` with no exceptions. Assets are fetched, not
// bundled (bundle discipline).
//
// Loaded meshes are re-skinned with the NPR cel+rim uber-material so authored
// models match the procedural dressing's look; ink edges come from the post
// stack automatically. Geometry is cached and instanced via clone() so repeated
// props (fences, rocks) share one buffer.

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createNprMaterial } from "./materials/nprMaterial.js";

const loader = new GLTFLoader();
const templates = new Map(); // url -> Promise<THREE.Object3D>

// Re-skin every mesh in a loaded tree with the NPR material, carrying the glTF
// material's base + emissive colour so authored tints survive.
function applyNpr(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    const src = Array.isArray(o.material) ? o.material[0] : o.material;
    const hex = src && src.color ? `#${src.color.getHexString()}` : "#9a8f80";
    const hasEmissive = src && src.emissive && src.emissive.getHexString() !== "000000";
    o.material = createNprMaterial(
      hex,
      hasEmissive ? { emissive: `#${src.emissive.getHexString()}`, emissiveIntensity: src.emissiveIntensity ?? 1 } : {},
    );
  });
  return root;
}

// Load a .glb once; the returned template is shared (do not mutate it — use
// instanceModel for placeable copies).
export function loadModel(url, { npr = true } = {}) {
  if (!templates.has(url)) {
    templates.set(
      url,
      loader.loadAsync(url).then((gltf) => (npr ? applyNpr(gltf.scene) : gltf.scene)),
    );
  }
  return templates.get(url);
}

// Load + return a fresh instance positioned in the world. Geometry/materials are
// shared with the template; only the transform is per-instance.
// opts: { x, z, y, yaw, scale }  (world x/z plane, y up — engine convention)
export async function instanceModel(url, opts = {}) {
  const template = await loadModel(url, opts);
  const node = template.clone(true);
  const { x = 0, z = 0, y = 0, yaw = 0, scale = 1 } = opts;
  node.position.set(x, y, z);
  node.rotation.y = yaw;
  node.scale.setScalar(scale);
  return node;
}

export function clearAssetCache() {
  templates.clear();
}

// Deterministic yaw in [0, 2π) from a world position — used to vary the rotation
// of repeated dressing (the 16-piece mesa ring, rocks, cacti) so identical models
// don't all face the same way. Pure: same (x,z) → same yaw, so renders stay
// stable for the golden-image gate.
export function hashYaw(x, z) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return (s - Math.floor(s)) * Math.PI * 2;
}

// Re-exported for callers that want to tag/inspect what the loader produced.
export const ASSET_ROOT = "/models/";
export { THREE as _three };
