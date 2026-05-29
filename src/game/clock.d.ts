// Type declarations for clock.js — the fixed-timestep accumulator.

export const DEFAULT_FIXED_DT: number;

export interface Clock {
  fixedDt: number;
  accumulator: number;
  tick: number;
}

export function createClock(fixedDt?: number): Clock;
export function advanceClock(
  clock: Clock,
  frameDt: number,
  maxSteps?: number,
): { clock: Clock; steps: number };
