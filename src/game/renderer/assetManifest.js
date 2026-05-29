// Asset manifest — the single registry mapping logical model keys to their .glb
// URL plus default placement transform. Authored in Blender, exported to
// public/models/. The spike resolves a placement's `kind` to a manifest entry;
// kinds without an entry fall back to procedural primitives, so models can be
// swapped in one at a time.

// `scale` multiplies the placement's own p.size; `yaw` is an extra base rotation
// (radians); `vary:true` adds a deterministic per-placement yaw so repeated
// dressing isn't uniform; `light` attaches a PointLight (height in local units).
// Authored in tools/blender/, exported to public/models/.
export const MODELS = {
  // buildings (western false-front variants)
  saloon: { url: "/models/building_saloon.glb", scale: 0.8 },
  storefront: { url: "/models/building_store.glb", scale: 0.85 },
  town: { url: "/models/building_house.glb", scale: 0.8 },
  ranch: { url: "/models/building_house.glb", scale: 0.9 },
  gate: { url: "/models/building_gate.glb", scale: 0.9 },
  // hero + dressing (Batch A)
  brokenWagon: { url: "/models/wagon.glb", scale: 0.85 },
  cactus: { url: "/models/cactus.glb", scale: 1.0, vary: true },
  deadTree: { url: "/models/dead_tree.glb", scale: 0.85, vary: true },
  rock: { url: "/models/rock.glb", scale: 1.0, vary: true },
  boulder: { url: "/models/boulder.glb", scale: 1.0, vary: true },
  // boundary ring (Batch B) — the backdrop silhouette
  mesa: { url: "/models/mesa.glb", scale: 1.0, vary: true },
  cliff: { url: "/models/cliff.glb", scale: 1.0, vary: true },
  // structures + lights (Batch B)
  watchtower: { url: "/models/watchtower.glb", scale: 0.55, light: { color: "#ffcc80", intensity: 18, distance: 22, decay: 1.8, height: 4.75 } },
  landmark: { url: "/models/watchtower.glb", scale: 0.55, light: { color: "#ffcc80", intensity: 18, distance: 22, decay: 1.8, height: 4.75 } },
  lamp: { url: "/models/lamp.glb", scale: 1.6, light: { color: "#ffcaa0", intensity: 5.5, distance: 7, decay: 2, height: 1.55 } },
  jobBoard: { url: "/models/jobBoard.glb", scale: 1.0, yaw: Math.PI / 2, light: { color: "#ffd090", intensity: 6, distance: 7, decay: 1.8, height: 2.3 } },
  fence: { url: "/models/fence.glb", scale: 1.5 },
  sign: { url: "/models/sign.glb", scale: 1.2 },
  road: { url: "/models/road.glb", scale: 1.6 },
  porch: { url: "/models/porch.glb", scale: 0.9 },
  cart: { url: "/models/cart.glb", scale: 1.4 },
  crate: { url: "/models/crate.glb", scale: 1.6 },
};

export function modelFor(kind) {
  return MODELS[kind] || null;
}
