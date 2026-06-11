// Seeded RNG — a stateful drop-in for Math.random.
//
// Loop sub-steps and feature modules take an injectable `rng` (default
// Math.random, so shipped behavior is unchanged). Inject createSeededRandom(seed)
// to make a slice deterministic — for tests, daily-seed runs, or replay.
//
// Same mulberry32 algorithm as the experimental src/game/rng.js, but in the
// mutable () => number form the imperative loop needs (game/rng.js is the pure
// functional form for the event-sourced sim core). A given seed produces an
// identical stream in both, so they are interchangeable.

export function createSeededRandom(seed = 1) {
  // Avoid the degenerate all-zero state, matching game/rng.js.
  let s = (seed >>> 0) || 0x9e3779b9;
  return function rng() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
