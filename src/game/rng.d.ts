// Type declarations for rng.js — the engine's seeded, pure PRNG.

export interface RngState {
  seed: number;
}

export interface RngDraw {
  value: number;
  state: RngState;
}

export function createRng(seed?: number): RngState;
export function nextRng(state: RngState): RngDraw;
export function rngRange(state: RngState, min: number, max: number): RngDraw;
export function rngInt(state: RngState, maxExclusive: number): RngDraw;
