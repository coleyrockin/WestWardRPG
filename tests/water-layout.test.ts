import { describe, it, expect } from "vitest";
import {
  RIVER_PIECES,
  RESERVOIR,
  OCEAN,
  DAM,
  waterCollisionBoxes,
  deepWaterRects,
  distPointToRect,
  waterBodies,
} from "../src/render3d/waterLayout.js";

// The protected hero waypoints (resolved from frontierLayout.js) + the spawn.
// Deep (blocking) water must clear each by ≥1u; the ford/marsh zone is walkable.
const HERO_WAYPOINTS: Record<string, [number, number]> = {
  spawn: [9.5, 8.5],
  jobBoard: [13, 5.65],
  roadSign: [24, 6.3],
  townBark: [32, 9.2],
  smokeCache: [41, 13.2],
  slimeTell: [48.2, 16.4],
  roadSlime: [53.5, 15],
  brokenWagon: [60.5, 12.2],
  gravesite: [15, -4],
  steelMustang: [16.2, 12],
};

// Existing marsh water extent (spike: 29×6.2 plane at world (48,19)).
const MARSH = { minX: 33.5, maxX: 62.5, minY: 15.9, maxY: 22.1 };

describe("waterLayout — deep water clears every hero waypoint", () => {
  it("keeps all blocking rects ≥1u from each protected waypoint", () => {
    for (const rect of deepWaterRects()) {
      for (const [name, [x, y]] of Object.entries(HERO_WAYPOINTS)) {
        const d = distPointToRect(x, y, rect);
        expect(d, `${rect.id} vs ${name}`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("keeps deep water out of the spawn→board camera wedge (x[9.5,16] y[6.5,11])", () => {
    // Sample the wedge corners + center; none may sit inside a blocking rect.
    const pts: [number, number][] = [[9.5, 6.5], [16, 6.5], [9.5, 11], [16, 11], [12.75, 8.75]];
    for (const rect of deepWaterRects()) {
      for (const [x, y] of pts) {
        expect(distPointToRect(x, y, rect), `${rect.id}`).toBeGreaterThan(0);
      }
    }
  });
});

describe("waterLayout — the ford is the one walkable crossing, connected to the marsh", () => {
  it("has exactly one walkable river piece", () => {
    const walkable = RIVER_PIECES.filter((p: any) => p.walkable);
    expect(walkable.length).toBe(1);
    expect(walkable[0].id).toBe("river_ford");
  });

  it("the ford overlaps the existing marsh extent (visual continuity)", () => {
    const ford = RIVER_PIECES.find((p: any) => p.walkable)!;
    const fMinX = ford.x - ford.w / 2, fMaxX = ford.x + ford.w / 2;
    const fMinY = ford.y - ford.h / 2, fMaxY = ford.y + ford.h / 2;
    const overlapX = Math.min(fMaxX, MARSH.maxX) - Math.max(fMinX, MARSH.minX);
    const overlapY = Math.min(fMaxY, MARSH.maxY) - Math.max(fMinY, MARSH.minY);
    expect(overlapX).toBeGreaterThan(0);
    expect(overlapY).toBeGreaterThan(0);
  });

  it("the walkable ford contributes NO collision box; deep pieces all do", () => {
    const boxes = waterCollisionBoxes();
    const ids = boxes.map((b: any) => b.source);
    expect(ids).not.toContain("river_ford");
    for (const p of RIVER_PIECES.filter((q: any) => !q.walkable)) {
      expect(ids).toContain(p.id);
    }
    expect(ids).toContain(RESERVOIR.id);
    expect(ids).toContain(OCEAN.id);
    expect(ids).toContain(DAM.id);
  });
});

describe("waterLayout — body table + geometry helpers", () => {
  it("waterBodies lists every river piece plus reservoir and ocean", () => {
    const ids = waterBodies().map((b: any) => b.id);
    for (const p of RIVER_PIECES) expect(ids).toContain(p.id);
    expect(ids).toContain(RESERVOIR.id);
    expect(ids).toContain(OCEAN.id);
  });

  it("every body carries createWater look params", () => {
    for (const b of waterBodies()) {
      expect(b.look).toBeTruthy();
      expect(typeof b.look.opacity).toBe("number");
      expect(Array.isArray(b.look.flow)).toBe(true);
    }
  });

  it("distPointToRect is 0 inside and positive outside", () => {
    const r = { id: "t", x: 0, y: 0, w: 10, h: 10 };
    expect(distPointToRect(0, 0, r)).toBe(0); // center
    expect(distPointToRect(4, 4, r)).toBe(0); // inside
    expect(distPointToRect(10, 0, r)).toBeCloseTo(5, 6); // 5u east of the +x edge
  });

  it("the reservoir sits well north of the gravesite (15,-4)", () => {
    expect(distPointToRect(15, -4, { id: RESERVOIR.id, x: RESERVOIR.x, y: RESERVOIR.y, w: RESERVOIR.w, h: RESERVOIR.h })).toBeGreaterThan(5);
  });
});
