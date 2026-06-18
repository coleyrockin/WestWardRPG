// Ambient NPC wander — pure waypoint follower for townsfolk (Living World slice 3).
// Deterministic (no RNG, fixed pauses) so frozen captures stay golden-stable.
// Returns position + heading yaw (matching playerController's convention:
// forward = (-sin yaw, -cos yaw), so yaw = atan2(-dx, -dz)) + a moving flag the
// animated character uses to crossfade Idle↔Walk.

export function createWander({ waypoints, speed = 1.3, pause = 1.6 }) {
  const wp = waypoints && waypoints.length ? waypoints : [{ x: 0, z: 0 }];
  // Warn on duplicate adjacent waypoints: stepWander's `dist < 0.08` arrival guard
  // would fire forever on a zero-length leg, stalling the NPC in a silent pause loop.
  if (typeof console !== "undefined" && wp.length > 1) {
    for (let i = 0; i < wp.length; i++) {
      const a = wp[i];
      const b = wp[(i + 1) % wp.length];
      if (Math.hypot(b.x - a.x, b.z - a.z) < 0.08) {
        console.warn(`[npcWander] duplicate adjacent waypoints at index ${i} — NPC may stall`);
        break;
      }
    }
  }
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

// Night behaviour — head straight to a `home` point and idle once arrived, so the
// town stops bustling after dark (instead of looping the daytime patrol at 2am).
// Pure + deterministic; mutates w in place, returns a snapshot. Ignores w.wait (the
// NPC walks home even if mid-pause). Resuming the day loop continues from w.idx.
export function stepHome(w, home, dt) {
  const step = Number.isFinite(dt) ? dt : 0;
  const dx = home.x - w.x;
  const dz = home.z - w.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.08) {
    w.moving = false; // arrived → idle at the doorway/corner
    return snapshot(w);
  }
  const move = Math.min(dist, w.speed * step);
  w.x += (dx / dist) * move;
  w.z += (dz / dist) * move;
  w.yaw = Math.atan2(-dx / dist, -dz / dist);
  w.moving = true;
  return snapshot(w);
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
