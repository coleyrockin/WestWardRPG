// Constraint-satisfaction side-job generator. Selects + composes side jobs
// from a handcrafted pool using current world state as constraints. Output is
// deterministic for a given daily seed — never contradicts active quest state.
//
// Anti-goal: does NOT generate dialogue, rewrite handcrafted jobs, or invent
// faction/quest content. Selects + composes from POOL only.

// ─── Handcrafted pool ────────────────────────────────────────────────────────

const POOL = [
  // Courier jobs
  { id: "side_courier_frontier_1", type: "courier", region: "frontier", factionLean: "civicCouncil",
    title: "Route Parcel to Boone", hint: "Deliver a sealed envelope before the evening patrol shifts.",
    rewardGold: 18, rewardXp: 12, conflictsWithQuests: [] },
  { id: "side_courier_ashfall_1", type: "courier", region: "ashfall", factionLean: "workersGuild",
    title: "Union Dispatch Run", hint: "Get a guild ledger to the Ashfall relay before the next shift.",
    rewardGold: 22, rewardXp: 14, conflictsWithQuests: [] },
  { id: "side_courier_ironlantern_1", type: "courier", region: "ironlantern", factionLean: "marketCartel",
    title: "Encrypted Ledger Drop", hint: "Move a cartel packet through the relay without opening it.",
    rewardGold: 30, rewardXp: 16, conflictsWithQuests: [] },

  // Bounty jobs
  { id: "side_bounty_frontier_1", type: "bounty", region: "frontier", factionLean: "civicCouncil",
    title: "Clear the Marsh Ambush", hint: "Three hostiles pinned a patrol down in the eastern marsh. End it.",
    rewardGold: 28, rewardXp: 18, conflictsWithQuests: [] },
  { id: "side_bounty_ashfall_1", type: "bounty", region: "ashfall", factionLean: "workersGuild",
    title: "Scrapyard Claim Defense", hint: "Something big moved into the guild's eastern claim. Relocate it.",
    rewardGold: 32, rewardXp: 20, conflictsWithQuests: ["ashfall_boss"] },
  { id: "side_bounty_ironlantern_1", type: "bounty", region: "ironlantern", factionLean: "marketCartel",
    title: "Signal Tower Sweep", hint: "Cartel tower crew reported an intrusion. Clear the approach.",
    rewardGold: 36, rewardXp: 22, conflictsWithQuests: ["lantern_revolt"] },

  // Salvage / survey jobs
  { id: "side_survey_frontier_1", type: "survey", region: "frontier", factionLean: "civicCouncil",
    title: "Old Road Assessment", hint: "Walk the northern trail and mark any collapsed sections.",
    rewardGold: 14, rewardXp: 10, conflictsWithQuests: [] },
  { id: "side_salvage_ashfall_1", type: "salvage", region: "ashfall", factionLean: "workersGuild",
    title: "Gear Pull from Shaft 7", hint: "Recover two crates of tools from an abandoned shaft before the next cave-in.",
    rewardGold: 20, rewardXp: 13, conflictsWithQuests: [] },
  { id: "side_salvage_ironlantern_1", type: "salvage", region: "ironlantern", factionLean: "marketCartel",
    title: "Relay Parts Recovery", hint: "Pull a signal array from a decommissioned post before it gets stripped.",
    rewardGold: 24, rewardXp: 15, conflictsWithQuests: [] },

  // Escort jobs
  { id: "side_escort_frontier_1", type: "escort", region: "frontier", factionLean: null,
    title: "Get the Tinker Home", hint: "A traveling repair-hand is too loaded down to walk alone. Clear the road.",
    rewardGold: 16, rewardXp: 11, conflictsWithQuests: [] },
  { id: "side_escort_ashfall_1", type: "escort", region: "ashfall", factionLean: "workersGuild",
    title: "Crew Safe Transit", hint: "Walk a guild crew from the eastern claim to the relay junction.",
    rewardGold: 20, rewardXp: 13, conflictsWithQuests: [] },
];

// ─── Constraint resolution ────────────────────────────────────────────────────

function murmur32(str) {
  let h = 0x9747b28c;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 0x5bd1e995);
    h ^= h >>> 15;
  }
  return (h >>> 0);
}

// Returns a seeded pseudo-random float [0,1) from a string seed.
function seededRand(seed) {
  const h = murmur32(seed);
  return (h % 10000) / 10000;
}

export function generateSideJobs(options = {}) {
  const {
    regionId = "frontier",
    factionRep = {},
    questOutcomes = {},
    dailySeed = "default",
    count = 2,
  } = options;

  // Filter pool: same region, no conflicting completed quests
  const completedQuestIds = Object.keys(questOutcomes);
  const eligible = POOL.filter((job) => {
    if (job.region !== regionId) return false;
    if (job.conflictsWithQuests.some((qid) => completedQuestIds.includes(qid))) return false;
    return true;
  });

  if (eligible.length === 0) return [];

  // Rank by faction rep alignment — jobs aligned with a high-rep faction score higher
  const ranked = eligible.map((job) => {
    let score = 0;
    if (job.factionLean && typeof factionRep[job.factionLean] === "number") {
      score = factionRep[job.factionLean] / 100;
    }
    // Deterministic tie-break via daily seed + job id
    score += seededRand(`${dailySeed}:${job.id}`) * 0.2;
    return { job, score };
  }).sort((a, b) => b.score - a.score);

  return ranked.slice(0, count).map(({ job }) => ({
    ...job,
    boardState: "available",
    hint: job.hint,
    rewardLine: `${job.rewardGold} gold · ${job.rewardXp} XP`,
    source: "generated",
  }));
}

export { POOL as SIDE_JOB_POOL };
