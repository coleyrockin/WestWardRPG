import { describe, expect, it } from "vitest";
import {
  createGameState,
  acceptStarterJob,
  recordSlimeKill,
  claimBoardReward,
  recordNpcGreeting,
} from "../src/render3d/gameState.js";
import { buildBoardView } from "../src/render3d/boardCopy.js";

function completedState() {
  const state = createGameState();
  acceptStarterJob(state);
  recordSlimeKill(state);
  recordSlimeKill(state);
  recordSlimeKill(state);
  claimBoardReward(state, { at: 120 });
  return state;
}

describe("buildBoardView", () => {
  it("offers the real starter bounty on a fresh state, copy driven by job data", () => {
    const view = buildBoardView(createGameState());
    expect(view.mode).toBe("offer");
    expect(view.title).toBe("Marsh Slime Bounty");
    expect(view.bodyLines.join(" ")).toContain("marsh road cleared");
    expect(view.rewardLine).toContain("+38g");
    expect(view.rewardLine).toContain("+18 XP");
    expect(view.progressLine).toBe("");
  });

  it("speaks Boone's first-meeting line before any greeting is recorded", () => {
    const view = buildBoardView(createGameState());
    expect(view.booneLine).toContain("Marshal Boone");
    expect(view.booneLine).toContain("not from here");
  });

  it("goes quiet (no boone line) on later visits with nothing new to say", () => {
    const state = createGameState();
    recordNpcGreeting(state, "warden", { at: 1 });
    const view = buildBoardView(state);
    expect(view.booneLine).toBe("");
  });

  it("pins other real listings beside the bounty offer", () => {
    const view = buildBoardView(createGameState());
    expect(view.listings.length).toBe(3);
    expect(view.listings[0].title.length).toBeGreaterThan(0);
    expect(view.listings[0].rewardLine).toMatch(/\+\d+g/);
    expect(view.listings.map((l) => l.title)).not.toContain("Marsh Slime Bounty");
  });

  it("tracks the live bounty while it is active (rules hold the rest of the board)", () => {
    const state = createGameState();
    acceptStarterJob(state);
    recordSlimeKill(state);
    const view = buildBoardView(state);
    expect(view.mode).toBe("active");
    expect(view.progressLine).toBe("1/3 slimes defeated");
    expect(view.listings).toEqual([]);
  });

  it("flips to the paid view after the claim: Boone reacts, survey hook teased", () => {
    const view = buildBoardView(completedState());
    expect(view.mode).toBe("completed");
    expect(view.title).toContain("Bounty Paid");
    expect(view.booneLine).toContain("First road loop held");
    expect(view.bodyLines.join(" ")).toContain("marked the marshal road as watched");
    expect(view.bodyLines.join(" ")).toContain("Old Road Survey");
    expect(view.rewardLine).toBe("");
  });

  it("re-pins the remaining board after the bounty is paid", () => {
    const view = buildBoardView(completedState());
    expect(view.listings.length).toBe(3);
    expect(view.listings.map((l) => l.title)).not.toContain("Marsh Slime Bounty");
  });

  it("never throws on a malformed state (normalize guards the surface)", () => {
    const state = createGameState();
    (state.world.jobs as unknown as Record<string, unknown>).activeJobId = 42;
    const view = buildBoardView(state);
    expect(["offer", "active", "completed"]).toContain(view.mode);
  });
});
