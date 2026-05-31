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

export const FIRST_FIVE_ROUTE = Object.freeze([
  { kind: "spawn", label: "Dustward Spawn", x: PLAYER_SPAWN.x, y: PLAYER_SPAWN.y },
  { kind: "jobBoard", label: "Boone's Job Board", x: 13.0, y: 5.65 },
  { kind: "roadSign", label: "Marshal Road Sign", x: 24.0, y: 6.3 },
  { kind: "townBark", label: "Town Edge Warning", x: 31.5, y: 8.8 },
  { kind: "smokeCache", label: "Smoke Cache", x: 40.5, y: 12.9 },
  { kind: "slimeTell", label: "Slime Trail", x: 48.2, y: 16.4 },
  { kind: "roadSlime", label: "Road Slime", x: 53.5, y: 15.0 },
  { kind: "brokenWagon", label: "Broken Wagon", x: 60.5, y: 12.2 },
  { kind: "returnJobBoard", label: "Return To Boone", x: 13.0, y: 5.65 },
]);

const OUTBOUND_ROUTE = FIRST_FIVE_ROUTE.filter((point) => point.kind !== "returnJobBoard");

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
    const count = Math.max(1, Math.floor(len / 3.2));
    const nx = -dy / len;
    const ny = dx / len;
    for (let i = 1; i <= count; i++) {
      const t = i / (count + 1);
      const side = ((i + seg) % 2 === 0 ? -1 : 1) * (2.6 + (i % 3) * 0.25);
      planks.push({
        kind: "roadPlank",
        label: `Road Plank ${seg}-${i}`,
        x: from.x + dx * t + nx * side,
        y: from.y + dy * t + ny * side,
        yaw,
        color: "#87633c",
        size: 0.72,
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
    const count = Math.max(1, Math.floor(len / 4.0));
    for (let i = 1; i <= count; i++) {
      const t = i / (count + 1);
      ruts.push({
        kind: "roadRut",
        label: `Road Rut ${seg}-${i}`,
        x: from.x + dx * t,
        y: from.y + dy * t,
        yaw,
        color: "#8f6338",
        size: 1.0,
      });
    }
  }
  return ruts;
}

// Dressing offsets relative to FRONTIER_ANCHOR, lifted verbatim from
// REGION_PRESENTATION.frontier. depthLane drives subtle scale/elevation cues.
const VISTAS = [
  { kind: "townFacadeWarm", label: "Boone Back Office", dx: -3.7, dy: -3.0, color: "#caa66c", size: 0.46, depthLane: "background" },
  { kind: "watchtower", label: "Watchtower Frame",  dx: 5.2,  dy: -2.7,  color: "#ffd77b", size: 1.1, depthLane: "background" },
  { kind: "townFacadeStore", label: "Far Storefront", dx: -2.05, dy: -2.78, color: "#8a6a3e", size: 0.42, depthLane: "background" },
  { kind: "brokenFence", label: "Ranch Rail",        dx: -0.9, dy: 4.2,   color: "#8d6540", size: 0.55, depthLane: "foreground" },
];

const ROADS = [
  { kind: "road", label: "Marshal Road Post", dx: 1.2, dy: 0.24, color: "#c8a56a", size: 0.56 },
  { kind: "road", label: "Town Circle Marker", dx: 2.14, dy: 0.18, color: "#d7b06d", size: 0.58 },
  { kind: "road", label: "Broken Wagon Roadmark", dx: 3.02, dy: 0.04, color: "#d89f62", size: 0.64 },
  { kind: "road", label: "Watchtower Milepost", dx: 4.0, dy: -0.14, color: "#ffd77b", size: 0.64 },
  { kind: "road", label: "Marsh Fence Marker", dx: 4.78, dy: 0.42, color: "#9fc17c", size: 0.58 },
];

const PROPS = [
  { kind: "sign",  label: "Boone Road Sign",    dx: 1.5,  dy: 0.9,  color: "#ffd77b", size: 0.82, depthLane: "foreground" },
  { kind: "fence", label: "Left Split Fence",   dx: 2.1,  dy: 1.8,  color: "#a47b4c", size: 0.6,  depthLane: "foreground" },
  { kind: "fence", label: "Right Split Fence",  dx: 3.4,  dy: -1.1, color: "#a47b4c", size: 0.54, depthLane: "midground" },
  { kind: "cart",  label: "Supply Cart",        dx: 4.2,  dy: -0.7, color: "#b9824d", size: 0.7,  depthLane: "midground" },
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
  { kind: "brokenFence", label: "Corridor Rail North",  x: 11.6, y: 4.9, color: "#a47b4c", size: 0.62, yaw: 0.12 },
  { kind: "brokenFence", label: "Corridor Rail South",  x: 11.8, y: 13.1, color: "#a47b4c", size: 0.6, yaw: -0.16 },
  { kind: "crate", label: "Roadside Crates",      x: 14.2, y: 5.2,  color: "#b9824d", size: 0.6 },
];

const ROUTE_LIGHTS = [
  { kind: "lampTall", label: "Board Road Lamp", x: 15.0, y: 4.1, color: "#ffe6a8", size: 0.86 },
  { kind: "lampTall", label: "Marshal Bend Lamp", x: 25.2, y: 4.2, color: "#ffd8a0", size: 0.82 },
  { kind: "lampLow", label: "Town Edge Low Lamp", x: 32.2, y: 12.1, color: "#ffd8a0", size: 0.74 },
  { kind: "lampLow", label: "Cache Glimmer Lamp", x: 41.9, y: 9.6, color: "#ffc88d", size: 0.7 },
  { kind: "lampLow", label: "Wagon Salvage Lamp", x: 60.0, y: 9.1, color: "#ffc88d", size: 0.72 },
];

// Tall hero landmark — should read as the tallest first-view shape.
const LANDMARK = { kind: "landmark", label: "North Watchtower Beacon", dx: 5.16, dy: -1.66, color: "#ffd77b", size: 1.84, depthLane: "background" };

// Hero objects at their real gameplay world positions (not anchor-relative).
const HERO_OBJECTS = [
  { kind: "jobBoard",    label: "Boone's Job Board", x: 13.0, y: 5.65, color: "#d8a84f", size: 1.0 },
  { kind: "roadSign",    label: "Marshal Road Sign", x: 24.0, y: 6.3,  color: "#ffd77b", size: 1.0 },
  { kind: "townBark",    label: "Town Edge Warning", x: 31.5, y: 8.8,  color: "#ffe0a0", size: 0.8 },
  { kind: "smokeCache",  label: "Smoke Cache",       x: 40.5, y: 12.9, color: "#caa15a", size: 0.9 },
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
  { kind: "townFacadeWarm", label: "Dustward Saloon",  x: -5.2, y: 0.55, color: "#7a5a36", size: 0.72 },
  { kind: "townFacadeStore", label: "Dry Goods Store",  x: 0.8,  y: 0.45, color: "#8a6a3e", size: 0.62 },
  { kind: "townFacadeDark", label: "Assay Office", x: 5.8, y: 0.35, color: "#6a4a30", size: 0.54 },
  { kind: "porch",        label: "Saloon Porch",     x: -5.2, y: 1.75, color: "#5a4327", size: 0.62 },
  { kind: "porch",        label: "Store Porch",      x: 0.8,  y: 1.75, color: "#5a4327", size: 0.58 },
  { kind: "lamp",         label: "Saloon Lamp",      x: -1.9, y: 2.25, color: "#ffe0a0", size: 0.44, depthLane: "foreground" },
  { kind: "sign",         label: "Saloon Shingle",   x: -5.2, y: 0.05, color: "#ffd77b", size: 0.56 },
  { kind: "fence",        label: "Town Hitching Rail", x: 6.8, y: 2.65, color: "#a47b4c", size: 0.55, depthLane: "foreground" },
  { kind: "cactus",       label: "Town Cactus",      x: -1.3, y: 6.9,  color: "#5c7a3a", size: 0.64 },
];

// Western flora flanking the road corridor — shoulders only (out of the wedge).
const ROAD_FLORA = [
  { kind: "cactus", label: "Roadside Cactus", x: 11.2, y: 6.0, color: "#5c7a3a", size: 0.9 },
  { kind: "brush", label: "Dry Brush", x: 13.0, y: 6.1, color: "#7a6a3a", size: 0.7 },
  { kind: "brush", label: "Dry Brush", x: 12.2, y: 11.6, color: "#6f5f33", size: 0.6 },
  { kind: "cactus", label: "Tall Cactus", x: 16.6, y: 7.9, color: "#577538", size: 1.0 },
  { kind: "deadTree", label: "Lone Dead Tree", x: 18.2, y: 6.9, color: "#4a3a28", size: 1.1 },
  { kind: "brush", label: "Scrub", x: 23.4, y: 9.6, color: "#6f5f33", size: 0.7 },
  { kind: "rock", label: "Road Rock", x: 27.8, y: 5.3, color: "#6a5f55", size: 0.9 },
  { kind: "cactus", label: "Twin Cactus", x: 34.0, y: 10.8, color: "#5c7a3a", size: 0.85 },
  { kind: "brush", label: "Tumbleweed", x: 38.6, y: 9.3, color: "#8a7a4a", size: 0.5 },
  { kind: "deadTree", label: "Junction Snag", x: 45.5, y: 12.4, color: "#3e3224", size: 1.1 },
  { kind: "marshCluster", label: "Marsh Slime Sign", x: 46.5, y: 16.1, color: "#75d06b", size: 0.75, yaw: -0.5 },
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
  { kind: "brush", label: "Marsh Grass", x: 47.0, y: 14.8, color: "#6a7a3a", size: 0.7 },
];

// Soft world boundary — mesas/cliffs/boulders ring the playable rectangle. Mesa
// footprints are square (3.2*size); spacing 5 with size ~1.8 (half-width 2.88)
// overlaps by ~0.76, so there is no gap wide enough to slip through.
const BOUNDARY_RING = [
  // north wall (behind town), pushed back so it reads as horizon, not a first-frame slab
  { kind: "mesaSkyline", label: "North Mesa", x: 1.0, y: -5.4, color: "#5a4636", size: 1.0 },
  { kind: "mesaSkyline", label: "North Mesa", x: 8.0, y: -5.8, color: "#63503c", size: 1.05 },
  { kind: "mesaSkyline", label: "North Mesa", x: 15.0, y: -5.6, color: "#5a4636", size: 0.98 },
  { kind: "mesaSkyline", label: "North Cliff", x: 23.0, y: -5.5, color: "#544234", size: 1.08 },
  { kind: "mesaSkyline", label: "North Mesa", x: 32.0, y: -5.6, color: "#63503c", size: 1.04 },
  { kind: "mesaSkyline", label: "North Mesa", x: 42.0, y: -5.4, color: "#5a4636", size: 1.08 },
  { kind: "mesaSkyline", label: "Northeast Mesa", x: 62.0, y: -5.3, color: "#5a4636", size: 1.12 },
  // east wall (the eastern horizon backdrop), x ≈ 70
  { kind: "mesa", label: "East Mesa", x: 70.0, y: 4.0, color: "#5e4a38", size: 2.0 },
  { kind: "cliff", label: "East Cliff", x: 70.0, y: 10.5, color: "#564434", size: 2.1 },
  { kind: "mesaSkyline", label: "East Mesa", x: 70.0, y: 17.5, color: "#5e4a38", size: 1.45 },
  { kind: "mesa", label: "Southeast Mesa", x: 68.0, y: 26.5, color: "#5a4636", size: 1.9 },
  // south wall, y ≈ 27
  { kind: "mesa", label: "South Mesa", x: 58.0, y: 27.0, color: "#544234", size: 1.9 },
  { kind: "mesa", label: "South Mesa", x: 48.0, y: 27.3, color: "#5a4636", size: 1.8 },
  { kind: "cliff", label: "South Cliff", x: 36.0, y: 27.0, color: "#564434", size: 2.0 },
  { kind: "mesa", label: "South Mesa", x: 24.0, y: 26.8, color: "#63503c", size: 1.8 },
  { kind: "mesa", label: "South Mesa", x: 12.0, y: 26.8, color: "#63503c", size: 1.8 },
  { kind: "mesa", label: "Southwest Mesa", x: 3.0, y: 26.4, color: "#5a4636", size: 1.9 },
  // west wall, pushed back from the spawn camera so it contains play without
  // becoming an opaque first-frame foreground slab.
  { kind: "mesa", label: "West Mesa", x: -8.0, y: 13.5, color: "#5e4a38", size: 1.9 },
  { kind: "mesa", label: "West Mesa", x: -8.0, y: 8.5, color: "#5a4636", size: 1.9 },
  { kind: "mesa", label: "West Mesa", x: -8.0, y: 3.5, color: "#63503c", size: 1.9 },
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
  ...ROAD_CORRIDOR,
  ...ROUTE_LIGHTS,
  ...routeRuts(),
  ...routePlanks(),
  ...ROAD_FLORA,
  ...MARSH,
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
