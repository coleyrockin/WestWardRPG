// Footfall-dust emission cadence (pure; unit-tested in tests/render3d-foot-dust.test.ts).
// The visual pool lives in spike.js; this is just the per-frame decision so it can be
// covered without the renderer.
//
// Accumulates travelled distance and emits one puff once `stride` is crossed. A
// teleport (respawn / beat jump / resume) appears as a huge single-frame delta —
// suppress emission and reset the accumulator so dust never trails across the jump.
export function footDustStep(dist, sinceEmit, stride) {
  if (dist > 10) return { emit: false, sinceEmit: 0 };
  const acc = sinceEmit + dist;
  return acc >= stride ? { emit: true, sinceEmit: 0 } : { emit: false, sinceEmit: acc };
}
