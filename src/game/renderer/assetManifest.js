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
  saloon: { url: "/models/building_saloon.glb", scale: 2.1, windowLight: { color: "#e78f49", intensity: 0.32, distance: 4.6, height: 1.7 } },
  saloonFacade: { url: "/models/saloon_facade.glb", scale: 1.45, windowLight: { color: "#e78f49", intensity: 0.28, distance: 4.0, height: 1.55 } },
  townFacadeWarm: { url: "/models/town_facade_warm.glb", scale: 1.0, windowLight: { color: "#e79851", intensity: 0.26, distance: 3.8, height: 1.45 } },
  townFacadeStore: { url: "/models/town_facade_store.glb", scale: 1.0, windowLight: { color: "#eca158", intensity: 0.24, distance: 3.7, height: 1.35 } },
  townFacadeDark: { url: "/models/town_facade_dark.glb", scale: 1.0, windowLight: { color: "#d68145", intensity: 0.22, distance: 3.3, height: 1.25 } },
  storefront: { url: "/models/building_store.glb", scale: 2.0, windowLight: { color: "#eaa058", intensity: 0.30, distance: 4.4, height: 1.6 } },
  town: { url: "/models/building_house.glb", scale: 1.95, windowLight: { color: "#eaa058", intensity: 0.28, distance: 4.5, height: 1.5 } },
  ranch: { url: "/models/building_house.glb", scale: 2.05, windowLight: { color: "#eaa058", intensity: 0.28, distance: 4.5, height: 1.5 } },
  gate: { url: "/models/building_gate.glb", scale: 2.05 },
  // hero + dressing (Batch A)
  brokenWagon: { url: "/models/wagon_wreck_hero_v2.glb", scale: 1.0 },
  wagonSalvage: { url: "/models/wagon_salvage.glb", scale: 1.0 },
  brokenFence: { url: "/models/broken_fence_scrap.glb", scale: 1.0, vary: true },
  sageCluster: { url: "/models/sage_cluster.glb", scale: 1.0, vary: true },
  roadGrass: { url: "/models/road_grass_cluster.glb", scale: 1.0, vary: true },
  cactus: { url: "/models/cactus.glb", scale: 1.0, vary: true },
  deadTree: { url: "/models/dead_tree.glb", scale: 0.85, vary: true },
  rock: { url: "/models/rock.glb", scale: 1.0, vary: true },
  boulder: { url: "/models/boulder.glb", scale: 1.0, vary: true },
  // boundary ring (Batch B) — the backdrop silhouette
  mesa: { url: "/models/mesa.glb", scale: 1.0, vary: true },
  mesaSilhouette: { url: "/models/mesa_silhouette.glb", scale: 1.0, vary: true },
  mesaSkyline: { url: "/models/mesa_skyline.glb", scale: 1.0, vary: true },
  heroMesaSkyline: { url: "/models/hero_mesa_skyline.glb", scale: 1.0, vary: true },
  cliff: { url: "/models/cliff.glb", scale: 1.0, vary: true },
  // structures + lights (Batch B)
  watchtower: { url: "/models/watchtower.glb", scale: 0.55, light: { color: "#ffcc80", intensity: 10, distance: 16, decay: 1.8, height: 4.75 } },
  landmark: { url: "/models/watchtower.glb", scale: 0.55, light: { color: "#ffcc80", intensity: 10, distance: 16, decay: 1.8, height: 4.75 } },
  lamp: { url: "/models/lamp.glb", scale: 1.6, light: { color: "#ffc08a", intensity: 2.25, distance: 5.2, decay: 2, height: 1.55 } },
  lampTall: { url: "/models/lamp_tall.glb", scale: 1.0, light: { color: "#ffc08a", intensity: 1.85, distance: 5.0, decay: 2, height: 1.9 } },
  lampLow: { url: "/models/lamp_low.glb", scale: 1.0, light: { color: "#ffc08a", intensity: 1.2, distance: 3.8, decay: 2, height: 1.2 } },
  jobBoard: { url: "/models/jobBoard_hero.glb", scale: 1.06, yaw: Math.PI / 2, light: { color: "#ffb86f", intensity: 1.75, distance: 4.4, decay: 2.1, height: 2.3 } },
  // Main-street buildings: at scale 1.0 they rendered ~1.2-1.5u tall — shorter than the
  // 1.8u hero (toy-diorama read). Now a modest 1.5x footprint × heightMul 1.9 → ~3.5u tall
  // false-fronts with doorways taller than the player, WITHOUT the footprint growing enough
  // to crowd the road/camera. windowLight heights ride effScale so they stay put.
  // Tall false-front storefronts: wider footprint (1.65x) + a modest height boost
  // (heightMul ~1.5) so they read as imposing 1-2 story western shops with doorways
  // taller than the 1.8u hero — not the narrow skyscrapers an aggressive heightMul gave.
  heroTownSaloon: { url: "/models/hero_town_saloon.glb", scale: 1.75, heightMul: 1.65, windowLight: { color: "#ffb867", intensity: 0.34, distance: 5.0, height: 1.55 } },
  heroTownStore: { url: "/models/hero_town_store.glb", scale: 1.68, heightMul: 1.58, windowLight: { color: "#ffc070", intensity: 0.30, distance: 4.7, height: 1.4 } },
  heroTownAssay: { url: "/models/hero_town_assay.glb", scale: 1.65, heightMul: 1.52, windowLight: { color: "#ffad6a", intensity: 0.26, distance: 4.2, height: 1.25 } },
  productionBoardwalk: { url: "/models/production_boardwalk.glb", scale: 1.35 },
  productionSaloon: { url: "/models/production_saloon.glb", scale: 1.72, heightMul: 1.62, windowLight: { color: "#dc8342", intensity: 0.30, distance: 4.4, height: 1.7 } },
  productionStore: { url: "/models/production_store.glb", scale: 1.68, heightMul: 1.55, windowLight: { color: "#e59b52", intensity: 0.28, distance: 4.1, height: 1.55 } },
  productionAssay: { url: "/models/production_assay.glb", scale: 1.65, heightMul: 1.48, windowLight: { color: "#d57a3e", intensity: 0.24, distance: 3.7, height: 1.45 } },
  roadSlime: { url: "/models/marsh_slime_cluster.glb", scale: 1.15, light: { color: "#58d040", intensity: 1.4, distance: 4.5, decay: 2, height: 0.5 } },
  windowGlowPanel: { url: "/models/window_glow_panel.glb", scale: 0.84, light: { color: "#d87538", intensity: 0.22, distance: 2.6, decay: 2, height: 0.7 } },
  hangingSign: { url: "/models/hanging_sign.glb", scale: 1.0, light: { color: "#e5aa58", intensity: 0.18, distance: 2.5, decay: 2, height: 1.25 } },
  hitchingRail: { url: "/models/hitching_rail.glb", scale: 1.0 },
  barrelCrateCluster: { url: "/models/barrel_crate_cluster.glb", scale: 1.0, vary: true },
  npcSilhouette: { url: "/models/npc_silhouette.glb", scale: 1.0, vary: true },
  lanternString: { url: "/models/lantern_string.glb", scale: 1.0, light: { color: "#df7f3c", intensity: 0.38, distance: 3.2, decay: 2, height: 1.75 } },
  mudRutDecal: { url: "/models/mud_rut_decal.glb", scale: 1.0, vary: true },
  dustSmokePlume: { url: "/models/dust_smoke_plume.glb", scale: 1.0, vary: true },
  bountyEmblem: { url: "/models/bounty_emblem.glb", scale: 1.0, light: { color: "#ffd77b", intensity: 0.55, distance: 2.8, decay: 2, height: 1.1 } },
  fence: { url: "/models/fence.glb", scale: 1.5 },
  sign: { url: "/models/sign.glb", scale: 1.2 },
  roadSign: { url: "/models/sign.glb", scale: 1.35 },
  roadPlank: { url: "/models/road_plank.glb", scale: 0.95 },
  roadRut: { url: "/models/road_rut_strip.glb", scale: 0.62 },
  slimeTell: { url: "/models/slime_trail_hero.glb", scale: 1.0 },
  slimeTrailHero: { url: "/models/slime_trail_hero.glb", scale: 1.0, vary: true },
  marshCluster: { url: "/models/slime_trail_hero.glb", scale: 1.0, vary: true },
  road: { url: "/models/road.glb", scale: 1.6 },
  porch: { url: "/models/porch.glb", scale: 0.9 },
  cart: { url: "/models/cart.glb", scale: 1.4 },
  crate: { url: "/models/crate.glb", scale: 1.6 },
  // R4.6 — Eastwater Ranch animals
  // Horse: authored 1.5u tall at withers × 1.9u long; scale 1.0 maps 1:1.
  // Placed at the hitching rail; head-bob ±4° period 3.2 s in stepWorld.
  horseHitched: { url: "/models/horse_hitched.glb", scale: 1.0, vary: true },
  // Cattle: authored 1.1u tall × 1.7u long; scale 1.0 maps 1:1.
  // Scatter 6-8 in the paddock (x 118-128); optional breath-sway 0.04 amp in stepWorld.
  cattle: { url: "/models/cattle.glb", scale: 1.0, vary: true },
};

export function modelFor(kind) {
  return MODELS[kind] || null;
}
