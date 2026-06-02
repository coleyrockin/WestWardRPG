// Player melee swing as an explicit state machine: ready → windup → active
// (hitbox live) → recovery → ready. Whiffable — a swing only damages if the hitbox
// overlaps the target during the active window, and at most once per swing. Pure
// (no Three.js); spike.js drives it and tests the hitbox against the slime.

export const ATTACK_TIMING = { windup: 0.12, active: 0.1, recovery: 0.18 };
export const HITBOX = { range: 2.2, halfAngle: Math.PI / 3 }; // 60° half-cone in front

// forwardVector(yaw) in playerController is { x: -sin(yaw), z: -cos(yaw) }; match it.
export function hitboxHitsTarget(playerPos, yaw, targetPos, opts = {}) {
  const range = opts.range ?? HITBOX.range;
  const halfAngle = opts.halfAngle ?? HITBOX.halfAngle;
  const dx = targetPos.x - playerPos.x;
  const dz = targetPos.z - playerPos.z;
  const dist = Math.hypot(dx, dz);
  if (dist > range) return false;
  if (dist < 1e-6) return true; // point-blank
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const dot = (dx / dist) * fx + (dz / dist) * fz;
  return Math.acos(Math.max(-1, Math.min(1, dot))) <= halfAngle;
}

export function createPlayerCombat(opts = {}) {
  const timing = { ...ATTACK_TIMING, ...(opts.timing || {}) };
  let phase = "ready"; // ready | windup | active | recovery
  let t = 0;
  let consumedHit = false;

  function tryAttack() {
    if (phase !== "ready") return false;
    phase = "windup";
    t = 0;
    consumedHit = false;
    return true;
  }
  function update(dt) {
    if (phase === "ready") return;
    t += Number.isFinite(dt) && dt > 0 ? dt : 0;
    if (phase === "windup" && t >= timing.windup) {
      phase = "active";
      t -= timing.windup;
    }
    if (phase === "active" && t >= timing.active) {
      phase = "recovery";
      t -= timing.active;
    }
    if (phase === "recovery" && t >= timing.recovery) {
      phase = "ready";
      t = 0;
    }
  }
  // Call each active-window frame the hitbox overlaps the target; true once per swing.
  function tryRegisterHit() {
    if (phase !== "active" || consumedHit) return false;
    consumedHit = true;
    return true;
  }
  return {
    tryAttack,
    update,
    tryRegisterHit,
    get phase() {
      return phase;
    },
    get isHitboxLive() {
      return phase === "active";
    },
    get isAttacking() {
      return phase !== "ready";
    },
    get windupProgress() {
      return phase === "windup" ? t / timing.windup : phase === "ready" ? 0 : 1;
    },
  };
}
