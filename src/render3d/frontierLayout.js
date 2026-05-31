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

// Dressing offsets relative to FRONTIER_ANCHOR, lifted verbatim from
// REGION_PRESENTATION.frontier. depthLane drives subtle scale/elevation cues.
const VISTAS = [
  { kind: "town",       label: "Town Roofline",    dx: 0.9,  dy: -1.4,  color: "#caa66c", size: 1.22, depthLane: "background" },
  { kind: "watchtower", label: "Watchtower Frame",  dx: 4.8,  dy: -2.2,  color: "#ffd77b", size: 1.28, depthLane: "background" },
  { kind: "gate",       label: "Town Gate Posts",   dx: 2.4,  dy: -1.2,  color: "#b9824d", size: 0.96, depthLane: "midground" },
  { kind: "ranch",      label: "Ranch Roof",        dx: 0.4,  dy: 1.6,   color: "#9f7a4e", size: 0.78, depthLane: "foreground" },
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

// Tall hero landmark — should read as the tallest first-view shape.
const LANDMARK = { kind: "landmark", label: "North Watchtower Beacon", dx: 5.16, dy: -1.66, color: "#ffd77b", size: 1.84, depthLane: "background" };

// Hero objects at their real gameplay world positions (not anchor-relative).
const HERO_OBJECTS = [
  { kind: "jobBoard",    label: "Boone's Job Board", x: 12.5,  y: 8.3,  color: "#d8a84f", size: 1.0 },
  { kind: "smokeCache",  label: "Smoke Cache",       x: 11.2,  y: 9.4,  color: "#caa15a", size: 0.9 },
  { kind: "brokenWagon", label: "Broken Wagon",      x: 15.5,  y: 11.0, color: "#b9824d", size: 1.2 },
  { kind: "roadSlime",   label: "Road Slime",        x: 14.8,  y: 9.0,  color: "#7fd06a", size: 0.9 },
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
  { kind: "saloon",     label: "Dustward Saloon",    x: 3.0,  y: 1.8,  color: "#7a5a36", size: 1.35 },
  { kind: "storefront", label: "Dry Goods Store",    x: 7.2,  y: 1.6,  color: "#8a6a3e", size: 1.0 },
  { kind: "storefront", label: "Assay Office",       x: 1.0,  y: 5.0,  color: "#6f5230", size: 0.95 },
  { kind: "saloon",     label: "Boarding House",     x: 6.0,  y: 5.5,  color: "#74552f", size: 1.1 },
  { kind: "porch",      label: "Saloon Porch",       x: 3.0,  y: 3.1,  color: "#5a4327", size: 1.2 },
  { kind: "porch",      label: "Store Porch",        x: 7.2,  y: 2.8,  color: "#5a4327", size: 1.0 },
  { kind: "lamp",       label: "Saloon Lamp",        x: 5.0,  y: 2.8,  color: "#ffe6a8", size: 0.6, depthLane: "foreground" },
  { kind: "sign",       label: "Saloon Shingle",     x: 3.0,  y: 0.6,  color: "#ffd77b", size: 0.82 },
  { kind: "fence",      label: "Town Hitching Rail", x: 9.5,  y: 3.5,  color: "#a47b4c", size: 0.8, depthLane: "foreground" },
  { kind: "cactus",     label: "Town Cactus",        x: 0.5,  y: 7.2,  color: "#5c7a3a", size: 0.85 },
];

// Western flora flanking the road corridor — shoulders only (out of the wedge).
const ROAD_FLORA = [
  { kind: "cactus", label: "Roadside Cactus", x: 11.2, y: 6.0, color: "#5c7a3a", size: 0.9 },
  { kind: "brush", label: "Dry Brush", x: 13.0, y: 6.1, color: "#7a6a3a", size: 0.7 },
  { kind: "brush", label: "Dry Brush", x: 12.2, y: 11.6, color: "#6f5f33", size: 0.6 },
  { kind: "cactus", label: "Tall Cactus", x: 16.6, y: 7.9, color: "#577538", size: 1.0 },
  { kind: "deadTree", label: "Lone Dead Tree", x: 18.2, y: 6.9, color: "#4a3a28", size: 1.1 },
  { kind: "brush", label: "Scrub", x: 17.4, y: 10.6, color: "#6f5f33", size: 0.7 },
  { kind: "rock", label: "Road Rock", x: 19.6, y: 8.9, color: "#6a5f55", size: 0.9 },
  { kind: "cactus", label: "Twin Cactus", x: 21.2, y: 7.5, color: "#5c7a3a", size: 0.85 },
  { kind: "brush", label: "Tumbleweed", x: 20.2, y: 9.7, color: "#8a7a4a", size: 0.5 },
  { kind: "deadTree", label: "Junction Snag", x: 23.8, y: 11.4, color: "#3e3224", size: 1.1 },
];

// Marsh / water lowland to the south — the Road Slime's home turf.
const MARSH = [
  { kind: "reeds", label: "Marsh Reeds", x: 12.5, y: 13.6, color: "#5f7a4a", size: 0.9 },
  { kind: "reeds", label: "Marsh Reeds", x: 15.0, y: 14.3, color: "#577038", size: 1.0 },
  { kind: "reeds", label: "Marsh Reeds", x: 18.6, y: 15.1, color: "#5f7a4a", size: 0.9 },
  { kind: "reeds", label: "Marsh Reeds", x: 21.6, y: 14.0, color: "#577038", size: 0.85 },
  { kind: "deadTree", label: "Marsh Snag", x: 14.0, y: 16.2, color: "#3e3224", size: 1.2 },
  { kind: "deadTree", label: "Marsh Snag", x: 20.2, y: 16.6, color: "#3e3224", size: 1.0 },
  { kind: "rock", label: "Marsh Stone", x: 11.0, y: 15.0, color: "#5a5048", size: 0.8 },
  { kind: "boulder", label: "Sunken Boulder", x: 17.0, y: 17.6, color: "#544c44", size: 1.0 },
  { kind: "brush", label: "Marsh Grass", x: 16.0, y: 13.2, color: "#6a7a3a", size: 0.7 },
];

// Soft world boundary — mesas/cliffs/boulders ring the playable rectangle. Mesa
// footprints are square (3.2*size); spacing 5 with size ~1.8 (half-width 2.88)
// overlaps by ~0.76, so there is no gap wide enough to slip through.
const BOUNDARY_RING = [
  // north wall (behind town), y ≈ -1.2
  { kind: "mesa", label: "North Mesa", x: 1.0, y: -1.2, color: "#5a4636", size: 1.8 },
  { kind: "mesa", label: "North Mesa", x: 6.0, y: -1.2, color: "#63503c", size: 1.9 },
  { kind: "mesa", label: "North Mesa", x: 11.0, y: -1.4, color: "#5a4636", size: 1.8 },
  { kind: "cliff", label: "North Cliff", x: 16.0, y: -1.2, color: "#544234", size: 2.0 },
  { kind: "mesa", label: "North Mesa", x: 21.0, y: -1.2, color: "#63503c", size: 1.9 },
  { kind: "mesa", label: "Northeast Mesa", x: 26.0, y: -1.2, color: "#5a4636", size: 2.0 },
  // east wall (the eastern horizon backdrop), x ≈ 29
  { kind: "mesa", label: "East Mesa", x: 29.0, y: 3.5, color: "#5e4a38", size: 2.0 },
  { kind: "cliff", label: "East Cliff", x: 29.0, y: 8.5, color: "#564434", size: 2.1 },
  { kind: "mesa", label: "East Mesa", x: 29.0, y: 13.5, color: "#5e4a38", size: 2.0 },
  { kind: "mesa", label: "Southeast Mesa", x: 28.0, y: 18.5, color: "#5a4636", size: 1.9 },
  // south wall, y ≈ 18.5
  { kind: "mesa", label: "South Mesa", x: 23.0, y: 18.8, color: "#544234", size: 1.9 },
  { kind: "mesa", label: "South Mesa", x: 18.0, y: 19.0, color: "#5a4636", size: 1.8 },
  { kind: "cliff", label: "South Cliff", x: 13.0, y: 19.0, color: "#564434", size: 2.0 },
  { kind: "mesa", label: "South Mesa", x: 8.0, y: 18.8, color: "#63503c", size: 1.8 },
  { kind: "mesa", label: "Southwest Mesa", x: 3.0, y: 18.6, color: "#5a4636", size: 1.9 },
  // west wall, x ≈ -1
  { kind: "mesa", label: "West Mesa", x: -1.0, y: 13.5, color: "#5e4a38", size: 1.9 },
  { kind: "mesa", label: "West Mesa", x: -1.0, y: 8.5, color: "#5a4636", size: 1.9 },
  { kind: "mesa", label: "West Mesa", x: -1.0, y: 3.5, color: "#63503c", size: 1.9 },
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
const ABSOLUTE_ZONES = [...TOWN_EDGE, ...ROAD_FLORA, ...MARSH, ...BOUNDARY_RING];

// Returns all scene placements in absolute world coordinates.
export function buildFrontierPlacements() {
  const dressing = [...VISTAS, ...ROADS, ...PROPS, LANDMARK].map((e) => {
    const { x, y } = world(FRONTIER_ANCHOR, e.dx, e.dy, e.depthLane);
    return { ...e, x, y };
  });
  return [...dressing, ...ABSOLUTE_ZONES, ...HERO_OBJECTS];
}
