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
  resolvePOILead,
  resolveRoadDiscoveryLead,
  resolveExplorationRenownReward,
  resolveExplorationRenownStatus,
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

  it("includes road-worthy discoveries beyond generic caches, shrines, and camps", () => {
    const roadKinds = new Set(
      Object.values(POI_DEFINITIONS)
        .flat()
        .map((poi) => poi.kind),
    );

    expect(roadKinds.has("mine")).toBe(true);
    expect(roadKinds.has("ruin")).toBe(true);
    expect(roadKinds.has("hideout")).toBe(true);
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

  it("points the player toward the nearest undiscovered POI", () => {
    const r: any = {};
    const lead = resolvePOILead(r, "frontier", 9.5, 8.5);

    expect(lead?.id).toBe("frontier_old_well");
    expect(lead?.direction).toBe("south");
    expect(lead?.distance).toBeGreaterThan(13);
    expect(lead?.line).toContain("Old Well");
    expect(lead?.rewardHint).toContain("Potion");
  });

  it("skips discovered POIs when resolving the next exploration lead", () => {
    const r: any = { poisDiscovered: ["frontier_old_well"] };
    const lead = resolvePOILead(r, "frontier", 9.5, 8.5);

    expect(lead?.id).not.toBe("frontier_old_well");
    expect(lead?.line).toContain(lead?.label);
  });

  it("grants exploration renown rewards at POI milestones", () => {
    expect(resolveExplorationRenownReward(2)).toBeNull();

    const reward = resolveExplorationRenownReward(3);
    expect(reward?.title).toBe("Trail Scout");
    expect(reward?.xp).toBeGreaterThan(0);
    expect(reward?.upgradePoints).toBe(1);
  });

  it("summarizes exploration renown progress", () => {
    const status = resolveExplorationRenownStatus(4, 9);

    expect(status.title).toBe("Trail Scout");
    expect(status.nextMilestone).toBe(6);
    expect(status.progressLine).toContain("4/9");
    expect(status.progressLine).toContain("next: 6");
  });
});

describe("poiSystem — road discovery lead", () => {
  it("turns a nearby undiscovered POI into an open-road hook", () => {
    const r: any = {};
    const lead = resolveRoadDiscoveryLead(r, "frontier", 9.5, 8.5, { maxDistance: 40 });

    expect(lead?.title).toBe("Road hook");
    expect(lead?.line).toContain("heading toward");
    expect(lead?.line).toContain("saw");
    expect(lead?.distanceLine).toMatch(/tiles/);
    expect(lead?.action).toBe("investigate");
    expect(lead?.dangerHint.length).toBeGreaterThan(4);
    expect(lead?.mysteryLine.length).toBeGreaterThan(4);
    expect(lead?.returnReason.length).toBeGreaterThan(4);
  });

  it("prefers authored road hooks over plain POI lead copy", () => {
    const r: any = {};
    const lead = resolveRoadDiscoveryLead(r, "ashfall", 38.5, 26.5, { maxDistance: 40 });

    expect(lead?.regionHint).toContain("Ashfall");
    expect(lead?.hookLine).toContain("road");
    expect(lead?.line).not.toContain("Reward hint:");
  });

  it("skips discovered road hooks and points to the next undiscovered place", () => {
    const first = resolveRoadDiscoveryLead({}, "ironlantern", 12.5, 22.5, { maxDistance: 40 });
    const r: any = { poisDiscovered: [first?.id] };
    const next = resolveRoadDiscoveryLead(r, "ironlantern", 12.5, 22.5, { maxDistance: 40 });

    expect(first?.id).toBeTruthy();
    expect(next?.id).toBeTruthy();
    expect(next?.id).not.toBe(first?.id);
  });

  it("returns null when every road hook in the region has been discovered", () => {
    const discovered = getPOIsForRegion("frontier").map((poi) => poi.id);
    const lead = resolveRoadDiscoveryLead({ poisDiscovered: discovered }, "frontier", 9.5, 8.5, { maxDistance: 40 });

    expect(lead).toBeNull();
  });
});
