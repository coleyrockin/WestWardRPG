// Seeded wind-gust schedule — pure and deterministic so the tumbleweed speed
// burst (R1.2) and the audio gust burst (R1.4) fire as ONE event read off the
// same world clock. No state: strength is a pure function of (time, seed), so
// consumers can't drift apart and the schedule survives pause/resume for free.
//
// A gust window opens once per period (18–28 s, seeded per consumer), lasts
// GUST_DURATION seconds, and eases 0→1→0 inside the window.

const hash01 = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export const GUST_DURATION = 1.2;

// Seconds between gust-window openings for this seed (constant per seed).
export function gustPeriod(seed) {
  return 18 + hash01(seed) * 10;
}

// Gust strength [0,1] at world-time t for this seed; 0 outside the window.
// Sine ease-in-out across the window so motion and audio swell, not snap.
export function gustAt(t, seed) {
  if (!Number.isFinite(t) || t < 0) return 0;
  const period = gustPeriod(seed);
  const offset = hash01(seed * 1.91) * period;
  const local = (t + offset) % period;
  if (local >= GUST_DURATION) return 0;
  return Math.sin((local / GUST_DURATION) * Math.PI);
}
