import { describe, expect, it } from "vitest";
import { createRenderSnapshot } from "../src/bridge/stateSnapshot.js";

const boardProp = {
  id: "frontier_job_board",
  kind: "job_board",
  label: "Boone's Job Board",
  x: 12.35,
  y: 8.55,
  color: "#d8a84f",
};

const brokenWagon = {
  id: "frontier_broken_wagon",
  kind: "poi",
  label: "Broken Wagon",
  x: 13.5,
  y: 10.5,
  color: "#b9824d",
};

const roadSlime = {
  id: "opening-patrol",
  type: "slime",
  label: "Road Slime",
  behavior: "balanced",
  x: 14.4,
  y: 9.4,
  hp: 38,
  alive: true,
  color: "#7fd06a",
  openingPatrol: true,
};

function baseState(overrides: any = {}) {
  return {
    mode: "playing",
    time: 8,
    player: { x: 9.5, y: 8.5, angle: 0, inHouse: false },
    regions: { activeRegion: "frontier", activeRegionLabel: "Westward Frontier", poisDiscovered: [] },
    inventory: {},
    quests: { slime: { progress: 0 }, crystal: { progress: 0 } },
    weather: { kind: "clear", rain: 0, fog: 0.18, wind: 0.15, lightning: 0, quality: "high" },
    world: { timeOfDay: 0.7, jobs: { activeJobId: null, completedJobIds: [], progressByJobId: {} } },
    house: { unlocked: false },
    narrative: { npcMemory: { byNpc: {} } },
    chest: { opened: false },
    ...overrides,
  };
}

describe("render3d state snapshot", () => {
  it("returns plain JSON-serializable state with no renderer objects", () => {
    const snapshot = createRenderSnapshot(baseState(), {
      boardProp,
      roadDiscoveryLead: brokenWagon,
      enemies: [roadSlime],
      worldObjects: [boardProp, brokenWagon],
      lights: [{ id: "board-lamp", kind: "lantern", x: 12.35, y: 8.55, radius: 6, intensity: 1.2, color: "#ffd77b" }],
    });

    const encoded = JSON.stringify(snapshot);
    expect(JSON.parse(encoded)).toEqual(snapshot);
    expect(encoded).not.toMatch(/isMesh|matrixWorld|uuid|geometry|material/i);
    expect(snapshot.schemaVersion).toBe(1);
    expect(snapshot.kind).toBe("westward-render-snapshot");
  });

  it("derives the starting board objective for the 3D route", () => {
    const snapshot = createRenderSnapshot(baseState(), {
      boardProp,
      roadDiscoveryLead: brokenWagon,
      enemies: [roadSlime],
    });

    expect(snapshot.objective?.phase).toBe("accept_bounty");
    expect(snapshot.objective?.currentTarget).toContain("Boone");
    expect(snapshot.interactables.map((i: any) => i.label)).toContain("Boone's Job Board");
  });

  it("derives follow-road state after the starter bounty is active", () => {
    const snapshot = createRenderSnapshot(baseState(), {
      boardProp,
      roadDiscoveryLead: brokenWagon,
      activeJob: { id: "frontier_slime_bounty", title: "Marsh Slime Bounty", status: "active", rewardLine: "+38g, +18 XP" },
      enemies: [],
    });

    expect(snapshot.objective?.phase).toBe("follow_road");
    expect(snapshot.objective?.currentTarget).toContain("Smoke Cache");
    expect(snapshot.routeMarkers.some((m: any) => m.label === "Smoke Cache")).toBe(true);
  });

  it("surfaces combat cue state without storing combat objects", () => {
    const snapshot = createRenderSnapshot(baseState({ time: 12 }), {
      boardProp,
      activeJob: { id: "frontier_slime_bounty", title: "Marsh Slime Bounty", status: "active" },
      enemies: [roadSlime],
    });

    expect(snapshot.objective?.phase).toBe("fight_slime");
    expect(snapshot.combatCues[0]).toMatchObject({ kind: "enemy-threat", label: "Road Slime" });
    expect(snapshot.enemies[0]).toMatchObject({ id: "opening-patrol", label: "Road Slime", alive: true });
  });

  it("derives first-road survey availability from existing save-safe state", () => {
    const snapshot = createRenderSnapshot(baseState({
      regions: { activeRegion: "frontier", activeRegionLabel: "Westward Frontier", poisDiscovered: ["frontier_broken_wagon"] },
      inventory: { "Map Scrap": 1 },
      world: {
        timeOfDay: 0.7,
        jobs: {
          activeJobId: null,
          completedJobIds: ["frontier_slime_bounty"],
          progressByJobId: {},
        },
      },
    }), {
      boardProp,
      roadDiscoveryLead: brokenWagon,
    });

    expect(snapshot.firstRoadMemory.phase).toBe("survey_available");
    expect(snapshot.objective?.phase).toBe("survey_followup");
    expect(snapshot.objective?.currentTarget).toContain("Old Road Survey");
  });
});
