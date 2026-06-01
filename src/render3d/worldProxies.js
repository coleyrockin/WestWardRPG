// World collision proxies for the Three.js spike.
//
// Milestone 3B step 2 (docs/roadmap.md). Translates the scene's per-kind
// placement records (from buildFrontierPlacements) into a flat list of
// axis-aligned bounding boxes that the playerController slides against.
//
// Conventions
//   World y (placement.y) maps to 3D Z. So a proxy's AABB lives in (X, Z).
//   Footprints intentionally match the visual builders in spike.js — when a
//   building looks 1.3×1.3 you can't walk through the middle of it.
//   Roads (path markers) and the road slime have no proxy: roads don't block,
//   the slime gets soft proximity handling in encounterSystem (Step 6).

const PLAYER_RADIUS_DEFAULT = 0.3;

// (placement, w, d) → AABB. `source` is preserved so debug overlays can map
// back to the original placement record.
function box(p, w, d) {
  return {
    minX: p.x - w / 2,
    maxX: p.x + w / 2,
    minZ: p.y - d / 2,
    maxZ: p.y + d / 2,
    source: p,
  };
}

// kind → footprint(placement) → AABB. Return null for placements with no
// physical presence. Sizes track the per-kind builders in spike.js so the
// collision feels honest at hero-camera height.
const FOOTPRINTS = {
  town:        (p) => box(p, 1.3 * p.size, 1.3 * p.size),
  ranch:       (p) => box(p, 1.3 * p.size, 1.3 * p.size),
  gate:        (p) => box(p, 1.0, 1.0),
  watchtower:  (p) => box(p, 1.1, 1.1),
  landmark:    (p) => box(p, 1.1, 1.1),
  fence:       (p) => box(p, 1.6 * p.size + 0.6, 0.25),
  sign:        (p) => box(p, 0.3, 0.3),
  road:        null,                            // road markers are visual only
  roadPlank:   null,
  roadRut:     null,
  lamp:        (p) => box(p, 0.2, 0.2),
  lampTall:    (p) => box(p, 0.24, 0.24),
  lampLow:     (p) => box(p, 0.2, 0.2),
  jobBoard:    (p) => box(p, 1.55, 0.4),
  roadSign:    (p) => box(p, 0.4, 0.4),
  townBark:    null,
  smokeCache:  (p) => box(p, 0.72, 0.54),
  slimeTell:   null,
  marshCluster:null,
  brokenWagon: (p) => box(p, 1.6, 1.0),
  wagonSalvage:(p) => box(p, 1.1 * p.size, 0.8 * p.size),
  brokenFence: (p) => box(p, 1.4 * p.size, 0.28 * p.size),
  roadSlime:   null,                            // soft collision lives in encounterSystem
  cart:        (p) => box(p, 0.6 * p.size, 0.6 * p.size),
  crate:       (p) => box(p, 0.6 * p.size, 0.6 * p.size),
  // --- bigger-world expansion (zone props) ---
  mesa:        (p) => box(p, 3.2 * p.size, 3.2 * p.size),
  mesaSilhouette: (p) => box(p, 3.2 * p.size, 3.2 * p.size),
  mesaSkyline: (p) => box(p, 4.8 * p.size, 1.0 * p.size),
  cliff:       (p) => box(p, 2.4 * p.size, 1.4 * p.size),
  rock:        (p) => box(p, 0.9 * p.size, 0.9 * p.size),
  boulder:     (p) => box(p, 1.4 * p.size, 1.4 * p.size),
  cactus:      (p) => box(p, 0.5 * p.size, 0.5 * p.size),
  deadTree:    (p) => box(p, 0.6 * p.size, 0.6 * p.size),
  saloon:      (p) => box(p, 1.6 * p.size, 1.6 * p.size),
  saloonFacade:(p) => box(p, 2.6 * p.size, 1.2 * p.size),
  townFacadeWarm:  (p) => box(p, 1.8 * p.size, 0.9 * p.size),
  townFacadeStore: (p) => box(p, 1.6 * p.size, 0.9 * p.size),
  townFacadeDark:  (p) => box(p, 1.4 * p.size, 0.8 * p.size),
  storefront:  (p) => box(p, 1.3 * p.size, 1.3 * p.size),
  porch:       (p) => box(p, 1.4 * p.size, 0.5 * p.size),
  brush:       null,                            // low scrub — visual only
  sagePatch:   null,                            // low scrub — visual only
  reeds:       null,                            // marsh blades — visual only
};

// Build the full proxy list from a placements array. Unknown kinds fall
// through to a small generic box so a stray new prop can't sneak past
// collision unnoticed — preferable to silent walk-through.
export function buildProxies(placements) {
  const out = [];
  for (const p of placements || []) {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    const fn = Object.prototype.hasOwnProperty.call(FOOTPRINTS, p.kind)
      ? FOOTPRINTS[p.kind]
      : (q) => box(q, 0.6 * (q.size || 0.8), 0.6 * (q.size || 0.8));
    if (fn == null) continue;
    out.push(fn(p));
  }
  return out;
}

function inflated(aabb, r) {
  return {
    minX: aabb.minX - r,
    maxX: aabb.maxX + r,
    minZ: aabb.minZ - r,
    maxZ: aabb.maxZ + r,
  };
}

// Treat the boundary as outside — the stuck-inside fallback pushes points to
// the boundary, so re-running detection on a snapped point must not flag it
// as still inside (would oscillate the next frame).
function strictlyInside(point, aabb) {
  return (
    point.x > aabb.minX && point.x < aabb.maxX &&
    point.z > aabb.minZ && point.z < aabb.maxZ
  );
}

// Tiny nudge applied when pushing a stuck point out so the next frame's
// sweep test (which uses from.x < inf.minX) sees the player as outside.
const BOUNDARY_EPSILON = 1e-4;

// Slide-resolve a movement step against a list of AABB proxies.
//   { from, to }   — start point and intended destination in world (X, Z).
//   proxies        — AABB[] from buildProxies().
//   radius         — player capsule radius (default 0.3).
// Strategy: axis-separated sweep. Resolve X first against the existing Z,
// then resolve Z against the post-X X. A trailing stuck-inside fallback
// pushes any leftover penetration out along its smallest axis — prevents
// spawn-inside-a-proxy edge cases from trapping the player.
export function resolveCollision({ from, to }, proxies, radius = PLAYER_RADIUS_DEFAULT) {
  let x = from.x;
  let z = from.z;

  // X-axis sweep. The Z-overlap guard tests the *swept* Z interval, not
  // just from.z — a diagonal sprint step where from.z is outside but to.z is
  // inside would otherwise skip the wall and tunnel through it.
  let attemptX = to.x;
  const zLo = Math.min(from.z, to.z);
  const zHi = Math.max(from.z, to.z);
  for (const p of proxies || []) {
    const inf = inflated(p, radius);
    if (zHi <= inf.minZ || zLo >= inf.maxZ) continue;
    if (to.x > from.x && from.x < inf.minX && attemptX > inf.minX) {
      attemptX = Math.min(attemptX, inf.minX);
    } else if (to.x < from.x && from.x > inf.maxX && attemptX < inf.maxX) {
      attemptX = Math.max(attemptX, inf.maxX);
    }
  }
  x = attemptX;

  // Z-axis sweep using the post-X X (enables slide along walls). Same swept
  // X-overlap guard so the orthogonal-axis tunnel case is symmetric.
  let attemptZ = to.z;
  const xLo = Math.min(from.x, x);
  const xHi = Math.max(from.x, x);
  for (const p of proxies || []) {
    const inf = inflated(p, radius);
    if (xHi <= inf.minX || xLo >= inf.maxX) continue;
    if (to.z > from.z && from.z < inf.minZ && attemptZ > inf.minZ) {
      attemptZ = Math.min(attemptZ, inf.minZ);
    } else if (to.z < from.z && from.z > inf.maxZ && attemptZ < inf.maxZ) {
      attemptZ = Math.max(attemptZ, inf.maxZ);
    }
  }
  z = attemptZ;

  // Stuck-inside fallback. Bounded iterations — a few passes are enough to
  // resolve overlapping proxies; we'd rather give up than spin.
  for (let iter = 0; iter < 4; iter++) {
    let pushed = false;
    for (const p of proxies || []) {
      const inf = inflated(p, radius);
      if (strictlyInside({ x, z }, inf)) {
        const dxLeft = x - inf.minX;
        const dxRight = inf.maxX - x;
        const dzMin = z - inf.minZ;
        const dzMax = inf.maxZ - z;
        const min = Math.min(dxLeft, dxRight, dzMin, dzMax);
        // Push fractionally past the boundary so next-frame sweep tests
        // (strict <, >) see this point as outside the inflated extent.
        if (min === dxLeft) x = inf.minX - BOUNDARY_EPSILON;
        else if (min === dxRight) x = inf.maxX + BOUNDARY_EPSILON;
        else if (min === dzMin) z = inf.minZ - BOUNDARY_EPSILON;
        else z = inf.maxZ + BOUNDARY_EPSILON;
        pushed = true;
      }
    }
    if (!pushed) break;
  }

  return { x, z };
}
