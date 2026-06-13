import { describe, expect, it } from "vitest";
import {
  BOARD_OPTIONS,
  LOOP_PHASES,
  createInitialLoopState,
  createLoopStateMachine,
  getPhaseView,
  getPhaseProgress,
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
    expect(state.encounterState.slimeHp).toBe(0);
    expect(state.encounterState.slimeHits).toBe(3);
    expect(state.encounterState.slimeDefeated).toBe(true);
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
    expect(view.objectiveText).toContain("broken wagon");
    expect(view.objectiveMeta[1]).toContain("Ask about road danger");
  });

  it("reflects board option in the return-to-Boone payoff copy", () => {
    const state = createInitialLoopState({ phase: "return_to_boone", boardChoice: "inspect_survey" });
    const view = getPhaseView("return_to_boone", state);

    expect(view.objectiveText).toContain("Old Road Survey");
    expect(view.objectiveMeta[1]).toContain("Inspect old survey");
  });

  it("gives every first-road phase objective metadata", () => {
    for (const phase of LOOP_PHASES) {
      const view = getPhaseView(phase);
      expect(view.objectiveMeta.length).toBeGreaterThan(0);
      expect(view.objectiveMeta.every((line: string) => line.trim().length > 0)).toBe(true);
    }
  });

  it("reports phase progress for the route HUD", () => {
    const start = getPhaseProgress("spawn");
    const fight = getPhaseProgress("slime_fight");
    const end = getPhaseProgress("survey_teaser");

    expect(start).toMatchObject({ step: 1, total: LOOP_PHASES.length, ratio: 0, label: `1/${LOOP_PHASES.length}` });
    expect(fight.step).toBeGreaterThan(start.step);
    expect(fight.ratio).toBeGreaterThan(0.5);
    expect(end.ratio).toBe(1);
  });
});

describe("dust_to_dust mission extension (M1.1)", () => {
  it("opens at the funeral when activeMission is set — default loop untouched", () => {
    const mission = createInitialLoopState({ activeMission: "dust_to_dust" });
    expect(mission.phase).toBe("funeral");
    expect(getPhaseView("funeral", mission).activeTargetKind).toBe("gravesite");
    // the default fresh loop (no mission) still opens at spawn — sacred tripwire
    expect(createInitialLoopState().phase).toBe("spawn");
  });

  it("walks funeral → implant → spawn, then hands off to the first-road loop", () => {
    let s = createInitialLoopState({ activeMission: "dust_to_dust" });
    s = transitionLoopPhase(s, "attend_funeral");
    expect(s.phase).toBe("implant");
    s = transitionLoopPhase(s, "install_implant");
    expect(s.phase).toBe("spawn");
    // hand-off intact: the board is the next target, exactly like a default run
    expect(getPhaseView("spawn").activeTargetKind).toBe("jobBoard");
  });

  it("carries activeMission across transitions (ironman resume)", () => {
    let s = createInitialLoopState({ activeMission: "dust_to_dust" });
    s = transitionLoopPhase(s, "attend_funeral");
    expect(s.activeMission).toBe("dust_to_dust");
  });
});
