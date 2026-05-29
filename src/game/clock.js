// Fixed-timestep accumulator for the WestWard 3D engine.
//
// Decouples simulation rate from render frame rate: the RAF shell feeds a
// variable frame dt; advanceClock() banks it and reports how many fixed sim
// steps to run this frame, carrying the remainder. Pure — the shell owns the
// loop, this owns the arithmetic. maxSteps guards the "spiral of death" when a
// tab resumes after a long stall (drop the backlog rather than chase it).

export const DEFAULT_FIXED_DT = 1 / 60;

export function createClock(fixedDt = DEFAULT_FIXED_DT) {
  return { fixedDt, accumulator: 0, tick: 0 };
}

export function advanceClock(clock, frameDt, maxSteps = 5) {
  const dt = Number.isFinite(frameDt) && frameDt > 0 ? frameDt : 0;
  let acc = clock.accumulator + dt;
  let steps = Math.floor(acc / clock.fixedDt);
  if (steps > maxSteps) {
    steps = maxSteps;
    acc = 0;
  } else {
    acc -= steps * clock.fixedDt;
  }
  return {
    clock: { fixedDt: clock.fixedDt, accumulator: acc, tick: clock.tick + steps },
    steps,
  };
}
