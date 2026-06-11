import { describe, it, expect } from "vitest";
import {
  EASTWATER_JOB_ID,
  questTargetEnabled,
  questPromptFor,
  questObjectiveView,
  questMapTarget,
} from "../src/render3d/questRuntime.js";
import {
  createInitialJobBoardState,
  acceptJob,
  recordJobEvent,
} from "../src/jobBoard.js";

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Build a jobState where frontier_slime_bounty is complete so eastwater unlocks. */
function jobStateWithSlimeDone() {
  const js = createInitialJobBoardState();
  js.completedJobIds = ["frontier_slime_bounty"];
  return js;
}

/** Accept the eastwater job on a state that has slime bounty complete. */
function acceptEastwater(extraCompletedJobIds: string[] = []) {
  const js = jobStateWithSlimeDone();
  js.completedJobIds = [...js.completedJobIds, ...extraCompletedJobIds];
  const result = acceptJob(js, EASTWATER_JOB_ID);
  expect(result.ok).toBe(true);
  return result.jobState;
}

/** Advance eastwater to count 1 (ledger picked up). */
function pickupDone(jobState: ReturnType<typeof createInitialJobBoardState>) {
  const r = recordJobEvent(jobState, {
    type: "pickup",
    targetId: "eastwater_ledger_cache",
  });
  expect(r.ok).toBe(true);
  return r.jobState;
}

/** Advance eastwater to ready (ledger delivered). */
function dropoffDone(jobState: ReturnType<typeof createInitialJobBoardState>) {
  const r = recordJobEvent(jobState, {
    type: "dropoff",
    targetId: "eastwater_trading_post",
  });
  expect(r.ok).toBe(true);
  expect(r.completed).toBe(true);
  return r.jobState;
}

// ─── questTargetEnabled ───────────────────────────────────────────────────────

describe("questRuntime — questTargetEnabled", () => {
  it("returns false when no job is active", () => {
    const js = createInitialJobBoardState();
    expect(questTargetEnabled(js, { kind: "questPickup" })).toBe(false);
    expect(questTargetEnabled(js, { kind: "questDropoff" })).toBe(false);
  });

  it("returns false when a different job is active", () => {
    const js = createInitialJobBoardState();
    const r = acceptJob(js, "frontier_slime_bounty");
    expect(r.ok).toBe(true);
    expect(questTargetEnabled(r.jobState, { kind: "questPickup" })).toBe(false);
    expect(questTargetEnabled(r.jobState, { kind: "questDropoff" })).toBe(false);
  });

  it("enables questPickup at count 0, not questDropoff", () => {
    const js = acceptEastwater();
    expect(questTargetEnabled(js, { kind: "questPickup" })).toBe(true);
    expect(questTargetEnabled(js, { kind: "questDropoff" })).toBe(false);
  });

  it("enables questDropoff at count 1, not questPickup", () => {
    const js = pickupDone(acceptEastwater());
    expect(questTargetEnabled(js, { kind: "questPickup" })).toBe(false);
    expect(questTargetEnabled(js, { kind: "questDropoff" })).toBe(true);
  });

  it("disables both targets when job is ready (delivered, awaiting claim)", () => {
    const js = dropoffDone(pickupDone(acceptEastwater()));
    expect(questTargetEnabled(js, { kind: "questPickup" })).toBe(false);
    expect(questTargetEnabled(js, { kind: "questDropoff" })).toBe(false);
  });

  it("returns false for null target", () => {
    const js = acceptEastwater();
    expect(questTargetEnabled(js, null as any)).toBe(false);
  });

  it("returns false for unknown target kind even during active job", () => {
    const js = acceptEastwater();
    expect(questTargetEnabled(js, { kind: "jobBoard" })).toBe(false);
    expect(questTargetEnabled(js, { kind: "smokeCache" })).toBe(false);
  });
});

// ─── questPromptFor ───────────────────────────────────────────────────────────

describe("questRuntime — questPromptFor", () => {
  it('returns pickup prompt at count 0', () => {
    const js = acceptEastwater();
    expect(questPromptFor(js, { kind: "questPickup" })).toBe("E — Take the Ranch Ledger");
  });

  it('returns dropoff prompt at count 1', () => {
    const js = pickupDone(acceptEastwater());
    expect(questPromptFor(js, { kind: "questDropoff" })).toBe("E — Deliver the Ledger");
  });

  it('returns empty string for disabled targets', () => {
    const js = acceptEastwater();
    // questDropoff is not enabled at count 0
    expect(questPromptFor(js, { kind: "questDropoff" })).toBe("");
    // questPickup is not enabled at count 1
    const js2 = pickupDone(acceptEastwater());
    expect(questPromptFor(js2, { kind: "questPickup" })).toBe("");
  });

  it('returns empty string when no job active', () => {
    const js = createInitialJobBoardState();
    expect(questPromptFor(js, { kind: "questPickup" })).toBe("");
    expect(questPromptFor(js, { kind: "questDropoff" })).toBe("");
  });
});

// ─── questObjectiveView ───────────────────────────────────────────────────────

describe("questRuntime — questObjectiveView", () => {
  it("returns null when frontier_eastwater_run is not active", () => {
    expect(questObjectiveView(createInitialJobBoardState())).toBeNull();
  });

  it("returns null when a different job is active", () => {
    const r = acceptJob(createInitialJobBoardState(), "frontier_slime_bounty");
    expect(questObjectiveView(r.jobState)).toBeNull();
  });

  it("describes the pickup beat at count 0", () => {
    const js = acceptEastwater();
    const view = questObjectiveView(js);
    expect(view).not.toBeNull();
    expect(view!.objectiveLabel).toBe("Ranch Ledger Run");
    expect(view!.objectiveText).toContain("ledger from Boone's office");
    expect(view!.objectiveMeta).toHaveLength(2);
    expect(view!.objectiveMeta[0]).toContain("Ranch Ledger");
    expect(view!.phase).toContain("pickup");
  });

  it("describes the delivery beat at count 1", () => {
    const js = pickupDone(acceptEastwater());
    const view = questObjectiveView(js);
    expect(view).not.toBeNull();
    expect(view!.objectiveText).toContain("Eastwater Trading Post");
    expect(view!.objectiveText).toMatch(/ride east/i);
    expect(view!.objectiveMeta[0]).toContain("Eastwater Trading Post");
    expect(view!.phase).toContain("deliver");
  });

  it("describes the return beat when job is ready", () => {
    const js = dropoffDone(pickupDone(acceptEastwater()));
    const view = questObjectiveView(js);
    expect(view).not.toBeNull();
    expect(view!.objectiveText).toContain("Boone's board");
    expect(view!.objectiveText).toContain("courier pay");
    expect(view!.objectiveMeta[0]).toContain("Return");
    expect(view!.objectiveMeta[1]).toContain("+60g");
    expect(view!.phase).toContain("return");
  });

  it("view has all fields syncObjectiveDom expects (objectiveLabel, objectiveText, objectiveMeta, phase)", () => {
    for (const js of [
      acceptEastwater(),
      pickupDone(acceptEastwater()),
      dropoffDone(pickupDone(acceptEastwater())),
    ]) {
      const view = questObjectiveView(js)!;
      expect(typeof view.objectiveLabel).toBe("string");
      expect(typeof view.objectiveText).toBe("string");
      expect(Array.isArray(view.objectiveMeta)).toBe(true);
      expect(typeof view.phase).toBe("string");
    }
  });
});

// ─── questMapTarget ───────────────────────────────────────────────────────────

describe("questRuntime — questMapTarget", () => {
  it("returns null when frontier_eastwater_run is not active", () => {
    expect(questMapTarget(createInitialJobBoardState())).toBeNull();
  });

  it("returns pickup coords at beat 0", () => {
    const js = acceptEastwater();
    const target = questMapTarget(js);
    expect(target).not.toBeNull();
    expect(target!.x).toBeCloseTo(14.2);
    expect(target!.y).toBeCloseTo(5.9);
    expect(target!.label).toContain("Ranch Ledger");
  });

  it("returns dropoff coords at beat 1", () => {
    const js = pickupDone(acceptEastwater());
    const target = questMapTarget(js);
    expect(target).not.toBeNull();
    expect(target!.x).toBeCloseTo(128.8);
    expect(target!.y).toBeCloseTo(18.6);
    expect(target!.label).toContain("Eastwater Trading Post");
  });

  it("returns board coords when job is ready", () => {
    const js = dropoffDone(pickupDone(acceptEastwater()));
    const target = questMapTarget(js);
    expect(target).not.toBeNull();
    // Board at FIRST_FIVE_ROUTE jobBoard waypoint
    expect(target!.x).toBeCloseTo(13.0);
    expect(target!.y).toBeCloseTo(5.65);
    expect(target!.label).toContain("Boone");
  });
});
