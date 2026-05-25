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
  { kind: "town", label: "Town Roofline", dx: 1.12, dy: -1.08, color: "#caa66c", size: 1.22, depthLane: "background" },
  { kind: "watchtower", label: "Watchtower Frame", dx: 4.25, dy: -1.92, color: "#ffd77b", size: 1.28, depthLane: "background" },
  { kind: "gate", label: "Town Gate Posts", dx: 2.45, dy: -1.02, color: "#b9824d", size: 0.96, depthLane: "midground" },
  { kind: "ranch", label: "Ranch Roof", dx: 0.52, dy: 1.24, color: "#9f7a4e", size: 0.78, depthLane: "foreground" },
];

const ROADS = [
  { kind: "road", label: "Marshal Road Post", dx: 1.2, dy: 0.24, color: "#c8a56a", size: 0.56 },
  { kind: "road", label: "Town Circle Marker", dx: 2.14, dy: 0.18, color: "#d7b06d", size: 0.58 },
  { kind: "road", label: "Broken Wagon Roadmark", dx: 3.02, dy: 0.04, color: "#d89f62", size: 0.64 },
  { kind: "road", label: "Watchtower Milepost", dx: 4.0, dy: -0.14, color: "#ffd77b", size: 0.64 },
  { kind: "road", label: "Marsh Fence Marker", dx: 4.78, dy: 0.42, color: "#9fc17c", size: 0.58 },
];

const PROPS = [
  { kind: "sign", label: "Boone Road Sign", dx: 1.62, dy: 0.74, color: "#ffd77b", size: 0.82, depthLane: "foreground" },
  { kind: "fence", label: "Left Split Fence", dx: 2.34, dy: 1.44, color: "#a47b4c", size: 0.6, depthLane: "foreground" },
  { kind: "fence", label: "Right Split Fence", dx: 3.12, dy: -0.96, color: "#a47b4c", size: 0.54, depthLane: "midground" },
  { kind: "cart", label: "Supply Cart", dx: 3.58, dy: -0.62, color: "#b9824d", size: 0.7, depthLane: "midground" },
  { kind: "lamp", label: "Road Lantern", dx: 4.25, dy: 0.42, color: "#ffd77b", size: 0.68, depthLane: "midground" },
  { kind: "lamp", label: "Board Lantern", dx: 1.18, dy: -0.44, color: "#ffe6a8", size: 0.58, depthLane: "midground" },
  { kind: "lamp", label: "Town Gate Lantern", dx: 2.58, dy: -0.58, color: "#ffe6a8", size: 0.56, depthLane: "background" },
  { kind: "crate", label: "Barricade Crates", dx: 2.84, dy: 0.92, color: "#b9824d", size: 0.62, depthLane: "foreground" },
];

// Tall hero landmark — should read as the tallest first-view shape.
const LANDMARK = { kind: "landmark", label: "North Watchtower Beacon", dx: 5.16, dy: -1.66, color: "#ffd77b", size: 1.84, depthLane: "background" };

// Hero objects at their real gameplay world positions (not anchor-relative).
const HERO_OBJECTS = [
  { kind: "jobBoard", label: "Boone's Job Board", x: 12.35, y: 8.55, color: "#d8a84f", size: 1.0 },
  { kind: "smokeCache", label: "Smoke Cache", x: 12.6, y: 8.85, color: "#caa15a", size: 0.9 },
  { kind: "brokenWagon", label: "Broken Wagon", x: 13.5, y: 10.5, color: "#b9824d", size: 1.2 },
  { kind: "roadSlime", label: "Road Slime", x: 14.4, y: 9.4, color: "#7fd06a", size: 0.9 },
];

// Depth lanes spread along the offset direction so background vistas read as
// distant horizon silhouettes and foreground dressing stays near the road,
// instead of every element crowding the same few tiles in front of the camera.
const DEPTH_SPREAD = { background: 3.4, midground: 2.1, foreground: 1.7 };

function world(anchor, dx, dy, depthLane) {
  const s = DEPTH_SPREAD[depthLane] ?? 1.5;
  return { x: anchor.x + dx * s, y: anchor.y + dy * s };
}

// Returns all scene placements in absolute world coordinates.
export function buildFrontierPlacements() {
  const dressing = [...VISTAS, ...ROADS, ...PROPS, LANDMARK].map((e) => {
    const { x, y } = world(FRONTIER_ANCHOR, e.dx, e.dy, e.depthLane);
    return { ...e, x, y };
  });
  return [...dressing, ...HERO_OBJECTS];
}
