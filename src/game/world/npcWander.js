// Ambient NPC wander — pure waypoint follower for townsfolk (Living World slice 3).
// Deterministic (no RNG, fixed pauses) so frozen captures stay golden-stable.
// Returns position + heading yaw (matching playerController's convention:
// forward = (-sin yaw, -cos yaw), so yaw = atan2(-dx, -dz)) + a moving flag the
// animated character uses to crossfade Idle↔Walk.

export function createWander({ waypoints, speed = 1.3, pause = 1.6 }) {
  const wp = waypoints && waypoints.length ? waypoints : [{ x: 0, z: 0 }];
  return {
    waypoints: wp,
    idx: 0,
    x: wp[0].x,
    z: wp[0].z,
    yaw: 0,
    wait: pause,
    speed,
    pause,
    moving: false,
  };
}

function snapshot(w) {
  return { x: w.x, z: w.z, yaw: w.yaw, moving: w.moving };
}

// Advance one step. Mutates w in place (cheap per-frame), returns a snapshot.
export function stepWander(w, dt) {
  const step = Number.isFinite(dt) ? dt : 0;
  if (w.wait > 0) {
    w.wait -= step;
    w.moving = false;
    return snapshot(w);
  }
  const n = w.waypoints.length;
  const target = w.waypoints[(w.idx + 1) % n];
  const dx = target.x - w.x;
  const dz = target.z - w.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.08) {
    w.idx = (w.idx + 1) % n;
    w.wait = w.pause;
    w.moving = false;
    return snapshot(w);
  }
  const move = Math.min(dist, w.speed * step);
  w.x += (dx / dist) * move;
  w.z += (dz / dist) * move;
  w.yaw = Math.atan2(-dx / dist, -dz / dist);
  w.moving = true;
  return snapshot(w);
}
