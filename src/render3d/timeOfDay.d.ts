// Type declarations for timeOfDay.js — the render3d time-of-day palette module.
// Pure data + blend helpers (no Three.js); atmosphere.js consumes a Palette.

export type TimeKey = "dusk" | "goldenHour" | "night";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Palette {
  key: TimeKey;
  label: string;
  sky: { top: string; mid: string; horizon: string };
  fog: { color: string; density: number };
  sun: { color: string; intensity: number; dir: Vec3; disc: number; glow: number };
  hemi: { sky: string; ground: string; intensity: number };
  rim: { color: string; intensity: number; dir: Vec3 };
  exposure: number;
  stars: number;
  bloom: number;
  grade: { tint: string; amount: number };
  bodyBg: string;
}

export const TIME_KEYS: ReadonlyArray<TimeKey>;
export const PALETTES: Readonly<Record<TimeKey, Palette>>;

export function getPalette(key: string): Palette;
export function nextTimeKey(key: string): TimeKey;
export function lerpColor(h1: string, h2: string, t: number): string;
export function lerpPalette(p1: Palette, p2: Palette, t: number): Palette;
