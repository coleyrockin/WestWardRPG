import { describe, expect, it } from "vitest";
import {
  acceptJob,
  claimJobReward,
  createInitialJobBoardState,
  getActiveJobSummary,
  getJobListings,
  normalizeJobBoardState,
  recordJobEvent,
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

    state.completedJobIds.push("frontier_slime_bounty");
    expect(getJobListings({ regionId: "frontier", playerLevel: 1, jobState: state }).map((job) => job.id)).not.toContain("frontier_slime_bounty");
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
});
