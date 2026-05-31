import { describe, expect, it } from "vitest";
import {
  BOARD_OPTIONS,
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
    expect(view.label).toBe("Follow the Road");
    expect(view.objectiveMeta).toEqual(["Target: Boone's job board", "Action: Open board"]);
  });

  it("walks the full paced first-road phase sequence", () => {
    const events = [
      "board_reached",
      { type: "choose_board", optionId: "ask_danger" },
      "read_sign",
      "hear_bark",
      "open_cache",
      "spot_slime_tell",
      "defeat_slime",
      "inspect_wagon",
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
      "board_choice",
      "road_sign",
      "road_walk",
      "cache_clue",
      "slime_tell",
      "slime_fight",
      "wagon_salvage",
      "return_to_boone",
      "survey_teaser",
    ]);
  });

  it("records board choice, route beats, reward, and completion preview state", () => {
    let state = createInitialLoopState();
    for (const event of [
      "board_reached",
      { type: "choose_board", optionId: "inspect_survey" },
      "read_sign",
      "hear_bark",
      "open_cache",
      "spot_slime_tell",
      "defeat_slime",
      "inspect_wagon",
    ]) {
      state = transitionLoopPhase(state, event);
    }

    expect(state.phase).toBe("return_to_boone");
    expect(state.boardChoice).toBe("inspect_survey");
    expect(state.inventoryPreview["Map Scrap"]).toBe(1);
    expect(state.completedInteractions).toContain("road_slime_defeated");
    expect(state.completedInteractions).toContain("frontier_broken_wagon_salvaged");
    expect(state.encounterState.slime).toBe("dead");
    expect(Object.values(state.routeBeats).filter(Boolean).length).toBeGreaterThanOrEqual(7);
  });

  it("keeps prompt and objective target aligned by phase", () => {
    const machine = createLoopStateMachine();
    const jobBoard = { kind: "jobBoard" };
    const roadSign = { kind: "roadSign" };
    const bark = { kind: "townBark" };
    const cache = { kind: "smokeCache" };
    const tell = { kind: "slimeTell" };
    const slime = { kind: "roadSlime" };

    expect(machine.isTargetEnabled(jobBoard)).toBe(true);
    expect(machine.getPromptForTarget(jobBoard)).toContain("Board");
    expect(machine.isTargetEnabled(cache)).toBe(false);

    machine.transition("board_reached");
    machine.chooseBoardOption("accept_bounty");
    expect(machine.phase).toBe("road_sign");
    expect(machine.isTargetEnabled(roadSign)).toBe(true);

    machine.transition("read_sign");
    expect(machine.isTargetEnabled(bark)).toBe(true);

    machine.transition("hear_bark");
    expect(machine.isTargetEnabled(cache)).toBe(true);

    machine.transition("open_cache");
    expect(machine.isTargetEnabled(tell)).toBe(true);

    machine.transition("spot_slime_tell");
    expect(machine.isTargetEnabled(slime)).toBe(true);
    expect(machine.getPromptForTarget(slime)).toContain("Strike");
  });

  it("reflects board option in follow-up objective copy", () => {
    const state = createInitialLoopState({ phase: "cache_clue", boardChoice: "ask_danger" });
    const view = getPhaseView("cache_clue", state);

    expect(BOARD_OPTIONS.map((option) => option.id)).toContain("ask_danger");
    expect(view.objectiveText).toContain("marsh grass");
    expect(view.objectiveMeta[1]).toContain("Ask about road danger");
  });

  it("gives every first-road phase objective metadata", () => {
    for (const phase of LOOP_PHASES) {
      const view = getPhaseView(phase);
      expect(view.objectiveMeta.length).toBeGreaterThan(0);
      expect(view.objectiveMeta.every((line: string) => line.trim().length > 0)).toBe(true);
    }
  });
});
