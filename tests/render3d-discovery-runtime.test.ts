import { describe, expect, it } from "vitest";
import { resolveDiscovery } from "../src/render3d/discoveryRuntime.js";
import { POI_DEFINITIONS } from "../src/poiSystem.js";

const firstPoi = POI_DEFINITIONS.frontier[0]; // frontier_broken_wagon @ (13.5, 10.5)

describe("discoveryRuntime — resolveDiscovery", () => {
  it("returns null when the rider is far from every POI", () => {
    const regions = { poisDiscovered: [] };
    expect(resolveDiscovery(regions, "frontier", -999, -999)).toBe(null);
  });

  it("detects a fresh POI within range and returns its lore + marks it discovered", () => {
    const regions = { poisDiscovered: [] };
    const event = resolveDiscovery(regions, "frontier", firstPoi.x, firstPoi.y);
    expect(event).not.toBe(null);
    expect(event?.id).toBe(firstPoi.id);
    expect(event?.label).toBe(firstPoi.label);
    expect(typeof event?.line).toBe("string");
    expect(event?.line.length).toBeGreaterThan(0);
    expect(regions.poisDiscovered).toContain(firstPoi.id);
  });

  it("does not re-fire for an already-discovered POI", () => {
    const regions = { poisDiscovered: [firstPoi.id] };
    expect(resolveDiscovery(regions, "frontier", firstPoi.x, firstPoi.y)).toBe(null);
  });

  it("surfaces a renown milestone on the 3rd discovery", () => {
    const regions = { poisDiscovered: [] };
    const pois = POI_DEFINITIONS.frontier;
    resolveDiscovery(regions, "frontier", pois[0].x, pois[0].y);
    resolveDiscovery(regions, "frontier", pois[1].x, pois[1].y);
    const third = resolveDiscovery(regions, "frontier", pois[2].x, pois[2].y);
    expect(third?.renown).not.toBe(null);
    expect(third?.renown.discoveredCount).toBe(3);
  });
});
