import { describe, expect, it } from "vitest";
import {
  acceptJob,
  claimJobReward,
  createInitialJobBoardState,
  getActiveJobSummary,
  getJobBoardProp,
  getJobBoardChoices,
  getJobListings,
  normalizeJobBoardState,
  recordJobEvent,
  resolveJobRouteMarker,
} from "../src/jobBoard.js";

describe("jobBoard", () => {
  it("normalizes missing and malformed save state", () => {
    const state = normalizeJobBoardState({
      activeJobId: 42,
      completedJobIds: ["frontier_slime_bounty", 7],
      progressByJobId: {
        frontier_slime_bounty: { status: "ready", count: 99, rewardClaimed: "yes" },
        broken: null,
      },
    });

    expect(state.activeJobId).toBe(null);
    expect(state.completedJobIds).toEqual(["frontier_slime_bounty"]);
    expect(state.progressByJobId.frontier_slime_bounty).toEqual({
      status: "ready",
      count: 3,
      rewardClaimed: false,
    });
    expect(state.progressByJobId.broken).toBeUndefined();
  });

  it("lists deterministic regional jobs and hides completed work", () => {
    const state = createInitialJobBoardState();

    const frontierListings = getJobListings({ regionId: "frontier", playerLevel: 1, jobState: state });
    const ashfallListings = getJobListings({ regionId: "ashfall", playerLevel: 3, jobState: state });

    expect(frontierListings.map((job) => job.id)).toContain("frontier_slime_bounty");
    expect(frontierListings.find((job) => job.id === "frontier_slime_bounty")?.reward.gold).toBe(38);
    expect(ashfallListings.map((job) => job.id)).toContain("ashfall_scrap_warrant");
    expect(frontierListings.map((job) => job.id)).toContain("frontier_road_salvage");
    expect(frontierListings.map((job) => job.id)).toContain("frontier_courier_orders");

    state.completedJobIds.push("frontier_slime_bounty");
    expect(getJobListings({ regionId: "frontier", playerLevel: 1, jobState: state }).map((job) => job.id)).not.toContain("frontier_slime_bounty");
  });

  it("builds selectable Boone board choices with reward and threat previews", () => {
    const state = createInitialJobBoardState();

    const choices = getJobBoardChoices({
      regionId: "frontier",
      playerLevel: 1,
      jobState: state,
      npcId: "warden",
    });

    expect(choices).toHaveLength(3);
    expect(choices.map((job) => job.id)).toEqual(["frontier_slime_bounty", "frontier_road_salvage", "frontier_courier_orders"]);
    expect(choices[0]).toMatchObject({
      boardState: "available",
      selectable: true,
      threat: "Low",
      rewardLine: "+38g, +18 XP, +1 Potion",
    });
  });

  it("accepts one active job and exposes a compact summary", () => {
    const state = createInitialJobBoardState();
    const accepted = acceptJob(state, "frontier_slime_bounty");
    const duplicate = acceptJob(state, "ashfall_scrap_warrant");

    expect(accepted.ok).toBe(true);
    expect(accepted.job?.title).toBe("Marsh Slime Bounty");
    expect(state.activeJobId).toBe("frontier_slime_bounty");
    expect(state.progressByJobId.frontier_slime_bounty.status).toBe("active");
    expect(duplicate.ok).toBe(false);
    expect(getActiveJobSummary(state)?.progressLine).toBe("0/3 slimes defeated");
  });

  it("backfills missing active job progress from partial saves", () => {
    const state = normalizeJobBoardState({ activeJobId: "frontier_slime_bounty", progressByJobId: {} });

    expect(state.activeJobId).toBe("frontier_slime_bounty");
    expect(state.progressByJobId.frontier_slime_bounty).toEqual({
      status: "active",
      count: 0,
      rewardClaimed: false,
    });
    expect(getActiveJobSummary(state)?.status).toBe("active");
  });

  it("records matching kill events and marks the active bounty ready", () => {
    const state = createInitialJobBoardState();
    acceptJob(state, "frontier_slime_bounty");

    const missed = recordJobEvent(state, { type: "kill", enemyType: "brute", behavior: "tank" });
    const first = recordJobEvent(state, { type: "kill", enemyType: "slime", behavior: "balanced" });
    const second = recordJobEvent(state, { type: "kill", enemyType: "slime", behavior: "balanced" });
    const third = recordJobEvent(state, { type: "kill", enemyType: "slime", behavior: "balanced" });

    expect(missed.ok).toBe(false);
    expect(first.progress?.count).toBe(1);
    expect(second.completed).toBe(false);
    expect(third.completed).toBe(true);
    expect(state.progressByJobId.frontier_slime_bounty).toMatchObject({ status: "ready", count: 3 });
    expect(getActiveJobSummary(state)?.status).toBe("ready");
  });

  it("records matching collection events for salvage jobs", () => {
    const state = createInitialJobBoardState();
    acceptJob(state, "frontier_road_salvage");

    const missed = recordJobEvent(state, { type: "collect", item: "Wood", resourceType: "tree" });
    const first = recordJobEvent(state, { type: "collect", item: "Stone", resourceType: "rock" });
    const second = recordJobEvent(state, { type: "collect", item: "Stone", resourceType: "rock" });

    expect(missed.ok).toBe(false);
    expect(first.progress?.count).toBe(1);
    expect(second.completed).toBe(true);
    expect(getActiveJobSummary(state)?.progressLine).toBe("2/2 road salvage recovered");
    expect(getActiveJobSummary(state)?.status).toBe("ready");
  });

  it("runs courier jobs through pickup, delivery, and return route markers", () => {
    const state = createInitialJobBoardState();
    acceptJob(state, "frontier_courier_orders");

    const pickupMarker = resolveJobRouteMarker({
      jobState: state,
      player: { x: 10, y: 8 },
      resources: [],
      enemies: [],
      npcs: [{ id: "elder", x: 9, y: 8 }],
    });

    expect(pickupMarker).toMatchObject({
      kind: "job_pickup",
      jobId: "frontier_courier_orders",
      label: "Pick up Sealed Orders",
      regionId: "frontier",
    });
    expect(getActiveJobSummary(state)?.progressLine).toBe("Pick up Sealed Orders");

    const pickedUp = recordJobEvent(state, { type: "pickup", targetId: "frontier_orders_cache" });
    const wrongDelivery = recordJobEvent(state, { type: "deliver", npcId: "merchant" });

    expect(pickedUp.ok).toBe(true);
    expect(pickedUp.progress?.count).toBe(1);
    expect(wrongDelivery.ok).toBe(false);
    expect(getActiveJobSummary(state)?.progressLine).toBe("Deliver to Elder Nira");

    const deliveryMarker = resolveJobRouteMarker({
      jobState: state,
      player: { x: 10, y: 8 },
      resources: [],
      enemies: [],
      npcs: [{ id: "elder", x: 9, y: 8 }],
    });

    expect(deliveryMarker).toMatchObject({
      kind: "job_delivery",
      label: "Deliver to Elder Nira",
      x: 9,
      y: 8,
      distanceLine: "1m",
    });

    const delivered = recordJobEvent(state, { type: "deliver", npcId: "elder" });

    expect(delivered.completed).toBe(true);
    expect(getActiveJobSummary(state)?.status).toBe("ready");
    expect(getActiveJobSummary(state)?.progressLine).toBe("Return to Marshal Boone");
  });

  it("claims rewards once and moves the job to completed history", () => {
    const state = createInitialJobBoardState();
    acceptJob(state, "frontier_slime_bounty");
    recordJobEvent(state, { type: "kill", enemyType: "slime", behavior: "balanced" });
    recordJobEvent(state, { type: "kill", enemyType: "slime", behavior: "balanced" });
    recordJobEvent(state, { type: "kill", enemyType: "slime", behavior: "balanced" });

    const claimed = claimJobReward(state, "frontier_slime_bounty");
    const secondClaim = claimJobReward(state, "frontier_slime_bounty");

    expect(claimed.ok).toBe(true);
    expect(claimed.reward).toEqual({ gold: 38, xp: 18, items: { Potion: 1 } });
    expect(state.activeJobId).toBe(null);
    expect(state.completedJobIds).toEqual(["frontier_slime_bounty"]);
    expect(state.progressByJobId.frontier_slime_bounty.rewardClaimed).toBe(true);
    expect(secondClaim.ok).toBe(false);
  });

  it("points salvage jobs at the nearest matching resource", () => {
    const state = createInitialJobBoardState();
    acceptJob(state, "frontier_road_salvage");

    const marker = resolveJobRouteMarker({
      jobState: state,
      player: { x: 5, y: 5 },
      resources: [
        { type: "tree", x: 5.5, y: 5, harvested: false },
        { type: "rock", x: 11, y: 11, harvested: false },
        { type: "rock", x: 6, y: 5, harvested: false },
      ],
      enemies: [],
      npcs: [],
    });

    expect(marker).toMatchObject({
      kind: "job_resource",
      jobId: "frontier_road_salvage",
      label: "Roadside Salvage",
      x: 6,
      y: 5,
      distance: 1,
    });
  });

  it("points bounty jobs at matching enemies and ready jobs back to the NPC", () => {
    const state = createInitialJobBoardState();
    acceptJob(state, "frontier_slime_bounty");

    const target = resolveJobRouteMarker({
      jobState: state,
      player: { x: 2, y: 2 },
      resources: [],
      enemies: [
        { type: "brute", behavior: "tank", x: 2.5, y: 2, alive: true },
        { type: "slime", behavior: "balanced", x: 9, y: 9, alive: true },
        { type: "slime", behavior: "balanced", x: 3, y: 2, alive: true },
      ],
      npcs: [{ id: "warden", x: 10, y: 10 }],
    });

    expect(target).toMatchObject({ kind: "job_bounty", jobId: "frontier_slime_bounty", x: 3, y: 2, distance: 1 });

    recordJobEvent(state, { type: "kill", enemyType: "slime", behavior: "balanced" });
    recordJobEvent(state, { type: "kill", enemyType: "slime", behavior: "balanced" });
    recordJobEvent(state, { type: "kill", enemyType: "slime", behavior: "balanced" });

    const turnIn = resolveJobRouteMarker({
      jobState: state,
      player: { x: 2, y: 2 },
      resources: [],
      enemies: [],
      npcs: [{ id: "warden", x: 10, y: 10 }],
    });

    expect(turnIn).toMatchObject({
      kind: "job_turn_in",
      jobId: "frontier_slime_bounty",
      label: "Return to Marshal Boone",
      x: 10,
      y: 10,
      action: "turn_in",
    });
  });

  it("exposes a deterministic in-world job-board prop near Boone", () => {
    const board = getJobBoardProp({ regionId: "frontier" });

    expect(board).toMatchObject({
      id: "frontier_job_board",
      kind: "job_board",
      label: "Boone's Job Board",
      npcId: "warden",
      regionId: "frontier",
      x: 12.35,
      y: 8.55,
    });
  });
});
