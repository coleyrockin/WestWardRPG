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
      startedAt: 0,
      bonusEligible: false,
      bonusClaimed: false,
      failedReason: null,
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
    expect(frontierListings.map((job) => job.id)).toContain("frontier_watch_patrol");
    expect(frontierListings.map((job) => job.id)).toContain("frontier_supply_run");
    expect(frontierListings.map((job) => job.id)).toContain("frontier_missing_scout");
    expect(frontierListings.map((job) => job.id)).toContain("frontier_settler_escort");
    expect(frontierListings.find((job) => job.id === "frontier_watch_patrol")?.boardNote).toContain("road posts");
    expect(frontierListings.find((job) => job.id === "frontier_supply_run")?.availabilityLine).toContain("Dustward Frontier");

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

    expect(choices).toHaveLength(7);
    expect(choices.map((job) => job.id)).toEqual([
      "frontier_slime_bounty",
      "frontier_road_salvage",
      "frontier_courier_orders",
      "frontier_watch_patrol",
      "frontier_supply_run",
      "frontier_missing_scout",
      "frontier_settler_escort",
    ]);
    expect(choices[0]).toMatchObject({
      boardState: "available",
      selectable: true,
      threat: "Low",
      rewardLine: "+38g, +18 XP, +1 Potion",
      regionHint: "Dustward Frontier",
    });
  });

  it("accepts one active job and exposes a compact summary", () => {
    const state = createInitialJobBoardState();
    const accepted = acceptJob(state, "frontier_slime_bounty", { time: 12.5 });
    const duplicate = acceptJob(state, "ashfall_scrap_warrant");

    expect(accepted.ok).toBe(true);
    expect(accepted.job?.title).toBe("Marsh Slime Bounty");
    expect(state.activeJobId).toBe("frontier_slime_bounty");
    expect(state.progressByJobId.frontier_slime_bounty.status).toBe("active");
    expect(state.progressByJobId.frontier_slime_bounty.startedAt).toBe(12.5);
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
      startedAt: 0,
      bonusEligible: false,
      bonusClaimed: false,
      failedReason: null,
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
    acceptJob(state, "frontier_courier_orders", { time: 10 });

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
      regionHint: "Dustward Frontier",
      action: "pickup",
      checkpointIndex: 1,
      checkpointTotal: 2,
    });
    expect(pickupMarker?.line).toContain("Dustward Frontier");
    expect(getActiveJobSummary(state)?.progressLine).toBe("Pick up Sealed Orders");

    const pickedUp = recordJobEvent(state, { type: "pickup", targetId: "frontier_orders_cache", time: 24 });
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
      checkpointIndex: 2,
      checkpointTotal: 2,
    });
    expect(deliveryMarker?.line).toContain("Dustward Frontier");

    const delivered = recordJobEvent(state, { type: "deliver", npcId: "elder", time: 64 });

    expect(delivered.completed).toBe(true);
    expect(delivered.progress?.bonusEligible).toBe(true);
    expect(getActiveJobSummary(state)?.status).toBe("ready");
    expect(getActiveJobSummary(state)?.progressLine).toBe("Return to Marshal Boone");

    const claimed = claimJobReward(state, "frontier_courier_orders");
    expect(claimed.reward).toEqual({ gold: 38, xp: 19, items: { Potion: 1 } });
    expect(claimed.bonusAwarded).toBe(true);
  });

  it("keeps courier jobs payable but drops the quick-delivery bonus when late", () => {
    const state = createInitialJobBoardState();
    acceptJob(state, "frontier_courier_orders", { time: 0 });
    recordJobEvent(state, { type: "pickup", targetId: "frontier_orders_cache", time: 20 });

    const delivered = recordJobEvent(state, { type: "deliver", npcId: "elder", time: 140 });
    const claimed = claimJobReward(state, "frontier_courier_orders");

    expect(delivered.completed).toBe(true);
    expect(delivered.progress?.bonusEligible).toBe(false);
    expect(claimed.reward).toEqual({ gold: 30, xp: 16, items: { Potion: 1 } });
    expect(claimed.bonusAwarded).toBe(false);
  });

  it("runs patrol jobs through ordered checkpoints before return", () => {
    const state = createInitialJobBoardState();
    acceptJob(state, "frontier_watch_patrol");

    const firstMarker = resolveJobRouteMarker({
      jobState: state,
      player: { x: 12, y: 8.5 },
      resources: [],
      enemies: [],
      npcs: [],
    });

    expect(firstMarker).toMatchObject({
      kind: "job_patrol",
      jobId: "frontier_watch_patrol",
      label: "Patrol: East Road Post",
      action: "checkpoint",
      targetId: "frontier_patrol_east_post",
      checkpointIndex: 1,
      checkpointTotal: 3,
      regionHint: "Dustward Frontier",
    });
    expect(firstMarker?.line).toContain("Checkpoint 1/3");

    const wrongCheckpoint = recordJobEvent(state, { type: "checkpoint", targetId: "frontier_patrol_watchtower" });
    const firstCheckpoint = recordJobEvent(state, { type: "checkpoint", targetId: "frontier_patrol_east_post" });

    expect(wrongCheckpoint.ok).toBe(false);
    expect(firstCheckpoint.ok).toBe(true);
    expect(firstCheckpoint.progress?.count).toBe(1);
    expect(getActiveJobSummary(state)?.progressLine).toBe("Checkpoint 2/3: Marsh Fence");

    const secondCheckpoint = recordJobEvent(state, { type: "checkpoint", targetId: "frontier_patrol_marsh_fence" });
    const thirdCheckpoint = recordJobEvent(state, { type: "checkpoint", targetId: "frontier_patrol_watchtower" });

    expect(secondCheckpoint.progress?.count).toBe(2);
    expect(thirdCheckpoint.completed).toBe(true);
    expect(getActiveJobSummary(state)?.status).toBe("ready");
    expect(getActiveJobSummary(state)?.progressLine).toBe("Return to Marshal Boone");
  });

  it("runs supply jobs through pickup, dropoff, and return route markers", () => {
    const state = createInitialJobBoardState();
    acceptJob(state, "frontier_supply_run");

    const pickup = resolveJobRouteMarker({
      jobState: state,
      player: { x: 12, y: 8.5 },
      resources: [],
      enemies: [],
      npcs: [],
    });

    expect(pickup).toMatchObject({
      kind: "job_supply_pickup",
      jobId: "frontier_supply_run",
      label: "Pick up Barricade Crate",
      action: "pickup",
      targetId: "frontier_supply_crate",
      checkpointIndex: 1,
      checkpointTotal: 2,
    });

    const pickedUp = recordJobEvent(state, { type: "pickup", targetId: "frontier_supply_crate" });
    const wrongDropoff = recordJobEvent(state, { type: "dropoff", targetId: "frontier_wrong_stall" });
    const dropoffMarker = resolveJobRouteMarker({
      jobState: state,
      player: { x: 15, y: 10.5 },
      resources: [],
      enemies: [],
      npcs: [],
    });

    expect(pickedUp.ok).toBe(true);
    expect(wrongDropoff.ok).toBe(false);
    expect(dropoffMarker).toMatchObject({
      kind: "job_supply_dropoff",
      label: "Deliver to Smith Varo's Forge",
      action: "dropoff",
      targetId: "frontier_smith_supply_drop",
      checkpointIndex: 2,
      checkpointTotal: 2,
    });

    const delivered = recordJobEvent(state, { type: "dropoff", targetId: "frontier_smith_supply_drop" });
    expect(delivered.completed).toBe(true);
    expect(getActiveJobSummary(state)?.status).toBe("ready");
  });

  it("fails urgent supply jobs when they miss the posted deadline and lets Boone clear the route", () => {
    const state = createInitialJobBoardState();
    acceptJob(state, "frontier_supply_run", { time: 0 });
    recordJobEvent(state, { type: "pickup", targetId: "frontier_supply_crate", time: 20 });

    const failed = recordJobEvent(state, { type: "dropoff", targetId: "frontier_smith_supply_drop", time: 220 });
    const marker = resolveJobRouteMarker({
      jobState: state,
      player: { x: 10, y: 8 },
      resources: [],
      enemies: [],
      npcs: [{ id: "warden", x: 12, y: 8 }],
    });

    expect(failed.failed).toBe(true);
    expect(getActiveJobSummary(state)?.status).toBe("failed");
    expect(marker).toMatchObject({
      kind: "job_failed",
      action: "fail_turn_in",
      label: "Report to Marshal Boone",
      returnTarget: "warden",
    });
    const closed = claimJobReward(state, "frontier_supply_run");
    expect(closed).toMatchObject({
      ok: true,
      failed: true,
      reward: { gold: 0, xp: 0, items: {} },
    });
    expect(state.activeJobId).toBe(null);
    expect(state.progressByJobId.frontier_supply_run).toBeUndefined();
  });

  it("runs rescue jobs through find, safe-return, and Boone payout", () => {
    const state = createInitialJobBoardState();
    acceptJob(state, "frontier_missing_scout", { time: 4 });

    const findMarker = resolveJobRouteMarker({
      jobState: state,
      player: { x: 12, y: 8.5 },
      resources: [],
      enemies: [],
      npcs: [{ id: "warden", x: 12, y: 8 }],
    });

    expect(findMarker).toMatchObject({
      kind: "job_rescue",
      jobId: "frontier_missing_scout",
      label: "Find Wounded Scout",
      action: "rescue",
      targetId: "frontier_wounded_scout",
      checkpointIndex: 1,
      checkpointTotal: 2,
    });

    const found = recordJobEvent(state, { type: "rescue", targetId: "frontier_wounded_scout", time: 24 });
    const wrongReturn = recordJobEvent(state, { type: "safe_return", targetId: "frontier_wrong_gate", time: 42 });
    const returnMarker = resolveJobRouteMarker({
      jobState: state,
      player: { x: 14, y: 9.8 },
      resources: [],
      enemies: [],
      npcs: [{ id: "warden", x: 12, y: 8 }],
    });

    expect(found.ok).toBe(true);
    expect(found.progress?.count).toBe(1);
    expect(wrongReturn.ok).toBe(false);
    expect(getActiveJobSummary(state)?.progressLine).toBe("Guide Wounded Scout to Marshal Gate");
    expect(returnMarker).toMatchObject({
      kind: "job_rescue_return",
      label: "Guide to Marshal Gate",
      action: "safe_return",
      targetId: "frontier_marshal_gate",
      checkpointIndex: 2,
      checkpointTotal: 2,
    });

    const secured = recordJobEvent(state, { type: "safe_return", targetId: "frontier_marshal_gate", time: 58 });
    const claimed = claimJobReward(state, "frontier_missing_scout");

    expect(secured.completed).toBe(true);
    expect(claimed.reward).toEqual({ gold: 42, xp: 22, items: { Tonic: 1 } });
    expect(state.completedJobIds).toContain("frontier_missing_scout");
  });

  it("runs escort jobs through meet, escort-finish, and quick-arrival bonus", () => {
    const state = createInitialJobBoardState();
    acceptJob(state, "frontier_settler_escort", { time: 10 });

    const meetMarker = resolveJobRouteMarker({
      jobState: state,
      player: { x: 12, y: 8.5 },
      resources: [],
      enemies: [],
      npcs: [],
    });

    expect(meetMarker).toMatchObject({
      kind: "job_escort_start",
      label: "Meet Settler Caravan",
      action: "escort_start",
      targetId: "frontier_settler_caravan",
      checkpointIndex: 1,
      checkpointTotal: 2,
    });

    const met = recordJobEvent(state, { type: "escort_start", targetId: "frontier_settler_caravan", time: 30 });
    const finishMarker = resolveJobRouteMarker({
      jobState: state,
      player: { x: 13.9, y: 10.8 },
      resources: [],
      enemies: [],
      npcs: [],
    });

    expect(met.ok).toBe(true);
    expect(getActiveJobSummary(state)?.progressLine).toBe("Escort Settler Caravan to West Gate");
    expect(finishMarker).toMatchObject({
      kind: "job_escort_finish",
      label: "Escort to West Gate",
      action: "escort_finish",
      targetId: "frontier_west_gate",
      checkpointIndex: 2,
      checkpointTotal: 2,
    });

    const finished = recordJobEvent(state, { type: "escort_finish", targetId: "frontier_west_gate", time: 95 });
    const claimed = claimJobReward(state, "frontier_settler_escort");

    expect(finished.completed).toBe(true);
    expect(finished.progress?.bonusEligible).toBe(true);
    expect(claimed.reward).toEqual({ gold: 53, xp: 25, items: { Potion: 1 } });
    expect(claimed.bonusAwarded).toBe(true);
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
      regionHint: "Dustward Frontier",
      returnTarget: "warden",
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

  it("exposes regional job-board props beyond Boone's town board", () => {
    const ashfall = getJobBoardProp({ regionId: "ashfall" });
    const lantern = getJobBoardProp({ regionId: "ironlantern" });

    expect(ashfall).toMatchObject({
      id: "ashfall_job_board",
      kind: "job_board",
      label: "Ashfall Warrant Board",
      regionId: "ashfall",
      x: 41.25,
      y: 39.65,
    });
    expect(lantern).toMatchObject({
      id: "ironlantern_job_board",
      kind: "job_board",
      label: "Lantern Quiet Board",
      regionId: "ironlantern",
      x: 15.25,
      y: 39.35,
    });
    expect(ashfall.label).not.toBe(lantern.label);
  });

  it("adds non-combat regional board depth beyond the Frontier", () => {
    const ashfall = getJobListings({ regionId: "ashfall", playerLevel: 3, jobState: createInitialJobBoardState() });
    const lantern = getJobListings({ regionId: "ironlantern", playerLevel: 4, jobState: createInitialJobBoardState() });

    expect(ashfall.map((job) => job.id)).toContain("ashfall_cooling_patrol");
    expect(ashfall.find((job) => job.id === "ashfall_cooling_patrol")?.objective.type).toBe("patrol");
    expect(lantern.map((job) => job.id)).toContain("ironlantern_signal_courier");
    expect(lantern.find((job) => job.id === "ironlantern_signal_courier")?.objective.type).toBe("delivery");
  });
});
