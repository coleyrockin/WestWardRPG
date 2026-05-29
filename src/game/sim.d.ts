// Type declarations for sim.js — the event-sourced simulation core.

import type { World } from "./ecs.js";

export interface SimState {
  tick: number;
  rng: { seed: number };
  playerId: number;
  world: World;
}

export type Command =
  | { type: "move"; dx: number; dz: number }
  | { type: "spawn"; kind?: string };

export interface Drawable {
  id: number;
  kind: string;
  x: number;
  z: number;
}

export interface RenderState {
  tick: number;
  drawables: Drawable[];
}

export const FIXED_DT: number;
export function hashState(state: unknown): string;
export function createInitialState(seed?: number): SimState;
export function stepSimulation(state: SimState, commands?: Command[], dt?: number): SimState;
export function runSimulation(seed: number, inputLog?: Command[][], dt?: number): SimState;
export function toRenderState(state: SimState): RenderState;
