import { describe, it, expect } from "vitest";
import {
  XP_START,
  createGameState,
  normalizeGameState,
  grantXp,
  grantGold,
  makeRng,
  boardChoices,
  acceptStarterJob,
  recordSlimeKill,
  lootBeat,
  claimBoardReward,
  recordNpcGreeting,
  activeJobLine,
  playerHudView,
  buildGameSaveSlice,
  hydrateGameState,
  reconcileWithLoopPhase,
} from "../src/render3d/gameState.js";
import { CANONICAL_STARTER_JOB_ID, JOB_DEFINITIONS } from "../src/jobBoard.js";

describe("gameState — creation", () => {
  it("starts at the oracle's level curve origin", () => {
    const s = createGameState();
    expect(s.player.level).toBe(1);
    expect(s.player.xp).toBe(0);
    expect(s.player.nextXp).toBe(XP_START);
    expect(s.player.gold).toBe(0);
    expect(s.inventory).toEqual({});
    expect(s.world.jobs.activeJobId).toBeNull();
    expect(s.npcMemory.byNpc).toEqual({});
  });
});

describe("gameState — XP / level (oracle math: nextXp = round(nextXp*1.34+28))", () => {
  it("levels at 80 xp and grows the threshold like main.js grantXp", () => {
    const s = createGameState();
    const r = grantXp(s, 80);
    expect(r.levelsGained).toBe(1);
    expect(s.player.level).toBe(2);
    expect(s.player.xp).toBe(0);
    expect(s.player.nextXp).toBe(Math.round(80 * 1.34 + 28)); // 135
  });

  it("carries remainder xp and can multi-level in one grant", () => {
    const s = createGameState();
    grantXp(s, 80 + 135 + 10); // exactly two thresholds + 10
    expect(s.player.level).toBe(3);
    expect(s.player.xp).toBe(10);
  });

  it("ignores negative/garbage amounts", () => {
    const s = createGameState();
    grantXp(s, -50);
    expect(s.player.xp).toBe(0);
    grantGold(s, -10);
    expect(s.player.gold).toBe(0);
  });
});

describe("gameState — first-road bounty flow (accept → 3 kills → claim)", () => {
  it("lists Boone's board with the starter bounty on top", () => {
    const s = createGameState();
    const choices = boardChoices(s);
    expect(choices.length).toBeGreaterThan(0);
    expect(choices[0].id).toBe(CANONICAL_STARTER_JOB_ID);
  });

  it("runs the full loop and pays the canonical reward", () => {
    const s = createGameState();
    const accept = acceptStarterJob(s, { time: 12 });
    expect(accept.ok).toBe(true);
    expect(s.world.jobs.activeJobId).toBe(CANONICAL_STARTER_JOB_ID);

    // Three strikes = three slimes of the cluster felled.
    expect(recordSlimeKill(s).completed).toBe(false);
    expect(recordSlimeKill(s).completed).toBe(false);
    const third = recordSlimeKill(s);
    expect(third.completed).toBe(true);

    const line = activeJobLine(s);
    expect(line?.ready).toBe(true);
    expect(line?.progressLabel).toBe("3/3");

    const reward = JOB_DEFINITIONS[CANONICAL_STARTER_JOB_ID].reward;
    const claim = claimBoardReward(s, { at: 99 });
    expect(claim.ok).toBe(true);
    expect(s.player.gold).toBe(reward.gold);
    expect(s.player.xp).toBe(reward.xp); // 18 < 80, no level yet
    expect(claim.levelsGained).toBe(0);
    expect(s.inventory.Potion).toBe(1);
    expect(s.inventory["Slime Core"]).toBe(1);
    expect(s.world.jobs.completedJobIds).toContain(CANONICAL_STARTER_JOB_ID);
    expect(s.world.jobs.activeJobId).toBeNull();
    // Boone remembers the completed bounty.
    expect(s.npcMemory.byNpc.warden.recentJobId).toBe(CANONICAL_STARTER_JOB_ID);
  });

  it("refuses to claim before the bounty is ready", () => {
    const s = createGameState();
    acceptStarterJob(s);
    recordSlimeKill(s);
    const claim = claimBoardReward(s);
    expect(claim.ok).toBe(false);
    expect(s.player.gold).toBe(0);
  });

  it("kill events without an active job are inert", () => {
    const s = createGameState();
    const r = recordSlimeKill(s);
    expect(r.ok).toBe(false);
    expect(activeJobLine(s)).toBeNull();
  });
});

describe("gameState — loot beats", () => {
  it("cache pry banks gold and items deterministically under a seeded rng", () => {
    const s = createGameState();
    const r = lootBeat(s, { source: "cache", rng: makeRng(7) });
    expect(r.gold).toBeGreaterThan(0);
    expect(s.player.gold).toBe(r.gold);
    expect(Object.keys(s.inventory).length).toBeGreaterThan(0);
    expect(s.world.loot.totalDrops).toBe(1);
    expect(r.drop.summary).toContain("Frontier");

    const s2 = createGameState();
    const r2 = lootBeat(s2, { source: "cache", rng: makeRng(7) });
    expect(r2.drop).toEqual(r.drop); // same seed → same drop
  });

  it("wagon salvage uses the camp table; slime gibs the resource table", () => {
    const s = createGameState();
    lootBeat(s, { source: "wagon", rng: makeRng(3) });
    lootBeat(s, { source: "slime", rng: makeRng(4) });
    expect(s.world.loot.totalDrops).toBe(2);
    expect(s.inventory.Stone ?? 0).toBeGreaterThanOrEqual(1); // frontier resource_find always adds Stone
  });
});

describe("gameState — npc greetings", () => {
  it("counts E-key greetings per npc", () => {
    const s = createGameState();
    recordNpcGreeting(s, "warden");
    recordNpcGreeting(s, "warden");
    recordNpcGreeting(s, "innkeeper");
    expect(s.npcMemory.byNpc.warden.greetings).toBe(2);
    expect(s.npcMemory.byNpc.innkeeper.greetings).toBe(1);
  });
});

describe("gameState — HUD views", () => {
  it("hero panel view reflects live state", () => {
    const s = createGameState();
    grantGold(s, 42);
    grantXp(s, 40);
    const hud = playerHudView(s);
    expect(hud.subtitle).toBe("Level 1 Road Bounty Hunter");
    expect(hud.gold).toBe(42);
    expect(hud.xpRatio).toBeCloseTo(0.5);
  });
});

describe("gameState — save slice round-trip", () => {
  it("survives build → hydrate with full flow state intact", () => {
    const s = createGameState();
    acceptStarterJob(s);
    recordSlimeKill(s);
    lootBeat(s, { source: "cache", rng: makeRng(11) });
    recordNpcGreeting(s, "warden");

    const slice = buildGameSaveSlice(s);
    const restored = hydrateGameState(JSON.parse(JSON.stringify(slice)));
    expect(restored.player.gold).toBe(s.player.gold);
    expect(restored.world.jobs.activeJobId).toBe(CANONICAL_STARTER_JOB_ID);
    expect(restored.world.jobs.progressByJobId[CANONICAL_STARTER_JOB_ID].count).toBe(1);
    expect(restored.world.loot.totalDrops).toBe(1);
    expect(restored.npcMemory.byNpc.warden.greetings).toBe(1);
    expect(restored.inventory).toEqual(s.inventory);
  });

  it("hydrate rejects garbage into a fresh state", () => {
    const restored = hydrateGameState({ player: { level: -4, gold: "lots" }, world: { jobs: 7 } });
    expect(restored.player.level).toBe(1);
    expect(restored.player.gold).toBe(0);
    expect(restored.world.jobs.activeJobId).toBeNull();
  });

  it("hydrate(undefined) gives a fresh run", () => {
    const restored = hydrateGameState(undefined);
    expect(restored.player.level).toBe(1);
    expect(restored.player.nextXp).toBe(XP_START);
  });
});

describe("gameState — v1-save reconciliation against loop phase", () => {
  it("backfills an accepted bounty when the loop is past the board", () => {
    const s = createGameState();
    reconcileWithLoopPhase(s, { phase: "cache_clue" });
    expect(s.world.jobs.activeJobId).toBe(CANONICAL_STARTER_JOB_ID);
    expect(activeJobLine(s)?.progressLabel).toBe("0/3");
  });

  it("replays the slime kills when the loop says the slime fell", () => {
    const s = createGameState();
    reconcileWithLoopPhase(s, { phase: "wagon_salvage", routeBeats: { slimeDefeated: true } });
    expect(activeJobLine(s)?.ready).toBe(true);
  });

  it("claims the reward for a run that already reported to Boone", () => {
    const s = createGameState();
    reconcileWithLoopPhase(s, { phase: "survey_teaser" });
    expect(s.world.jobs.completedJobIds).toContain(CANONICAL_STARTER_JOB_ID);
    expect(s.player.gold).toBeGreaterThan(0);
  });

  it("is idempotent and leaves a fresh spawn untouched", () => {
    const s = createGameState();
    reconcileWithLoopPhase(s, { phase: "spawn" });
    expect(s.world.jobs.activeJobId).toBeNull();
    const mid = createGameState();
    reconcileWithLoopPhase(mid, { phase: "slime_tell" });
    const snapshot = JSON.stringify(mid);
    reconcileWithLoopPhase(mid, { phase: "slime_tell" });
    expect(JSON.stringify(mid)).toBe(snapshot);
  });
});
