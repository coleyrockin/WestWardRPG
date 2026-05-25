// Type declarations for interactionSystem.js. Mirrors the JS exports.

export const INTERACTABLE_KINDS: ReadonlyArray<string>;

export function pickNearest(
  playerPos: { x: number; z: number } | null | undefined,
  worldObjects: any[] | null | undefined,
): any | null;

export function promptFor(target: any | null): string;

export interface CreateInteractionSystemOptions {
  worldObjects?: any[];
  setPromptText?: (text: string) => void;
  document?: any;
}

export interface InteractionSystem {
  update(playerPos: { x: number; z: number }): void;
  registerHandler(kind: string, fn: (target: any) => void): void;
  dispose(): void;
  readonly nearest: any | null;
}

export function createInteractionSystem(opts?: CreateInteractionSystemOptions): InteractionSystem;
