// Day/night cycle — pure module.
//
// Game time advances `state.world.timeOfDay` from 0 → 1 over a configurable
// real-time period (default ~10 minutes). Four phases drive a multiplicative
// tint LUT applied on top of biome grading, plus spawn-density and patrol
// scalars that hostile spawn logic can read.

export const DAY_LENGTH_SECONDS = 600; // 10 real minutes per in-game day

export const PHASES = {
  dawn: { start: 0.0, end: 0.18, label: "Dawn" },
  day:  { start: 0.18, end: 0.62, label: "Day" },
  dusk: { start: 0.62, end: 0.78, label: "Dusk" },
  night:{ start: 0.78, end: 1.0,  label: "Night" },
};

// Phase LUT — multiplicative tint applied on top of biome grading.
// r/g/b in linear-mult range; brightness <= 1 darkens the frame.
export const PHASE_TINT = {
  dawn:  { r: 1.04, g: 0.96, b: 0.86, brightness: 0.92 },
  day:   { r: 1.0,  g: 1.0,  b: 1.0,  brightness: 1.0 },
  dusk:  { r: 1.06, g: 0.84, b: 0.66, brightness: 0.86 },
  night: { r: 0.62, g: 0.66, b: 0.92, brightness: 0.55 },
};

// Hostile spawn density and patrol density modifiers per phase.
export const PHASE_SPAWN = {
  dawn:  { hostileMult: 1.0, patrolMult: 1.0 },
  day:   { hostileMult: 0.85, patrolMult: 1.2 },
  dusk:  { hostileMult: 1.15, patrolMult: 1.0 },
  night: { hostileMult: 2.0, patrolMult: 0.55 },
};

export function resolvePhase(timeOfDay) {
  const t = ((typeof timeOfDay === "number" && isFinite(timeOfDay)) ? timeOfDay : 0) % 1;
  const tt = t < 0 ? t + 1 : t;
  if (tt < PHASES.dawn.end) return "dawn";
  if (tt < PHASES.day.end) return "day";
  if (tt < PHASES.dusk.end) return "dusk";
  return "night";
}

// Linear interpolation of phase tints across phase boundaries — gives
// a smooth gradient instead of a hard switch.
function lerp(a, b, t) { return a + (b - a) * t; }

function phaseAndProgress(timeOfDay) {
  const t = ((typeof timeOfDay === "number" && isFinite(timeOfDay)) ? timeOfDay : 0) % 1;
  const tt = t < 0 ? t + 1 : t;
  const order = ["dawn", "day", "dusk", "night"];
  let activeIdx = 0;
  for (let i = 0; i < order.length; i++) {
    const p = PHASES[order[i]];
    if (tt >= p.start && tt < p.end) { activeIdx = i; break; }
  }
  const a = order[activeIdx];
  const b = order[(activeIdx + 1) % order.length];
  const p = PHASES[a];
  const span = p.end - p.start;
  const localProgress = span > 0 ? (tt - p.start) / span : 0;
  // Crossfade only in the last 25% of the active phase.
  const blendStart = 0.75;
  const blend = localProgress > blendStart
    ? (localProgress - blendStart) / (1 - blendStart)
    : 0;
  return { active: a, next: b, blend };
}

export function resolvePhaseTint(timeOfDay) {
  const { active, next, blend } = phaseAndProgress(timeOfDay);
  const A = PHASE_TINT[active];
  const B = PHASE_TINT[next];
  return {
    r: lerp(A.r, B.r, blend),
    g: lerp(A.g, B.g, blend),
    b: lerp(A.b, B.b, blend),
    brightness: lerp(A.brightness, B.brightness, blend),
  };
}

export function resolveSpawnModifier(timeOfDay) {
  const { active, next, blend } = phaseAndProgress(timeOfDay);
  const A = PHASE_SPAWN[active];
  const B = PHASE_SPAWN[next];
  return {
    hostileMult: lerp(A.hostileMult, B.hostileMult, blend),
    patrolMult: lerp(A.patrolMult, B.patrolMult, blend),
    activePhase: active,
  };
}

export function advanceTimeOfDay(world, dt, dayLength = DAY_LENGTH_SECONDS) {
  if (!world) return 0;
  const cur = typeof world.timeOfDay === "number" && isFinite(world.timeOfDay) ? world.timeOfDay : 0;
  const next = (cur + dt / dayLength) % 1;
  world.timeOfDay = next < 0 ? next + 1 : next;
  return world.timeOfDay;
}

export function ensureWorldTimeDefaults(world) {
  if (!world || typeof world !== "object") return;
  if (typeof world.timeOfDay !== "number" || !isFinite(world.timeOfDay)) {
    world.timeOfDay = 0.25; // start at mid-morning
  }
}

export function formatPhaseLabel(timeOfDay) {
  return PHASES[resolvePhase(timeOfDay)].label;
}
