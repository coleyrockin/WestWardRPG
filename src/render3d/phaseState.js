export const LOOP_PHASES = Object.freeze([
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

export const BOARD_OPTIONS = Object.freeze([
  {
    id: "accept_bounty",
    label: "Accept bounty",
    followUp: "Boone marks the cache road in lamp chalk.",
  },
  {
    id: "ask_danger",
    label: "Ask about road danger",
    followUp: "Boone warns you to watch the marsh grass before the cache.",
  },
  {
    id: "inspect_survey",
    label: "Inspect old survey",
    followUp: "A torn survey note points past the wagon toward the old road.",
  },
]);

const DEFAULT_BOARD_OPTION = BOARD_OPTIONS[0].id;
const BOARD_OPTION_IDS = new Set(BOARD_OPTIONS.map((option) => option.id));

const PHASE_COPY = {
  spawn: {
    label: "Follow the Road",
    text: "Find Boone's lit job board by the road.",
    meta: ["Target: Boone's job board", "Action: Open board"],
    targetKind: "jobBoard",
    prompt: "E — Read Boone's Board",
  },
  board_choice: {
    label: "Boone's Board",
    text: "Choose how to take Boone's first road job.",
    meta: ["Choice: Bounty, danger, or survey", "Reward: Road lead"],
    targetKind: "jobBoard",
    prompt: "E — Choose Boone's Job",
  },
  road_sign: {
    label: "Marshal Road",
    text: "Read the marshal sign where the road bends east.",
    meta: ["Target: Road sign", "Beat: Route warning"],
    targetKind: "roadSign",
    prompt: "E — Read Road Sign",
  },
  road_walk: {
    label: "Town Edge",
    text: "Hear the warning before leaving Dustward's lamp line.",
    meta: ["Target: Town edge", "Beat: Local warning"],
    targetKind: "townBark",
    prompt: "E — Hear Pearl's Warning",
  },
  cache_clue: {
    label: "Smoke Cache",
    text: "Open Smoke Cache and check what Boone's road job disturbed.",
    meta: ["Target: Smoke Cache", "Beat: Cache clue"],
    targetKind: "smokeCache",
    prompt: "E — Open Smoke Cache",
  },
  slime_tell: {
    label: "Marsh Sign",
    text: "Inspect the green trail before the Road Slime breaks cover.",
    meta: ["Target: Slime trail", "Threat: Close"],
    targetKind: "slimeTell",
    prompt: "E — Inspect Slime Trail",
  },
  slime_fight: {
    label: "Road Slime",
    text: "Strike the Road Slime before it reaches the cache road.",
    meta: ["Action: Strike until it falls", "Threat: Road Slime"],
    targetKind: "roadSlime",
    prompt: "E — Strike Road Slime",
  },
  wagon_salvage: {
    label: "Broken Wagon",
    text: "Salvage the broken wagon for whatever the slime was guarding.",
    meta: ["Action: Salvage wagon", "Reward: Map Scrap"],
    targetKind: "brokenWagon",
    prompt: "E — Salvage Wagon",
  },
  return_to_boone: {
    label: "Return To Boone",
    text: "Bring the Map Scrap back to Boone's board.",
    meta: ["Action: Return to board", "Reward: Old Road Survey"],
    targetKind: "jobBoard",
    prompt: "E — Report To Boone",
  },
  survey_teaser: {
    label: "Old Road Survey",
    text: "Old Road Survey is unlocked as the next Boone follow-up.",
    meta: ["Status: New job teased", "Next: Follow the old road"],
    targetKind: "jobBoard",
    prompt: "E — View Old Road Survey",
  },
};

const TRANSITIONS = {
  spawn: {
    board_reached: "board_choice",
    open_board: "board_choice",
  },
  board_choice: {
    choose_board: "road_sign",
    accept_bounty: "road_sign",
  },
  road_sign: {
    read_sign: "road_walk",
  },
  road_walk: {
    hear_bark: "cache_clue",
  },
  cache_clue: {
    open_cache: "slime_tell",
  },
  slime_tell: {
    spot_slime_tell: "slime_fight",
    slime_appeared: "slime_fight",
  },
  slime_fight: {
    defeat_slime: "wagon_salvage",
  },
  wagon_salvage: {
    inspect_wagon: "return_to_boone",
  },
  return_to_boone: {
    report_to_boone: "survey_teaser",
  },
  survey_teaser: {},
};

function normalizeBoardOption(optionId) {
  return BOARD_OPTION_IDS.has(optionId) ? optionId : DEFAULT_BOARD_OPTION;
}

function normalizeEvent(event) {
  if (event && typeof event === "object") {
    return { type: event.type || event.event || "", optionId: event.optionId };
  }
  return { type: event || "", optionId: null };
}

function createRouteBeats(overrides = {}) {
  return {
    boardChoice: false,
    roadSign: false,
    townBark: false,
    cacheClue: false,
    slimeTell: false,
    slimeDefeated: false,
    wagonSalvage: false,
    returnToBoone: false,
    ...(overrides || {}),
  };
}

function copyFor(phase, state = null) {
  const base = PHASE_COPY[phase] || PHASE_COPY.spawn;
  if (phase !== "cache_clue" && phase !== "return_to_boone") return base;

  const option = BOARD_OPTIONS.find((item) => item.id === state?.boardChoice);
  if (!option) return base;

  if (phase === "cache_clue") {
    return {
      ...base,
      text: option.followUp,
      meta: [base.meta[0], `Choice: ${option.label}`],
    };
  }

  return {
    ...base,
    meta: [base.meta[0], `Choice remembered: ${option.label}`],
  };
}

function cloneState(state) {
  return {
    phase: state.phase,
    boardChoice: state.boardChoice || null,
    routeBeats: createRouteBeats(state.routeBeats),
    inventoryPreview: { ...state.inventoryPreview },
    completedInteractions: [...state.completedInteractions],
    encounterState: { ...state.encounterState },
  };
}

function applySideEffects(next, event) {
  const type = event.type;
  if (type === "choose_board" || type === "accept_bounty") {
    next.boardChoice = normalizeBoardOption(event.optionId || (type === "accept_bounty" ? "accept_bounty" : null));
    next.routeBeats.boardChoice = true;
    next.completedInteractions.push(`board_choice_${next.boardChoice}`);
  }
  if (type === "read_sign") {
    next.routeBeats.roadSign = true;
    next.completedInteractions.push("marshal_road_sign_read");
  }
  if (type === "hear_bark") {
    next.routeBeats.townBark = true;
    next.completedInteractions.push("town_edge_warning_heard");
  }
  if (type === "open_cache") {
    next.routeBeats.cacheClue = true;
    next.completedInteractions.push("smoke_cache_opened");
  }
  if (type === "spot_slime_tell" || type === "slime_appeared") {
    next.routeBeats.slimeTell = true;
    next.encounterState.slime = "aggro";
    next.completedInteractions.push("slime_trail_spotted");
  }
  if (type === "defeat_slime") {
    next.routeBeats.slimeDefeated = true;
    next.completedInteractions.push("road_slime_defeated");
    next.encounterState.slime = "dead";
  }
  if (type === "inspect_wagon") {
    next.routeBeats.wagonSalvage = true;
    next.completedInteractions.push("frontier_broken_wagon_salvaged");
    next.inventoryPreview["Map Scrap"] = (next.inventoryPreview["Map Scrap"] || 0) + 1;
  }
  if (type === "report_to_boone") {
    next.routeBeats.returnToBoone = true;
    next.completedInteractions.push("old_road_survey_unlocked");
  }
}

export function getPhaseView(phase, state = null) {
  const safePhase = LOOP_PHASES.includes(phase) ? phase : "spawn";
  const copy = copyFor(safePhase, state);
  return {
    phase: safePhase,
    label: copy.label,
    objectiveText: copy.text,
    objectiveMeta: copy.meta,
    activeTargetKind: copy.targetKind,
    promptText: copy.prompt,
  };
}

export function transitionLoopPhase(state, rawEvent) {
  const safeState = state || createInitialLoopState();
  const event = normalizeEvent(rawEvent);
  const current = LOOP_PHASES.includes(safeState.phase) ? safeState.phase : "spawn";
  const nextPhase = TRANSITIONS[current]?.[event.type] || current;
  const next = cloneState({ ...safeState, phase: nextPhase });
  if (nextPhase !== current) applySideEffects(next, event);
  return next;
}

export function createInitialLoopState(overrides = {}) {
  return {
    phase: overrides.phase || "spawn",
    boardChoice: overrides.boardChoice || null,
    routeBeats: createRouteBeats(overrides.routeBeats),
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
    const view = getPhaseView(state.phase, state);
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
    chooseBoardOption(optionId) {
      state = transitionLoopPhase(state, { type: "choose_board", optionId });
      return snapshot();
    },
    isTargetEnabled(target) {
      return Boolean(target && target.kind === getPhaseView(state.phase, state).activeTargetKind);
    },
    getPromptForTarget(target) {
      return this.isTargetEnabled(target) ? getPhaseView(state.phase, state).promptText : "";
    },
    get phase() {
      return state.phase;
    },
    get state() {
      return snapshot();
    },
  };
}
