// Data-driven placement records for the Dustward (frontier) opening scene.
//
// This mirrors the Canvas scene so the Three.js spike is an honest comparison.
// Source of truth for the dressing offsets is REGION_PRESENTATION.frontier in
// src/regionVisualIdentity.js; hero-object world positions come from
// src/poiSystem.js and the opening-scene anchors in src/main.js / src/gameFeel.js.
//
// World coordinate system (matches render_game_to_text):
//   +x = east, +y = south. Origin top-left of the world map.
// The renderer maps world (x, y) -> 3D (X = east, Z = south, Y = up).

export const FRONTIER_ANCHOR = { x: 9.5, y: 8.5 };

// Player spawn — camera origin, looking east down the road.
export const PLAYER_SPAWN = { x: 9.5, y: 8.5 };

export const ROUTE_BEAT_SECONDS = Object.freeze({
  board_choice: 55,
  road_sign: 24,
  road_walk: 28,
  cache_clue: 42,
  slime_tell: 28,
  slime_fight: 54,
  wagon_salvage: 34,
  return_to_boone: 32,
});

export const FIRST_ROAD_ART_STYLE = Object.freeze({
  roadWidth: 7.25,
  openingRoadWidth: 6.75,
  shoulderWidth: 2.65,
  minNaturalClusters: 24,
  minProductionStreetProps: 36,
  minStorefronts: 6,
  minNpcSilhouettes: 6,
  minWindowLights: 10,
});

export const FIRST_FIVE_ROUTE = Object.freeze([
  { kind: "spawn", label: "Dustward Spawn", x: PLAYER_SPAWN.x, y: PLAYER_SPAWN.y },
  { kind: "jobBoard", label: "Boone's Job Board", x: 13.0, y: 5.65 },
  { kind: "roadSign", label: "Marshal Road Sign", x: 24.0, y: 6.3 },
  { kind: "townBark", label: "Town Edge Warning", x: 32.0, y: 9.2 },
  { kind: "smokeCache", label: "Smoke Cache", x: 41.0, y: 13.2 },
  { kind: "slimeTell", label: "Slime Trail", x: 48.2, y: 16.4 },
  { kind: "roadSlime", label: "Road Slime", x: 53.5, y: 15.0 },
  { kind: "brokenWagon", label: "Broken Wagon", x: 60.5, y: 12.2 },
  { kind: "returnJobBoard", label: "Return To Boone", x: 13.0, y: 5.65 },
]);

const OUTBOUND_ROUTE = FIRST_FIVE_ROUTE.filter((point) => point.kind !== "returnJobBoard");

function hash01(seed) {
  const s = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

function routePlanks() {
  const planks = [];
  for (let seg = 1; seg < OUTBOUND_ROUTE.length; seg++) {
    const from = OUTBOUND_ROUTE[seg - 1];
    const to = OUTBOUND_ROUTE[seg];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.1) continue;
    const yaw = Math.atan2(dx, dy);
    const count = Math.max(1, Math.floor(len / 2.8));
    const nx = -dy / len;
    const ny = dx / len;
    for (let i = 1; i <= count; i++) {
      const t = i / (count + 1);
      const side = ((i + seg) % 2 === 0 ? -1 : 1) * (4.7 + (i % 3) * 0.28);
      planks.push({
        kind: "roadPlank",
        label: `Road Plank ${seg}-${i}`,
        x: from.x + dx * t + nx * side,
        y: from.y + dy * t + ny * side,
        yaw,
        color: "#735332",
        size: 0.58,
      });
    }
  }
  return planks;
}

function routeRuts() {
  const ruts = [];
  for (let seg = 1; seg < OUTBOUND_ROUTE.length; seg++) {
    const from = OUTBOUND_ROUTE[seg - 1];
    const to = OUTBOUND_ROUTE[seg];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.1) continue;
    const yaw = Math.atan2(dx, dy);
    const count = Math.max(1, Math.floor(len / 3.2));
    for (let i = 1; i <= count; i++) {
      const t = i / (count + 1);
      ruts.push({
        kind: "roadRut",
        label: `Road Rut ${seg}-${i}`,
        x: from.x + dx * t,
        y: from.y + dy * t,
        yaw,
        color: "#6f4f31",
        size: 0.76,
      });
    }
  }
  return ruts;
}

function routeNaturalClusters() {
  const clusters = [];
  // Per-leg density: dense town opening, sparse frontier legs, marsh shoulder only.
  const legDensity = [1.0, 0.85, 0.72, 0.62, 0.55, 0.58, 0.5, 0.48];
  for (let seg = 1; seg < OUTBOUND_ROUTE.length; seg++) {
    const from = OUTBOUND_ROUTE[seg - 1];
    const to = OUTBOUND_ROUTE[seg];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.1) continue;
    const nx = -dy / len;
    const ny = dx / len;
    const density = legDensity[Math.min(seg - 1, legDensity.length - 1)] ?? 0.5;
    const minPerSeg = seg <= 3 ? 2 : 1;
    const count = Math.max(minPerSeg, Math.floor(len / 4.4 * density));
    const oneSided = seg >= 4; // negative space: sparse legs dress one shoulder only
    for (let i = 0; i < count; i++) {
      const t = (i + 0.45 + hash01(seg * 37 + i) * 0.25) / count;
      const sideSign = oneSided ? 1 : (hash01(seg * 101 + i * 17) > 0.5 ? 1 : -1);
      const shoulder = sideSign * (5.3 + hash01(seg * 59 + i * 23) * 2.6);
      const alongJitter = (hash01(seg * 71 + i * 29) - 0.5) * 0.7;
      const kind = i % 3 === 0 ? "sageCluster" : "roadGrass";
      clusters.push({
        kind,
        label: `${kind === "sageCluster" ? "Sage" : "Road Grass"} Cluster ${seg}-${i}`,
        x: from.x + dx * t + nx * shoulder + (dx / len) * alongJitter,
        y: from.y + dy * t + ny * shoulder + (dy / len) * alongJitter,
        yaw: Math.atan2(dx, dy) + (hash01(seg * 83 + i * 31) - 0.5) * 0.8,
        color: kind === "sageCluster" ? "#70814b" : "#8f8a56",
        size: 0.7 + hash01(seg * 97 + i * 43) * 0.55,
      });
    }
  }
  return clusters;
}

// Dressing offsets relative to FRONTIER_ANCHOR, lifted verbatim from
// REGION_PRESENTATION.frontier. depthLane drives subtle scale/elevation cues.
const VISTAS = [
  { kind: "townFacadeWarm", label: "Boone Back Office", dx: -3.7, dy: -4.25, color: "#b99462", size: 0.34, depthLane: "background" },
  { kind: "watchtower", label: "Watchtower Frame",  dx: 5.3,  dy: -3.25,  color: "#ffd77b", size: 0.96, depthLane: "background" },
  { kind: "townFacadeStore", label: "Far Storefront", dx: -1.65, dy: -4.45, color: "#856342", size: 0.3, depthLane: "background" },
  { kind: "townFacadeDark", label: "Back Alley Assay", dx: -2.5, dy: -5.1, color: "#6a4a30", size: 0.24, depthLane: "background" },
  { kind: "brokenFence", label: "Ranch Rail",        dx: -1.15, dy: 4.6,   color: "#8d6540", size: 0.42, depthLane: "foreground" },
];

// Cleared: these five sign posts resolved onto the road centreline (y≈8.5–9.1,
// 1.3u apart) and read as a picket fence of identical markers straight down the
// opening lane. The road planes, ruts, and shoulder planks already mark the route,
// so the lane stays clean. (Add route signage on the shoulders if needed later.)
const ROADS = [];

const PROPS = [
  { kind: "sign",  label: "Boone Road Sign",    dx: 1.5,  dy: 0.9,  color: "#ffd77b", size: 0.82, depthLane: "foreground" },
  { kind: "fence", label: "Left Split Fence",   dx: 2.1,  dy: 1.8,  color: "#a47b4c", size: 0.6,  depthLane: "foreground" },
  { kind: "fence", label: "Right Split Fence",  dx: 3.4,  dy: -1.1, color: "#a47b4c", size: 0.54, depthLane: "midground" },
  { kind: "cart",  label: "Supply Cart",        dx: 3.2,  dy: -0.7, color: "#b9824d", size: 0.7,  depthLane: "midground" },
  { kind: "lamp",  label: "Road Lantern",       dx: 5.0,  dy: 0.5,  color: "#ffd77b", size: 0.68, depthLane: "midground" },
  { kind: "lamp",  label: "Board Lantern",      dx: 1.0,  dy: -0.5, color: "#ffe6a8", size: 0.58, depthLane: "midground" },
  { kind: "lamp",  label: "Town Gate Lantern",  dx: 3.0,  dy: -0.7, color: "#ffe6a8", size: 0.56, depthLane: "background" },
  { kind: "crate", label: "Barricade Crates",   dx: 2.6,  dy: 1.2,  color: "#b9824d", size: 0.62, depthLane: "foreground" },
];

// Corridor framing — props in the spawn→board wedge (absolute coords) that turn
// the road's first stretch into a readable street: a pair of lanterns flanking the
// path right out of spawn, a directional signpost, and a hitching rail edge. These
// lead the eye east toward Boone's board without crowding the walking lane.
const ROAD_CORRIDOR = [
  { kind: "lampLow",  label: "Spawn Lantern Left",  x: 10.4, y: 4.7,  color: "#ffe6a8", size: 0.62 },
  { kind: "lampLow",  label: "Spawn Lantern Right", x: 10.4, y: 13.2, color: "#ffe6a8", size: 0.62 },
  { kind: "sign",  label: "Road Sign — Board",   x: 11.2, y: 5.35, color: "#ffd77b", size: 0.8 },
  { kind: "roadGrass", label: "Opening Grass Left", x: 8.6, y: 5.65, color: "#8f8a56", size: 1.18, yaw: -0.4 },
  { kind: "sageCluster", label: "Opening Sage Right", x: 8.7, y: 11.65, color: "#70814b", size: 1.08, yaw: 0.35 },
  { kind: "roadGrass", label: "Board Shoulder Grass", x: 12.4, y: 10.95, color: "#8f8a56", size: 0.92, yaw: 0.18 },
  { kind: "brokenFence", label: "Corridor Rail North",  x: 11.6, y: 4.9, color: "#a47b4c", size: 0.62, yaw: 0.12 },
  { kind: "brokenFence", label: "Corridor Rail South",  x: 11.8, y: 13.1, color: "#a47b4c", size: 0.6, yaw: -0.16 },
  { kind: "crate", label: "Roadside Crates",      x: 14.2, y: 5.2,  color: "#b9824d", size: 0.6 },
];

const ROUTE_LIGHTS = [
  { kind: "lampTall", label: "Board Road Lamp", x: 15.0, y: 4.1, color: "#ffe6a8", size: 0.86 },
  { kind: "lampTall", label: "Marshal Bend Lamp", x: 25.2, y: 4.2, color: "#ffd8a0", size: 0.82 },
  { kind: "lampLow", label: "Town Edge Low Lamp", x: 32.2, y: 12.1, color: "#ffd8a0", size: 0.74 },
  { kind: "lampLow", label: "Cache Glimmer Lamp", x: 41.9, y: 9.6, color: "#ffc88d", size: 0.7 },
  { kind: "lampLow", label: "Wagon Salvage Lamp", x: 60.0, y: 12.0, color: "#ffc88d", size: 0.72 },
];

// Tall hero landmark — should read as the tallest first-view shape.
const LANDMARK = { kind: "landmark", label: "North Watchtower Beacon", dx: 5.16, dy: -1.66, color: "#ffd77b", size: 1.84, depthLane: "background" };

// Hero objects at their real gameplay world positions (not anchor-relative).
const HERO_OBJECTS = [
  { kind: "jobBoard",    label: "Boone's Job Board", x: 13.0, y: 5.65, color: "#d8a84f", size: 1.0 },
  { kind: "roadSign",    label: "Marshal Road Sign", x: 24.0, y: 6.3,  color: "#ffd77b", size: 1.0 },
  { kind: "townBark",    label: "Town Edge Warning", x: 32.0, y: 9.2,  color: "#ffe0a0", size: 0.8 },
  { kind: "smokeCache",  label: "Smoke Cache",       x: 41.0, y: 13.2, color: "#caa15a", size: 0.9 },
  { kind: "slimeTell",   label: "Slime Trail",       x: 48.2, y: 16.4, color: "#75d06b", size: 1.0 },
  { kind: "roadSlime",   label: "Road Slime",        x: 53.5, y: 15.0, color: "#7fd06a", size: 0.9 },
  { kind: "brokenWagon", label: "Broken Wagon",      x: 60.5, y: 12.2, color: "#b9824d", size: 1.2 },
];

// --- Bigger-world expansion -------------------------------------------------
// The zone arrays below use ABSOLUTE world coordinates (not anchor-relative
// dx/dy), because the depth-spread scheme gets unwieldy at world scale. They
// turn the diorama slice into a roamable frontier while honouring three rules:
//   1. Spawn point (9.5, 8.5) stays clear of any blocking prop.
//   2. The spawn→hero wedge (~x[9.5..16], y[6.5..11]) stays free of tall props
//      so the opening camera keeps the board + cluster cleanly framed.
//   3. The mesa/cliff ring overlaps with no gap > player diameter (~0.6) so the
//      player can roam but never walk off the ground plane.

// Walkable town edge to the NW of spawn — spread along a proper main street so
// buildings don't overlap (each saloon/store is ~2.8 units wide at scale 1.0-1.35,
// so min 3.5 units clear between centres; larger buildings need 4+).
const TOWN_EDGE = [
  { kind: "heroTownSaloon", label: "Dustward Saloon",  x: -6.0, y: -0.25, color: "#a87848", size: 0.92 },
  { kind: "heroTownStore", label: "Dry Goods Store",  x: 0.5,  y: -0.3, color: "#9a7840", size: 0.78 },
  { kind: "heroTownAssay", label: "Assay Office", x: 6.2, y: -0.25, color: "#886038", size: 0.68 },
  { kind: "porch",        label: "Saloon Porch",     x: -5.2, y: 1.75, color: "#5a4327", size: 0.62 },
  { kind: "porch",        label: "Store Porch",      x: 0.8,  y: 1.75, color: "#5a4327", size: 0.58 },
  { kind: "lamp",         label: "Saloon Lamp",      x: -1.9, y: 2.25, color: "#ffe0a0", size: 0.44, depthLane: "foreground" },
  { kind: "sign",         label: "Saloon Shingle",   x: -5.2, y: 0.05, color: "#ffd77b", size: 0.56 },
  { kind: "fence",        label: "Town Hitching Rail", x: 6.8, y: 2.65, color: "#a47b4c", size: 0.55, depthLane: "foreground" },
  { kind: "cactus",       label: "Town Cactus",      x: -1.3, y: 6.9,  color: "#5c7a3a", size: 0.64 },
];

const PRODUCTION_MAIN_STREET = [
  // North boardwalk/storefront edge. Facades sit just outside the first-frame
  // blocker audit band while their windows/signs still read in the opening shot.
  { kind: "productionSaloon", label: "Drifter Saloon", x: 6.4, y: 1.75, color: "#a87848", size: 0.88, yaw: 0 },
  { kind: "productionStore", label: "Lamp Dry Goods", x: 11.4, y: 1.55, color: "#9a7840", size: 0.84, yaw: 0 },
  { kind: "productionAssay", label: "Boone Assay", x: 16.2, y: 1.62, color: "#886038", size: 0.78, yaw: 0 },
  { kind: "productionBoardwalk", label: "North Boardwalk", x: 6.7, y: 3.28, color: "#5d3f24", size: 0.92, yaw: 0 },
  { kind: "productionBoardwalk", label: "North Boardwalk", x: 10.1, y: 3.28, color: "#5d3f24", size: 0.92, yaw: 0 },
  { kind: "productionBoardwalk", label: "North Boardwalk", x: 13.5, y: 3.28, color: "#5d3f24", size: 0.92, yaw: 0 },
  { kind: "productionBoardwalk", label: "North Boardwalk", x: 16.9, y: 3.28, color: "#5d3f24", size: 0.88, yaw: 0 },
  { kind: "hangingSign", label: "Drifter Sign", x: 7.05, y: 3.55, color: "#ffd77b", size: 0.9, yaw: 0.08 },
  { kind: "hangingSign", label: "Dry Goods Sign", x: 12.0, y: 3.5, color: "#ffd77b", size: 0.82, yaw: -0.06 },
  { kind: "windowGlowPanel", label: "Saloon Window Glow", x: 5.35, y: 3.18, color: "#ffad63", size: 1.0, yaw: 0 },
  { kind: "windowGlowPanel", label: "Saloon Window Glow", x: 7.4, y: 3.18, color: "#ffad63", size: 1.0, yaw: 0 },
  { kind: "windowGlowPanel", label: "Store Window Glow", x: 10.65, y: 3.12, color: "#ffbf72", size: 0.9, yaw: 0 },
  { kind: "windowGlowPanel", label: "Store Window Glow", x: 12.15, y: 3.12, color: "#ffbf72", size: 0.9, yaw: 0 },
  { kind: "windowGlowPanel", label: "Marshal Hall Window Glow", x: 21.92, y: 3.42, color: "#ff9f5d", size: 0.74, yaw: -0.04 },
  { kind: "lanternString", label: "North Lantern String", x: 11.0, y: 4.15, color: "#ffb866", size: 0.9, yaw: 0 },

  // South boardwalk/storefront edge, mirrored to frame the road without
  // swallowing the third-person camera or blocking the spawn-to-board lane.
  { kind: "productionStore", label: "Dustward Hotel", x: 7.2, y: 15.25, color: "#9a7144", size: 0.74, yaw: Math.PI },
  { kind: "productionSaloon", label: "South Porch Saloon", x: 12.2, y: 15.48, color: "#7a5230", size: 0.76, yaw: Math.PI },
  { kind: "productionAssay", label: "Marshal Office", x: 17.0, y: 15.3, color: "#6a4630", size: 0.7, yaw: Math.PI },
  { kind: "productionStore", label: "Roadside Undertaker", x: 20.6, y: 13.7, color: "#70452f", size: 0.82, yaw: Math.PI - 0.08 },
  { kind: "productionSaloon", label: "Far South Hotel", x: 24.4, y: 13.0, color: "#583626", size: 0.68, yaw: Math.PI - 0.12 },
  { kind: "productionBoardwalk", label: "South Boardwalk", x: 6.7, y: 13.42, color: "#5d3f24", size: 0.88, yaw: Math.PI },
  { kind: "productionBoardwalk", label: "South Boardwalk", x: 10.1, y: 13.42, color: "#5d3f24", size: 0.9, yaw: Math.PI },
  { kind: "productionBoardwalk", label: "South Boardwalk", x: 13.5, y: 13.42, color: "#5d3f24", size: 0.9, yaw: Math.PI },
  { kind: "productionBoardwalk", label: "South Boardwalk", x: 16.9, y: 13.42, color: "#5d3f24", size: 0.86, yaw: Math.PI },
  { kind: "productionBoardwalk", label: "Undertaker Boardwalk", x: 20.5, y: 12.08, color: "#4a3423", size: 0.78, yaw: Math.PI - 0.08 },
  { kind: "windowGlowPanel", label: "Hotel Window Glow", x: 6.52, y: 13.72, color: "#ffbf72", size: 0.9, yaw: Math.PI },
  { kind: "windowGlowPanel", label: "Hotel Window Glow", x: 7.92, y: 13.72, color: "#ffbf72", size: 0.9, yaw: Math.PI },
  { kind: "windowGlowPanel", label: "South Saloon Glow", x: 11.35, y: 13.76, color: "#ffad63", size: 1.0, yaw: Math.PI },
  { kind: "windowGlowPanel", label: "South Saloon Glow", x: 12.9, y: 13.76, color: "#ffad63", size: 1.0, yaw: Math.PI },
  { kind: "lanternString", label: "South Lantern String", x: 12.0, y: 12.84, color: "#ffb866", size: 0.86, yaw: Math.PI },
  { kind: "windowGlowPanel", label: "Undertaker Window Glow", x: 20.2, y: 12.32, color: "#ff9b58", size: 0.82, yaw: Math.PI - 0.08 },
  { kind: "windowGlowPanel", label: "Far Hotel Window Glow", x: 23.96, y: 11.96, color: "#ff9b58", size: 0.72, yaw: Math.PI - 0.12 },
  { kind: "hangingSign", label: "Undertaker Hanging Sign", x: 19.65, y: 12.28, color: "#ffc66e", size: 0.72, yaw: Math.PI - 0.08 },
  { kind: "lanternString", label: "Street Crossing Lanterns", x: 15.0, y: 8.75, color: "#ffb866", size: 0.74, yaw: Math.PI / 2 },
  { kind: "lanternString", label: "High Street Wire", x: 10.1, y: 8.7, color: "#d88946", size: 1.18, yaw: Math.PI / 2 },
  { kind: "lanternString", label: "Far Bounty Wire", x: 18.4, y: 8.35, color: "#d88946", size: 1.02, yaw: Math.PI / 2 },

  // Bounty street life: silhouettes and props read as inhabited without
  // becoming gameplay blockers in the main road lane.
  { kind: "npcSilhouette", label: "Porch Bounty Hunter", x: 7.9, y: 4.55, color: "#17100c", size: 0.88, yaw: 2.85 },
  { kind: "npcSilhouette", label: "Boardwalk Lookout", x: 11.4, y: 4.4, color: "#17100c", size: 0.78, yaw: 2.95 },
  { kind: "npcSilhouette", label: "Road Deputy", x: 15.4, y: 7.15, color: "#17100c", size: 0.72, yaw: -1.5 },
  { kind: "npcSilhouette", label: "Street Traveler", x: 19.1, y: 7.85, color: "#17100c", size: 0.64, yaw: -1.45 },
  { kind: "npcSilhouette", label: "South Porch Watcher", x: 8.8, y: 12.52, color: "#17100c", size: 0.78, yaw: 0.25 },
  { kind: "npcSilhouette", label: "Lantern Bystander", x: 14.4, y: 12.35, color: "#17100c", size: 0.72, yaw: -0.15 },
  { kind: "npcSilhouette", label: "Undertaker Door Guard", x: 19.35, y: 11.82, color: "#120c09", size: 0.7, yaw: -0.25 },
  { kind: "hitchingRail", label: "North Hitching Rail", x: 5.2, y: 4.55, color: "#4a3526", size: 0.82, yaw: 0.04 },
  { kind: "hitchingRail", label: "South Hitching Rail", x: 15.6, y: 12.55, color: "#4a3526", size: 0.78, yaw: Math.PI - 0.08 },
  { kind: "barrelCrateCluster", label: "Saloon Cargo", x: 4.8, y: 4.25, color: "#7a5230", size: 0.88, yaw: 0.28 },
  { kind: "barrelCrateCluster", label: "Dry Goods Cargo", x: 13.8, y: 4.1, color: "#7a5230", size: 0.82, yaw: -0.18 },
  { kind: "barrelCrateCluster", label: "South Porch Cargo", x: 10.0, y: 12.55, color: "#7a5230", size: 0.84, yaw: 0.12 },
  { kind: "mudRutDecal", label: "Opening Mud Rut", x: 10.8, y: 8.0, color: "#5a3923", size: 1.1, yaw: -0.7 },
  { kind: "mudRutDecal", label: "Board Road Mud Rut", x: 14.2, y: 7.1, color: "#5a3923", size: 1.0, yaw: -0.65 },
  { kind: "mudRutDecal", label: "Saloon Wheel Rut", x: 8.6, y: 9.4, color: "#5a3923", size: 0.82, yaw: -0.55 },
  { kind: "mudRutDecal", label: "Boardwalk Wheel Rut", x: 16.9, y: 8.45, color: "#5a3923", size: 0.9, yaw: -0.62 },
  { kind: "mudRutDecal", label: "Far Street Wheel Rut", x: 21.8, y: 8.7, color: "#5a3923", size: 0.78, yaw: -0.58 },
  { kind: "mudRutDecal", label: "Marshal Road Wheel Rut", x: 25.6, y: 9.65, color: "#5a3923", size: 0.8, yaw: -0.42 },
  { kind: "dustSmokePlume", label: "Boardwalk Dust", x: 8.0, y: 4.85, color: "#b88551", size: 0.9, yaw: 0.2 },
  { kind: "dustSmokePlume", label: "Street Dust", x: 17.6, y: 7.35, color: "#b88551", size: 0.74, yaw: -0.3 },
  { kind: "dustSmokePlume", label: "Far Street Dust", x: 23.2, y: 8.25, color: "#b88551", size: 0.56, yaw: -0.18 },
  { kind: "bountyEmblem", label: "Boone Bounty Emblem", x: 13.0, y: 4.6, color: "#ffd77b", size: 0.75, yaw: Math.PI / 2 },
];

// Cross-street spur — north-south pocket off the main road so the town reads as
// a place with depth, not a corridor. Low boardwalk + a storefront facing east.
const CROSS_STREET = [
  { kind: "productionBoardwalk", label: "Cross Street Plank", x: 15.0, y: 6.2, color: "#5d3f24", size: 0.72, yaw: Math.PI / 2 },
  { kind: "productionBoardwalk", label: "Cross Street Plank", x: 15.0, y: 7.4, color: "#5d3f24", size: 0.72, yaw: Math.PI / 2 },
  { kind: "productionStore", label: "Cross Street Mercantile", x: 14.2, y: 6.8, color: "#9a7840", size: 0.62, yaw: Math.PI / 2 },
  { kind: "lampLow", label: "Cross Street Lamp", x: 15.6, y: 6.8, color: "#ffe6a8", size: 0.52 },
  { kind: "brokenFence", label: "Cross Street Rail", x: 15.0, y: 5.5, color: "#8d6540", size: 0.55, yaw: Math.PI / 2 },
];

// Set-back SECOND building rank behind the north storefront strip. The town used
// to be two parallel facade walls with an empty void to the north (y < 1.5) up to
// the mesa horizon — a flat frontal stage. This rank fills that void with smaller,
// staggered facades whose centres fall in the GAPS between the front-row buildings,
// so the town reads as overlapping masses receding in depth with a broken roofline.
// Sized 0.58–0.72 (smaller than the y~1.6 front row) to read as further away; the
// renderer's per-instance height/yaw jitter breaks the skyline further. Placed
// entirely NORTH of y = 1.0, so it sits outside both guarded boxes
// (first-frame y[2.4,14.2], first-street y[1.0,16.2]) and changes no test counts —
// and the production* kinds are not slab-blockers, so the spawn wedge stays clear.
const BACK_ROW = [
  { kind: "productionAssay",  label: "Back Row Land Office", x: 3.9,  y: -0.1,  color: "#54382a", size: 0.6,  yaw: 0.06 },
  { kind: "productionStore",  label: "Back Row Granary",     x: 8.9,  y: -0.9,  color: "#634330", size: 0.66, yaw: 0.04 },
  { kind: "productionSaloon", label: "Back Row Saloon",      x: 13.8, y: -1.1,  color: "#583828", size: 0.7,  yaw: -0.05 },
  { kind: "productionStore",  label: "Back Row Mercantile",  x: 19.0, y: -0.5,  color: "#6a4a32", size: 0.64, yaw: -0.07 },
  { kind: "productionSaloon", label: "Back Row Livery",      x: 29.0, y: 0.55,  color: "#4f3326", size: 0.68, yaw: -0.11 },
];

// Western flora flanking the road corridor — shoulders only (out of the wedge).
const ROAD_FLORA = [
  { kind: "sageCluster", label: "Roadside Sage", x: 10.9, y: 6.1, color: "#687a42", size: 1.1 },
  { kind: "sageCluster", label: "Board Sage", x: 13.2, y: 6.3, color: "#74864a", size: 0.95 },
  { kind: "roadGrass", label: "South Road Grass", x: 12.2, y: 11.6, color: "#8f8a56", size: 0.98 },
  { kind: "cactus", label: "Tall Cactus", x: 16.6, y: 7.9, color: "#577538", size: 1.0 },
  { kind: "deadTree", label: "Lone Dead Tree", x: 18.2, y: 6.9, color: "#4a3a28", size: 1.1 },
  { kind: "sageCluster", label: "Road Scrub", x: 23.4, y: 9.6, color: "#657744", size: 0.85 },
  { kind: "rock", label: "Road Rock", x: 27.8, y: 5.3, color: "#6a5f55", size: 0.9 },
  { kind: "cactus", label: "Twin Cactus", x: 34.0, y: 10.8, color: "#5c7a3a", size: 0.85 },
  { kind: "roadGrass", label: "Cache Grass", x: 38.6, y: 9.3, color: "#8a7a4a", size: 0.82 },
  { kind: "deadTree", label: "Junction Snag", x: 45.5, y: 12.4, color: "#3e3224", size: 1.1 },
  { kind: "slimeTrailHero", label: "Marsh Slime Sign", x: 46.5, y: 16.1, color: "#75d06b", size: 0.82, yaw: -0.5 },
  { kind: "cactus", label: "Long Road Cactus", x: 50.4, y: 12.0, color: "#577538", size: 0.9 },
  { kind: "rock", label: "Wagon Road Rock", x: 56.0, y: 17.0, color: "#6a5f55", size: 0.8 },
  { kind: "wagonSalvage", label: "Scattered Wagon Salvage", x: 58.7, y: 10.4, color: "#a87542", size: 0.58, yaw: -0.45 },
  { kind: "brokenFence", label: "Wagon Splinter Rail", x: 61.8, y: 10.7, color: "#8d6540", size: 0.72, yaw: 0.45 },
];

// Marsh / water lowland to the south — the Road Slime's home turf.
const MARSH = [
  { kind: "reeds", label: "Marsh Reeds", x: 35.5, y: 15.4, color: "#5f7a4a", size: 0.9 },
  { kind: "reeds", label: "Marsh Reeds", x: 40.0, y: 17.4, color: "#577038", size: 1.0 },
  { kind: "reeds", label: "Marsh Reeds", x: 46.6, y: 19.1, color: "#5f7a4a", size: 0.9 },
  { kind: "reeds", label: "Marsh Reeds", x: 54.6, y: 18.6, color: "#577038", size: 0.85 },
  { kind: "deadTree", label: "Marsh Snag", x: 42.0, y: 20.5, color: "#3e3224", size: 1.2 },
  { kind: "deadTree", label: "Marsh Snag", x: 58.2, y: 19.2, color: "#3e3224", size: 1.0 },
  { kind: "rock", label: "Marsh Stone", x: 37.0, y: 18.0, color: "#5a5048", size: 0.8 },
  { kind: "boulder", label: "Sunken Boulder", x: 50.0, y: 20.6, color: "#544c44", size: 1.0 },
  { kind: "roadGrass", label: "Marsh Grass", x: 47.0, y: 14.8, color: "#6a7a3a", size: 0.9 },
  { kind: "marshCluster", label: "Far Marsh Slick", x: 44.4, y: 19.4, color: "#75d06b", size: 0.62, yaw: 0.35 },
];

// Beat staging — frames the Smoke Cache and the slime arena so they read as
// authored scenes (a cache among crates and signal-smoke; a fight clearing at the
// marsh edge) instead of a lone marker in a field. All on the shoulders, clear of
// the y~12-13 travel lane and the hero interaction objects.
const SCENE_DRESSING = [
  // Smoke Cache (hero at 40.5, 12.9): a warm lantern (so it's a lit focal point like
  // the board + wagon), signal smoke, and a salvage stash
  { kind: "lampLow", label: "Cache Lantern", x: 39.5, y: 12.4, color: "#ffc88d", size: 0.7 },
  // Plume sized up + tucked beside the chest so the cache smoke reads from the
  // road bend (roadmap "first 10 minutes": smoke plume visibility).
  { kind: "dustSmokePlume", label: "Cache Signal Smoke", x: 40.2, y: 11.9, color: "#c19058", size: 1.45, yaw: 0.2 },
  { kind: "barrelCrateCluster", label: "Cache Stash", x: 42.1, y: 14.0, color: "#7a5230", size: 0.8, yaw: -0.3 },
  { kind: "brokenFence", label: "Cache Rail", x: 38.7, y: 13.8, color: "#8d6540", size: 0.7, yaw: 0.4 },
  { kind: "crate", label: "Cache Crate", x: 42.6, y: 11.4, color: "#b9824d", size: 0.6 },
  { kind: "rock", label: "Cache Stone", x: 37.9, y: 11.1, color: "#6a5f55", size: 0.7 },
  // Slime arena (roadSlime 53.5, 15 / slimeTell 48.2, 16.4): a marsh-edge clearing
  { kind: "deadTree", label: "Arena Snag", x: 49.4, y: 17.5, color: "#3e3224", size: 1.05 },
  { kind: "reeds", label: "Arena Reeds", x: 51.6, y: 17.3, color: "#5f7a4a", size: 0.85 },
  { kind: "rock", label: "Arena Stone", x: 55.4, y: 16.2, color: "#5a5048", size: 0.8 },
  { kind: "marshCluster", label: "Arena Goo Slick", x: 52.4, y: 16.1, color: "#75d06b", size: 0.6, yaw: -0.4 },
];

// Per-district "you are here" silhouettes for the eastern legs. The lone watchtower
// anchors town, but outskirts / marsh / wagon had NO tall vertical landmark — the
// eastern half read as the same flat dusty plane with an empty skyline. These four
// interior buttes (NOT the boundary ring) give each eastern leg a silhouette to
// travel toward. All sit x ≥ 44 (far outside every guarded box → zero test impact),
// 8–10u off the travel lane and clear of hero beats / marsh props, using the already
// manifested mesaSkyline / heroMesaSkyline kinds (no manifest change).
const EASTERN_LANDMARKS = [
  { kind: "mesaSkyline",     label: "Outskirts Butte", x: 44.0, y: 4.6,  color: "#5a4636", size: 1.35 },
  { kind: "heroMesaSkyline", label: "Wagon Rise Mesa", x: 58.5, y: 4.2,  color: "#63503c", size: 1.6 },
  { kind: "heroMesaSkyline", label: "Marsh Butte",     x: 45.5, y: 22.6, color: "#5a4636", size: 1.5 },
  { kind: "mesaSkyline",     label: "Slimewater Spur", x: 56.5, y: 22.4, color: "#544234", size: 1.4 },
];

// Outskirts district (x ~26-38, between the road sign and the cache): leaving town
// should FEEL like leaving town. A corral with a paddock wagon, a lone outpost, an
// abandoned wagon and desert scrub turn the empty transition leg into frontier edge.
// All on the shoulders, clear of the diagonal travel lane and outside guarded boxes;
// `ranch` is not a slab-blocker kind.
const OUTSKIRTS_DRESSING = [
  { kind: "ranch", label: "Outskirts Outpost", x: 34.5, y: 3.6, color: "#6a4a32", size: 0.58, yaw: -0.12 },
  { kind: "brokenFence", label: "Corral Rail North", x: 29.5, y: 3.8, color: "#8d6540", size: 0.8, yaw: 0.0 },
  { kind: "fence", label: "Corral Rail East", x: 31.6, y: 4.6, color: "#a47b4c", size: 0.75, yaw: 1.45 },
  { kind: "brokenFence", label: "Corral Rail West", x: 27.7, y: 4.8, color: "#8d6540", size: 0.7, yaw: 1.45 },
  { kind: "cart", label: "Paddock Wagon", x: 30.2, y: 5.0, color: "#b9824d", size: 0.7, yaw: 0.5 },
  { kind: "barrelCrateCluster", label: "Outpost Cargo", x: 33.0, y: 4.2, color: "#7a5230", size: 0.68, yaw: 0.3 },
  { kind: "deadTree", label: "Outskirts Snag", x: 26.4, y: 11.6, color: "#3e3224", size: 1.1 },
  { kind: "wagonSalvage", label: "Abandoned Wagon", x: 35.8, y: 15.2, color: "#a87542", size: 0.7, yaw: -0.4 },
  { kind: "cactus", label: "Outskirts Cactus", x: 29.2, y: 12.0, color: "#577538", size: 0.95 },
  { kind: "cactus", label: "Frontier Cactus", x: 37.6, y: 5.6, color: "#5c7a3a", size: 0.85 },
  { kind: "rock", label: "Outskirts Stone", x: 31.6, y: 13.2, color: "#6a5f55", size: 0.85 },
];

// Marsh district — the slime/wagon climax runs the north shore of the water pond
// (centre 48,19, ~x[34,62] y[16,22]). Line the shore with reeds, set snags + a
// half-sunk boulder in the shallows, and mud the road approach so the beat reads as
// a real wetland crossing, not sand with a blue rectangle. All south of the y~12-16
// travel lane / on the water; outside guarded boxes.
const MARSH_DISTRICT = [
  { kind: "reeds", label: "Shore Reeds", x: 43.5, y: 16.1, color: "#5f7a4a", size: 0.95 },
  { kind: "reeds", label: "Shore Reeds", x: 46.6, y: 16.3, color: "#577038", size: 0.9 },
  { kind: "reeds", label: "Shore Reeds", x: 57.2, y: 16.1, color: "#5f7a4a", size: 0.9 },
  { kind: "reeds", label: "Shallows Reeds", x: 44.6, y: 18.3, color: "#577038", size: 0.85 },
  { kind: "reeds", label: "Shallows Reeds", x: 56.4, y: 18.7, color: "#5f7a4a", size: 0.85 },
  { kind: "deadTree", label: "Sunken Snag", x: 53.6, y: 19.2, color: "#3e3224", size: 1.05 },
  { kind: "boulder", label: "Half-Sunk Boulder", x: 47.6, y: 19.4, color: "#544c44", size: 0.95 },
  { kind: "mudRutDecal", label: "Marsh Approach Mud", x: 50.0, y: 15.9, color: "#5a3923", size: 1.0, yaw: -0.5 },
  { kind: "mudRutDecal", label: "Crossing Mud", x: 55.4, y: 15.6, color: "#5a3923", size: 0.9, yaw: -0.4 },
  { kind: "marshCluster", label: "Goo Pool", x: 54.6, y: 18.0, color: "#75d06b", size: 0.62, yaw: 0.3 },
];

// South town back-rank — depth behind the south storefronts (mirrors BACK_ROW on the
// north), west of the marsh water (x < 26). Small, set back at y~16.5-17.5, facing
// the street; outside the guarded first-street box (y < 16.2 there is the boundary).
const SOUTH_BACK_ROW = [
  { kind: "productionStore",  label: "South Back Granary", x: 7.6,  y: 17.0, color: "#5e4030", size: 0.62, yaw: Math.PI + 0.05 },
  { kind: "productionSaloon", label: "South Back Lodge",   x: 12.7, y: 17.3, color: "#583828", size: 0.66, yaw: Math.PI - 0.05 },
  { kind: "productionAssay",  label: "South Back Office",  x: 17.6, y: 16.7, color: "#54382a", size: 0.6,  yaw: Math.PI + 0.07 },
  { kind: "productionStore",  label: "South Back Depot",   x: 22.6, y: 16.5, color: "#634330", size: 0.64, yaw: Math.PI - 0.09 },
];

// Opening foreground frame — near-camera props just behind the spawn (x < 9.5, west
// of the wedge, so zero blocker/test impact) that sit at the lower frame EDGES to add
// a depth layer to the establishing shot: a thin dead-tree silhouette upper-left, a
// low cart lower-right. Deliberately off-centre so they frame without blocking the
// road's leading line to the board. (If they read as clutter, delete this array.)
const FOREGROUND_FRAME = [
  { kind: "deadTree", label: "Spawn Frame Snag", x: 7.4, y: 5.1, color: "#3e3224", size: 1.35 },
  { kind: "brokenFence", label: "Spawn Frame Rail", x: 7.6, y: 6.2, color: "#8d6540", size: 0.72, yaw: 0.35 },
  { kind: "cart", label: "Spawn Frame Cart", x: 8.1, y: 12.1, color: "#a87542", size: 0.82, yaw: 0.55 },
  { kind: "rock", label: "Spawn Frame Stone", x: 7.8, y: 11.2, color: "#5a5048", size: 0.65 },
];

// Board plaza life — Boone's board (13, 5.65) is the opening focal point + first
// interaction. A couple of townsfolk gathered reading the bounties + a supply stack
// make it the lively heart of town instead of a lone signpost. Low props only (not
// slab-blockers), so the spawn→board camera wedge stays clear.
const BOARD_PLAZA = [
  { kind: "npcSilhouette", label: "Bounty Reader", x: 12.3, y: 6.7, color: "#17100c", size: 0.74, yaw: -0.7 },
  { kind: "npcSilhouette", label: "Board Onlooker", x: 14.4, y: 6.8, color: "#120c09", size: 0.7, yaw: -2.3 },
  { kind: "barrelCrateCluster", label: "Board Supplies", x: 15.2, y: 5.0, color: "#7a5230", size: 0.66, yaw: 0.2 },
  // Civic pocket — low fence rails enclose the plaza without slab blockers.
  { kind: "brokenFence", label: "Plaza Rail North", x: 12.8, y: 5.2, color: "#8d6540", size: 0.58, yaw: 0.08 },
  { kind: "brokenFence", label: "Plaza Rail East", x: 15.8, y: 6.2, color: "#8d6540", size: 0.55, yaw: 1.52 },
  { kind: "hitchingRail", label: "Plaza Hitching Rail", x: 11.8, y: 5.5, color: "#4a3526", size: 0.68, yaw: 0.12 },
  { kind: "lampLow", label: "Plaza Lantern", x: 13.6, y: 5.15, color: "#ffe6a8", size: 0.58 },
];

// The walk-in saloon — one building you can physically enter (door faces south toward
// the road at the town edge, x>21 so it's outside the production-count box). Geometry
// + collision walls share SALOON_DIMS (spike.js buildWalkInSaloon / worldProxies).
const WALKIN_SALOON = [
  { kind: "walkInSaloon", label: "The Lucky Lantern Saloon", x: 22.5, y: 1.25, color: "#6b4a2c", size: 1.08 },
];

// Landmark skyline — five distinctive procedural buildings set on the open north
// side (y < 0, behind the storefront row, clear of the mesa ring) so they rise over
// the rooftops as a varied silhouette: a church spire, a grand hotel, a water tower,
// a blacksmith chimney, and a prairie windmill. Each has a real collision footprint
// (worldProxies). North of the first-frame wedge; none are slab-blocker kinds.
const LANDMARK_BUILDINGS = [
  { kind: "church",     label: "Dustward Chapel",     x: 13.5, y: -2.2, color: "#cdb89a", size: 1.15 },
  { kind: "hotel",      label: "The Frontier Hotel",  x: 20.5, y: -2.8, color: "#8a5a3a", size: 1.12 },
  { kind: "waterTower", label: "Town Water Tower",    x: 28.0, y: -1.2, color: "#6e5236", size: 1.2 },
  { kind: "blacksmith", label: "Dustward Forge",      x: 34.0, y: -2.0, color: "#463528", size: 1.05 },
  { kind: "windmill",   label: "Prairie Windmill",    x: 42.0, y: 0.2,  color: "#7a5c3a", size: 1.1 },
];

// Soft world boundary — mesas/cliffs/boulders ring the playable rectangle. Mesa
// footprints are square (3.2*size); spacing 5 with size ~1.8 (half-width 2.88)
// overlaps by ~0.76, so there is no gap wide enough to slip through.
const BOUNDARY_RING = [
  // north wall — hero peak + saddle notch frames the vista; asymmetric heights
  { kind: "heroMesaSkyline", label: "North Mesa West", x: 1.0, y: -6.2, color: "#4a5568", size: 0.95, heightMul: 0.85 },
  { kind: "heroMesaSkyline", label: "North Saddle Low", x: 6.5, y: -6.0, color: "#525a6a", size: 0.72, heightMul: 0.55 },
  { kind: "heroMesaSkyline", label: "North Hero Peak", x: 13.5, y: -6.8, color: "#5a6070", size: 1.35, heightMul: 1.45, heroPeak: true },
  { kind: "heroMesaSkyline", label: "North Saddle Low", x: 20.0, y: -6.1, color: "#525a6a", size: 0.78, heightMul: 0.6 },
  { kind: "heroMesaSkyline", label: "North Mesa East", x: 28.0, y: -6.3, color: "#4e5868", size: 1.05, heightMul: 0.95 },
  { kind: "heroMesaSkyline", label: "North Mesa Far", x: 39.0, y: -6.3, color: "#485268", size: 1.0, heightMul: 0.9 },
  { kind: "mesaSkyline", label: "Northeast Mesa", x: 52.0, y: -5.6, color: "#424c60", size: 0.95, heightMul: 0.82 },
  { kind: "mesaSkyline", label: "Northeast Mesa Far", x: 62.0, y: -5.3, color: "#3c4658", size: 0.9, heightMul: 0.78 },
  // east wall (the eastern horizon backdrop), x ≈ 70 — cool aerial fade
  { kind: "mesa", label: "East Mesa", x: 70.0, y: 4.0, color: "#424c5c", size: 2.0, heightMul: 1.1 },
  { kind: "cliff", label: "East Cliff", x: 70.0, y: 10.5, color: "#3c4654", size: 2.1, heightMul: 1.15 },
  { kind: "mesaSkyline", label: "East Mesa", x: 70.0, y: 17.5, color: "#404858", size: 1.45, heightMul: 0.9 },
  { kind: "mesa", label: "Southeast Mesa", x: 68.0, y: 26.5, color: "#3e4850", size: 1.9, heightMul: 0.95 },
  // south wall, y ≈ 27
  { kind: "mesa", label: "South Mesa", x: 58.0, y: 27.0, color: "#444c58", size: 1.9 },
  { kind: "mesa", label: "South Mesa", x: 48.0, y: 27.3, color: "#464e5a", size: 1.8 },
  { kind: "cliff", label: "South Cliff", x: 36.0, y: 27.0, color: "#424850", size: 2.0 },
  { kind: "mesa", label: "South Mesa", x: 24.0, y: 26.8, color: "#4a5260", size: 1.8 },
  { kind: "mesa", label: "South Mesa", x: 12.0, y: 26.8, color: "#4e5664", size: 1.8 },
  { kind: "mesa", label: "Southwest Mesa", x: 3.0, y: 26.4, color: "#505868", size: 1.9 },
  // west wall
  { kind: "mesa", label: "West Mesa", x: -8.0, y: 13.5, color: "#4e5664", size: 1.9 },
  { kind: "mesa", label: "West Mesa", x: -8.0, y: 8.5, color: "#525a68", size: 1.9 },
  { kind: "mesa", label: "West Mesa", x: -8.0, y: 3.5, color: "#565e6c", size: 1.9 },
];

// Depth lanes spread along the offset direction so background vistas read as
// distant horizon silhouettes and foreground dressing stays near the road,
// instead of every element crowding the same few tiles in front of the camera.
const DEPTH_SPREAD = { background: 3.4, midground: 2.1, foreground: 1.7 };

function world(anchor, dx, dy, depthLane) {
  const s = DEPTH_SPREAD[depthLane] ?? 1.5;
  return { x: anchor.x + dx * s, y: anchor.y + dy * s };
}

// Anchor-relative dressing entries carry dx/dy; absolute zone entries already
// carry x/y. Project the former, pass the latter through untouched.
const ABSOLUTE_ZONES = [
  ...TOWN_EDGE,
  ...PRODUCTION_MAIN_STREET,
  ...CROSS_STREET,
  ...BACK_ROW,
  ...ROAD_CORRIDOR,
  ...ROUTE_LIGHTS,
  ...routeRuts(),
  ...routePlanks(),
  ...routeNaturalClusters(),
  ...ROAD_FLORA,
  ...MARSH,
  ...SCENE_DRESSING,
  ...EASTERN_LANDMARKS,
  ...OUTSKIRTS_DRESSING,
  ...MARSH_DISTRICT,
  ...SOUTH_BACK_ROW,
  ...FOREGROUND_FRAME,
  ...BOARD_PLAZA,
  ...WALKIN_SALOON,
  ...LANDMARK_BUILDINGS,
  ...BOUNDARY_RING,
];

// Returns all scene placements in absolute world coordinates.
export function buildFrontierPlacements() {
  const dressing = [...VISTAS, ...ROADS, ...PROPS, LANDMARK].map((e) => {
    const { x, y } = world(FRONTIER_ANCHOR, e.dx, e.dy, e.depthLane);
    return { ...e, x, y };
  });
  return [...dressing, ...ABSOLUTE_ZONES, ...HERO_OBJECTS];
}

export function getRouteMetrics(placements = buildFrontierPlacements(), options = {}) {
  const walkSpeed = Number.isFinite(options.walkSpeed) ? options.walkSpeed : 4;
  const runSpeed = Number.isFinite(options.runSpeed) ? options.runSpeed : 8;
  const byKind = new Map(placements.map((p) => [p.kind, p]));
  const points = FIRST_FIVE_ROUTE.map((point) => {
    if (point.kind === "spawn" || point.kind === "returnJobBoard") return point;
    return byKind.get(point.kind) || point;
  });
  const legs = [];
  let totalDistance = 0;
  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1];
    const to = points[i];
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    totalDistance += distance;
    legs.push({ from: from.kind, to: to.kind, distance });
  }
  const expectedBeatSeconds = Object.values(ROUTE_BEAT_SECONDS).reduce((sum, n) => sum + n, 0);
  return {
    targetKinds: points.map((point) => point.kind),
    legs,
    totalDistance,
    walkSeconds: totalDistance / walkSpeed,
    runSeconds: totalDistance / runSpeed,
    expectedBeatSeconds,
    estimatedPlaySeconds: expectedBeatSeconds + totalDistance / walkSpeed,
  };
}

const HERO_POLISH_KINDS = new Set([
  "heroTownSaloon",
  "heroTownStore",
  "heroTownAssay",
  "heroMesaSkyline",
  "sageCluster",
  "roadGrass",
  "slimeTrailHero",
]);

const PRODUCTION_FRAME_KINDS = new Set([
  "productionBoardwalk",
  "productionSaloon",
  "productionStore",
  "productionAssay",
  "windowGlowPanel",
  "hangingSign",
  "hitchingRail",
  "barrelCrateCluster",
  "npcSilhouette",
  "lanternString",
  "mudRutDecal",
  "dustSmokePlume",
  "bountyEmblem",
]);

const PRODUCTION_STOREFRONT_KINDS = new Set([
  "productionSaloon",
  "productionStore",
  "productionAssay",
  "heroTownSaloon",
  "heroTownStore",
  "heroTownAssay",
]);

const PRODUCTION_WINDOW_KINDS = new Set(["windowGlowPanel", "lanternString", "hangingSign", "bountyEmblem"]);

const NATURAL_KINDS = new Set(["sageCluster", "roadGrass", "slimeTrailHero", "marshCluster", "reeds"]);

export function getArtDirectionLayoutMetrics(placements = buildFrontierPlacements()) {
  const kinds = new Set(placements.map((placement) => placement.kind));
  const firstFrame = placements.filter((p) => (
    p.x >= 5.5 && p.x <= 18.5 &&
    p.y >= 2.4 && p.y <= 14.2
  ));
  const slabBlockers = firstFrame.filter((p) => (
    ["townFacadeWarm", "townFacadeStore", "townFacadeDark", "heroTownSaloon", "heroTownStore", "heroTownAssay", "mesa", "cliff"].includes(p.kind) &&
    (p.size || 1) > 0.95
  ));
  return {
    style: FIRST_ROAD_ART_STYLE,
    heroPolishKinds: Array.from(HERO_POLISH_KINDS).filter((kind) => kinds.has(kind)),
    naturalClusterCount: placements.filter((p) => NATURAL_KINDS.has(p.kind)).length,
    firstFrameNaturalCount: firstFrame.filter((p) => NATURAL_KINDS.has(p.kind)).length,
    firstFrameSlabBlockers: slabBlockers.map((p) => p.kind),
  };
}

export function getProductionFrameLayoutMetrics(placements = buildFrontierPlacements()) {
  const kinds = new Set(placements.map((placement) => placement.kind));
  const firstStreet = placements.filter((p) => (
    p.x >= 4.0 && p.x <= 21.0 &&
    p.y >= 1.0 && p.y <= 16.2
  ));
  const productionProps = firstStreet.filter((p) => PRODUCTION_FRAME_KINDS.has(p.kind));
  const storefronts = firstStreet.filter((p) => PRODUCTION_STOREFRONT_KINDS.has(p.kind));
  const windowLights = firstStreet.filter((p) => PRODUCTION_WINDOW_KINDS.has(p.kind));
  const npcSilhouettes = firstStreet.filter((p) => p.kind === "npcSilhouette");
  return {
    style: FIRST_ROAD_ART_STYLE,
    productionKinds: Array.from(PRODUCTION_FRAME_KINDS).filter((kind) => kinds.has(kind)),
    productionStreetPropCount: productionProps.length,
    storefrontCount: storefronts.length,
    windowLightCount: windowLights.length,
    npcSilhouetteCount: npcSilhouettes.length,
    firstStreetBounds: { minX: 4.0, maxX: 21.0, minY: 1.0, maxY: 16.2 },
  };
}
