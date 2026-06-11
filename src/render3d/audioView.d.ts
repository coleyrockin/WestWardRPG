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

// R1.4 — wind cutoff + gust schedule
export function windCutoffFor(windSpeed: number): number;

export const GUST_AUDIO_SEED: number;
export function gustAt(t: number, seed: number): 0 | 1;
export function gustWindowOpened(prevT: number, t: number, seed: number): boolean;

// R1.5 — biome pocket levels
export interface BiomePocketLevels {
  marsh: number;
  folly: number;
  ranch: number;
  saloon: number;
}
export function biomePocketLevels(x: number, y: number): BiomePocketLevels;

export const NIGHT_BED_GAINS: Readonly<Record<string, number>>;
export function nightBedGainFor(paletteKey: string): number;

export interface AudioViewUpdate {
  moving?: boolean;
  running?: boolean;
  paletteKey?: string;
  /** R1.4: 1=clear, 1.8=dust, 2.6=storm — drives whistle cutoff + gust gain */
  windSpeed?: number;
  /** R1.4: monotonic world seconds — drives seeded gust schedule */
  worldTime?: number;
  /** R1.5: world X coord — drives biome pocket cross-fades */
  playerX?: number;
  /** R1.5: world Y coord — drives biome pocket cross-fades */
  playerY?: number;
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
