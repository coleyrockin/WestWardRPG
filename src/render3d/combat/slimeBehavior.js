// The slime as a real-time enemy: chase → telegraph (dodge window) → lunge
// (the lethal contact) → recover → chase. Pure step over (state, playerPos, dt).
// Coordinates are 3D ground plane (x, z). No RNG — fully deterministic.

export const SLIME_TUNING = {
  chaseSpeed: 1.7, // u/s toward the player while chasing
  engageRange: 2.0, // start a telegraph within this distance
  telegraphTime: 0.5, // windup before the lunge — this IS the player's dodge window
  lungeSpeed: 7.5, // u/s during the lunge dash
  lungeTime: 0.26, // lunge duration
  recoverTime: 0.6, // pause after a lunge
  contactRadius: 1.0, // lunge connects within this distance
};

export function createSlimeState(pos) {
  return { pos: { x: pos.x, z: pos.z }, mode: "idle", timer: 0, lungeDir: { x: 0, z: 1 } };
}

// Returns a NEW state plus { contact, telegraphT } for the frame. Never mutates input.
export function stepSlime(state, playerPos, dt, tuning = SLIME_TUNING) {
  const d = Number.isFinite(dt) && dt > 0 ? dt : 0;
  const s = {
    pos: { x: state.pos.x, z: state.pos.z },
    mode: state.mode,
    timer: state.timer || 0,
    lungeDir: { x: state.lungeDir.x, z: state.lungeDir.z },
  };
  let contact = false;
  const dx = playerPos.x - s.pos.x;
  const dz = playerPos.z - s.pos.z;
  const dist = Math.hypot(dx, dz) || 1e-6;
  const toPlayer = { x: dx / dist, z: dz / dist };

  if (s.mode === "idle" || s.mode === "chase") {
    if (dist <= tuning.engageRange) {
      s.mode = "telegraph";
      s.timer = 0;
    } else {
      s.mode = "chase";
      s.pos.x += toPlayer.x * tuning.chaseSpeed * d;
      s.pos.z += toPlayer.z * tuning.chaseSpeed * d;
    }
  } else if (s.mode === "telegraph") {
    s.timer += d;
    if (s.timer >= tuning.telegraphTime) {
      s.mode = "lunge";
      s.timer = 0;
      s.lungeDir = { x: toPlayer.x, z: toPlayer.z }; // lock aim at lunge start
    }
  } else if (s.mode === "lunge") {
    s.timer += d;
    s.pos.x += s.lungeDir.x * tuning.lungeSpeed * d;
    s.pos.z += s.lungeDir.z * tuning.lungeSpeed * d;
    if (dist <= tuning.contactRadius) contact = true;
    if (s.timer >= tuning.lungeTime) {
      s.mode = "recover";
      s.timer = 0;
    }
  } else if (s.mode === "recover") {
    s.timer += d;
    if (s.timer >= tuning.recoverTime) {
      s.mode = "chase";
      s.timer = 0;
    }
  }

  return { ...s, contact, telegraphT: s.mode === "telegraph" ? s.timer / tuning.telegraphTime : 0 };
}
