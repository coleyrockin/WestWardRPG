// World-map generation for the Canvas raycaster game.
//
// Extracted verbatim from src/main.js (the "behavioral oracle"). These are pure
// functions over plain arrays — no DOM, no shared `state`, no canvas — so they
// run headlessly and are covered by tests/world-map-gen.test.ts. `Math.random`
// is injected as `rng` so generation can be made deterministic under test; the
// default keeps the original runtime behavior byte-for-byte.
//
// Tile legend (values the raycaster/collision read):
//   0 = open floor      1 = solid wall/rubble   2 = rock cluster
//   3 = house lot wall  4 = building shell       5 = Glass Gulch industrial floor

// 56x56 frontier world: border walls, scattered rubble + rock clusters, a carved
// settlement core (streets, building shells, house lot), and the Glass Gulch biome.
export function createWorldMap(width, height, rng = Math.random) {
  const grid = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => (x === 0 || y === 0 || x === width - 1 || y === height - 1 ? 1 : 0)),
  );

  const settlementZone = { minX: 4, maxX: 26, minY: 4, maxY: 18 };

  for (let i = 0; i < 260; i++) {
    const x = 2 + Math.floor(rng() * (width - 4));
    const y = 2 + Math.floor(rng() * (height - 4));
    const inSettlement = x >= settlementZone.minX && x <= settlementZone.maxX && y >= settlementZone.minY && y <= settlementZone.maxY;
    if (!inSettlement && rng() < 0.66) {
      grid[y][x] = 1;
    }
  }

  for (let i = 0; i < 70; i++) {
    const cx = 4 + Math.floor(rng() * (width - 8));
    const cy = 4 + Math.floor(rng() * (height - 8));
    const inSettlement = cx >= settlementZone.minX && cx <= settlementZone.maxX && cy >= settlementZone.minY && cy <= settlementZone.maxY;
    if (inSettlement) continue;
    const radius = 1 + Math.floor(rng() * 3);
    for (let y = cy - radius; y <= cy + radius; y++) {
      for (let x = cx - radius; x <= cx + radius; x++) {
        if (x <= 1 || y <= 1 || x >= width - 1 || y >= height - 1) continue;
        if (Math.hypot(x - cx, y - cy) < radius + rng() * 0.7) {
          grid[y][x] = 2;
        }
      }
    }
  }

  for (let y = 5; y <= 13; y++) {
    for (let x = 5; x <= 15; x++) {
      grid[y][x] = 0;
    }
  }

  for (let y = 8; y <= 14; y++) {
    for (let x = 11; x <= 27; x++) {
      grid[y][x] = 0;
    }
  }

  for (let y = 5; y <= 14; y++) {
    for (let x = 15; x <= 23; x++) {
      grid[y][x] = 0;
    }
  }

  for (let x = 16; x <= 22; x++) {
    grid[6][x] = 3;
    grid[12][x] = 3;
  }
  for (let y = 6; y <= 12; y++) {
    grid[y][16] = 3;
    grid[y][22] = 3;
  }
  grid[12][19] = 0;

  for (let x = 14; x <= 24; x++) {
    grid[5][x] = 4;
    grid[14][x] = 4;
  }
  for (let y = 5; y <= 14; y++) {
    grid[y][14] = 4;
    grid[y][24] = 4;
  }
  grid[14][19] = 0;
  grid[14][20] = 0;

  for (let y = 11; y <= 14; y++) {
    for (let x = 18; x <= 21; x++) {
      grid[y][x] = 0;
    }
  }

  // Flagship biome: "Glass Gulch", a foggy industrial fringe where ranged enemies thrive.
  for (let y = 32; y <= 50; y++) {
    for (let x = 36; x <= 52; x++) {
      if (x === 36 || y === 32 || x === 52 || y === 50) {
        grid[y][x] = 1;
      } else {
        grid[y][x] = 5;
      }
    }
  }
  for (let y = 38; y <= 43; y++) {
    for (let x = 41; x <= 47; x++) {
      grid[y][x] = 0;
    }
  }
  grid[32][44] = 0;
  grid[31][44] = 0;
  grid[30][44] = 0;

  return grid;
}

// 18x18 player house interior: border walls with a south doorway and a few
// furniture blocks. Fully deterministic (no randomness).
export function createHouseInteriorMap() {
  const width = 18;
  const height = 18;
  const map = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => (x === 0 || y === 0 || x === width - 1 || y === height - 1 ? 3 : 0)),
  );

  map[height - 1][9] = 0;

  for (let y = 2; y <= 4; y++) {
    for (let x = 3; x <= 5; x++) {
      map[y][x] = 4;
    }
  }

  for (let y = 2; y <= 3; y++) {
    for (let x = 12; x <= 14; x++) {
      map[y][x] = 4;
    }
  }

  for (let y = 4; y <= 5; y++) {
    for (let x = 7; x <= 10; x++) {
      map[y][x] = 4;
    }
  }

  for (let x = 5; x <= 12; x++) {
    map[8][x] = 4;
  }

  return map;
}

// The fixed world-tile footprint reserved for the player's house lot.
export function isInHouseLot(x, y) {
  return x >= 16 && x <= 22 && y >= 6 && y <= 12;
}

// Random open cell within [minX..maxX, minY..maxY] passing an optional predicate,
// returned at tile center. Falls back to the min corner after 1200 misses. `rng`
// is injectable for deterministic placement under test.
export function findEmptyCell(map, minX = 2, minY = 2, maxX = map[0].length - 3, maxY = map.length - 3, extraCheck = null, rng = Math.random) {
  for (let attempts = 0; attempts < 1200; attempts++) {
    const x = minX + Math.floor(rng() * (maxX - minX + 1));
    const y = minY + Math.floor(rng() * (maxY - minY + 1));
    if (map[y][x] !== 0) continue;
    if (extraCheck && !extraCheck(x, y)) continue;
    return { x: x + 0.5, y: y + 0.5 };
  }
  return { x: minX + 0.5, y: minY + 0.5 };
}
