// Type declarations for audioView.js — the procedural Web Audio layer.
// Pure routing/cadence helpers up top; createAudioView is the imperative shell
// (inert until unlock() runs inside a user gesture).

export type SfxName =
  | "uiTick"
  | "chalkScratch"
  | "chime"
  | "resolveChime"
  | "creak"
  | "menace"
  | "splat"
  | "bigSplat"
  | "playerHurt"
  | "whoosh"
  | "footstep"
  | "sting";

export const SFX_NAMES: ReadonlyArray<SfxName>;
export const EVENT_SFX: Readonly<Record<string, SfxName>>;

export type LoopEvent = string | { type?: string };

export function sfxForLoopEvent(event: LoopEvent | null | undefined): SfxName | null;

export const FOOTSTEP: Readonly<{ walkInterval: number; runInterval: number }>;

export function stepFootstepClock(
  clock: number,
  dt: number,
  moving: boolean,
  running: boolean,
): { clock: number; fire: boolean };

export const WIND_LEVELS: Readonly<Record<string, number>>;
export function windLevelForPalette(key: string): number;

export interface AudioViewUpdate {
  moving?: boolean;
  running?: boolean;
  paletteKey?: string;
}

export interface AudioView {
  unlock(): boolean;
  update(dt: number, state?: AudioViewUpdate): void;
  play(name: SfxName | string): boolean;
  onLoopEvent(event: LoopEvent): boolean;
  setMuted(muted: boolean): void;
  readonly muted: boolean;
  readonly unlocked: boolean;
  dispose(): void;
}

export function createAudioView(options?: { contextFactory?: () => unknown }): AudioView;
