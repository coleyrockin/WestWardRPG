// World clock — drives the continuous day/night arc (docs/roadmap.md §3, Bet 4).
//
// dayTime is a 0..1 phase the renderer feeds to sunArc() each frame, so the sun
// physically arcs and the palette drifts instead of hard-cutting between three
// discrete keys. Pure logic (no Three.js) so it's node-testable; the spike's RAF
// loop owns the stepping and the freeze for the golden-image gate.
//
// The discrete dev/test API (setTimeOfDay/getTimeOfDay/cycleTimeOfDay) is
// preserved by mapping the three palette keys to fixed dayTime positions and
// pausing auto-advance when a key is pinned.

// Same order as sunArc's ARC_KEYS; positions are the segment anchors.
export const CYCLE_KEYS = Object.freeze(["day", "goldenHour", "dusk", "night"]);
const KEY_POS = Object.freeze({ day: 0, goldenHour: 1 / 4, dusk: 1 / 2, night: 3 / 4 });

const wrap01 = (t) => (((Number(t) || 0) % 1) + 1) % 1;

// Boot at full daylight (first impressions live here), one cycle every ~7
// minutes — a play session drifts day → golden hour instead of racing through
// dusk into night murk (the old 3-minute cycle booted AT dusk).
export function createWorldClock({ dayTime = 0, speed = 1 / 420, paused = false } = {}) {
  return { dayTime: wrap01(dayTime), speed, paused };
}

// Advance the clock by dt seconds (no-op when paused/frozen). Returns dayTime.
export function tickClock(clock, dt) {
  if (!clock.paused && Number.isFinite(dt)) {
    clock.dayTime = wrap01(clock.dayTime + dt * clock.speed);
  }
  return clock.dayTime;
}

export function keyToDayTime(key) {
  return KEY_POS[key] ?? KEY_POS.dusk;
}

// Nearest cycle key to a dayTime, by circular distance.
export function dayTimeToKey(dayTime) {
  const t = wrap01(dayTime);
  let best = "dusk";
  let bestDist = Infinity;
  for (const k of CYCLE_KEYS) {
    const raw = Math.abs(t - KEY_POS[k]);
    const dist = Math.min(raw, 1 - raw);
    if (dist < bestDist) {
      bestDist = dist;
      best = k;
    }
  }
  return best;
}

// Pin to a discrete key and pause auto-advance (dev/test + the ?visual freeze).
export function pinClock(clock, key) {
  clock.dayTime = keyToDayTime(key);
  clock.paused = true;
  return clock.dayTime;
}

// Advance to the next key in the cycle and pin there.
export function cycleClock(clock) {
  const i = CYCLE_KEYS.indexOf(dayTimeToKey(clock.dayTime));
  const next = CYCLE_KEYS[(i + 1) % CYCLE_KEYS.length];
  pinClock(clock, next);
  return next;
}
