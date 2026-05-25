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
  lamp:        (p) => box(p, 0.2, 0.2),
  jobBoard:    (p) => box(p, 1.55, 0.4),
  smokeCache:  (p) => box(p, 0.72, 0.54),
  brokenWagon: (p) => box(p, 1.4, 0.8),
  roadSlime:   null,                            // soft collision lives in encounterSystem
  cart:        (p) => box(p, 0.6 * p.size, 0.6 * p.size),
  crate:       (p) => box(p, 0.6 * p.size, 0.6 * p.size),
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

function strictlyInside(point, aabb) {
  return (
    point.x > aabb.minX && point.x < aabb.maxX &&
    point.z > aabb.minZ && point.z < aabb.maxZ
  );
}

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

  // X-axis sweep. For each proxy whose Z extent overlaps the current row,
  // snap attemptX to the wall the path is crossing. Sweep (not endpoint)
  // testing prevents tunneling at sprint speed.
  let attemptX = to.x;
  for (const p of proxies || []) {
    const inf = inflated(p, radius);
    if (z <= inf.minZ || z >= inf.maxZ) continue;
    if (to.x > from.x && from.x < inf.minX && attemptX > inf.minX) {
      attemptX = Math.min(attemptX, inf.minX);
    } else if (to.x < from.x && from.x > inf.maxX && attemptX < inf.maxX) {
      attemptX = Math.max(attemptX, inf.maxX);
    }
  }
  x = attemptX;

  // Z-axis sweep using the post-X X (enables slide along walls).
  let attemptZ = to.z;
  for (const p of proxies || []) {
    const inf = inflated(p, radius);
    if (x <= inf.minX || x >= inf.maxX) continue;
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
        if (min === dxLeft) x = inf.minX;
        else if (min === dxRight) x = inf.maxX;
        else if (min === dzMin) z = inf.minZ;
        else z = inf.maxZ;
        pushed = true;
      }
    }
    if (!pushed) break;
  }

  return { x, z };
}
