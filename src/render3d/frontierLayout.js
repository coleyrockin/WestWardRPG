// Data-driven placement records for the Westward (frontier) opening scene.
//
// Source of truth for the dressing offsets is REGION_PRESENTATION.frontier in
// src/regionVisualIdentity.js; hero-object world positions come from
// src/poiSystem.js and the opening-scene anchors in src/gameFeel.js.
//
// World coordinate system (matches render_game_to_text):
//   +x = east, +y = south. Origin top-left of the world map.
// The renderer maps world (x, y) -> 3D (X = east, Z = south, Y = up).

export const FRONTIER_ANCHOR = { x: 9.5, y: 8.5 };

// Player spawn — camera origin, looking east down the road.
export const PLAYER_SPAWN = { x: 9.5, y: 8.5 };

// Funeral cold-open spawn — a few paces NORTH of Abram's casket (the "gravesite"
// HERO_OBJECT), facing SOUTH (yaw π). Kept in LOCKSTEP with the casket placement:
// move the grave and you move this. Applied unconditionally for the funeral/implant
// beats (render3d/spike.js) so a resumed run can never re-pin you to the old
// "clogged closet", and it is the reset target for stale funeral saves (runSave.js).
export const GRAVESIDE_SPAWN = Object.freeze({ x: 15, z: -37, yaw: Math.PI });

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
  { kind: "spawn", label: "Westward Spawn", x: PLAYER_SPAWN.x, y: PLAYER_SPAWN.y },
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
    // rotation.y maps the box's +X long axis to (cos θ, -sin θ) in world XZ;
    // layout y IS world z, so along-road alignment is atan2(-dy, dx). The old
    // atan2(dx, dy) put every plank/rut 90° off — lying ACROSS the road.
    const yaw = Math.atan2(-dy, dx);
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
    const yaw = Math.atan2(-dy, dx); // along-road, see routePlanks
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
// Opening corridor — REDESIGNED for composition (the old version sprinkled
// fences/crates/grass through the middle of the player's first thirty steps).
// Rules: the road lane stays EMPTY; the two gate lanterns frame the first
// frame like theater wings; everything else hugs the shoulders.
const ROAD_CORRIDOR = [
  { kind: "lampLow",  label: "Spawn Lantern Left",  x: 10.4, y: 4.7,  color: "#ffe6a8", size: 0.62 },
  { kind: "lampLow",  label: "Spawn Lantern Right", x: 10.4, y: 13.2, color: "#ffe6a8", size: 0.62 },
  { kind: "sign",  label: "Road Sign — Board",   x: 11.2, y: 5.35, color: "#ffd77b", size: 0.8 },
  { kind: "roadGrass", label: "Opening Grass Left", x: 8.5, y: 5.2, color: "#8f8a56", size: 1.05, yaw: -0.4 },
  { kind: "sageCluster", label: "Opening Sage Right", x: 8.6, y: 12.3, color: "#70814b", size: 0.95, yaw: 0.35 },
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
  { kind: "gravesite",   label: "Abram's Casket",    x: 15.0, y: -32.0, color: "#4f3a2c", size: 1.0 },
  { kind: "steelMustang", label: "Steel Mustang Mount", x: 16.2, y: 12.0, color: "#8a8f7d", size: 1.1, yaw: -1.2 },
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
// WESTWARD v2 — west approach. The hero-model trio now WELCOMES you to town
// (it used to hide at x≈-6 behind the spawn camera): saloon + assay flank the
// north side of the road in, the dry-goods store answers from the south, and
// the WESTWARD gate arch (procedural, spike.js buildTownGate) spans the road
// at x 7.6 — posts on the frontage lines, lane clear. All heroTown* centers
// sit west of x 5.5 so the slab-blocker audit box never sees them.
const TOWN_EDGE = [
  { kind: "townGate",       label: "Westward Gate Arch", x: 7.6, y: 8.9,  color: "#6b4a2c", size: 1.0 },
  { kind: "heroTownSaloon", label: "Westgate Saloon",    x: 2.6, y: 3.4,  color: "#a87848", size: 0.78 },
  { kind: "heroTownAssay",  label: "Land & Assay",       x: 5.0, y: 13.2, color: "#886038", size: 0.68, yaw: Math.PI },
  { kind: "heroTownStore",  label: "Pioneer Dry Goods",  x: 2.4, y: 13.1, color: "#9a7840", size: 0.66, yaw: Math.PI },
  { kind: "porch",          label: "Westgate Porch",     x: 2.8, y: 4.9,  color: "#5a4327", size: 0.62 },
  { kind: "lamp",           label: "Westgate Lamp",      x: 5.4, y: 4.8,  color: "#ffe0a0", size: 0.44 },
  { kind: "sign",           label: "Westgate Shingle",   x: 1.6, y: 4.75, color: "#ffd77b", size: 0.56 },
  { kind: "fence",          label: "Approach Rail",      x: 5.2, y: 11.9, color: "#a47b4c", size: 0.55 },
];

const PRODUCTION_MAIN_STREET = [
  // WESTWARD v2 — NORTH frontage. One dense street wall: centers on y≈3.6 so
  // fronts land at y≈4.1, shoulder-to-shoulder from the gate to the church bend.
  // The frontage BREAKS at x 12.8–15.6 for the board plaza (the town square the
  // first mission starts in). production* kinds are slab-audit-exempt, so this
  // density inside the first-frame box is legal; the y3.6 line keeps every
  // building outside the spawn→board camera wedge (y ≥ 6.5).
  { kind: "productionStore", label: "Lamp Dry Goods", x: 9.2, y: 3.6, color: "#9a7840", size: 0.84, yaw: 0 },
  { kind: "productionAssay", label: "Boone Assay", x: 12.0, y: 3.7, color: "#886038", size: 0.78, yaw: 0 },
  { kind: "productionStore", label: "Westward Mercantile", x: 16.4, y: 3.7, color: "#8a6a3c", size: 0.84, yaw: 0 },
  { kind: "productionSaloon", label: "Drifter Saloon", x: 22.4, y: 3.6, color: "#a87848", size: 0.8, yaw: 0 },
  // Continuous north boardwalk, gate to bend.
  { kind: "productionBoardwalk", label: "North Boardwalk", x: 8.6, y: 4.5, color: "#5d3f24", size: 0.92, yaw: 0 },
  { kind: "productionBoardwalk", label: "North Boardwalk", x: 11.8, y: 4.5, color: "#5d3f24", size: 0.92, yaw: 0 },
  { kind: "productionBoardwalk", label: "North Boardwalk", x: 16.2, y: 4.5, color: "#5d3f24", size: 0.92, yaw: 0 },
  { kind: "productionBoardwalk", label: "North Boardwalk", x: 19.5, y: 4.5, color: "#5d3f24", size: 0.92, yaw: 0 },
  { kind: "productionBoardwalk", label: "North Boardwalk", x: 22.8, y: 4.5, color: "#5d3f24", size: 0.88, yaw: 0 },
  { kind: "hangingSign", label: "Mercantile Sign", x: 16.9, y: 4.35, color: "#ffd77b", size: 0.82, yaw: -0.06 },
  { kind: "hangingSign", label: "Lucky Lantern Sign", x: 19.9, y: 4.3, color: "#ffd77b", size: 0.9, yaw: 0.08 },
  { kind: "windowGlowPanel", label: "Dry Goods Glow", x: 8.6, y: 4.18, color: "#ffbf72", size: 0.9, yaw: 0 },
  { kind: "windowGlowPanel", label: "Dry Goods Glow", x: 9.9, y: 4.18, color: "#ffbf72", size: 0.9, yaw: 0 },
  { kind: "windowGlowPanel", label: "Assay Glow", x: 11.5, y: 4.25, color: "#ffad63", size: 0.9, yaw: 0 },
  { kind: "windowGlowPanel", label: "Assay Glow", x: 12.6, y: 4.25, color: "#ffad63", size: 0.9, yaw: 0 },
  { kind: "windowGlowPanel", label: "Mercantile Glow", x: 15.8, y: 4.25, color: "#ffbf72", size: 0.9, yaw: 0 },
  { kind: "windowGlowPanel", label: "Mercantile Glow", x: 17.1, y: 4.25, color: "#ffbf72", size: 0.9, yaw: 0 },
  { kind: "windowGlowPanel", label: "Drifter Glow", x: 21.9, y: 4.15, color: "#ff9f5d", size: 0.8, yaw: 0 },
  { kind: "lanternString", label: "North Lantern String", x: 10.4, y: 4.4, color: "#ffb866", size: 0.9, yaw: 0 },

  // WESTWARD v2 — SOUTH frontage, mirrored (yaw π), centers on y≈12.9 so fronts
  // land at y≈12.4 — face-to-face street width ≈ 8.3u instead of the old ~13.5u
  // plain. The grand Frontier Hotel (procedural landmark) anchors x 18.4 facing
  // the Lucky Lantern saloon across the street.
  { kind: "productionSaloon", label: "South Porch Saloon", x: 10.0, y: 12.9, color: "#7a5230", size: 0.8, yaw: Math.PI },
  { kind: "productionStore", label: "Westward Hotel Annex", x: 11.8, y: 13.0, color: "#9a7144", size: 0.86, yaw: Math.PI },
  { kind: "productionAssay", label: "Marshal Office", x: 15.0, y: 12.9, color: "#6a4630", size: 0.74, yaw: Math.PI },
  { kind: "productionStore", label: "Roadside Undertaker", x: 21.8, y: 12.9, color: "#70452f", size: 0.78, yaw: Math.PI },
  { kind: "productionBoardwalk", label: "South Boardwalk", x: 7.4, y: 11.9, color: "#5d3f24", size: 0.88, yaw: Math.PI },
  { kind: "productionBoardwalk", label: "South Boardwalk", x: 10.7, y: 11.9, color: "#5d3f24", size: 0.9, yaw: Math.PI },
  { kind: "productionBoardwalk", label: "South Boardwalk", x: 14.0, y: 11.9, color: "#5d3f24", size: 0.9, yaw: Math.PI },
  { kind: "productionBoardwalk", label: "South Boardwalk", x: 17.3, y: 11.9, color: "#5d3f24", size: 0.86, yaw: Math.PI },
  { kind: "productionBoardwalk", label: "South Boardwalk", x: 20.6, y: 11.9, color: "#5d3f24", size: 0.86, yaw: Math.PI },
  { kind: "windowGlowPanel", label: "South Saloon Glow", x: 8.0, y: 12.35, color: "#ffad63", size: 0.9, yaw: Math.PI },
  { kind: "windowGlowPanel", label: "South Saloon Glow", x: 9.3, y: 12.35, color: "#ffad63", size: 0.9, yaw: Math.PI },
  { kind: "windowGlowPanel", label: "Annex Glow", x: 11.2, y: 12.45, color: "#ffbf72", size: 0.9, yaw: Math.PI },
  { kind: "windowGlowPanel", label: "Annex Glow", x: 12.5, y: 12.45, color: "#ffbf72", size: 0.9, yaw: Math.PI },
  { kind: "windowGlowPanel", label: "Marshal Glow", x: 14.5, y: 12.4, color: "#ff9f5d", size: 0.85, yaw: Math.PI },
  { kind: "windowGlowPanel", label: "Undertaker Glow", x: 21.3, y: 12.4, color: "#ff9b58", size: 0.82, yaw: Math.PI },
  { kind: "lanternString", label: "South Lantern String", x: 11.4, y: 12.15, color: "#ffb866", size: 0.86, yaw: Math.PI },
  { kind: "hangingSign", label: "Undertaker Hanging Sign", x: 21.2, y: 12.2, color: "#ffc66e", size: 0.72, yaw: Math.PI },
  // TWO crossing wires only, each marking a destination: one crowning the board
  // plaza, one between the Lucky Lantern saloon and the Frontier Hotel.
  { kind: "lanternString", label: "Board Crossing Lanterns", x: 13.6, y: 8.75, color: "#ffb866", size: 0.8, yaw: Math.PI / 2 },
  { kind: "lanternString", label: "Saloon-Hotel Lanterns", x: 18.9, y: 8.6, color: "#ffb866", size: 0.82, yaw: Math.PI / 2 },

  // Bounty street life: silhouettes and props read as inhabited without
  // becoming gameplay blockers in the main road lane.
  { kind: "npcSilhouette", label: "Porch Bounty Hunter", x: 7.9, y: 4.55, color: "#17100c", size: 0.88, yaw: 2.85 },
  { kind: "npcSilhouette", label: "Boardwalk Lookout", x: 11.4, y: 4.4, color: "#17100c", size: 0.78, yaw: 2.95 },
  // Off the road, onto the boardwalk edges — silhouettes standing mid-lane read
  // as bugs, not life.
  { kind: "npcSilhouette", label: "Road Deputy", x: 15.6, y: 4.6, color: "#17100c", size: 0.72, yaw: 2.9 },
  { kind: "npcSilhouette", label: "Street Traveler", x: 18.9, y: 12.2, color: "#17100c", size: 0.64, yaw: -0.2 },
  { kind: "npcSilhouette", label: "South Porch Watcher", x: 8.8, y: 12.52, color: "#17100c", size: 0.78, yaw: 0.25 },
  { kind: "npcSilhouette", label: "Lantern Bystander", x: 14.4, y: 12.35, color: "#17100c", size: 0.72, yaw: -0.15 },
  { kind: "npcSilhouette", label: "Undertaker Door Guard", x: 19.35, y: 11.82, color: "#120c09", size: 0.7, yaw: -0.25 },
  { kind: "hitchingRail", label: "North Hitching Rail", x: 5.2, y: 4.55, color: "#4a3526", size: 0.82, yaw: 0.04 },
  { kind: "hitchingRail", label: "South Hitching Rail", x: 15.6, y: 12.55, color: "#4a3526", size: 0.78, yaw: Math.PI - 0.08 },
  { kind: "barrelCrateCluster", label: "Saloon Cargo", x: 4.8, y: 4.25, color: "#7a5230", size: 0.88, yaw: 0.28 },
  { kind: "barrelCrateCluster", label: "Mercantile Cargo", x: 17.6, y: 4.3, color: "#7a5230", size: 0.82, yaw: -0.18 },
  { kind: "barrelCrateCluster", label: "South Porch Cargo", x: 10.0, y: 12.55, color: "#7a5230", size: 0.84, yaw: 0.12 },
  // Wheel ruts now run ALONG the road (small yaw following its easterly drift)
  // — the old random diagonals read as smears, not wagon tracks.
  { kind: "mudRutDecal", label: "Opening Mud Rut", x: 10.8, y: 8.2, color: "#5a3923", size: 1.1, yaw: 0.06 },
  { kind: "mudRutDecal", label: "Board Road Mud Rut", x: 14.6, y: 8.6, color: "#5a3923", size: 1.0, yaw: 0.1 },
  { kind: "mudRutDecal", label: "Boardwalk Wheel Rut", x: 18.2, y: 9.0, color: "#5a3923", size: 0.9, yaw: 0.12 },
  { kind: "mudRutDecal", label: "Far Street Wheel Rut", x: 21.8, y: 8.7, color: "#5a3923", size: 0.78, yaw: -0.58 },
  { kind: "mudRutDecal", label: "Marshal Road Wheel Rut", x: 25.6, y: 9.65, color: "#5a3923", size: 0.8, yaw: -0.42 },
  { kind: "dustSmokePlume", label: "Boardwalk Dust", x: 8.0, y: 4.85, color: "#b88551", size: 0.9, yaw: 0.2 },
  { kind: "dustSmokePlume", label: "Street Dust", x: 17.6, y: 7.35, color: "#b88551", size: 0.74, yaw: -0.3 },
  { kind: "dustSmokePlume", label: "Far Street Dust", x: 23.2, y: 8.25, color: "#b88551", size: 0.56, yaw: -0.18 },
  { kind: "bountyEmblem", label: "Boone Bounty Emblem", x: 13.0, y: 4.6, color: "#ffd77b", size: 0.75, yaw: Math.PI / 2 },
];

// Cross-street spur — WESTWARD v2: a north alley out of the board plaza between
// the Assay and the Mercantile, leading back to the water-tower yard. Gives the
// plaza an exit and the second row a reason to exist.
const CROSS_STREET = [
  { kind: "productionBoardwalk", label: "Alley Plank", x: 14.3, y: 2.6, color: "#5d3f24", size: 0.7, yaw: Math.PI / 2 },
  { kind: "productionBoardwalk", label: "Alley Plank", x: 14.3, y: 1.2, color: "#5d3f24", size: 0.7, yaw: Math.PI / 2 },
  { kind: "lampLow", label: "Alley Lamp", x: 14.9, y: 2.0, color: "#ffe6a8", size: 0.52 },
  { kind: "brokenFence", label: "Alley Rail", x: 13.7, y: 1.6, color: "#8d6540", size: 0.55, yaw: Math.PI / 2 },
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
  { kind: "productionStore",  label: "Back Row Mercantile",  x: 17.2, y: -0.8,  color: "#6a4a32", size: 0.64, yaw: -0.07 },
  { kind: "productionSaloon", label: "Back Row Livery",      x: 29.0, y: 0.55,  color: "#4f3326", size: 0.68, yaw: -0.11 },
];

// Western flora flanking the road corridor — shoulders only (out of the wedge).
const ROAD_FLORA = [
  { kind: "sageCluster", label: "Roadside Sage", x: 10.9, y: 6.1, color: "#687a42", size: 1.1 },
  { kind: "sageCluster", label: "Board Sage", x: 13.2, y: 6.3, color: "#74864a", size: 0.95 },
  { kind: "roadGrass", label: "South Road Grass", x: 12.2, y: 11.6, color: "#8f8a56", size: 0.98 },
  // v2: pulled out of the now-dense street lane onto the bend shoulders.
  { kind: "cactus", label: "Tall Cactus", x: 24.6, y: 10.4, color: "#577538", size: 1.0 },
  { kind: "deadTree", label: "Lone Dead Tree", x: 28.6, y: 7.4, color: "#4a3a28", size: 1.1 },
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
// Two frame elements only — snag left, cart right — a classic theater frame.
// (The extra rail + stone at the player's feet were clutter, not composition.)
const FOREGROUND_FRAME = [
  // Pulled east (x7.4/8.1 → 10.5/10.8) out of the worm's-eye foreground so the
  // opening vantage isn't peering THROUGH a snag/cart into the frontage wall —
  // they now frame the mid-ground depth instead. y held outside the spawn→board
  // wedge (y[6.5..11]) and well off the road's leading line (both ≥2.5u clear).
  { kind: "deadTree", label: "Spawn Frame Snag", x: 10.5, y: 5.1, color: "#3e3224", size: 1.35 },
  { kind: "cart", label: "Spawn Frame Cart", x: 10.8, y: 12.1, color: "#a87542", size: 0.82, yaw: 0.55 },
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
  // WESTWARD v2: the one enterable building moves from its old orphan lot into
  // the north frontage as the mid-street anchor — door meets the boardwalk,
  // facing the Frontier Hotel across the street.
  { kind: "walkInSaloon", label: "The Lucky Lantern Saloon", x: 19.3, y: 2.7, color: "#6b4a2c", size: 1.0 },
];

// Landmark skyline — five distinctive procedural buildings set on the open north
// side (y < 0, behind the storefront row, clear of the mesa ring) so they rise over
// the rooftops as a varied silhouette: a church spire, a grand hotel, a water tower,
// a blacksmith chimney, and a prairie windmill. Each has a real collision footprint
// (worldProxies). North of the first-frame wedge; none are slab-blocker kinds.
// WESTWARD v2 — landmarks join the street instead of hiding behind it:
// the church CLOSES the main-street vista at the eastern bend (visible from the
// gate), the grand hotel faces the walk-in saloon, the forge takes the SE
// corner lot with its coal glow facing the street, the water tower rises
// behind the north row, and the windmill keeps the far-east skyline.
const LANDMARK_BUILDINGS = [
  { kind: "church",     label: "Westward Chapel",     x: 26.2, y: 3.4,  color: "#cdb89a", size: 1.1 },
  { kind: "hotel",      label: "The Frontier Hotel",  x: 18.4, y: 13.6, color: "#8a5a3a", size: 1.0, yaw: Math.PI },
  { kind: "waterTower", label: "Town Water Tower",    x: 20.8, y: 0.6,  color: "#6e5236", size: 1.2 },
  { kind: "blacksmith", label: "Westward Forge",      x: 24.8, y: 13.8, color: "#463528", size: 1.0 },
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
  // east rim — OPEN RANGE: the wall parts at y 10–15 so the road runs on to
  // Eastwater Ranch; the cliff slides north to frame the pass instead of block it.
  { kind: "mesa", label: "East Mesa", x: 70.0, y: 4.0, color: "#424c5c", size: 2.0, heightMul: 1.1 },
  { kind: "cliff", label: "East Cliff", x: 70.0, y: 7.2, color: "#3c4654", size: 1.6, heightMul: 1.15 },
  { kind: "mesaSkyline", label: "East Mesa", x: 70.0, y: 17.5, color: "#404858", size: 1.45, heightMul: 0.9 },
  { kind: "mesa", label: "Southeast Mesa", x: 68.0, y: 26.5, color: "#3e4850", size: 1.9, heightMul: 0.95 },
  // south wall, y ≈ 27
  { kind: "mesa", label: "South Mesa", x: 58.0, y: 27.0, color: "#444c58", size: 1.9 },
  { kind: "mesa", label: "South Mesa", x: 48.0, y: 27.3, color: "#464e5a", size: 1.8 },
  { kind: "cliff", label: "South Cliff", x: 36.0, y: 27.0, color: "#424850", size: 2.0 },
  { kind: "mesa", label: "South Mesa", x: 24.0, y: 26.8, color: "#4a5260", size: 1.8 },
  { kind: "mesa", label: "South Mesa", x: 12.0, y: 26.8, color: "#4e5664", size: 1.8 },
  { kind: "mesa", label: "Southwest Mesa", x: 3.0, y: 26.4, color: "#505868", size: 1.9 },
  // west rim — OPEN RANGE: the middle mesa steps aside so the West Pass road
  // (Ashfall tease) leaves town between the remaining two.
  { kind: "mesa", label: "West Mesa", x: -8.0, y: 14.5, color: "#4e5664", size: 1.9 },
  { kind: "mesa", label: "West Mesa", x: -8.0, y: 2.5, color: "#565e6c", size: 1.9 },
];

// Depth lanes spread along the offset direction so background vistas read as
// distant horizon silhouettes and foreground dressing stays near the road,
// instead of every element crowding the same few tiles in front of the camera.
const DEPTH_SPREAD = { background: 3.4, midground: 2.1, foreground: 1.7 };

function world(anchor, dx, dy, depthLane) {
  const s = DEPTH_SPREAD[depthLane] ?? 1.5;
  return { x: anchor.x + dx * s, y: anchor.y + dy * s };
}

// ---------- OPEN RANGE (P4) — the big world beyond the first road ----------
// The authored Westward + first-road slice (x −12..74, y −10..31) is untouched;
// everything below dresses the range AROUND it. All generation is deterministic
// (hash01) so layouts are stable across boots and testable.

export const OPEN_RANGE_BOUNDS = Object.freeze({ minX: -78, maxX: 150, minY: -60, maxY: 90 });

// Dirt roads continuing past the authored slice — drawn by buildGround with the
// same ribbon materials as the first road, and used as keep-clear corridors by
// the wilderness scatter.
export const OPEN_RANGE_ROADS = Object.freeze([
  // east: broken wagon → Eastwater Ranch
  { from: { x: 60.5, y: 12.2 }, to: { x: 88, y: 13.6 }, width: 5.4 },
  { from: { x: 88, y: 13.6 }, to: { x: 114, y: 13.2 }, width: 5.2 },
  { from: { x: 114, y: 13.2 }, to: { x: 131, y: 14.0 }, width: 5.6 },
  // west: Westward gate → the West Pass → Calico Flats (the free town, town 2)
  { from: { x: 7.6, y: 8.9 }, to: { x: -14, y: 8.6 }, width: 5.6 },
  { from: { x: -14, y: 8.6 }, to: { x: -34, y: 8.2 }, width: 5.0 },
  { from: { x: -34, y: 8.2 }, to: { x: -44, y: 9.0 }, width: 5.0 },
  // Calico Flats main street — the dirt ribbon under the gate, a leading line
  // running the length of the town to the water tower (the vista terminus).
  { from: { x: -44, y: 9.0 }, to: { x: -62, y: 9.1 }, width: 5.2 },
  // north spur: main road → Prospector's Folly (threads the old north-rim gap x 30..37)
  { from: { x: 30.5, y: 6.5 }, to: { x: 33.5, y: -27.5 }, width: 3.4 },
  // south spur: marsh edge → the Sunken Wash (threads the old south-rim gap x 51..55)
  { from: { x: 49, y: 21.5 }, to: { x: 76, y: 58 }, width: 3.6 },
]);

// Named points of interest for the world minimap. Coordinates are world-space
// (same system as OPEN_RANGE_BOUNDS: +x east, +y south).
export const WORLD_MAP_POIS = Object.freeze([
  { id: "westward",   label: "Westward",           x: 13,    y: 8    },
  { id: "eastwater",  label: "Eastwater Ranch",    x: 128,   y: 12   },
  { id: "folly",      label: "Prospector's Folly", x: 33.5,  y: -29.5 },
  { id: "wash",       label: "Sunken Wash",         x: 76.5,  y: 58.5 },
  { id: "westPass",   label: "West Pass",           x: -20,   y: 8.6  },
  { id: "calico",     label: "Calico Flats",       x: -52,   y: 9    },
]);

// Second settlement on the eastern road — a working ranch outpost. Buildings
// reuse WESTERN_SPECS kinds; fronts auto-face the road (front flips at y 8.9).
const EASTWATER_RANCH = [
  { kind: "ranch",       label: "Eastwater Ranch House",  x: 126.0, y: 9.4,  color: "#886840", size: 1.05 },
  { kind: "ranch",       label: "Eastwater Bunkhouse",    x: 133.0, y: 10.8, color: "#806038", size: 0.85 },
  { kind: "storefront",  label: "Eastwater Trading Post", x: 128.8, y: 18.6, color: "#9a7840", size: 0.92 },
  { kind: "waterTower",  label: "Eastwater Water Tower",  x: 135.5, y: 16.8, color: "#5a4a38", size: 1.0 },
  { kind: "windmill",    label: "Eastwater Windmill",     x: 122.5, y: 6.0,  color: "#6b5638", size: 1.15 },
  { kind: "fence",       label: "Paddock Rail W",         x: 128.5, y: 5.6,  color: "#a47b4c", size: 0.62 },
  { kind: "fence",       label: "Paddock Rail C",         x: 132.5, y: 5.4,  color: "#a47b4c", size: 0.62, yaw: 0.12 },
  { kind: "fence",       label: "Paddock Rail E",         x: 136.5, y: 5.8,  color: "#a47b4c", size: 0.6,  yaw: -0.1 },
  { kind: "brokenFence", label: "Gate Rail",              x: 120.8, y: 16.3, color: "#8d6540", size: 0.46 },
  { kind: "cart",        label: "Ranch Supply Cart",      x: 124.4, y: 13.0, color: "#b9824d", size: 0.72, yaw: 0.5 },
  { kind: "crate",       label: "Feed Crates",            x: 127.2, y: 11.9, color: "#b9824d", size: 0.6 },
  { kind: "crate",       label: "Post Crates",            x: 129.9, y: 17.1, color: "#a87542", size: 0.56 },
  { kind: "lampLow",     label: "Ranch Gate Lamp",        x: 118.5, y: 12.6, color: "#ffe6a8", size: 0.66 },
  { kind: "lampLow",     label: "Ranch House Lamp",       x: 124.8, y: 10.4, color: "#ffd8a0", size: 0.6 },
  { kind: "lampLow",     label: "Trading Post Lamp",      x: 127.4, y: 17.3, color: "#ffe6a8", size: 0.62 },
  { kind: "sign",        label: "Eastwater Sign",         x: 117.5, y: 15.0, color: "#ffd77b", size: 0.8 },
  // R4.6 — the ranch is inhabited. Horses tether at the Gate Rail south of the
  // road (clear of the road band y≤16.6 and the ranch tumbleweed's weave
  // y≤15.4); cattle graze the open paddock north of the buildings. Broadside
  // yaws — silhouettes read at range.
  { kind: "horseHitched", label: "Hitched Horse A", x: 120.2, y: 17.2, color: "#7a5a3c", size: 1.0, yaw: 2.9 },
  { kind: "horseHitched", label: "Hitched Horse B", x: 121.5, y: 17.5, color: "#6b4f34", size: 0.96, yaw: 3.3 },
  { kind: "cattle", label: "Paddock Cattle 1", x: 121.0, y: 5.2, color: "#8a6a48", size: 1.0,  yaw: 1.1 },
  { kind: "cattle", label: "Paddock Cattle 2", x: 123.4, y: 4.8, color: "#7d5f40", size: 0.95, yaw: -0.4 },
  { kind: "cattle", label: "Paddock Cattle 3", x: 125.2, y: 5.6, color: "#90704c", size: 1.05, yaw: 2.3 },
  { kind: "cattle", label: "Paddock Cattle 4", x: 127.0, y: 5.0, color: "#85664a", size: 0.9,  yaw: 0.7 },
  { kind: "cattle", label: "Paddock Cattle 5", x: 122.1, y: 4.2, color: "#7a5c3e", size: 1.0,  yaw: -1.2 },
  { kind: "cattle", label: "Paddock Cattle 6", x: 124.8, y: 4.4, color: "#8d6d4a", size: 0.92, yaw: 1.8 },
  { kind: "cattle", label: "Paddock Cattle 7", x: 126.5, y: 4.8, color: "#806248", size: 1.02, yaw: 3.0 },
];

// Abandoned dig in the north bluffs — a ruin to stumble on, lit so it reads at dusk.
const PROSPECTORS_FOLLY = [
  { kind: "watchtower",  label: "Folly Headframe",   x: 33.2, y: -31.5, color: "#4a3a28", size: 0.8 },
  { kind: "cart",        label: "Abandoned Ore Cart", x: 35.4, y: -28.8, color: "#7a5230", size: 0.66, yaw: 1.1 },
  { kind: "crate",       label: "Folly Crates",      x: 31.9, y: -29.7, color: "#7a5230", size: 0.54 },
  { kind: "deadTree",    label: "Folly Snag",        x: 30.2, y: -32.6, color: "#4a3526", size: 1.0 },
  { kind: "deadTree",    label: "Folly Snag II",     x: 36.8, y: -33.0, color: "#43301f", size: 0.85, yaw: 2.1 },
  { kind: "boulder",     label: "Folly Boulder",     x: 29.4, y: -28.2, color: "#6a5f55", size: 1.1 },
  { kind: "boulder",     label: "Folly Boulder II",  x: 37.6, y: -30.4, color: "#5d4f3f", size: 0.9 },
  { kind: "lampLow",     label: "Folly Lamp",        x: 33.8, y: -29.4, color: "#ffc88d", size: 0.6 },
  { kind: "sign",        label: "Folly Claim Sign",  x: 32.8, y: -25.8, color: "#caa15a", size: 0.7 },
];

// Damp pocket at the end of the south spur — reeds and deadfall, a future POI site.
const SUNKEN_WASH = [
  { kind: "marshCluster", label: "Wash Reeds",       x: 74.5, y: 57.0, color: "#5f7a4a", size: 1.1 },
  { kind: "marshCluster", label: "Wash Reeds II",    x: 78.2, y: 59.4, color: "#577038", size: 0.95 },
  { kind: "marshCluster", label: "Wash Reeds III",   x: 76.4, y: 61.8, color: "#5f7a4a", size: 1.2 },
  { kind: "reeds",        label: "Wash Edge Reeds",  x: 72.8, y: 59.8, color: "#5f7a4a", size: 0.9 },
  { kind: "deadTree",     label: "Wash Snag",        x: 73.4, y: 55.0, color: "#4a3526", size: 1.05, yaw: 0.7 },
  { kind: "deadTree",     label: "Wash Snag II",     x: 79.6, y: 56.6, color: "#43301f", size: 0.8 },
  { kind: "boulder",      label: "Wash Boulder",     x: 80.4, y: 60.8, color: "#6a5f55", size: 1.0 },
  { kind: "brokenFence",  label: "Washed-out Rail",  x: 75.6, y: 54.2, color: "#8d6540", size: 0.5, yaw: 1.9 },
];

// The road west narrows between two cliffs — the doorway to the next region.
const WEST_PASS = [
  { kind: "cliff",    label: "Pass Cliff North",  x: -20.0, y: 3.0,  color: "#4a5260", size: 1.7, heightMul: 1.35 },
  { kind: "cliff",    label: "Pass Cliff South",  x: -20.0, y: 14.2, color: "#444c5a", size: 1.8, heightMul: 1.5 },
  { kind: "deadTree", label: "Pass Snag",         x: -16.5, y: 6.0,  color: "#4a3526", size: 0.9, yaw: 1.3 },
  { kind: "boulder",  label: "Pass Boulder",      x: -24.2, y: 11.6, color: "#5d4f3f", size: 1.05 },
  { kind: "rock",     label: "Pass Scree",        x: -27.0, y: 5.8,  color: "#6a5f55", size: 0.8 },
  { kind: "sign",     label: "West Pass Sign",    x: -12.8, y: 10.1, color: "#ffd77b", size: 0.78 },
  { kind: "lampLow",  label: "Pass Lamp",         x: -13.6, y: 7.2,  color: "#ffc88d", size: 0.6 },
];

// CALICO FLATS — town 2, the free town (no corp charter, elected sheriff, neutral
// saloon row). A LEAN hero-object skeleton built west past the West Pass while the
// M0 perf reset is pending: procedural builders only, no scatter/NPC swarm. The
// main street runs east–west at y≈9 so the hardcoded building auto-facing rule
// (front = 8.9 - y; spike.js) orients every front to the street with no manual yaw.
// The road enters from the east under the gate arch; the water tower closes the
// west end as the town's vertical landmark. Density + a Calico region identity
// come post-M0.
const CALICO_FLATS = [
  // East entrance — the gate arch spans the incoming road (posts collide, lane clear).
  // signLines overrides the gate board text (default "WESTWARD") so Calico wears its
  // own name, not town 1's.
  { kind: "townGate",     label: "Calico Flats Gate",       x: -44.0, y: 9.0,  color: "#6b4a2c", size: 0.95, signLines: ["CALICO FLATS"] },
  // Foreground frame — a snag + cart flank the eastern approach like theater wings,
  // adding depth to the flat frontal view (mirrors Westward's FOREGROUND_FRAME). Off
  // the road lane (band y≈6.4–11.6 at width 5.2); east of the gate posts.
  { kind: "deadTree",     label: "Calico Approach Snag",     x: -41.0, y: 5.0,  color: "#3e3224", size: 1.2 },
  { kind: "cart",         label: "Calico Approach Cart",     x: -41.0, y: 12.2, color: "#a87542", size: 0.78, yaw: 0.5 },
  // Neutral saloon row — NORTH shoulder (y < 8.9 → fronts face south to the street).
  // Centers pulled to ~3.7u so the three masses read as one contiguous row (the
  // town's identity-defining "neutral saloon row"), not detached boxes. Bleached,
  // sun-scoured body+trim+roof (bodyTint/trimTint/roofTint) set Calico apart from
  // Westward's warm amber; the two saloons wear neon-on-clapboard signs (the free
  // town's lawless glow). Drovers' wears a rusty-red roof for accent relief.
  // bodyTint/trimTint nudged COOLER/greyer-blue than warm Westward — Calico is the
  // neon free-town, so its clapboard reads cold-lit, not amber. Subtle (still
  // readable wood); the rusty-red Drovers' roof stays as warm accent relief.
  { kind: "saloonFacade", label: "The Neutral Ground Saloon", x: -48.0, y: 5.4, color: "#a87848", size: 0.95, bodyTint: "#a3a896", trimTint: "#7e8478", roofTint: "#586066" },
  { kind: "saloonFacade", label: "Drovers' Rest Saloon",     x: -51.7, y: 5.2,  color: "#9c6f43", size: 0.9, bodyTint: "#9aa090", trimTint: "#778070", roofTint: "#7a3a2e" },
  { kind: "porch",        label: "Saloon Row Porch",         x: -48.0, y: 6.6,  color: "#5a4327", size: 0.6 },
  { kind: "storefront",   label: "Flats Mercantile",         x: -55.4, y: 5.8,  color: "#9a7840", size: 0.9, bodyTint: "#9ea596", trimTint: "#7c8472", roofTint: "#566066" },
  // SOUTH shoulder (y > 8.9 → fronts face north). The elected Sheriff's Office is
  // the civic anchor — set across the street FACING the saloon row, up-sized and
  // cool stone-tinted so the law out-masses the bars. The Boarding House wears a
  // verdigris (aged-copper) trim accent.
  { kind: "storefront",   label: "Calico Sheriff's Office",  x: -51.0, y: 12.6, color: "#8a6a3c", size: 1.0, bodyTint: "#9ba08c", trimTint: "#7e8270", roofTint: "#4e5a5e" },
  { kind: "ranch",        label: "Calico Boarding House",     x: -55.0, y: 13.0, color: "#86683e", size: 0.8, bodyTint: "#9c9276", trimTint: "#5f8a72", roofTint: "#5a5e60" },
  // Vertical landmark — closes the west end of the street, reads at range (bleached
  // tank to match the town).
  { kind: "waterTower",   label: "Calico Water Tower",        x: -62.0, y: 9.2,  color: "#8a7a5e", size: 1.1 },
  // Street fixtures.
  { kind: "sign",         label: "Calico Flats Marker",       x: -45.0, y: 7.4,  color: "#ffd77b", size: 0.72, signLines: ["CALICO FLATS"] },
  { kind: "lampLow",      label: "Gate Lantern",              x: -45.5, y: 10.3, color: "#ffe0a0", size: 0.56 },
  { kind: "lampLow",      label: "Saloon Row Lantern",        x: -50.5, y: 6.9,  color: "#ffe0a0", size: 0.52 },
  // Lights the dark west run — the Sheriff + water-tower (vista terminus) end sat in
  // an unlit ~12u corridor. North shoulder, off the y≈9 walk path.
  { kind: "lampLow",      label: "Tower Base Lantern",        x: -59.5, y: 7.4,  color: "#ffe0a0", size: 0.52 },
  { kind: "hitchingRail", label: "Saloon Hitching Rail",      x: -51.6, y: 7.0,  color: "#4a3526", size: 0.7,  yaw: 0.04 },
];

// CALICO FLATS — composition dressing (M0-safe authored props, Westward's proven
// vocabulary; NOT a scatter swarm). Turns the skeleton into a composed free town:
// boardwalks + warm window-glow + signage give the street life, the gallows is the
// grim civic landmark the eye lands on ("where bodies get found"), the Sheriff's
// warm lamp + readable "SHERIFF" sign set the law against the saloons' pink neon,
// and a back rank breaks the skyline with depth. Road lane (y≈9, band 6.4–11.6)
// stays clear; props hug the shoulders / boardwalk edges. Silhouettes are flat,
// dark, intentionally non-realistic SCENERY (art direction) — not NPCs (post-M0).
const CALICO_DRESSING = [
  // The gallows — centerpiece, south shoulder just past the gate; noose faces the
  // street (north). First grim thing you meet in the free town.
  { kind: "gallows",      label: "Calico Gallows",            x: -46.5, y: 12.6, color: "#4a3526", size: 1.0 },
  { kind: "lampLow",      label: "Gallows Lantern",           x: -45.8, y: 11.6, color: "#ffd6a0", size: 0.52 },
  // North boardwalk — continuous walk fronting the saloon row (null footprint).
  { kind: "productionBoardwalk", label: "North Boardwalk", x: -47.5, y: 6.6, color: "#5d3f24", size: 0.9 },
  { kind: "productionBoardwalk", label: "North Boardwalk", x: -51.0, y: 6.6, color: "#5d3f24", size: 0.9 },
  { kind: "productionBoardwalk", label: "North Boardwalk", x: -54.5, y: 6.6, color: "#5d3f24", size: 0.9 },
  // South boardwalk — fronts the sheriff + boarding house.
  { kind: "productionBoardwalk", label: "South Boardwalk", x: -51.0, y: 11.6, color: "#5d3f24", size: 0.9 },
  { kind: "productionBoardwalk", label: "South Boardwalk", x: -54.5, y: 11.6, color: "#5d3f24", size: 0.9 },
  // Warm window-glow — occupied-at-dusk read on every street-facing building.
  { kind: "windowGlowPanel", label: "Neutral Ground Glow", x: -48.0, y: 6.1,  color: "#ffbf72", size: 0.9 },
  { kind: "windowGlowPanel", label: "Drovers Glow",        x: -51.7, y: 5.95, color: "#ffad63", size: 0.85 },
  { kind: "windowGlowPanel", label: "Mercantile Glow",     x: -55.4, y: 6.4,  color: "#ffbf72", size: 0.85 },
  { kind: "windowGlowPanel", label: "Sheriff Glow",        x: -51.0, y: 11.9, color: "#ffce8a", size: 0.8 },
  // Saloon signage — hanging boards reinforce the neon row.
  { kind: "hangingSign",  label: "Neutral Ground Sign",      x: -47.4, y: 6.4,  color: "#ffc66e", size: 0.82 },
  { kind: "hangingSign",  label: "Drovers Sign",             x: -51.1, y: 6.3,  color: "#ffc66e", size: 0.8 },
  // Civic contrast — a readable gold "SHERIFF" board + a tall warm lamp set the
  // law's warmth against the saloons' pink neon (signLines renders the text).
  { kind: "sign",         label: "Sheriff Board",            x: -49.3, y: 11.8, color: "#ffd77b", size: 0.74, signLines: ["SHERIFF"] },
  { kind: "lampTall",     label: "Sheriff Lamp",             x: -49.0, y: 11.5, color: "#ffe0a0", size: 0.8 },
  // Cargo = activity.
  { kind: "barrelCrateCluster", label: "Saloon Cargo",       x: -46.6, y: 6.5,  color: "#7a5230", size: 0.82, yaw: 0.2 },
  { kind: "barrelCrateCluster", label: "Sheriff Cargo",      x: -53.4, y: 11.8, color: "#7a5230", size: 0.78, yaw: -0.2 },
  // Stylized shadow-figure silhouettes — SCENERY, off the lane, on boardwalk edges.
  { kind: "npcSilhouette", label: "Saloon Lounger",          x: -48.3, y: 6.5,  color: "#17100c", size: 0.82, yaw: 2.9 },
  { kind: "npcSilhouette", label: "Sheriff's Deputy",        x: -50.4, y: 11.8, color: "#17100c", size: 0.8,  yaw: -0.2 },
  { kind: "npcSilhouette", label: "Drifter",                 x: -53.5, y: 6.5,  color: "#120c09", size: 0.74, yaw: 2.95 },
  // Wheel ruts at the road margins (flat decals).
  { kind: "mudRutDecal",  label: "Calico Wheel Rut",         x: -49.0, y: 10.7, color: "#5a3923", size: 0.95, yaw: 0.05 },
  { kind: "mudRutDecal",  label: "West Run Wheel Rut",       x: -56.0, y: 7.4,  color: "#5a3923", size: 0.85, yaw: -0.1 },
  // Back rank — set-back small buildings break the north skyline (depth).
  { kind: "productionSaloon", label: "Back Lot Saloon",       x: -49.5, y: 2.3,  color: "#7a5230", size: 0.6, yaw: 0.05 },
  { kind: "productionStore",  label: "Back Lot Granary",      x: -54.0, y: 2.1,  color: "#634330", size: 0.62, yaw: -0.06 },
  // Comms masts on the saloon-row + sheriff rooftops — the free town's pirate-radio
  // skyline ("antennas/cables on clapboard"). baseH mounts them atop the buildings
  // so the thin silhouette + beacon rise above the roofline. Far west (x<-44) — OUT
  // of the dusk capture frame, so they don't touch the golden baseline.
  { kind: "antennaMast",  label: "Neutral Ground Mast",       x: -48.0, y: 5.7,  color: "#7d8270", size: 0.78, baseH: 3.1, beacon: "cyan" },
  { kind: "antennaMast",  label: "Sheriff Roof Mast",         x: -51.0, y: 12.4, color: "#7d8270", size: 0.72, baseH: 3.2, beacon: "red" },
  // Lore signs — the free town says its own canon (treatment WORLD section). Same
  // shape as the Sheriff Board (signLines renders via makeSignTexture). Small far-west
  // props (x<-44), hugging shoulders OFF the lane band (y≈6.4–11.6); not slabs, not in
  // the spawn wedge — so firstFrameSlabBlockers stays [] and the dusk frame is untouched.
  // 1) Free-town code, south of the gallows (gallows x:-46.5,y:12.6) — clear of the lane.
  { kind: "sign",         label: "Free Town Code Sign",       x: -46.0, y: 13.4, color: "#ffd77b", size: 0.7,  signLines: ["FREE TOWN OF", "CALICO FLATS", "NO CHARTER · NO MASTER"] },
  // 2) Water-rights / Severance, north shoulder at the water-tower base (tower x:-62,y:9.2).
  { kind: "sign",         label: "Water Rights Sign",         x: -61.0, y: 7.6,  color: "#ffd77b", size: 0.7,  signLines: ["WATER IS LAW", "SHARES HONORED HERE", "SINCE THE SEVERANCE"] },
  // 3) Neutral-ground pledge, street-side of the saloon row (saloons y≈5.4) — off the lane.
  { kind: "sign",         label: "Neutral Ground Pledge",     x: -47.0, y: 7.6,  color: "#ffd77b", size: 0.7,  signLines: ["NEUTRAL GROUND", "CHECK YOUR WAR", "AT THE DOOR"] },
];

// CYBERPUNK-WESTERN IDENTITY DRESSING — the "nothing is sleek" props that mark this
// as a rusted-chrome frontier, not a clean western: the iron doctor's wagon on the
// Calico approach and a comms mast on the town watchtower. Absolute coords. Kept to
// a handful of hero objects (M0-safe) and clear of the spawn wedge + route waypoints.
const CYBER_DRESSING = [
  // Iron doctor's wagon — parked off the north shoulder just outside the Calico gate,
  // flanking the eastern approach beside the Approach Snag. Cyan-accent surgery glow
  // is the first cyberpunk note you read entering the free town. Far west (x<-39) —
  // OUT of the dusk capture frame.
  { kind: "ironDoctor",   label: "Iron Doctor's Wagon",       x: -39.5, y: 5.5,  color: "#8a8f7d", size: 1.0, yaw: 0.7 },
  // Watchtower comms mast — a thin antenna + red beacon on the town's north watchtower
  // shoulder, breaking the skyline with a cyberpunk silhouette. NOTE: this sits inside
  // the dusk hero-capture frame (camera at 6.6,3.5,10.2 looking east) — flagged for a
  // golden re-bless. Off the spawn wedge (y 4 < 6.5) and ~1.9u off the jobBoard waypoint.
  { kind: "antennaMast",  label: "Watchtower Comms Mast",     x: 14.0,  y: 4.0,  color: "#7d8270", size: 0.85, beacon: "red" },
];

// Far navigation landmarks — big verticals that read across the range and give
// every horizon a destination.
const RANGE_LANDMARKS = [
  { kind: "heroMesaSkyline", label: "Sentinel Butte",    x: 105.0, y: -38.0, color: "#4e5870", size: 2.3, heightMul: 1.9, heroPeak: true },
  { kind: "mesaSkyline",     label: "Northwest Rampart", x: -28.0, y: -40.0, color: "#485266", size: 1.6, heightMul: 1.25 },
  { kind: "mesa",            label: "Far South Mesa",    x: 20.0,  y: 70.0,  color: "#46505e", size: 2.2, heightMul: 1.1 },
  { kind: "mesaSkyline",     label: "Southeast Tabletop", x: 118.0, y: 64.0, color: "#424c5e", size: 1.7, heightMul: 1.0 },
  { kind: "windmill",        label: "Drifter's Windmill", x: 88.0,  y: 40.0,  color: "#6b5638", size: 1.0 },
];

// Hard rim of the new world — overlapping mesas/cliffs around OPEN_RANGE_BOUNDS.
// Size floor keeps half-width sums above the 13u spacing so there is no slip gap
// (footprint 3.2·size; only colliding kinds — skyline kinds are backdrop-only).
function openRangeBoundaryRing() {
  const { minX, maxX, minY, maxY } = OPEN_RANGE_BOUNDS;
  const ring = [];
  const SPACING = 13;
  const edges = [
    { from: { x: minX, y: minY }, to: { x: maxX, y: minY }, name: "North Rim" },
    { from: { x: maxX, y: minY }, to: { x: maxX, y: maxY }, name: "East Rim" },
    { from: { x: maxX, y: maxY }, to: { x: minX, y: maxY }, name: "South Rim" },
    { from: { x: minX, y: maxY }, to: { x: minX, y: minY }, name: "West Rim" },
  ];
  // The far rims read as distant cool haze, but the OLD palette was 4 near-identical
  // blue-greys at near-uniform height — a flat monolith WALL, not a horizon. Widen the
  // cool palette across value + a hint of hue (one desaturated taupe ridge breaks the
  // blue monotony), and dramatize heightMul below, so the skyline reads as a broken
  // line of buttes. The West Rim (directly behind Calico) keeps the warm sandstone set
  // — buildMesa still cool-shifts it ~38% with distance, landing on warm taupe.
  const COOL_RIM = ["#3a4250", "#46506a", "#525a6e", "#3e4658", "#5c5e68", "#4a4e5c", "#62604f"];
  const WARM_RIM = ["#7a5e40", "#6e5238", "#82664a", "#765a42"];
  let n = 0;
  for (const edge of edges) {
    const palette = edge.name === "West Rim" ? WARM_RIM : COOL_RIM;
    const len = Math.hypot(edge.to.x - edge.from.x, edge.to.y - edge.from.y);
    const count = Math.ceil(len / SPACING);
    for (let i = 0; i < count; i++) {
      const t = i / count;
      n++;
      const h = hash01(n * 17.3);
      ring.push({
        kind: h > 0.62 ? "cliff" : "mesa",
        label: `${edge.name} ${i}`,
        x: edge.from.x + (edge.to.x - edge.from.x) * t,
        y: edge.from.y + (edge.to.y - edge.from.y) * t,
        color: palette[n % palette.length],
        // size floor stays 3.9 (no slip gaps); only the max widens for silhouette
        // variety. heightMul swings 0.6–2.1 for a jagged skyline (vertical only —
        // doesn't touch the footprint, so the wall stays sealed).
        size: 3.9 + hash01(n * 31.7) * 2.2,
        heightMul: 0.6 + hash01(n * 47.1) * 1.5,
        yaw: (hash01(n * 59.3) - 0.5) * 0.6,
      });
    }
  }
  return ring;
}

// Deterministic desert scatter across the open range: stratified grid, thinned
// by hash, kept clear of the authored slice, the roads, and the POI clearings.
const RANGE_PROTECT_RECT = { minX: -16, maxX: 78, minY: -12, maxY: 33 };
const RANGE_CLEARINGS = [
  { x: 127, y: 13, r: 17 },   // Eastwater Ranch
  { x: 33.5, y: -30, r: 12 }, // Prospector's Folly
  { x: 76, y: 58, r: 12 },    // Sunken Wash
  { x: -22, y: 8.6, r: 11 },  // West Pass corridor
  { x: -52, y: 9, r: 17 },    // Calico Flats (town 2)
];

function distToSegment(px, py, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / lenSq));
  return Math.hypot(px - (a.x + dx * t), py - (a.y + dy * t));
}

const RANGE_FLORA = [
  { kind: "sageCluster", color: "#70814b", w: 0.26 },
  { kind: "roadGrass",   color: "#8f8a56", w: 0.20 },
  { kind: "cactus",      color: "#577038", w: 0.16 },
  { kind: "boulder",     color: "#6a5f55", w: 0.12 },
  { kind: "rock",        color: "#5d4f3f", w: 0.10 },
  { kind: "brush",       color: "#6b6242", w: 0.08 },
  { kind: "deadTree",    color: "#4a3526", w: 0.05 },
  { kind: "sagePatch",   color: "#5f7a4a", w: 0.03 },
];

function openRangeWilderness() {
  const { minX, maxX, minY, maxY } = OPEN_RANGE_BOUNDS;
  const CELL = 11;
  const out = [];
  let n = 0;
  for (let gx = minX + CELL; gx < maxX - CELL * 0.5; gx += CELL) {
    for (let gy = minY + CELL; gy < maxY - CELL * 0.5; gy += CELL) {
      n++;
      // thin the field — deserts are empty; clumps come from the survivors
      if (hash01(n * 13.7 + gx * 0.31 + gy * 0.17) < 0.42) continue;
      const x = gx + (hash01(n * 23.9) - 0.5) * CELL * 0.9;
      const y = gy + (hash01(n * 41.3) - 0.5) * CELL * 0.9;
      if (x > RANGE_PROTECT_RECT.minX && x < RANGE_PROTECT_RECT.maxX &&
          y > RANGE_PROTECT_RECT.minY && y < RANGE_PROTECT_RECT.maxY) continue;
      if (RANGE_CLEARINGS.some((c) => Math.hypot(x - c.x, y - c.y) < c.r)) continue;
      if (OPEN_RANGE_ROADS.some((r) => distToSegment(x, y, r.from, r.to) < r.width / 2 + 4)) continue;
      let pick = hash01(n * 7.7);
      let flora = RANGE_FLORA[0];
      for (const f of RANGE_FLORA) { pick -= f.w; if (pick <= 0) { flora = f; break; } }
      const mega = flora.kind === "boulder" && hash01(n * 101.9) > 0.94;
      out.push({
        kind: flora.kind,
        label: `Range ${flora.kind} ${n}`,
        x, y,
        yaw: hash01(n * 67.1) * Math.PI * 2,
        color: flora.color,
        size: mega ? 2.3 : 0.6 + hash01(n * 89.3) * 1.0,
      });
    }
  }
  return out;
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
  // OPEN RANGE (P4) — the world beyond the first road
  ...WEST_PASS,
  ...CALICO_FLATS,
  ...CALICO_DRESSING,
  ...CYBER_DRESSING,
  ...EASTWATER_RANCH,
  ...PROSPECTORS_FOLLY,
  ...SUNKEN_WASH,
  ...RANGE_LANDMARKS,
  ...openRangeBoundaryRing(),
  ...openRangeWilderness(),
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
