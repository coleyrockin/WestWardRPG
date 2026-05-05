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

export function resolveNpcReactiveLine(npcId, memory, context = {}) {
  const safe = normalizeNpcMemoryState(memory);
  const entry = normalizeEntry(safe.byNpc[npcId]);
  const name = NPC_NAMES[npcId] || "NPC";
  const rep = context.factionRep || {};
  const completedJobIds = Array.isArray(context.completedJobIds) ? context.completedJobIds : [];
  const completedJobReaction = (COMPLETED_JOB_REACTIONS[npcId] || [])
    .find((reaction) => completedJobIds.includes(reaction.jobId));
  if (completedJobReaction) return completedJobReaction.line;

  const storyLootReaction = resolveStoryLootNpcReaction(npcId, context.inventory);
  if (storyLootReaction) return storyLootReaction.line;

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
  return null;
}
