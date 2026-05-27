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

export function createEncounterSystem(scene?: any, snapshot?: any, options?: {
  worldObjects?: any[];
  slimePlacement?: any;
  slimeMesh?: any;
  aggroRadius?: number;
  attackRadius?: number;
  strikeRadius?: number;
  getPhase?: () => string | null;
  onSlimeEngage?: (event: any) => void | boolean;
  onSlimeAttack?: (event: any) => void | boolean;
  onSlimeDeath?: (event: any) => void;
}): {
  update(playerPos: { x: number; z: number }, dt?: number): {
    slime: SlimeState;
    distance: number;
    engaged: boolean;
    disposed: boolean;
  };
  engage(): {
    slime: SlimeState;
    distance: number;
    engaged: boolean;
    disposed: boolean;
  };
  strike(playerPos: { x: number; z: number }): boolean;
  dispose(): void;
  getState(playerPos?: { x: number; z: number } | null): {
    slime: SlimeState;
    distance: number;
    engaged: boolean;
    disposed: boolean;
  };
};
