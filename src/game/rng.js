// Seeded, fully deterministic PRNG (mulberry32) for the WestWard 3D engine.
//
// Pure + serializable: an RNG is a plain { seed } object and nextRng(state)
// returns { value, state } WITHOUT mutating its input. ALL game randomness
// (spawns, loot, wander, crits) must flow through this so the simulation stays
// a pure function of (seed, input-log) — the determinism gate. Never call
// Math.random() in sim code.

export function createRng(seed = 1) {
  // Avoid the degenerate all-zero state.
  return { seed: (seed >>> 0) || 0x9e3779b9 };
}

// Advance the stream once. Returns the float in [0,1) and the next state.
export function nextRng(state) {
  const a = (state.seed + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, state: { seed: a } };
}

// Float in [min, max).
export function rngRange(state, min, max) {
  const { value, state: next } = nextRng(state);
  return { value: min + value * (max - min), state: next };
}

// Integer in [0, maxExclusive).
export function rngInt(state, maxExclusive) {
  const { value, state: next } = nextRng(state);
  return { value: Math.floor(value * maxExclusive), state: next };
}
