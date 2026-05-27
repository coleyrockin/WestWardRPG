import { describe, expect, it } from "vitest";
import {
  LOOP_PHASES,
  createInitialLoopState,
  createLoopStateMachine,
  getPhaseView,
  transitionLoopPhase,
} from "../src/render3d/phaseState.js";

describe("render3d phase state", () => {
  it("starts with Boone board as the first visible target", () => {
    const state = createInitialLoopState();
    const view = getPhaseView(state.phase);

    expect(state.phase).toBe("spawn");
    expect(view.activeTargetKind).toBe("jobBoard");
    expect(view.objectiveText).toContain("Boone");
  });

  it("walks the full first-road phase sequence", () => {
    const events = [
      "board_reached",
      "accept_bounty",
      "open_cache",
      "slime_appeared",
      "defeat_slime",
      "inspect_wagon",
      "acknowledge_scrap",
      "report_to_boone",
    ];
    const phases = ["spawn"];
    let state = createInitialLoopState();

    for (const event of events) {
      state = transitionLoopPhase(state, event);
      phases.push(state.phase);
    }

    expect(phases).toEqual([
      "spawn",
      "accept_bounty",
      "road_walk",
      "cache_open",
      "slime_fight",
      "wagon_inspect",
      "scrap_earned",
      "return_to_boone",
      "survey_offered",
    ]);
  });

  it("records local-only reward and completion preview state", () => {
    let state = createInitialLoopState();
    for (const event of [
      "board_reached",
      "accept_bounty",
      "open_cache",
      "slime_appeared",
      "defeat_slime",
      "inspect_wagon",
    ]) {
      state = transitionLoopPhase(state, event);
    }

    expect(state.phase).toBe("scrap_earned");
    expect(state.inventoryPreview["Map Scrap"]).toBe(1);
    expect(state.completedInteractions).toContain("road_slime_defeated");
    expect(state.completedInteractions).toContain("frontier_broken_wagon_inspected");
    expect(state.encounterState.slime).toBe("dead");
  });

  it("keeps prompt and objective target aligned by phase", () => {
    const machine = createLoopStateMachine();
    const jobBoard = { kind: "jobBoard" };
    const cache = { kind: "smokeCache" };
    const slime = { kind: "roadSlime" };

    expect(machine.isTargetEnabled(jobBoard)).toBe(true);
    expect(machine.getPromptForTarget(jobBoard)).toContain("Board");
    expect(machine.isTargetEnabled(cache)).toBe(false);

    machine.transition("board_reached");
    machine.transition("accept_bounty");
    expect(machine.phase).toBe("road_walk");
    expect(machine.isTargetEnabled(cache)).toBe(true);
    expect(machine.getPromptForTarget(cache)).toContain("Smoke Cache");

    machine.transition("open_cache");
    machine.transition("slime_appeared");
    expect(machine.phase).toBe("slime_fight");
    expect(machine.isTargetEnabled(slime)).toBe(true);
    expect(machine.getPromptForTarget(slime)).toContain("Strike");
  });

  it("gives every first-road phase objective metadata", () => {
    for (const phase of LOOP_PHASES) {
      const view = getPhaseView(phase);
      expect(view.objectiveMeta.length).toBeGreaterThan(0);
      expect(view.objectiveMeta.every((line: string) => line.trim().length > 0)).toBe(true);
    }
  });
});
