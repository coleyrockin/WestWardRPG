import { PLAYER_MAX_HP } from "./encounterSystem.js";

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

export function getPhaseProgress(phase, activeMission = null) {
  const phases = getLoopPhases(activeMission);
  const safePhase = phases.includes(phase) ? phase : phases[0];
  const index = phases.indexOf(safePhase);
  const total = phases.length;
  return {
    phase: safePhase,
    index,
    step: index + 1,
    total,
    ratio: total <= 1 ? 1 : index / (total - 1),
    label: `${index + 1}/${total}`,
  };
}

export const BOARD_OPTIONS = Object.freeze([
  {
    id: "accept_bounty",
    label: "Accept bounty",
    followUp: "Boone chalks the cache road and rings the broken wagon at the marsh end — that wreck is your salvage.",
    returnLine: "Boone counts the bounty and pins your Map Scrap beside the old survey.",
  },
  {
    id: "ask_danger",
    label: "Ask about road danger",
    followUp: "Boone says the slime nests by the broken wagon — clear it before you salvage the wreck.",
    returnLine: "Boone marks the marsh warning in red and circles the safe road home.",
  },
  {
    id: "inspect_survey",
    label: "Inspect old survey",
    followUp: "A torn survey note points past the wagon toward the old road.",
    returnLine: "Boone matches your scrap to the Old Road Survey and opens the next job.",
  },
]);

const DEFAULT_BOARD_OPTION = BOARD_OPTIONS[0].id;
const BOARD_OPTION_IDS = new Set(BOARD_OPTIONS.map((option) => option.id));

export function getLoopPhases(activeMission = null) {
  if (activeMission === "dust_to_dust") {
    return [
      "funeral",
      "implant",
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
    ];
  }
  return [...LOOP_PHASES];
}

const PHASE_COPY = {
  funeral: {
    label: "Dust to Dust",
    text: "Attend Abram Cross's burial at the gravesite.",
    meta: ["Target: Abram's casket", "Action: Attend funeral"],
    targetKind: "gravesite",
    prompt: "E — Attend Abram's Funeral",
  },
  implant: {
    label: "Neural Sync",
    text: "Sync with the neural ghost implant from the casket.",
    meta: ["Executor implant connection active", "Action: Sync neural interface"],
    targetKind: "gravesite",
    prompt: "E — Sync Neural Implant",
  },
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
    text: "Hear the warning before leaving Westward's lamp line.",
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
    text: "Green trail to the broken wagon — inspect it before the Road Slime breaks cover.",
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
    text: "The wagon the slime was guarding — pry the strongbox for the map scrap Boone wants.",
    meta: ["The slime died guarding this wreck", "Action: Salvage wagon", "Reward: Map Scrap"],
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
  funeral: {
    attend_funeral: "implant",
  },
  implant: {
    install_implant: "spawn",
  },
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
    funeral: false,
    implant: false,
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
    text: option.returnLine,
    meta: [base.meta[0], `Choice remembered: ${option.label}`],
  };
}

function cloneState(state) {
  return {
    activeMission: state.activeMission || null,
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
  if (type === "attend_funeral") {
    next.routeBeats.funeral = true;
    next.completedInteractions.push("funeral_attended");
  }
  if (type === "install_implant") {
    next.routeBeats.implant = true;
    next.completedInteractions.push("implant_installed");
  }
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
    next.encounterState.slimeHp = 3;
    next.encounterState.slimeHits = 0;
    next.encounterState.slimeDefeated = false;
    next.completedInteractions.push("slime_trail_spotted");
  }
  if (type === "defeat_slime") {
    next.routeBeats.slimeDefeated = true;
    next.completedInteractions.push("road_slime_defeated");
    next.encounterState.slime = "dead";
    next.encounterState.slimeHp = 0;
    next.encounterState.slimeHits = 3;
    next.encounterState.slimeDefeated = true;
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
  const phases = getLoopPhases(state?.activeMission);
  const safePhase = phases.includes(phase) ? phase : phases[0];
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
  const phases = getLoopPhases(safeState.activeMission);
  const current = phases.includes(safeState.phase) ? safeState.phase : phases[0];
  const nextPhase = TRANSITIONS[current]?.[event.type] || current;
  const next = cloneState({ ...safeState, phase: nextPhase });
  if (nextPhase !== current) applySideEffects(next, event);
  return next;
}

export function createInitialLoopState(overrides = {}) {
  const activeMission = overrides.activeMission || null;
  return {
    activeMission,
    phase: overrides.phase || (activeMission === "dust_to_dust" ? "funeral" : "spawn"),
    boardChoice: overrides.boardChoice || null,
    routeBeats: createRouteBeats(overrides.routeBeats),
    inventoryPreview: { ...(overrides.inventoryPreview || {}) },
    completedInteractions: [...(overrides.completedInteractions || [])],
    encounterState: {
      slime: "idle",
      slimeHp: 3,
      slimeHits: 0,
      slimeDefeated: false,
      playerHp: PLAYER_MAX_HP,
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
