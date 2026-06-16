// Type declarations for gameState.js — the 3D build's RPG state tree
// (wiring layer over jobBoard / lootSystem / progressionSystem / npcMemory).

export const REGION_ID: "frontier";
export const PLAYER_NAME: string;
export const PLAYER_CLASS: string;
export const XP_START: number;
export const XP_GROWTH: number;
export const XP_FLAT: number;

export type FactionId = "helios" | "tally" | "freeholder" | "circuit" | "civic";
export const FACTION_IDS: FactionId[];

export type FactionRep = Record<FactionId, number>;

export interface GamePlayer {
  name: string;
  className: string;
  level: number;
  xp: number;
  nextXp: number;
  gold: number;
}

export interface JobBoardState {
  activeJobId: string | null;
  completedJobIds: string[];
  progressByJobId: Record<string, { status: string; count: number; rewardClaimed: boolean }>;
}

export interface LootState {
  recentDrops: Array<{ source: string; regionId: string; summary: string }>;
  totalDrops: number;
  gearFinds: number;
}

export interface NpcMemoryState {
  byNpc: Record<string, Record<string, unknown> & { greetings: number; recentJobId: string | null }>;
  recentEvents: Array<Record<string, unknown>>;
}

export interface GameState {
  player: GamePlayer;
  inventory: Record<string, number>;
  progression: Record<string, unknown> & { identity?: unknown; equipment?: unknown };
  world: { jobs: JobBoardState; loot: LootState };
  npcMemory: NpcMemoryState;
  executorCompliance: unknown;
  factionRep: FactionRep;
  executorApproval: number;
}

export function makeRng(seed?: number): () => number;
export function createGameState(): GameState;
export function normalizeGameState(source?: unknown): GameState;
export function grantXp(state: GameState, amount: number): { levelsGained: number; level: number; upgradePointsGained: number };
export function grantGold(state: GameState, amount: number): number;
export function grantInventoryItems(
  state: GameState,
  items: Record<string, number> | null | undefined,
): Array<{ name: string; count: number }>;
export function boardChoices(state: GameState): Array<Record<string, unknown>>;
export function acceptStarterJob(state: GameState, opts?: { time?: number }): Record<string, unknown> & { ok: boolean };
export function recordSlimeKill(state: GameState): Record<string, unknown> & { ok: boolean; completed: boolean };
export function lootBeat(
  state: GameState,
  opts?: { source?: "cache" | "wagon" | "slime"; rng?: () => number },
): { drop: { summary: string; gold: number; items: Record<string, number> }; gold: number; gearFinds: number };
export function claimBoardReward(
  state: GameState,
  opts?: { at?: number },
): Record<string, unknown> & { ok: boolean; levelsGained: number };
export function recordNpcGreeting(state: GameState, npcId: string, opts?: { at?: number }): Record<string, unknown>;
export function activeJobLine(
  state: GameState,
): { title: string; progressLabel: string; ready: boolean; hint: string } | null;
export function playerHudView(state: GameState): {
  name: string;
  subtitle: string;
  gold: number;
  xp: number;
  nextXp: number;
  xpRatio: number;
};
export function adjustFactionRep(state: GameState, faction: string, delta: number): number;
export function adjustExecutorApproval(state: GameState, delta: number): number;
export function buildGameSaveSlice(
  state: GameState,
): Record<string, unknown> & { factionRep: FactionRep; executorApproval: number };
export function hydrateGameState(slice?: unknown): GameState;
export function reconcileWithLoopPhase(
  state: GameState,
  loopState?: { phase?: string; routeBeats?: Record<string, unknown> },
): { accepted: boolean; kills: number; claimed: boolean };
export function tradeWithVendor(
  state: GameState,
  opts?: { vendorId?: string; item?: string; mode?: "buy" | "sell" },
): { ok: boolean; reason: string | null; gold: number; owned: number };
