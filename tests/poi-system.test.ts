import { describe, it, expect } from "vitest";
import {
  POI_KINDS,
  POI_DEFINITIONS,
  getPOIsForRegion,
  ensurePoiDefaults,
  isPOIDiscovered,
  markPOIDiscovered,
  findNearbyPOIs,
  poiUnderInteraction,
} from "../src/poiSystem.js";

describe("poiSystem — definitions", () => {
  it("each region has at least 3 POIs", () => {
    expect(POI_DEFINITIONS.frontier.length).toBeGreaterThanOrEqual(3);
    expect(POI_DEFINITIONS.ashfall.length).toBeGreaterThanOrEqual(3);
    expect(POI_DEFINITIONS.ironlantern.length).toBeGreaterThanOrEqual(3);
  });

  it("every POI has a recognised kind", () => {
    for (const region of Object.keys(POI_DEFINITIONS)) {
      for (const poi of POI_DEFINITIONS[region]) {
        expect(POI_KINDS[poi.kind]).toBeTruthy();
        expect(typeof poi.id).toBe("string");
        expect(typeof poi.x).toBe("number");
      }
    }
  });

  it("getPOIsForRegion returns empty for unknown region", () => {
    expect(getPOIsForRegion("nowhere")).toEqual([]);
  });
});

describe("poiSystem — discovery state", () => {
  it("ensurePoiDefaults seeds an empty array", () => {
    const r: any = {};
    ensurePoiDefaults(r);
    expect(Array.isArray(r.poisDiscovered)).toBe(true);
    expect(r.poisDiscovered.length).toBe(0);
  });

  it("ensurePoiDefaults preserves an existing array", () => {
    const r: any = { poisDiscovered: ["frontier_old_well"] };
    ensurePoiDefaults(r);
    expect(r.poisDiscovered).toEqual(["frontier_old_well"]);
  });

  it("markPOIDiscovered adds id and returns true (idempotent)", () => {
    const r: any = {};
    expect(markPOIDiscovered(r, "frontier_old_well")).toBe(true);
    expect(markPOIDiscovered(r, "frontier_old_well")).toBe(false);
    expect(r.poisDiscovered).toEqual(["frontier_old_well"]);
  });

  it("isPOIDiscovered tracks state", () => {
    const r: any = { poisDiscovered: ["a"] };
    expect(isPOIDiscovered(r, "a")).toBe(true);
    expect(isPOIDiscovered(r, "b")).toBe(false);
  });
});

describe("poiSystem — proximity", () => {
  it("findNearbyPOIs returns nothing far from any POI", () => {
    const r: any = {};
    expect(findNearbyPOIs(r, "frontier", 0, 0, 1)).toEqual([]);
  });

  it("findNearbyPOIs returns POIs inside ping radius", () => {
    const r: any = {};
    // Old Well is at (12.5, 22.5). Ping at (12, 22) within radius 4 should find it.
    const found = findNearbyPOIs(r, "frontier", 12, 22, 4);
    expect(found.find((p) => p.id === "frontier_old_well")).toBeTruthy();
  });

  it("findNearbyPOIs excludes already-discovered POIs", () => {
    const r: any = { poisDiscovered: ["frontier_old_well"] };
    const found = findNearbyPOIs(r, "frontier", 12, 22, 4);
    expect(found.find((p) => p.id === "frontier_old_well")).toBeUndefined();
  });

  it("poiUnderInteraction returns the POI when within its interact radius", () => {
    const r: any = {};
    const poi = poiUnderInteraction(r, "frontier", 12.5, 22.5);
    expect(poi?.id).toBe("frontier_old_well");
  });

  it("poiUnderInteraction returns null when nothing in range", () => {
    const r: any = {};
    expect(poiUnderInteraction(r, "frontier", 0, 0)).toBeNull();
  });

  it("poiUnderInteraction skips already-discovered POIs", () => {
    const r: any = { poisDiscovered: ["frontier_old_well"] };
    expect(poiUnderInteraction(r, "frontier", 12.5, 22.5)).toBeNull();
  });
});
