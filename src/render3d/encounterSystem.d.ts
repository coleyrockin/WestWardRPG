export type SlimeState = "patrol" | "aggro" | "attack" | "dead";

export const SLIME_STATES: readonly SlimeState[];

export function getNextSlimeState(options?: {
  state?: SlimeState;
  playerPos?: { x: number; z: number } | null;
  slimePos?: { x: number; z: number } | null;
  aggroRadius?: number;
  attackRadius?: number;
}): SlimeState;

export function canStrikeSlime(options?: {
  state?: SlimeState;
  playerPos?: { x: number; z: number } | null;
  slimePos?: { x: number; z: number } | null;
  strikeRadius?: number;
}): boolean;

export interface EncounterState {
  slime: SlimeState;
  hp: number;
  maxHp: number;
  hitCount: number;
  hits: number;
  defeated: boolean;
  distance: number;
  engaged: boolean;
  playerHp: number;
  playerMaxHp: number;
  playerDefeated: boolean;
  disposed: boolean;
}

export function createEncounterSystem(scene?: any, snapshot?: any, options?: {
  worldObjects?: any[];
  slimePlacement?: any;
  slimeMesh?: any;
  aggroRadius?: number;
  attackRadius?: number;
  strikeRadius?: number;
  maxHits?: number;
  initialPlayerHp?: number;
  playerDamagePerSecond?: number;
  canDamagePlayer?: () => boolean;
  getPhase?: () => string | null;
  onSlimeEngage?: (event: any) => void | boolean;
  onSlimeAttack?: (event: any) => void | boolean;
  onSlimeHit?: (event: any) => void;
  onSlimeDeath?: (event: any) => void;
  onPlayerDeath?: (event: any) => void;
  playerInvulnerable?: () => boolean;
  lungeDamage?: number;
}): {
  update(playerPos: { x: number; z: number }, dt?: number): EncounterState;
  engage(): EncounterState;
  strike(playerPos: { x: number; z: number }): boolean;
  registerHit(): EncounterState;
  applyLungeContact(): EncounterState;
  dispose(): void;
  getState(playerPos?: { x: number; z: number } | null): EncounterState;
};
