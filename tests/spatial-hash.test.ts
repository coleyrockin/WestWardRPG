import { describe, it, expect } from "vitest";
import {
  createSpatialHash,
  clearSpatialHash,
  rebuildSpatialHash,
  queryRadius,
} from "../src/spatialHash.js";

describe("spatialHash", () => {
  it("creates an empty grid with given cellSize", () => {
    const g = createSpatialHash(4);
    expect(g.cellSize).toBe(4);
    expect(g.count).toBe(0);
  });

  it("rebuilds count equal to entity count after filter", () => {
    const g = createSpatialHash(4);
    const ents = [
      { x: 0, y: 0, alive: true },
      { x: 5, y: 5, alive: true },
      { x: 9, y: 9, alive: false },
    ];
    rebuildSpatialHash(g, ents, { filter: (e: any) => e.alive });
    expect(g.count).toBe(2);
  });

  it("queryRadius finds nearby entities, excludes far ones", () => {
    const g = createSpatialHash(4);
    const ents = [
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 20, y: 20 },
    ];
    rebuildSpatialHash(g, ents);
    const found = queryRadius(g, 0, 0, 5);
    expect(found.length).toBe(2);
    const farFound = queryRadius(g, 0, 0, 1.5);
    // (1,1) is sqrt(2)~1.414 inside radius 1.5; (2,2) is sqrt(8)~2.83 outside
    expect(farFound.length).toBe(1);
  });

  it("query returns identical sets to brute-force scan on random data", () => {
    const g = createSpatialHash(4);
    const rng = (seed => () => (seed = (seed * 9301 + 49297) % 233280) / 233280)(7);
    const ents: any[] = [];
    for (let i = 0; i < 200; i++) ents.push({ x: rng() * 60, y: rng() * 60 });
    rebuildSpatialHash(g, ents);
    for (let trial = 0; trial < 10; trial++) {
      const x = rng() * 60;
      const y = rng() * 60;
      const r = 3 + rng() * 9;
      const r2 = r * r;
      const brute = ents.filter((e) => (e.x - x) ** 2 + (e.y - y) ** 2 <= r2);
      const fast = queryRadius(g, x, y, r);
      expect(fast.length).toBe(brute.length);
    }
  });

  it("clearSpatialHash empties the grid", () => {
    const g = createSpatialHash(4);
    rebuildSpatialHash(g, [{ x: 1, y: 2 }, { x: 3, y: 4 }]);
    expect(g.count).toBe(2);
    clearSpatialHash(g);
    expect(g.count).toBe(0);
    expect(queryRadius(g, 0, 0, 100).length).toBe(0);
  });

  it("query reuses the out array (zero-alloc when supplied)", () => {
    const g = createSpatialHash(4);
    rebuildSpatialHash(g, [{ x: 0, y: 0 }, { x: 1, y: 1 }]);
    const out: any[] = [];
    const r1 = queryRadius(g, 0, 0, 5, out);
    expect(r1).toBe(out);
    expect(out.length).toBe(2);
    queryRadius(g, 50, 50, 1, out);
    expect(out.length).toBe(0);
  });
});
