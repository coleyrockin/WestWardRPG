import { describe, it, expect } from "vitest";
import {
  POI_KINDS,
  POI_DEFINITIONS,
  getPOIsForRegion,
  getTotalPOICount,
  ensurePoiDefaults,
  isPOIDiscovered,
  markPOIDiscovered,
  findNearbyPOIs,
  findNearbyRoadsideDiscoveries,
  getRoadsideDiscoveriesForRegion,
  poiUnderInteraction,
  resolvePOILead,
  resolveRoadDiscoveryLead,
  resolveExplorationRenownReward,
  resolveExplorationRenownStatus,
} from "../src/poiSystem.js";

function isKnownFrontierOpenTile(x: number, y: number) {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (tx >= 16 && tx <= 22 && ty >= 6 && ty <= 12) return false;
  if (ty >= 5 && ty <= 14 && (tx === 14 || tx === 24)) return false;
  if (tx >= 14 && tx <= 24 && (ty === 5 || ty === 14)) return false;
  return (tx >= 5 && tx <= 15 && ty >= 5 && ty <= 13)
    || (tx >= 11 && tx <= 27 && ty >= 8 && ty <= 14);
}

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

  it("counts authored POIs from the single POI definition table", () => {
    const authoredCount = Object.values(POI_DEFINITIONS).flat().length;

    expect(getTotalPOICount()).toBe(authoredCount);
    expect(resolveExplorationRenownStatus(0).totalCount).toBe(authoredCount);
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

    expect(lead?.id).toBe("frontier_broken_wagon");
    expect(lead?.direction).toBe("southeast");
    expect(lead?.distance).toBeLessThan(5);
    expect(lead?.line).toContain("Broken Wagon");
    expect(lead?.rewardHint).toContain("Map Scrap");
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
  it("defines early roadside discoveries near Boone's first roads", () => {
    const roadside = getRoadsideDiscoveriesForRegion("frontier");

    expect(roadside.map((poi) => poi.id)).toEqual(expect.arrayContaining([
      "frontier_broken_wagon",
      "frontier_wayside_shrine",
      "frontier_abandoned_lunchfire",
    ]));
    expect(roadside.every((poi) => poi.roadside === true)).toBe(true);
    expect(roadside.every((poi) => poi.rollLoot === false)).toBe(true);
    expect(roadside.every((poi) => isKnownFrontierOpenTile(poi.x, poi.y))).toBe(true);
  });

  it("lists nearby roadside finds in deterministic distance order", () => {
    const nearby = findNearbyRoadsideDiscoveries({}, "frontier", 9.5, 8.5, 14);

    expect(nearby.map((poi) => poi.id)).toEqual([
      "frontier_broken_wagon",
      "frontier_abandoned_lunchfire",
      "frontier_wayside_shrine",
    ]);
    expect(nearby[0]).toMatchObject({
      label: "Broken Wagon",
      distance: 4.5,
      direction: "southeast",
    });
  });

  it("prioritizes a roadside find as the first open-road hook from town", () => {
    const lead = resolveRoadDiscoveryLead({}, "frontier", 9.5, 8.5, { maxDistance: 40 });

    expect(lead).toMatchObject({
      id: "frontier_broken_wagon",
      title: "Roadside find",
      roadside: true,
      action: "inspect",
      actionLabel: "Inspect",
    });
    expect(lead?.objectiveLine).toContain("inspect");
    expect(lead?.rewardHint).toContain("Map Scrap");
    expect(lead?.returnReason).toContain("Boone");
    expect(lead?.hookLine).toContain("slime-scarred");
    expect(lead?.dangerHint).toContain("slime burns");
  });

  it("turns a nearby undiscovered POI into an open-road hook", () => {
    const r: any = {};
    const lead = resolveRoadDiscoveryLead(r, "ashfall", 38.5, 26.5, { maxDistance: 40 });

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
