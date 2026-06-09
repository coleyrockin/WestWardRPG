import { describe, it, expect } from "vitest";
import {
  createWorldMap,
  createHouseInteriorMap,
  isInHouseLot,
  findEmptyCell,
} from "../src/canvas/worldGen.js";

// Small deterministic PRNG so generation is reproducible under test.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("worldGen — createWorldMap", () => {
  it("produces a grid of the requested dimensions", () => {
    const map = createWorldMap(56, 56, mulberry32(1));
    expect(map).toHaveLength(56);
    expect(map.every((row) => row.length === 56)).toBe(true);
  });

  it("walls the entire border", () => {
    const map = createWorldMap(56, 56, mulberry32(7));
    for (let i = 0; i < 56; i++) {
      expect(map[0][i]).toBe(1);
      expect(map[55][i]).toBe(1);
      expect(map[i][0]).toBe(1);
      expect(map[i][55]).toBe(1);
    }
  });

  it("carves the settlement core open", () => {
    const map = createWorldMap(56, 56, mulberry32(3));
    // Inside the carved street block (y 5..13, x 5..15).
    expect(map[8][10]).toBe(0);
  });

  it("lays down the Glass Gulch industrial floor (tile 5)", () => {
    const map = createWorldMap(56, 56, mulberry32(3));
    let gulchFloor = 0;
    for (let y = 33; y <= 49; y++) {
      for (let x = 37; x <= 51; x++) {
        if (map[y][x] === 5) gulchFloor++;
      }
    }
    expect(gulchFloor).toBeGreaterThan(0);
  });

  it("is deterministic for a fixed seed", () => {
    const a = createWorldMap(56, 56, mulberry32(42));
    const b = createWorldMap(56, 56, mulberry32(42));
    expect(a).toEqual(b);
  });

  it("only emits known tile values", () => {
    const map = createWorldMap(56, 56, mulberry32(9));
    const seen = new Set<number>();
    for (const row of map) for (const cell of row) seen.add(cell);
    for (const v of seen) expect([0, 1, 2, 3, 4, 5]).toContain(v);
  });
});

describe("worldGen — createHouseInteriorMap", () => {
  it("is an 18x18 walled room with a south doorway", () => {
    const map = createHouseInteriorMap();
    expect(map).toHaveLength(18);
    expect(map[0].length).toBe(18);
    // Border is house-wall (3) except the carved doorway at the south edge.
    expect(map[0][1]).toBe(3);
    expect(map[17][9]).toBe(0);
  });

  it("is deterministic (no randomness)", () => {
    expect(createHouseInteriorMap()).toEqual(createHouseInteriorMap());
  });
});

describe("worldGen — isInHouseLot", () => {
  it("matches the reserved house footprint", () => {
    expect(isInHouseLot(19, 9)).toBe(true);
    expect(isInHouseLot(16, 6)).toBe(true);
    expect(isInHouseLot(22, 12)).toBe(true);
    expect(isInHouseLot(15, 9)).toBe(false);
    expect(isInHouseLot(23, 9)).toBe(false);
    expect(isInHouseLot(19, 5)).toBe(false);
    expect(isInHouseLot(19, 13)).toBe(false);
  });
});

describe("worldGen — findEmptyCell", () => {
  const open3x3 = [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 1, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
  ];

  it("returns an open cell at tile center", () => {
    const cell = findEmptyCell(open3x3, 1, 1, 3, 3, null, mulberry32(5));
    const tx = Math.floor(cell.x);
    const ty = Math.floor(cell.y);
    expect(open3x3[ty][tx]).toBe(0);
    expect(cell.x - tx).toBeCloseTo(0.5);
  });

  it("respects the extra predicate", () => {
    // Only accept the cell at (3,1).
    const cell = findEmptyCell(open3x3, 1, 1, 3, 3, (x, y) => x === 3 && y === 1, mulberry32(5));
    expect(cell).toEqual({ x: 3.5, y: 1.5 });
  });

  it("falls back to the min corner when nothing qualifies", () => {
    const allWall = [
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ];
    const cell = findEmptyCell(allWall, 1, 1, 1, 1, null, mulberry32(5));
    expect(cell).toEqual({ x: 1.5, y: 1.5 });
  });

  it("is deterministic for a fixed seed", () => {
    const a = findEmptyCell(open3x3, 1, 1, 3, 3, null, mulberry32(11));
    const b = findEmptyCell(open3x3, 1, 1, 3, 3, null, mulberry32(11));
    expect(a).toEqual(b);
  });
});
