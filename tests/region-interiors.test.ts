import { describe, it, expect } from "vitest";
import {
  REGION_INTERIORS,
  buildRegionInteriorMap,
  getRegionInteriorByRegion,
  listRegionInteriors,
  ensureInteriorVisitState,
  hasVisitedInterior,
  markInteriorVisited,
} from "../src/regionInteriors.js";

describe("regionInteriors", () => {
  it("ships one interior per region", () => {
    const interiors = listRegionInteriors();
    expect(interiors.length).toBe(3);
    const regions = new Set(interiors.map((i) => i.region));
    expect(regions.has("frontier")).toBe(true);
    expect(regions.has("ashfall")).toBe(true);
    expect(regions.has("ironlantern")).toBe(true);
  });

  it("each interior defines spawn, exit, lore, and loot", () => {
    for (const interior of listRegionInteriors()) {
      expect(interior.id).toBeTruthy();
      expect(Number.isFinite(interior.spawn.x)).toBe(true);
      expect(Number.isFinite(interior.spawn.y)).toBe(true);
      expect(Number.isFinite(interior.exit.x)).toBe(true);
      expect(Number.isFinite(interior.exit.y)).toBe(true);
      expect(interior.firstVisitLore.length).toBeGreaterThan(0);
      expect(interior.firstVisitLoot.gold).toBeGreaterThan(0);
    }
  });

  it("buildRegionInteriorMap returns a tile grid bordered by walls", () => {
    for (const interior of listRegionInteriors()) {
      const map = buildRegionInteriorMap(interior.id);
      expect(map).not.toBeNull();
      expect(Array.isArray(map)).toBe(true);
      const rows = map!.length;
      const cols = map![0].length;
      expect(rows).toBeGreaterThan(8);
      expect(cols).toBeGreaterThan(8);
      // Border walls (with carved entry door at bottom-center)
      for (let y = 0; y < rows; y++) {
        expect(map![y][0]).toBe(3);
        expect(map![y][cols - 1]).toBe(3);
      }
      // Top row fully walled
      for (let x = 0; x < cols; x++) expect(map![0][x]).toBe(3);
    }
  });

  it("buildRegionInteriorMap returns null for unknown id", () => {
    expect(buildRegionInteriorMap("nope")).toBeNull();
  });

  it("getRegionInteriorByRegion looks up by region id", () => {
    expect(getRegionInteriorByRegion("ashfall")?.id).toBe("ashfall-ruin");
    expect(getRegionInteriorByRegion("nope")).toBeNull();
  });

  it("tracks visited interiors on the regions state", () => {
    const regions: any = {};
    expect(hasVisitedInterior(regions, "frontier-cave")).toBe(false);
    markInteriorVisited(regions, "frontier-cave");
    expect(hasVisitedInterior(regions, "frontier-cave")).toBe(true);
    expect(hasVisitedInterior(regions, "ashfall-ruin")).toBe(false);
  });

  it("ensureInteriorVisitState is idempotent", () => {
    const regions: any = { interiorsVisited: { x: true } };
    ensureInteriorVisitState(regions);
    expect(regions.interiorsVisited.x).toBe(true);
  });

  it("REGION_INTERIORS keys match interior ids", () => {
    for (const [key, val] of Object.entries(REGION_INTERIORS)) {
      expect(key).toBe(val.id);
    }
  });
});
