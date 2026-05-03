import { QUEST_DEFINITIONS } from "./questDefinitions.js";

const clampAxis = (value) => Math.max(-100, Math.min(100, Math.round(value)));

export const STORY_CHAPTERS = [
  {
    id: "act1",
    title: "Dust and Debts",
    summary: "You arrive while every faction sells safety through slogans.",
  },
  {
    id: "act2",
    title: "The Ridiculous Cold War",
    summary: "Rival powers rewrite history while districts split.",
  },
  {
    id: "act3",
    title: "The Great Reckoning Hoedown",
    summary: "Control, truth, and solidarity collide in public view.",
  },
];

export const MAJOR_NPCS = {
  elder: {
    name: "Mayor Clementine \"Clem\" Rusk",
    publicPersona: "The smiling reformer",
    privateTruth: "Uses policy theater to keep panic manageable",
    comedicVoice: "Corporate pep-talks in frontier slang",
  },
  warden: {
    name: "Marshal Brickett Boone",
    publicPersona: "The protector of order",
    privateTruth: "Believes fear keeps people alive",
    comedicVoice: "Writes poems about municipal permits",
  },
  smith: {
    name: "Professor Tilly Cogwheel",
    publicPersona: "Harmless inventor",
    privateTruth: "Prototype tech reshapes town power silently",
    comedicVoice: "Treats explosions like lesson plans",
  },
  merchant: {
    name: "Reverend Jasper Quill",
    publicPersona: "Kind intermediary",
    privateTruth: "Controls rumors as market leverage",
    comedicVoice: "Blesses people while upselling necessities",
  },
  innkeeper: {
    name: "Nora \"Knuckles\" Vale",
    publicPersona: "Retired outlaw turned host",
    privateTruth: "Still connected to violent logistics networks",
    comedicVoice: "Deadpan threats wrapped in hospitality",
  },
};

export const CHOICE_LIBRARY = {
  elder: {
    id: "publish_ledger",
    prompt: "Expose the debt ledger or keep panic contained?",
    effects: {
      controlVsFreedom: -15,
      truthVsComfort: 22,
      solidarityVsStatus: 8,
      factionRep: { civicCouncil: -8, workersGuild: 12, marketCartel: -4 },
      npcAffinity: { elder: 6, merchant: -5 },
      flags: { ledgerPublished: true },
    },
    immediateLog: "You publish the books. Trust rises, stability trembles.",
  },
  warden: {
    id: "curfew_enforcement",
    prompt: "Back curfew drones or civilian patrol autonomy?",
    effects: {
      controlVsFreedom: 20,
      truthVsComfort: -8,
      solidarityVsStatus: -10,
      factionRep: { civicCouncil: 9, workersGuild: -6, marketCartel: 4 },
      npcAffinity: { warden: 10, bard: -4 },
      flags: { curfewNormalized: true },
    },
    immediateLog: "Night patrols become safer, and much less free.",
  },
  smith: {
    id: "tooling_access",
    prompt: "Open source the steam rigs or license them to elites?",
    effects: {
      controlVsFreedom: -10,
      truthVsComfort: 5,
      solidarityVsStatus: 16,
      factionRep: { civicCouncil: -4, workersGuild: 14, marketCartel: -11 },
      npcAffinity: { smith: 12, merchant: -8 },
      flags: { toolCommonsCreated: true },
    },
    immediateLog: "Productivity spikes. Profit margins scream.",
  },
};

export function createInitialNarrativeState() {
  return {
    chapterIndex: 0,
    chapter: STORY_CHAPTERS[0].id,
    chapterTitle: STORY_CHAPTERS[0].title,
    factionRep: {
      civicCouncil: 0,
      workersGuild: 0,
      marketCartel: 0,
    },
    npcAffinity: {
      elder: 0,
      warden: 0,
      smith: 0,
      merchant: 0,
      innkeeper: 0,
      bard: 0,
      cat: 0,
    },
    thematicAxes: {
      controlVsFreedom: 0,
      truthVsComfort: 0,
      solidarityVsStatus: 0,
    },
    globalFlags: {},
    decisions: [],
    questOutcomes: {},
    ending: null,
  };
}

function applyEffectBundle(narrativeState, effects = {}) {
  for (const axis of ["controlVsFreedom", "truthVsComfort", "solidarityVsStatus"]) {
    if (Number.isFinite(effects[axis])) {
      narrativeState.thematicAxes[axis] = clampAxis((narrativeState.thematicAxes[axis] || 0) + effects[axis]);
    }
  }

  for (const [faction, delta] of Object.entries(effects.factionRep || {})) {
    narrativeState.factionRep[faction] = clampAxis((narrativeState.factionRep[faction] || 0) + delta);
  }
  for (const [npc, delta] of Object.entries(effects.npcAffinity || {})) {
    narrativeState.npcAffinity[npc] = clampAxis((narrativeState.npcAffinity[npc] || 0) + delta);
  }
  for (const [flag, value] of Object.entries(effects.flags || {})) {
    narrativeState.globalFlags[flag] = value;
  }
}

export function getChapterByLevel(level) {
  if (level >= 8) return STORY_CHAPTERS[2];
  if (level >= 4) return STORY_CHAPTERS[1];
  return STORY_CHAPTERS[0];
}

export function syncChapterFromProgress(narrativeState, level) {
  const chapter = getChapterByLevel(level);
  narrativeState.chapter = chapter.id;
  narrativeState.chapterTitle = chapter.title;
  narrativeState.chapterIndex = STORY_CHAPTERS.findIndex((entry) => entry.id === chapter.id);
}

export function applyMajorDecision(narrativeState, npcId) {
  const spec = CHOICE_LIBRARY[npcId];
  if (!spec) return null;
  if (narrativeState.globalFlags[`decision_${spec.id}`]) return null;

  applyEffectBundle(narrativeState, spec.effects);

  narrativeState.globalFlags[`decision_${spec.id}`] = true;
  narrativeState.decisions.push({
    id: spec.id,
    npcId,
    prompt: spec.prompt,
    log: spec.immediateLog,
  });

  return spec;
}

export function applyQuestOutcome(narrativeState, questId, outcomeId) {
  const spec = QUEST_DEFINITIONS[questId]?.outcomes?.[outcomeId];
  if (!spec) return null;
  if (!narrativeState.questOutcomes || typeof narrativeState.questOutcomes !== "object") {
    narrativeState.questOutcomes = {};
  }
  if (narrativeState.questOutcomes[questId]) return null;

  applyEffectBundle(narrativeState, spec.effects);
  narrativeState.questOutcomes[questId] = outcomeId;
  narrativeState.decisions.push({
    id: `quest_${questId}_${outcomeId}`,
    questId,
    outcomeId,
    prompt: spec.label,
    log: spec.summary,
  });
  return spec;
}

export function resolveNarrativeEnding(narrativeState) {
  const { controlVsFreedom, truthVsComfort, solidarityVsStatus } = narrativeState.thematicAxes;
  if (controlVsFreedom > 25 && truthVsComfort < -10) {
    return {
      id: "order_without_truth",
      title: "Order Without Truth",
      summary: "The valley is safe, obedient, and quietly hollow.",
    };
  }
  if (solidarityVsStatus > 20 && truthVsComfort > 5) {
    return {
      id: "messy_commons",
      title: "Messy Commons",
      summary: "People govern together, loudly, imperfectly, and honestly.",
    };
  }
  return {
    id: "elite_rotation",
    title: "Elite Rotation",
    summary: "The slogans changed; the hierarchy mostly did not.",
  };
}

export function createDecisionRecap(narrativeState) {
  const latest = narrativeState.decisions[narrativeState.decisions.length - 1];
  if (!latest) return "No major decisions logged yet.";
  return `Decision recap: ${latest.log}`;
}

export function migrateNarrativeState(save) {
  const narrative = save.version >= 2 && save.narrative ? save.narrative : createInitialNarrativeState();
  if (!narrative.questOutcomes || typeof narrative.questOutcomes !== "object") {
    narrative.questOutcomes = {};
  }
  return narrative;
}
