// Uniform-grid spatial hash for radius queries against entities scattered
// across a small world. Built fresh per-tick from the live entity array;
// query is O(R^2 / cellArea) which is constant for the radii we use (4-9).

export function createSpatialHash(cellSize = 4) {
  return {
    cellSize,
    cells: new Map(), // cellKey -> array of entities
    count: 0,
  };
}

function cellKey(cx, cy) {
  return `${cx},${cy}`;
}

export function clearSpatialHash(grid) {
  grid.cells.clear();
  grid.count = 0;
}

export function rebuildSpatialHash(grid, entities, opts = {}) {
  const filter = opts.filter || (() => true);
  clearSpatialHash(grid);
  const cs = grid.cellSize;
  if (!entities || entities.length === 0) return grid;
  for (let i = 0; i < entities.length; i++) {
    const e = entities[i];
    if (!filter(e)) continue;
    const cx = Math.floor(e.x / cs);
    const cy = Math.floor(e.y / cs);
    const key = cellKey(cx, cy);
    let bucket = grid.cells.get(key);
    if (!bucket) {
      bucket = [];
      grid.cells.set(key, bucket);
    }
    bucket.push(e);
    grid.count++;
  }
  return grid;
}

export function queryRadius(grid, x, y, radius, out = []) {
  out.length = 0;
  const cs = grid.cellSize;
  const minCx = Math.floor((x - radius) / cs);
  const maxCx = Math.floor((x + radius) / cs);
  const minCy = Math.floor((y - radius) / cs);
  const maxCy = Math.floor((y + radius) / cs);
  const r2 = radius * radius;
  for (let cy = minCy; cy <= maxCy; cy++) {
    for (let cx = minCx; cx <= maxCx; cx++) {
      const bucket = grid.cells.get(cellKey(cx, cy));
      if (!bucket) continue;
      for (let i = 0; i < bucket.length; i++) {
        const e = bucket[i];
        const dx = e.x - x;
        const dy = e.y - y;
        if (dx * dx + dy * dy <= r2) out.push(e);
      }
    }
  }
  return out;
}
