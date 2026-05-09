import { resolveStoryLootNpcReaction } from "./storyLootReactions.js";

const NPC_NAMES = {
  elder: "Mayor Clem",
  warden: "Marshal Boone",
  smith: "Professor Cogwheel",
  merchant: "Reverend Quill",
  innkeeper: "Nora Knuckles",
  bard: "Bard Jingles",
  cat: "Whiskers the Cat",
};

// Per-NPC quest-outcome reactions for the social/dialogue surface. Vendor
// (commerce) reactions live in economyServices.js — these target the chat
// path through resolveNpcReactiveLine. Lookup priority walks late-chain
// quests first, so a finished campaign reads back its most recent decision.
// Vendors (merchant, smith) intentionally absent here so the player does
// not see double reaction lines; their outcome line comes from the vendor
// profile.
const QUEST_PRIORITY = [
  "lantern_revolt",
  "lantern_probe",
  "ashfall_boss",
  "ashfall_intro",
  "archive",
  "wood",
  "crystal",
];

const NPC_OUTCOME_REACTIONS = {
  elder: {
    archive: {
      truth: "Mayor Clem: The archive is loose. I cannot keep up with the angry letters. I think I am proud of you.",
      comfort: "Mayor Clem: We sealed the archive. The peace is real. The cost will outlive me.",
    },
    wood: {
      solidarity: "Mayor Clem: Half the town has plans for a roof now. Whatever you did, do it again.",
      status: "Mayor Clem: A private deed in your name. Your house. Your shadow on the map.",
    },
    lantern_revolt: {
      guild: "Mayor Clem: Lantern listens to the guild now. We will see what it decides to hear.",
      council: "Mayor Clem: The council brokered terms. Neat ink, ragged outcomes.",
    },
  },
  warden: {
    archive: {
      truth: "Marshal Boone: That archive going public made my job louder.",
      comfort: "Marshal Boone: Sealed archive. Town's calmer. I'll take it.",
    },
    ashfall_boss: {
      mercy: "Marshal Boone: You spared the tyrant's crew. I get witnesses, not corpses.",
      purge: "Marshal Boone: Purge cleaned Ashfall. Less paperwork. More silence.",
    },
    lantern_revolt: {
      guild: "Marshal Boone: Lantern guild backed. Patrols thinner where they organize.",
      council: "Marshal Boone: Council terms hold. Streets quiet. Watchers paid.",
    },
  },
  innkeeper: {
    wood: {
      solidarity: "Nora Knuckles: Heard your house plans went to the workers. Round on me, drifter.",
      status: "Nora Knuckles: Private deed, fancy stoop. You drink alone or with the pretty people now.",
    },
    ashfall_intro: {
      salvage: "Nora Knuckles: Open salvage means Ashfall crews come through hungry. Good for stew, bad for chairs.",
      monopoly: "Nora Knuckles: Licensed route. Same crews, fewer of them, twice the swagger.",
    },
    lantern_revolt: {
      guild: "Nora Knuckles: Guild backed. The bar gets loud arguments and louder toasts.",
      council: "Nora Knuckles: Council terms. The bar gets paperwork and quieter regulars.",
    },
  },
};

function resolveQuestOutcomeReaction(npcId, questOutcomes) {
  const table = NPC_OUTCOME_REACTIONS[npcId];
  if (!table) return null;
  if (!questOutcomes || typeof questOutcomes !== "object") return null;
  for (const questId of QUEST_PRIORITY) {
    if (!table[questId]) continue;
    const outcomeId = questOutcomes[questId];
    if (!outcomeId) continue;
    const line = table[questId][outcomeId];
    if (typeof line === "string" && line.length > 0) return line;
  }
  return null;
}

const COMPLETED_JOB_REACTIONS = {
  warden: [
    {
      jobId: "ashfall_miner_helmet_salvage",
      line: "Marshal Boone: Ashfall crews heard that helmet lamp made it back lit. That is the kind of rumor that gets people paid.",
    },
    {
      jobId: "frontier_quiet_note_trace",
      line: "Marshal Boone: Quill smiled when that note came through, which means either we learned something or he charged us for it. Maybe both.",
    },
    {
      jobId: "frontier_map_survey",
      line: "Marshal Boone: That road survey helps. A marked road keeps families from learning geography by panic.",
    },
    {
      jobId: "frontier_badge_return",
      line: "Marshal Boone: Returning that badge did more than tidy a drawer. People saw the town remember its own.",
    },
  ],
  merchant: [
    {
      jobId: "frontier_quiet_note_trace",
      line: "Reverend Quill: A copied note is still a note, friend. Ink doubles faster than guilt.",
    },
  ],
  smith: [
    {
      jobId: "ashfall_miner_helmet_salvage",
      line: "Professor Cogwheel: A miner helmet with fresh slag dust is a contract written in dents. Bring me the parts before they become folklore.",
    },
  ],
  elder: [
    {
      jobId: "frontier_map_survey",
      line: "Mayor Clem: A surveyed road is a promise with coordinates. That is better than most promises we get.",
    },
    {
      jobId: "frontier_badge_return",
      line: "Mayor Clem: The returned badge gives the town one clean story to tell. We are short on those.",
    },
  ],
};

export function createInitialNpcMemoryState() {
  return {
    byNpc: {},
    recentEvents: [],
  };
}

function normalizeEntry(source = {}) {
  return {
    greetings: Number.isFinite(source?.greetings) ? Math.max(0, Math.floor(source.greetings)) : 0,
    lastOriginId: typeof source?.lastOriginId === "string" ? source.lastOriginId : null,
    lastRegionId: typeof source?.lastRegionId === "string" ? source.lastRegionId : null,
    houseUnlocked: Boolean(source?.houseUnlocked),
    recentQuestOutcome: typeof source?.recentQuestOutcome === "string" ? source.recentQuestOutcome : null,
    notableGearMilestone: typeof source?.notableGearMilestone === "string" ? source.notableGearMilestone : null,
    discoveredPoiCount: Number.isFinite(source?.discoveredPoiCount) ? Math.max(0, Math.floor(source.discoveredPoiCount)) : 0,
    recentPoiId: typeof source?.recentPoiId === "string" ? source.recentPoiId : null,
    recentPoiLabel: typeof source?.recentPoiLabel === "string" ? source.recentPoiLabel : null,
  };
}

export function normalizeNpcMemoryState(source = {}) {
  const byNpc = {};
  if (source?.byNpc && typeof source.byNpc === "object") {
    for (const [npcId, entry] of Object.entries(source.byNpc)) {
      if (typeof npcId === "string") byNpc[npcId] = normalizeEntry(entry);
    }
  }
  return {
    byNpc,
    recentEvents: Array.isArray(source?.recentEvents)
      ? source.recentEvents.filter((event) => event && typeof event === "object").slice(0, 8)
      : [],
  };
}

export function recordNpcMemoryEvent(memory, npcId, event = {}) {
  const safe = normalizeNpcMemoryState(memory);
  Object.assign(memory, safe);
  memory.byNpc[npcId] = normalizeEntry(memory.byNpc[npcId]);
  const entry = memory.byNpc[npcId];
  if (event.type === "greeting") entry.greetings += 1;
  if (typeof event.originId === "string") entry.lastOriginId = event.originId;
  if (typeof event.regionId === "string") entry.lastRegionId = event.regionId;
  if (typeof event.houseUnlocked === "boolean") entry.houseUnlocked = event.houseUnlocked;
  if (typeof event.recentQuestOutcome === "string") entry.recentQuestOutcome = event.recentQuestOutcome;
  if (typeof event.gearMilestone === "string") entry.notableGearMilestone = event.gearMilestone;
  if (event.type === "poi_discovered") {
    entry.discoveredPoiCount += 1;
    if (typeof event.poiId === "string") entry.recentPoiId = event.poiId;
    if (typeof event.poiLabel === "string") entry.recentPoiLabel = event.poiLabel;
  }
  memory.recentEvents.unshift({ npcId, type: event.type || "memory", at: event.at || 0 });
  memory.recentEvents = memory.recentEvents.slice(0, 8);
  return entry;
}

// Two-track NPC relationship system:
//   narrative.npcAffinity[npcId]  — sentiment score (-100..100) driven by
//     dialogue choices, quest outcomes, companion events. Authoritative for
//     "how does this NPC feel about the player." Read here for warmth/tone.
//   npcMemory.byNpc[npcId].greetings — visit count, incremented each E-key
//     interaction. Authoritative for "has the player met this NPC before."
//     Read here for first-meeting vs returning-player dialogue gating.
const HIGH_AFFINITY_THRESHOLD = 40;

const FIRST_MEETING_LINES = {
  elder: (name) => `${name}: A new face. I'm Mayor Clem. This town has more history than it looks — ask around before you judge it.`,
  warden: (name) => `${name}: Marshal Boone. You're not from here, I can tell. Stay on the posted roads and we'll get along fine.`,
  smith: (name) => `${name}: Professor Cogwheel. Don't let the title fool you — I fix things, not ideas. Need gear looked at?`,
  merchant: (name) => `${name}: Reverend Quill, at your service. Commerce is my congregation. What are you hauling and where are you headed?`,
  innkeeper: (name) => `${name}: Nora Knuckles. Rooms, meals, and no questions after dark. You look like you could use all three.`,
};

const HIGH_AFFINITY_LINES = {
  elder: (name) => `${name}: Good to see you again. This town's got more friends than it did yesterday — that's your doing as much as mine.`,
  warden: (name) => `${name}: You've earned some trust in this county. That's not nothing. Watch your back out there.`,
  smith: (name) => `${name}: Come back for more? Good. A craftsman works better knowing who's carrying the work.`,
  merchant: (name) => `${name}: Ah, someone worth talking to. What do you need? I'll find it if you're the one asking.`,
  innkeeper: (name) => `${name}: Always glad to see a face that isn't trouble. Your usual corner's open if you want it.`,
};

export function resolveNpcReactiveLine(npcId, memory, context = {}) {
  const safe = normalizeNpcMemoryState(memory);
  const entry = normalizeEntry(safe.byNpc[npcId]);
  const name = NPC_NAMES[npcId] || "NPC";
  const rep = context.factionRep || {};
  const affinity = (context.npcAffinity || {})[npcId] ?? 0;
  const completedJobIds = Array.isArray(context.completedJobIds) ? context.completedJobIds : [];
  const completedJobReaction = (COMPLETED_JOB_REACTIONS[npcId] || [])
    .find((reaction) => completedJobIds.includes(reaction.jobId));
  if (completedJobReaction) return completedJobReaction.line;

  const storyLootReaction = resolveStoryLootNpcReaction(npcId, context.inventory);
  if (storyLootReaction) return storyLootReaction.line;

  const outcomeLine = resolveQuestOutcomeReaction(npcId, context.questOutcomes);
  if (outcomeLine) return outcomeLine;

  if (npcId === "smith" && entry.houseUnlocked) {
    return `${name}: Your workbench is more than furniture now. Bring me salvage and we turn it into leverage.`;
  }
  if (npcId === "smith" && entry.notableGearMilestone) {
    return `${name}: I saw that ${entry.notableGearMilestone}. Good tools change the worker and the work.`;
  }
  if (npcId === "merchant" && rep.marketCartel < -10) {
    return `${name}: Word travels. Discounts do not, at least not for enemies of the ledger.`;
  }
  if (npcId === "elder" && entry.recentPoiLabel) {
    return `${name}: You found ${entry.recentPoiLabel}. Good. A town is only as alive as the places its people still remember.`;
  }
  if (npcId === "elder" && context.recentQuestOutcome) {
    return `${name}: Choices leave paperwork. Yours left ${context.recentQuestOutcome} in the margins.`;
  }
  if (entry.lastOriginId === "lantern_defector") {
    return `${name}: You carry Lantern habits in your shoulders. Try not to let them steer your hands.`;
  }
  if (entry.lastRegionId === "ashfall") {
    return `${name}: Ashfall dust is still on you. That place keeps receipts in soot.`;
  }

  // First meeting: greetings count is 0 before recordNpcMemoryEvent increments it
  if (entry.greetings === 0 && FIRST_MEETING_LINES[npcId]) {
    return FIRST_MEETING_LINES[npcId](name);
  }

  // High affinity fallback: player has invested meaningfully in this relationship
  if (affinity >= HIGH_AFFINITY_THRESHOLD && HIGH_AFFINITY_LINES[npcId]) {
    return HIGH_AFFINITY_LINES[npcId](name);
  }

  return null;
}

// Reactions to recently completed jobs, surfaced when the player re-opens a
// job board in the matching region. Extracted from jobBoard.js so NPC reaction
// content lives alongside the rest of NPC memory. jobBoard.js looks these up
// in resolveCompletedJobBoardLine().
export const COMPLETED_JOB_BOARD_LINES = {
  frontier_badge_return: {
    regionId: "frontier",
    line: "The returned badge has Boone posting deputy work with fewer whispers around it.",
  },
  frontier_map_survey: {
    regionId: "frontier",
    line: "Your old-road survey has Boone marking one route as trusted again.",
  },
  frontier_quiet_note_trace: {
    regionId: "frontier",
    line: "The traced note has Quill's quiet routes showing up in Boone's margins.",
  },
  ashfall_miner_helmet_salvage: {
    regionId: "ashfall",
    line: "Your helmet-lamp salvage check has Ashfall crews marking one shaft as workable again.",
  },
};
