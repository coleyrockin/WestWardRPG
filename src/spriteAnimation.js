// Walk/idle cycle resolver for procedural character sprites.
// Pure functions: given a stable id (label/name) and the world clock, return
// phase values the renderer maps to position offsets and limb ticks.

const TAU = Math.PI * 2;

function hash01(seed) {
  if (typeof seed !== "string" || seed.length === 0) return 0;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return (h % 10000) / 10000;
}

const KIND_DEFAULTS = {
  npc:   { rate: 1.6, bobAmp: 0.012, swayAmp: 0.014, legAmp: 0.020, breathAmp: 0.018 },
  enemy: { rate: 2.4, bobAmp: 0.018, swayAmp: 0.000, legAmp: 0.000, breathAmp: 0.034 },
  pig:   { rate: 1.4, bobAmp: 0.010, swayAmp: 0.010, legAmp: 0.025, breathAmp: 0.010 },
};

export function resolveWalkCycle(input = {}) {
  const time = Number.isFinite(input.time) ? input.time : 0;
  const kind = typeof input.kind === "string" ? input.kind : "npc";
  const defaults = KIND_DEFAULTS[kind] || KIND_DEFAULTS.npc;
  const rate = Number.isFinite(input.rate) ? input.rate : defaults.rate;
  const moving = input.moving !== false;
  const offset = hash01(input.id || "") * TAU;
  const speedMul = moving ? 1 : 0.35;

  const phase = time * rate * speedMul + offset;
  const bobBase = Math.sin(phase * 2);                      // up-down
  const swayBase = Math.sin(phase + Math.PI / 4);           // side-to-side
  const legBase = Math.sin(phase);                          // alternating leg
  const breathBase = Math.sin(time * 0.9 + offset);         // slow idle breath

  const moveScale = moving ? 1 : 0.4;
  return {
    phase,
    bob: bobBase * defaults.bobAmp * moveScale,             // multiplied by spriteHeight at use site
    swayX: swayBase * defaults.swayAmp * moveScale,         // multiplied by spriteWidth
    legPhase: legBase,                                      // -1..1, sign picks foot
    legAmp: defaults.legAmp * moveScale,
    breath: breathBase * defaults.breathAmp,                // additive scale modifier (~+/-2-3%)
    moving,
  };
}

export function resolveAttackCycle(input = {}) {
  const wind = Number.isFinite(input.windupTimer) ? input.windupTimer : 0;
  const max = Number.isFinite(input.windupMax) && input.windupMax > 0 ? input.windupMax : 0;
  if (wind <= 0 || max <= 0) return { active: false, ratio: 0, lunge: 0 };
  const ratio = Math.max(0, Math.min(1, wind / max));
  // 1 = fully wound, 0 = about to strike. Lunge peaks just before release.
  const lunge = (1 - ratio) ** 2;
  return { active: true, ratio, lunge };
}
