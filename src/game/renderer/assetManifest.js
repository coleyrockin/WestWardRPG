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
  // Buildings tower ~2.5× over the ~1.8-tall character — frontier false-fronts,
  // big enough to read as real buildings without crowding the street.
  // `windowLight` adds warm emissive window panes + a soft interior PointLight on
  // the road-facing side so buildings read as occupied at dusk instead of dark boxes.
  saloon: { url: "/models/building_saloon.glb", scale: 2.1, windowLight: { color: "#ffb867", intensity: 2.0, distance: 6.5, height: 1.7 } },
  saloonFacade: { url: "/models/saloon_facade.glb", scale: 1.45, windowLight: { color: "#ffb867", intensity: 1.4, distance: 5.5, height: 1.55 } },
  storefront: { url: "/models/building_store.glb", scale: 2.0, windowLight: { color: "#ffc070", intensity: 1.8, distance: 6, height: 1.6 } },
  town: { url: "/models/building_house.glb", scale: 1.95, windowLight: { color: "#ffbf72", intensity: 1.6, distance: 6, height: 1.5 } },
  ranch: { url: "/models/building_house.glb", scale: 2.05, windowLight: { color: "#ffbf72", intensity: 1.6, distance: 6, height: 1.5 } },
  gate: { url: "/models/building_gate.glb", scale: 2.05 },
  // hero + dressing (Batch A)
  brokenWagon: { url: "/models/wagon_salvage.glb", scale: 0.95 },
  wagonSalvage: { url: "/models/wagon_salvage.glb", scale: 1.0 },
  cactus: { url: "/models/cactus.glb", scale: 1.0, vary: true },
  deadTree: { url: "/models/dead_tree.glb", scale: 0.85, vary: true },
  rock: { url: "/models/rock.glb", scale: 1.0, vary: true },
  boulder: { url: "/models/boulder.glb", scale: 1.0, vary: true },
  // boundary ring (Batch B) — the backdrop silhouette
  mesa: { url: "/models/mesa.glb", scale: 1.0, vary: true },
  mesaSilhouette: { url: "/models/mesa_silhouette.glb", scale: 1.0, vary: true },
  cliff: { url: "/models/cliff.glb", scale: 1.0, vary: true },
  // structures + lights (Batch B)
  watchtower: { url: "/models/watchtower.glb", scale: 0.55, light: { color: "#ffcc80", intensity: 10, distance: 16, decay: 1.8, height: 4.75 } },
  landmark: { url: "/models/watchtower.glb", scale: 0.55, light: { color: "#ffcc80", intensity: 10, distance: 16, decay: 1.8, height: 4.75 } },
  lamp: { url: "/models/lamp.glb", scale: 1.6, light: { color: "#ffc08a", intensity: 2.25, distance: 5.2, decay: 2, height: 1.55 } },
  lampTall: { url: "/models/lamp_tall.glb", scale: 1.0, light: { color: "#ffc08a", intensity: 1.85, distance: 5.0, decay: 2, height: 1.9 } },
  lampLow: { url: "/models/lamp_low.glb", scale: 1.0, light: { color: "#ffc08a", intensity: 1.2, distance: 3.8, decay: 2, height: 1.2 } },
  jobBoard: { url: "/models/jobBoard_v2.glb", scale: 1.05, yaw: Math.PI / 2, light: { color: "#ffc080", intensity: 2.15, distance: 4.6, decay: 2, height: 2.25 } },
  fence: { url: "/models/fence.glb", scale: 1.5 },
  sign: { url: "/models/sign.glb", scale: 1.2 },
  roadSign: { url: "/models/sign.glb", scale: 1.35 },
  roadPlank: { url: "/models/road_plank.glb", scale: 1.8 },
  slimeTell: { url: "/models/slime_tell.glb", scale: 1.0 },
  road: { url: "/models/road.glb", scale: 1.6 },
  porch: { url: "/models/porch.glb", scale: 0.9 },
  cart: { url: "/models/cart.glb", scale: 1.4 },
  crate: { url: "/models/crate.glb", scale: 1.6 },
};

export function modelFor(kind) {
  return MODELS[kind] || null;
}
