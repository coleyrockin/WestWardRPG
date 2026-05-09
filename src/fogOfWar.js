// Tile-based fog of war. Per-region 32×32 bool discovery grid that reveals
// as the player moves. Minimap consumes it to grey out undiscovered tiles.
// The grid is saved on state.regions.fog and migrated cleanly on load.

export const FOG_GRID_SIZE = 32;

// World-space bounds per region (matches the map layout in main.js)
const REGION_BOUNDS = {
  frontier:    { minX: 0, minY: 0,  maxX: 32, maxY: 32 },
  ashfall:     { minX: 24, minY: 24, maxX: 56, maxY: 56 },
  ironlantern: { minX: 48, minY: 0,  maxX: 80, maxY: 32 },
};

function boundsFor(regionId) {
  return REGION_BOUNDS[regionId] || REGION_BOUNDS.frontier;
}

// Convert world (x, y) → grid cell indices for a region.
export function worldToCell(regionId, wx, wy) {
  const b = boundsFor(regionId);
  const gx = Math.floor(((wx - b.minX) / (b.maxX - b.minX)) * FOG_GRID_SIZE);
  const gy = Math.floor(((wy - b.minY) / (b.maxY - b.minY)) * FOG_GRID_SIZE);
  return {
    gx: Math.max(0, Math.min(FOG_GRID_SIZE - 1, gx)),
    gy: Math.max(0, Math.min(FOG_GRID_SIZE - 1, gy)),
  };
}

export function createFogGrid() {
  return new Array(FOG_GRID_SIZE * FOG_GRID_SIZE).fill(false);
}

export function normalizeFogGrid(source) {
  if (Array.isArray(source) && source.length === FOG_GRID_SIZE * FOG_GRID_SIZE) {
    return source.map(Boolean);
  }
  return createFogGrid();
}

// Mark a 3×3 neighbourhood around the player's cell as discovered.
export function revealAroundPlayer(grid, regionId, wx, wy) {
  const { gx, gy } = worldToCell(regionId, wx, wy);
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = gx + dx;
      const ny = gy + dy;
      if (nx >= 0 && nx < FOG_GRID_SIZE && ny >= 0 && ny < FOG_GRID_SIZE) {
        grid[ny * FOG_GRID_SIZE + nx] = true;
      }
    }
  }
}

export function isCellDiscovered(grid, gx, gy) {
  if (!Array.isArray(grid)) return false;
  return Boolean(grid[gy * FOG_GRID_SIZE + gx]);
}

// Returns a [0..1] discovery fraction for a region.
export function regionDiscoveryRatio(grid) {
  if (!Array.isArray(grid)) return 0;
  const discovered = grid.filter(Boolean).length;
  return discovered / (FOG_GRID_SIZE * FOG_GRID_SIZE);
}
