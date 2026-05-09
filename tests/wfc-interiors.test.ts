import { describe, it, expect } from "vitest";
import { generateInterior, interiorSizeFor } from "../src/wfcInteriors.js";

describe("wfcInteriors — generateInterior", () => {
  it("returns a 2D array of the correct size", () => {
    const map = generateInterior("test-seed", 14, 16);
    expect(map).toHaveLength(16);
    expect(map[0]).toHaveLength(14);
  });

  it("all tile values are valid (0, 3, or 4)", () => {
    const map = generateInterior("alpha-seed");
    const valid = new Set([0, 3, 4]);
    for (const row of map) for (const t of row) expect(valid.has(t)).toBe(true);
  });

  it("border cells are all walls (tile 3) except the door", () => {
    const map = generateInterior("border-test", 14, 16);
    const h = map.length;
    const w = map[0].length;
    // Top row must be all walls
    for (const t of map[0]) expect(t).toBe(3);
    // Left and right columns must be walls
    for (let y = 0; y < h; y++) {
      expect(map[y][0]).toBe(3);
      expect(map[y][w - 1]).toBe(3);
    }
  });

  it("south wall has at least one door tile (floor = 0)", () => {
    const map = generateInterior("door-test", 14, 16);
    const lastRow = map[map.length - 1];
    expect(lastRow.some((t) => t === 0)).toBe(true);
  });

  it("same seed produces identical output", () => {
    const a = generateInterior("deterministic-seed", 12, 14);
    const b = generateInterior("deterministic-seed", 12, 14);
    expect(a).toEqual(b);
  });

  it("different seeds produce different layouts", () => {
    const a = generateInterior("seed-aaa", 12, 14);
    const b = generateInterior("seed-bbb", 12, 14);
    const same = a.every((row, y) => row.every((t, x) => t === b[y][x]));
    expect(same).toBe(false);
  });

  it("interior is at least 50% walkable (floor or decor)", () => {
    const map = generateInterior("walkable-test");
    const h = map.length;
    const w = map[0].length;
    let walkable = 0;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      if (map[y][x] !== 3) walkable++;
    }
    const inner = (h - 2) * (w - 2);
    expect(walkable / inner).toBeGreaterThan(0.5);
  });
});

describe("wfcInteriors — interiorSizeFor", () => {
  it("returns array of [width, height]", () => {
    const [w, h] = interiorSizeFor("frontier");
    expect(w).toBeGreaterThan(0);
    expect(h).toBeGreaterThan(0);
  });

  it("returns different sizes per region", () => {
    const f = interiorSizeFor("frontier");
    const a = interiorSizeFor("ashfall");
    expect(f).not.toEqual(a);
  });

  it("falls back to frontier for unknown region", () => {
    expect(interiorSizeFor("nowhere")).toEqual(interiorSizeFor("frontier"));
  });
});
