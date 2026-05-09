// Game state type hierarchy. Subtrees are typed incrementally — start here
// when converting a module to TypeScript. Each type maps to a top-level key
// on the GameState object constructed in main.js.

import type { UiModalState } from "./uiModals.js";

// ─── UI ──────────────────────────────────────────────────────────────────────

export interface UiState {
  modals: UiModalState;
}

// ─── Player ──────────────────────────────────────────────────────────────────

export interface PlayerLoadout {
  weapon: string;
  stance: string;
}

export interface QuickUtilityState {
  active: string;
  inventory: Record<string, number>;
}

export interface PlayerState {
  x: number;
  y: number;
  angle: number;
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  nextXp: number;
  stamina: number;
  gold: number;
  attackCooldown: number;
  hurtCooldown: number;
  chargeAttackWindup: number;
  chargeAttackWindupMax: number;
  walkBob: number;
  inHouse: boolean;
  regionInterior: string | null;
  blocking: boolean;
  guardBroken: boolean;
  guardBrokenTimer: number;
  parryChainTimer: number;
  comboStep: number;
  comboWindow: number;
  swingTimer: number;
  swingDuration: number;
  hitPulse: number;
  cameraKick: number;
  screenShake: number;
  weaponSway: number;
  deaths: number;
  loadout: PlayerLoadout;
  quickUtility: QuickUtilityState;
  perks: string[];
  combatProfile: any;
}

// ─── World ───────────────────────────────────────────────────────────────────

export type Difficulty = "beginner" | "standard" | "hard";

export interface WorldState {
  timeOfDay: number;
  difficulty: Difficulty;
  companionId: string | null;
  companionHp: number | null;
  companionDowned: boolean;
  companionRecoveryTimer: number;
  runStats: any;
  loot: any;
  jobs: any;
  roadRoute: string | null;
}

// ─── Narrative ───────────────────────────────────────────────────────────────

export type FactionId = "civicCouncil" | "workersGuild" | "marketCartel";
export type NpcId = "elder" | "warden" | "smith" | "merchant" | "innkeeper" | "bard";
export type ThematicAxis = "solidarityVsStatus" | "controlVsFreedom" | "truthVsComfort";

export interface NarrativeState {
  factionRep: Record<FactionId, number>;
  npcAffinity: Record<NpcId, number>;
  thematicAxes: Record<ThematicAxis, number>;
  globalFlags: Record<string, boolean>;
  questOutcomes: Record<string, string>;
  decisions: any[];
  dialogueChoicesTaken: Record<string, boolean>;
  npcMemory: any;
}

// ─── Regions ─────────────────────────────────────────────────────────────────

export type RegionId = "frontier" | "ashfall" | "ironlantern";

export interface RegionsState {
  activeRegion: RegionId;
  unlocked: RegionId[];
  events: Record<string, any>;
  miniBosses: Record<string, boolean>;
  poisDiscovered: string[];
}

// ─── Root ────────────────────────────────────────────────────────────────────

export interface GameState {
  mode: "menu" | "playing" | "dead" | "victory";
  time: number;
  keys: Record<string, boolean>;
  mouseButtons: { left: boolean; right: boolean };
  mouseLook: number;
  showMap: boolean;
  msg: any[];
  weather: any;
  player: PlayerState;
  inventory: any;
  quests: any;
  narrative: NarrativeState;
  progression: any;
  regions: RegionsState;
  graphics: any;
  combat: { statusEffectsEnabled: boolean };
  world: WorldState;
  companion: any;
  ui: UiState;
  codex: any;
  npcs: any[];
  enemies: any[];
  floatingTexts: any[];
  pigJokeCooldown: number;
  narrativePulseTimer: number;
}
