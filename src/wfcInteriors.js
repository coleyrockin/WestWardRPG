// Wave Function Collapse interior generator.
// Produces deterministic one-room cave/ruin layouts from a seed string.
// Tile-code convention for the generated grid:
//   0 = floor, 3 = wall, 4 = decor/pillar
//
// Anti-goal: world map and POI placement remain handcrafted. This is
// interior-only and supplements (not replaces) the hand-authored maps.

// Tile definitions — id, weight, and allowed adjacency in each of 4 directions.
// Directions: 0=N, 1=E, 2=S, 3=W
const TILES = [
  { id: 0, name: "floor",  weight: 10, adj: [[0, 3, 4], [0, 3, 4], [0, 3, 4], [0, 3, 4]] },
  { id: 3, name: "wall",   weight: 4,  adj: [[0, 3, 4], [0, 3, 4], [0, 3, 4], [0, 3, 4]] },
  { id: 4, name: "decor",  weight: 2,  adj: [[0, 3],    [0, 3],    [0, 3],    [0, 3]]    },
];

const TILE_COUNT = TILES.length;

function murmur32(str, seed = 0) {
  let h = 0x9747b28c ^ seed;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 0x5bd1e995);
    h ^= h >>> 15;
  }
  return (h >>> 0);
}

class SeededRng {
  constructor(seed) {
    this.state = murmur32(seed, 0xdeadbeef) | 1;
  }
  next() {
    this.state = Math.imul(this.state, 0x6d2b79f5) + 0x9747b28c;
    return ((this.state >>> 1) & 0x7fffffff) / 0x7fffffff;
  }
  int(n) { return Math.floor(this.next() * n); }
}

// Build allowed-neighbor tables keyed by tile id for fast lookup
const ALLOWED = {};
for (const t of TILES) ALLOWED[t.id] = t.adj;

function makeCell() {
  return { options: new Set([0, 3, 4]), collapsed: false, tile: -1 };
}

const TILE_BY_ID = {};
for (const t of TILES) TILE_BY_ID[t.id] = t;

function entropy(cell) {
  if (cell.collapsed) return 0;
  let wSum = 0;
  let wLogSum = 0;
  for (const id of cell.options) {
    const w = (TILE_BY_ID[id] || TILES[0]).weight;
    wSum += w;
    wLogSum += w * Math.log(w);
  }
  return Math.log(wSum) - wLogSum / wSum;
}

function collapseCell(cell, rng) {
  const opts = [...cell.options];
  const totalW = opts.reduce((s, id) => s + (TILE_BY_ID[id] || TILES[0]).weight, 0);
  let pick = rng.next() * totalW;
  for (const id of opts) {
    pick -= (TILE_BY_ID[id] || TILES[0]).weight;
    if (pick <= 0) { cell.tile = id; break; }
  }
  if (cell.tile === -1) cell.tile = opts[0];
  cell.options = new Set([cell.tile]);
  cell.collapsed = true;
}

function propagate(grid, w, h, startX, startY) {
  const queue = [[startX, startY]];
  const visited = new Set();
  const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];

  while (queue.length > 0) {
    const [x, y] = queue.shift();
    const key = y * w + x;
    if (visited.has(key)) continue;
    visited.add(key);

    const cell = grid[y][x];
    for (let d = 0; d < 4; d++) {
      const nx = x + dirs[d][0];
      const ny = y + dirs[d][1];
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const neighbor = grid[ny][nx];
      if (neighbor.collapsed) continue;

      // Compute which tiles are allowed in the neighbor cell
      const allowed = new Set();
      for (const tileId of cell.options) {
        for (const nId of ALLOWED[tileId][d]) allowed.add(nId);
      }

      const before = neighbor.options.size;
      for (const id of [...neighbor.options]) {
        if (!allowed.has(id)) neighbor.options.delete(id);
      }
      if (neighbor.options.size === 0) neighbor.options.add(0); // contradiction fallback → floor
      if (neighbor.options.size < before) queue.push([nx, ny]);
    }
  }
}

// Generates a w×h interior map as a 2D array of tile codes.
// Seed must be a non-empty string; same seed always produces the same output.
export function generateInterior(seed, w = 14, h = 16) {
  const rng = new SeededRng(seed);

  // Init grid
  const grid = Array.from({ length: h }, () =>
    Array.from({ length: w }, makeCell)
  );

  // Border cells are always walls
  for (let x = 0; x < w; x++) {
    for (const y of [0, h - 1]) {
      grid[y][x].options = new Set([3]);
      grid[y][x].collapsed = true;
      grid[y][x].tile = 3;
    }
  }
  for (let y = 0; y < h; y++) {
    for (const x of [0, w - 1]) {
      grid[y][x].options = new Set([3]);
      grid[y][x].collapsed = true;
      grid[y][x].tile = 3;
    }
  }

  // Entry door on south wall
  const doorX = Math.floor(w / 2);
  grid[h - 1][doorX].options = new Set([0]);
  grid[h - 1][doorX].tile = 0;
  if (doorX + 1 < w - 1) {
    grid[h - 1][doorX + 1].options = new Set([0]);
    grid[h - 1][doorX + 1].tile = 0;
  }

  // Propagate from borders
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (grid[y][x].collapsed) propagate(grid, w, h, x, y);
  }

  // WFC main loop
  const maxIter = w * h * 3;
  for (let i = 0; i < maxIter; i++) {
    // Find lowest-entropy uncollapsed cell
    let minEnt = Infinity;
    let minX = -1;
    let minY = -1;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        if (grid[y][x].collapsed) continue;
        const e = entropy(grid[y][x]) + rng.next() * 0.01;
        if (e < minEnt) { minEnt = e; minX = x; minY = y; }
      }
    }
    if (minX === -1) break; // all collapsed

    collapseCell(grid[minY][minX], rng);
    propagate(grid, w, h, minX, minY);
  }

  // Finalize: any uncollapsed cell → floor
  return grid.map((row) => row.map((cell) => cell.collapsed ? cell.tile : 0));
}

// Returns the region-appropriate default size for interior generation.
export function interiorSizeFor(regionId) {
  const sizes = { frontier: [14, 16], ashfall: [16, 14], ironlantern: [12, 18] };
  return sizes[regionId] || sizes.frontier;
}
