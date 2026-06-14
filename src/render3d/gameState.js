// The 3D build's authoritative RPG state tree (roadmap §8 Port-ledger Tier A).
//
// One state tree, no bridge: spike.js owns a single gameState and mutates it
// through these helpers; runSave.js persists it. The renderer-agnostic modules
// (jobBoard / lootSystem / progressionSystem / npcMemory) are the rules — this
// module is only the game's wiring layer around them.
//
// Pure node-environment logic: no Three.js, no DOM — tested in
// tests/render3d-game-state.test.ts.

import {
  CANONICAL_STARTER_JOB_ID,
  createInitialJobBoardState,
  normalizeJobBoardState,
  getJobBoardChoices,
  getActiveJobSummary,
  acceptJob,
  recordJobEvent,
  claimJobReward,
} from "../jobBoard.js";
import { applyTrade } from "../shopCatalog.js";
import {
  createInitialLootState,
  normalizeLootState,
  rollLootDrop,
  applyLootDropToState,
} from "../lootSystem.js";
import { createInitialProgressionState } from "../progressionSystem.js";
import {
  createInitialNpcMemoryState,
  normalizeNpcMemoryState,
  recordNpcMemoryEvent,
} from "../npcMemory.js";

export const REGION_ID = "frontier";
export const PLAYER_NAME = "Ezra Cross";
export const PLAYER_CLASS = "Cross Heir";

// Level curve — the original tuned numbers, kept exact:
// start at nextXp 80; each level: nextXp = round(nextXp * 1.34 + 28).
export const XP_START = 80;
export const XP_GROWTH = 1.34;
export const XP_FLAT = 28;

// Deterministic PRNG (mulberry32) so loot rolls can ride the run seed.
export function makeRng(seed = 1) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createGameState() {
  return {
    player: { name: PLAYER_NAME, className: PLAYER_CLASS, level: 1, xp: 0, nextXp: XP_START, gold: 0 },
    inventory: {},
    progression: createInitialProgressionState(),
    world: {
      jobs: createInitialJobBoardState(),
      loot: createInitialLootState(),
    },
    npcMemory: createInitialNpcMemoryState(),
    executorCompliance: null,
  };
}

// Save-load normalization: every module slice goes through its own normalize*
// so a hand-edited or stale payload can't poison the run.
export function normalizeGameState(source = {}) {
  const fresh = createGameState();
  fresh.executorCompliance = source?.executorCompliance || null;
  const player = source?.player || {};
  const num = (v, fallback, min = 0) => (Number.isFinite(v) ? Math.max(min, Math.floor(v)) : fallback);
  fresh.player.level = num(player.level, 1, 1);
  fresh.player.xp = num(player.xp, 0);
  fresh.player.nextXp = num(player.nextXp, XP_START, 1);
  fresh.player.gold = num(player.gold, 0);
  if (source?.inventory && typeof source.inventory === "object") {
    for (const [name, count] of Object.entries(source.inventory)) {
      const safe = num(count, 0);
      if (typeof name === "string" && safe > 0) fresh.inventory[name] = safe;
    }
  }
  if (source?.progression && typeof source.progression === "object") {
    // progressionSystem has no normalize export; merge known keys over initial.
    const init = fresh.progression;
    const src = source.progression;
    if (src.skillTree && typeof src.skillTree === "object") {
      for (const branch of Object.keys(init.skillTree)) {
        init.skillTree[branch] = num(src.skillTree[branch], init.skillTree[branch]);
      }
    }
    init.upgradePoints = num(src.upgradePoints, init.upgradePoints);
    if (src.equipment && typeof src.equipment === "object") {
      init.equipment = {
        ...init.equipment,
        ...src.equipment,
        ownedArmorPieces: Array.isArray(src.equipment.ownedArmorPieces) ? [...src.equipment.ownedArmorPieces] : [],
        weaponFamilyTokens: Array.isArray(src.equipment.weaponFamilyTokens) ? [...src.equipment.weaponFamilyTokens] : [],
      };
    }
  }
  fresh.world.jobs = normalizeJobBoardState(source?.world?.jobs);
  fresh.world.loot = normalizeLootState(source?.world?.loot);
  fresh.npcMemory = normalizeNpcMemoryState(source?.npcMemory);
  return fresh;
}

// XP grant with the oracle's level-up loop. HP lives in the encounter system,
// so level-ups here only move level / xp / nextXp; the caller reads
// `levelsGained` to fire toasts/sfx and any encounter heal it wants. Each level
// also banks one progression upgrade point — without this the skill tree
// (canUnlockSkill gates on upgradePoints > 0) is permanently unreachable.
export function grantXp(state, amount) {
  const safe = Math.max(0, Math.floor(amount || 0));
  state.player.xp += safe;
  let levelsGained = 0;
  while (state.player.xp >= state.player.nextXp) {
    state.player.xp -= state.player.nextXp;
    state.player.level += 1;
    state.player.nextXp = Math.round(state.player.nextXp * XP_GROWTH + XP_FLAT);
    levelsGained += 1;
  }
  if (levelsGained > 0 && state.progression) {
    state.progression.upgradePoints = (state.progression.upgradePoints || 0) + levelsGained;
  }
  return { levelsGained, level: state.player.level, upgradePointsGained: levelsGained };
}

export function grantGold(state, amount) {
  state.player.gold = Math.max(0, state.player.gold + Math.floor(amount || 0));
  return state.player.gold;
}

// Real board listings for the modal (Boone is npcId "warden" in the job data).
export function boardChoices(state) {
  return getJobBoardChoices({
    regionId: REGION_ID,
    playerLevel: state.player.level,
    jobState: state.world.jobs,
    npcId: "warden",
    inventory: state.inventory,
  });
}

// Accepting at Boone's board takes the canonical starter bounty — the 3D
// first-road loop IS that job (clear the marsh road slimes, check the wagon,
// report back). Other listings become take-able when the board UI grows.
export function acceptStarterJob(state, { time = 0 } = {}) {
  return acceptJob(state.world.jobs, CANONICAL_STARTER_JOB_ID, {
    time,
    inventory: state.inventory,
  });
}

// One road-slime strike = one slime of the cluster felled (the encounter's 3
// clean hits map onto the bounty's 3 kills).
export function recordSlimeKill(state) {
  return recordJobEvent(state.world.jobs, {
    type: "kill",
    enemyType: "slime",
    behavior: "balanced",
    regionId: REGION_ID,
  });
}

// Loot beat: cache pry / wagon salvage / slime gib. Applies items + gear to the
// tree, banks the gold, and returns the drop for toast copy.
const LOOT_SOURCES = { cache: "poi_cache", wagon: "poi_camp", slime: "resource_find" };

export function lootBeat(state, { source = "cache", rng = Math.random } = {}) {
  const drop = rollLootDrop({
    source: LOOT_SOURCES[source] || "resource_find",
    regionId: REGION_ID,
    playerLevel: state.player.level,
    identity: state.progression.identity,
    rng,
  });
  const { gold, gearFinds } = applyLootDropToState({
    lootState: state.world.loot,
    inventory: state.inventory,
    progression: state.progression,
    drop,
  });
  grantGold(state, gold);
  return { drop, gold, gearFinds };
}

// Turn the bounty in at Boone's board: claim reward, bank gold + items, grant
// XP (with level-ups), and remember the completion for Boone's future greetings.
export function claimBoardReward(state, { at = 0 } = {}) {
  const claim = claimJobReward(state.world.jobs);
  if (!claim.ok || claim.failed) return { ...claim, levelsGained: 0 };
  const reward = claim.reward || { gold: 0, xp: 0, items: {} };
  grantGold(state, reward.gold || 0);
  for (const [name, count] of Object.entries(reward.items || {})) {
    const safe = Math.max(0, Math.floor(count || 0));
    if (safe > 0) state.inventory[name] = (state.inventory[name] || 0) + safe;
  }
  const { levelsGained } = grantXp(state, reward.xp || 0);
  recordNpcMemoryEvent(state.npcMemory, "warden", {
    type: "job_completed",
    jobId: claim.job?.id,
    jobTitle: claim.job?.title,
    regionId: REGION_ID,
    at,
  });
  return { ...claim, levelsGained };
}

export function recordNpcGreeting(state, npcId, { at = 0 } = {}) {
  return recordNpcMemoryEvent(state.npcMemory, npcId, { type: "greeting", regionId: REGION_ID, at });
}

// Resume reconciliation: a v1 ironman save (or hand-rolled payload) carries loop
// phase but no game slice. Replay the bounty's implied book-keeping so the job
// ledger agrees with where the run stands. Idempotent — safe on every load.
const PHASE_ORDER = [
  "spawn", "board_choice", "road_sign", "road_walk", "cache_clue",
  "slime_tell", "slime_fight", "wagon_salvage", "return_to_boone", "survey_teaser",
];

export function reconcileWithLoopPhase(state, loopState = {}) {
  const phase = typeof loopState.phase === "string" ? loopState.phase : "spawn";
  const index = Math.max(0, PHASE_ORDER.indexOf(phase));
  const jobs = state.world.jobs;
  const started = index >= PHASE_ORDER.indexOf("road_sign"); // board choice made
  const slimeDown = Boolean(loopState.routeBeats?.slimeDefeated) || index >= PHASE_ORDER.indexOf("wagon_salvage");
  const reported = index >= PHASE_ORDER.indexOf("survey_teaser");
  const touched = { accepted: false, kills: 0, claimed: false };

  if (started && !jobs.activeJobId && !jobs.completedJobIds.includes(CANONICAL_STARTER_JOB_ID)) {
    touched.accepted = acceptStarterJob(state).ok === true;
  }
  if (slimeDown && jobs.activeJobId === CANONICAL_STARTER_JOB_ID) {
    let guard = 0;
    while (guard < 3) {
      const progress = jobs.progressByJobId[CANONICAL_STARTER_JOB_ID];
      if (progress && progress.status !== "active") break;
      recordSlimeKill(state);
      touched.kills += 1;
      guard += 1;
    }
  }
  if (reported && jobs.activeJobId === CANONICAL_STARTER_JOB_ID) {
    touched.claimed = claimBoardReward(state).ok === true;
  }
  return touched;
}

// Active-job line for the HUD jobs tracker ("Marsh Slime Bounty · 2/3").
export function activeJobLine(state) {
  const summary = getActiveJobSummary(state.world.jobs);
  if (!summary) return null;
  const count = summary.progress?.count ?? 0;
  const target = summary.objective?.count ?? 0;
  return {
    title: summary.title,
    progressLabel: target > 0 ? `${count}/${target}` : "",
    ready: summary.progress?.status === "ready",
    hint: summary.hint || "",
  };
}

// Flat snapshot for the hero-panel HUD.
export function playerHudView(state) {
  const p = state.player;
  return {
    name: p.name,
    subtitle: `Level ${p.level} ${p.className}`,
    gold: p.gold,
    xp: p.xp,
    nextXp: p.nextXp,
    xpRatio: p.nextXp > 0 ? Math.min(1, p.xp / p.nextXp) : 0,
  };
}

// Save-slice round-trip (runSave payload v2 carries this under `game`).
// DEEP copy, not references: the IndexedDB write structured-clones the payload
// asynchronously, so a live reference would snapshot whatever the tree looks
// like at clone time — a later mutation (e.g. a reward claim right after an
// autosave) would leak into the "earlier" save as a mixed-time state.
export function buildGameSaveSlice(state) {
  return JSON.parse(
    JSON.stringify({
      player: state.player,
      inventory: state.inventory,
      progression: state.progression,
      world: { jobs: state.world.jobs, loot: state.world.loot },
      npcMemory: state.npcMemory,
      executorCompliance: state.executorCompliance,
    }),
  );
}

export function hydrateGameState(slice) {
  return normalizeGameState(slice || {});
}

// Vendor trade: validate and apply a single buy/sell transaction against the
// live state tree. Returns { ok, reason, gold, owned } for toast copy — the
// caller should surface reason on rejection and gold/owned for confirmation.
// Delegates validation to applyTrade (pure); applies deltas here via grantGold
// and the same inventory pattern used in claimBoardReward.
export function tradeWithVendor(state, { vendorId, item, mode } = {}) {
  const result = applyTrade({
    vendorId,
    item,
    mode,
    inventory: state.inventory,
    gold: state.player.gold,
  });
  if (!result.ok) {
    return { ok: false, reason: result.reason, gold: state.player.gold, owned: state.inventory[item] ?? 0 };
  }
  // Apply gold delta (grantGold clamps ≥ 0).
  grantGold(state, result.goldDelta);
  // Apply item delta (+1 buy, -1 sell); clamp to 0 floor.
  const prev = state.inventory[item] ?? 0;
  const next = Math.max(0, prev + result.itemDelta);
  if (next === 0) {
    delete state.inventory[item];
  } else {
    state.inventory[item] = next;
  }
  return { ok: true, reason: null, gold: state.player.gold, owned: state.inventory[item] ?? 0 };
}
