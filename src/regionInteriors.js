// Hand-authored interior maps — one per region.
// Tile codes match the world map: 0 = floor, 3 = timber/wall, 4 = plaster/decor.
// Each interior shares the player-house pipeline (no weather, no enemies, no
// minimap noise) and grants a one-time lore line + loot tier on first entry.

function createGrid(width, height, fillFloor = 0, wallTile = 3) {
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) =>
      x === 0 || y === 0 || x === width - 1 || y === height - 1 ? wallTile : fillFloor,
    ),
  );
}

function block(map, x0, y0, x1, y1, tile) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (map[y] && map[y][x] !== undefined) map[y][x] = tile;
    }
  }
}

function carveDoor(map, x, y) {
  if (map[y]) map[y][x] = 0;
}

// frontier-cave: a low-ceilinged miner's drift. Stone walls, timber bracing,
// a sealed strongbox at the back wall.
function createFrontierCave() {
  const w = 16;
  const h = 18;
  const map = createGrid(w, h, 0, 3);
  // Inner pillars/stalagmites
  block(map, 4, 4, 5, 5, 4);
  block(map, 10, 4, 11, 5, 4);
  block(map, 4, 11, 5, 12, 4);
  block(map, 10, 11, 11, 12, 4);
  // Mine-cart rails (decorative wall blocks running down center)
  block(map, 7, 3, 8, 8, 4);
  // Back-wall vault row
  block(map, 3, 14, 12, 14, 4);
  carveDoor(map, 7, 14);
  carveDoor(map, 8, 14);
  // Entry door
  carveDoor(map, 7, h - 1);
  carveDoor(map, 8, h - 1);
  return map;
}

// ashfall-ruin: collapsed obsidian temple. Open central nave, broken altar,
// scorch-marked floor (still floor tiles).
function createAshfallRuin() {
  const w = 18;
  const h = 16;
  const map = createGrid(w, h, 0, 3);
  // Toppled column stubs
  block(map, 4, 3, 4, 4, 4);
  block(map, 13, 3, 13, 4, 4);
  block(map, 4, 11, 4, 12, 4);
  block(map, 13, 11, 13, 12, 4);
  // Inner sanctum walls (broken on near side)
  block(map, 7, 3, 10, 3, 4);
  block(map, 7, 12, 10, 12, 4);
  block(map, 7, 4, 7, 11, 4);
  block(map, 10, 4, 10, 11, 4);
  carveDoor(map, 8, 12);
  carveDoor(map, 9, 12);
  // Altar (decor cluster at the back)
  block(map, 8, 5, 9, 6, 4);
  // Entry door
  carveDoor(map, 8, h - 1);
  carveDoor(map, 9, h - 1);
  return map;
}

// ironlantern-relay: an abandoned lantern-network signal hub. Steel partition
// walls, central console, side conduits.
function createIronlanternRelay() {
  const w = 16;
  const h = 16;
  const map = createGrid(w, h, 0, 3);
  // Side conduit walls
  block(map, 2, 5, 2, 10, 4);
  block(map, 13, 5, 13, 10, 4);
  // Central console cluster
  block(map, 6, 6, 9, 9, 4);
  carveDoor(map, 7, 9);
  carveDoor(map, 8, 9);
  // Side benches
  block(map, 4, 12, 5, 12, 4);
  block(map, 10, 12, 11, 12, 4);
  // Entry door
  carveDoor(map, 7, h - 1);
  carveDoor(map, 8, h - 1);
  return map;
}

export const REGION_INTERIORS = {
  "frontier-cave": {
    id: "frontier-cave",
    region: "frontier",
    label: "Old Drift Mine",
    propLabel: "Mine Mouth",
    propColor: "#a99480",
    spawn: { x: 7.5, y: 16.2, angle: -Math.PI / 2 },
    exit: { x: 7.5, y: 16.5 },
    entryLog: "You step into the old drift mine. Cool air, timber creaks, and a strongbox sealed under dust.",
    firstVisitLore: "Scratched into a beam: 'Cogwheel signed for the load. Council never paid us.'",
    firstVisitLoot: { gold: 22, items: { "lantern-filament": 1 } },
  },
  "ashfall-ruin": {
    id: "ashfall-ruin",
    region: "ashfall",
    label: "Obsidian Sanctum",
    propLabel: "Cracked Sanctum",
    propColor: "#7a3a26",
    spawn: { x: 8.5, y: 14.2, angle: -Math.PI / 2 },
    exit: { x: 8.5, y: 14.5 },
    entryLog: "Heat radiates from the sanctum stones. The altar is split clean down the middle.",
    firstVisitLore: "Half a tablet remains: '...when the lantern dims, the rotation begins again.'",
    firstVisitLoot: { gold: 28, items: { "heat-resin": 1, "ashglass": 1 } },
  },
  "ironlantern-relay": {
    id: "ironlantern-relay",
    region: "ironlantern",
    label: "Hollow Signal Relay",
    propLabel: "Relay Hatch",
    propColor: "#7aa6d8",
    spawn: { x: 7.5, y: 14.2, angle: -Math.PI / 2 },
    exit: { x: 7.5, y: 14.5 },
    entryLog: "The relay hums faintly under your boots. Console screens flicker in patterns nobody alive can read.",
    firstVisitLore: "A console log loops: 'PURGE QUEUED — operator absent — PURGE QUEUED — operator absent —'",
    firstVisitLoot: { gold: 34, items: { "cipher-lens": 1, "pressurized-ink": 1 } },
  },
};

const FACTORIES = {
  "frontier-cave": createFrontierCave,
  "ashfall-ruin": createAshfallRuin,
  "ironlantern-relay": createIronlanternRelay,
};

export function buildRegionInteriorMap(interiorId) {
  const factory = FACTORIES[interiorId];
  if (!factory) return null;
  return factory();
}

export function getRegionInteriorByRegion(regionId) {
  for (const interior of Object.values(REGION_INTERIORS)) {
    if (interior.region === regionId) return interior;
  }
  return null;
}

export function listRegionInteriors() {
  return Object.values(REGION_INTERIORS);
}

export function ensureInteriorVisitState(regions) {
  if (!regions || typeof regions !== "object") return;
  if (!regions.interiorsVisited || typeof regions.interiorsVisited !== "object") {
    regions.interiorsVisited = {};
  }
}

export function hasVisitedInterior(regions, interiorId) {
  return Boolean(regions?.interiorsVisited?.[interiorId]);
}

export function markInteriorVisited(regions, interiorId) {
  ensureInteriorVisitState(regions);
  regions.interiorsVisited[interiorId] = true;
}
