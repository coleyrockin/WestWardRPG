export const LOOP_PHASES = Object.freeze([
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

const PHASE_COPY = {
  spawn: {
    label: "Follow the Road",
    text: "Find Boone's lit job board by the road.",
    meta: ["Target: Boone's job board", "Action: Open board"],
    targetKind: "jobBoard",
    prompt: "E — Read Boone's Board",
  },
  accept_bounty: {
    label: "Marsh Slime Bounty",
    text: "Open Boone's board and accept the Marsh Slime Bounty.",
    meta: ["Target: Smoke Cache", "Reward: Route clarity + job line"],
    targetKind: "jobBoard",
    prompt: "E — Open Boone's Board",
  },
  road_walk: {
    label: "Follow The Marshal Road",
    text: "Follow the lantern road to Smoke Cache.",
    meta: ["Target: Smoke Cache", "Threat: Unknown in marsh"],
    targetKind: "smokeCache",
    prompt: "E — Open Smoke Cache",
  },
  cache_open: {
    label: "Smoke Cache",
    text: "Smoke Cache is open. Something is moving in the marsh.",
    meta: ["Objective: Survive the ambush", "Reward: Map Scrap lead"],
    targetKind: "smokeCache",
    prompt: "Cache opened",
  },
  slime_fight: {
    label: "Road Slime",
    text: "Strike the Road Slime before it reaches the cache.",
    meta: ["Action: Strike until it falls", "Threat: Road Slime"],
    targetKind: "roadSlime",
    prompt: "E — Strike Road Slime",
  },
  wagon_inspect: {
    label: "Broken Wagon",
    text: "Inspect the broken wagon for whatever the slime was guarding.",
    meta: ["Action: Inspect wagon", "Reward: Map Scrap"],
    targetKind: "brokenWagon",
    prompt: "E — Inspect Broken Wagon",
  },
  scrap_earned: {
    label: "Map Scrap Found",
    text: "+1 Map Scrap. This points to an old road survey.",
    meta: ["Status: Map Scrap secured", "Next: Return to Boone"],
    targetKind: "brokenWagon",
    prompt: "Map Scrap recovered",
  },
  return_to_boone: {
    label: "Return To Boone",
    text: "Bring the Map Scrap back to Boone's board.",
    meta: ["Action: Return promptly", "Reward: Survey opportunity"],
    targetKind: "jobBoard",
    prompt: "E — Report To Boone",
  },
  survey_offered: {
    label: "Old Road Survey",
    text: "Old Road Survey is unlocked as the next Boone follow-up.",
    meta: ["Status: Open on board", "Next: Follow-up loop active"],
    targetKind: "jobBoard",
    prompt: "E — View Old Road Survey",
  },
};

const TRANSITIONS = {
  spawn: {
    board_reached: "accept_bounty",
    open_board: "accept_bounty",
  },
  accept_bounty: {
    accept_bounty: "road_walk",
  },
  road_walk: {
    open_cache: "cache_open",
  },
  cache_open: {
    slime_appeared: "slime_fight",
  },
  slime_fight: {
    defeat_slime: "wagon_inspect",
  },
  wagon_inspect: {
    inspect_wagon: "scrap_earned",
  },
  scrap_earned: {
    acknowledge_scrap: "return_to_boone",
  },
  return_to_boone: {
    report_to_boone: "survey_offered",
  },
  survey_offered: {},
};

function copyFor(phase) {
  return PHASE_COPY[phase] || PHASE_COPY.spawn;
}

function cloneState(state) {
  return {
    phase: state.phase,
    inventoryPreview: { ...state.inventoryPreview },
    completedInteractions: [...state.completedInteractions],
    encounterState: { ...state.encounterState },
  };
}

function applySideEffects(next, event) {
  if (event === "accept_bounty") {
    next.completedInteractions.push("frontier_slime_bounty_accepted");
  }
  if (event === "open_cache") {
    next.completedInteractions.push("smoke_cache_opened");
  }
  if (event === "defeat_slime") {
    next.completedInteractions.push("road_slime_defeated");
    next.encounterState.slime = "dead";
  }
  if (event === "inspect_wagon") {
    next.completedInteractions.push("frontier_broken_wagon_inspected");
    next.inventoryPreview["Map Scrap"] = (next.inventoryPreview["Map Scrap"] || 0) + 1;
  }
  if (event === "report_to_boone") {
    next.completedInteractions.push("old_road_survey_unlocked");
  }
}

export function getPhaseView(phase) {
  const copy = copyFor(phase);
  return {
    phase: LOOP_PHASES.includes(phase) ? phase : "spawn",
    label: copy.label,
    objectiveText: copy.text,
    objectiveMeta: copy.meta,
    activeTargetKind: copy.targetKind,
    promptText: copy.prompt,
  };
}

export function transitionLoopPhase(state, event) {
  const safeState = state || createInitialLoopState();
  const current = LOOP_PHASES.includes(safeState.phase) ? safeState.phase : "spawn";
  const nextPhase = TRANSITIONS[current]?.[event] || current;
  const next = cloneState({ ...safeState, phase: nextPhase });
  if (nextPhase !== current) applySideEffects(next, event);
  return next;
}

export function createInitialLoopState(overrides = {}) {
  return {
    phase: overrides.phase || "spawn",
    inventoryPreview: { ...(overrides.inventoryPreview || {}) },
    completedInteractions: [...(overrides.completedInteractions || [])],
    encounterState: {
      slime: "idle",
      playerHp: 40,
      ...(overrides.encounterState || {}),
    },
  };
}

export function createLoopStateMachine(overrides = {}) {
  let state = createInitialLoopState(overrides);

  function snapshot() {
    const view = getPhaseView(state.phase);
    return {
      ...cloneState(state),
      activePrompt: view.promptText,
      activeTargetKind: view.activeTargetKind,
      objectiveText: view.objectiveText,
      objectiveLabel: view.label,
      objectiveMeta: view.objectiveMeta,
    };
  }

  return {
    transition(event) {
      state = transitionLoopPhase(state, event);
      return snapshot();
    },
    isTargetEnabled(target) {
      return Boolean(target && target.kind === getPhaseView(state.phase).activeTargetKind);
    },
    getPromptForTarget(target) {
      return this.isTargetEnabled(target) ? getPhaseView(state.phase).promptText : "";
    },
    get phase() {
      return state.phase;
    },
    get state() {
      return snapshot();
    },
  };
}
