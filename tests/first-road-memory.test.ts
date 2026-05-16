import { describe, expect, it } from "vitest";
import {
  FIRST_ROAD_DISCOVERY_ID,
  FIRST_ROAD_STARTER_JOB_ID,
  FIRST_ROAD_SURVEY_JOB_ID,
  resolveFirstRoadMemoryStatus,
} from "../src/firstRoadMemory.js";

describe("firstRoadMemory", () => {
  it("moves from visible to discovered when Broken Wagon is found", () => {
    const visible = resolveFirstRoadMemoryStatus({ regionId: "frontier" });
    const discovered = resolveFirstRoadMemoryStatus({
      regionId: "frontier",
      regions: { poisDiscovered: [FIRST_ROAD_DISCOVERY_ID] },
      inventory: { "Map Scrap": 1 },
      house: { unlocked: true },
    });

    expect(visible).toMatchObject({
      phase: "visible",
      discoveryId: FIRST_ROAD_DISCOVERY_ID,
    });
    expect(visible.nextStep).toContain("Broken Wagon");
    expect(discovered).toMatchObject({
      phase: "discovered",
      wagonDiscovered: true,
      hasMapScrap: true,
    });
    expect(discovered.boardLine).toContain("Old Road Survey");
    expect(discovered.houseLine).toContain("Broken Wagon Map Scrap");
  });

  it("points bounty-only completion back to the missed road discovery", () => {
    const status = resolveFirstRoadMemoryStatus({
      regionId: "frontier",
      jobState: { completedJobIds: [FIRST_ROAD_STARTER_JOB_ID] },
    });

    expect(status.phase).toBe("bounty_completed");
    expect(status.nextStep).toContain("Broken Wagon");
    expect(status.runSummaryLine).toContain("Broken Wagon remains");
  });

  it("unlocks the survey follow-up when bounty and map scrap are both present", () => {
    const status = resolveFirstRoadMemoryStatus({
      regionId: "frontier",
      regions: { poisDiscovered: [FIRST_ROAD_DISCOVERY_ID] },
      inventory: { "Map Scrap": 1 },
      jobState: { completedJobIds: [FIRST_ROAD_STARTER_JOB_ID] },
      house: { unlocked: true },
    });

    expect(status.phase).toBe("survey_available");
    expect(status.objectiveLine).toContain("Old Road Survey");
    expect(status.booneLine).toContain("map scrap");
    expect(status.runSummaryLine).toContain("opened Old Road Survey");
  });

  it("tracks active survey checkpoint progress before the turn-in", () => {
    const active = resolveFirstRoadMemoryStatus({
      regionId: "frontier",
      regions: { poisDiscovered: [FIRST_ROAD_DISCOVERY_ID] },
      inventory: { "Map Scrap": 1 },
      jobState: {
        activeJobId: FIRST_ROAD_SURVEY_JOB_ID,
        completedJobIds: [FIRST_ROAD_STARTER_JOB_ID],
        progressByJobId: {
          [FIRST_ROAD_SURVEY_JOB_ID]: { status: "active", count: 1 },
        },
      },
      house: { unlocked: true },
    });
    const ready = resolveFirstRoadMemoryStatus({
      regionId: "frontier",
      regions: { poisDiscovered: [FIRST_ROAD_DISCOVERY_ID] },
      inventory: { "Map Scrap": 1 },
      jobState: {
        activeJobId: FIRST_ROAD_SURVEY_JOB_ID,
        completedJobIds: [FIRST_ROAD_STARTER_JOB_ID],
        progressByJobId: {
          [FIRST_ROAD_SURVEY_JOB_ID]: { status: "ready", count: 3 },
        },
      },
      house: { unlocked: true },
    });

    expect(active).toMatchObject({
      phase: "survey_active",
      surveyActive: true,
      surveyCount: 1,
      surveyTotal: 3,
    });
    expect(active.objectiveLine).toContain("checkpoint 2/3");
    expect(ready).toMatchObject({
      phase: "survey_ready",
      surveyReady: true,
      surveyCount: 3,
    });
    expect(ready.nextStep).toContain("claim Old Road Survey");
  });

  it("recognizes the completed survey as the finished first-road memory", () => {
    const status = resolveFirstRoadMemoryStatus({
      regionId: "frontier",
      regions: { poisDiscovered: [FIRST_ROAD_DISCOVERY_ID] },
      inventory: { "Map Scrap": 1 },
      jobState: { completedJobIds: [FIRST_ROAD_STARTER_JOB_ID, FIRST_ROAD_SURVEY_JOB_ID] },
      house: { unlocked: true },
    });

    expect(status.phase).toBe("survey_completed");
    expect(status.nextStep).toContain("workbench");
    expect(status.houseLine).toContain("Old Road Survey");
  });
});
