// Pure horse-momentum model for the mounted free-roam slice.
//
// A horse moves only along its facing (no strafing), reins-turns with A/D,
// throttles with W/S, gallops while Shift is held, and carries momentum
// (eases toward a target speed via accel/decel). Mirrors the pure stepPlayer
// pattern in playerController.js so it is deterministic and node-testable.

import { forwardVector } from "./playerController.js";

export const MOUNT_GAITS = Object.freeze({
  trotSpeed: 7,    // steady cruise (u/s) — W
  gallopSpeed: 15, // top speed (u/s) — W + Shift
  accel: 9,        // u/s^2 toward a higher target speed
  decel: 12,       // u/s^2 toward a lower target speed (and to a stop)
  turnRate: 1.9,   // rad/s yaw turn from A/D reins
});

const DEFAULT_SENSITIVITY = 0.0035; // matches playerController look sensitivity

// Pure single step. state = { position:{x,z}, yaw, speed }. Returns a NEW
// { position, yaw, speed }; never mutates input.
export function stepMount({
  position,
  yaw,
  speed = 0,
  input,
  dt,
  gaits = MOUNT_GAITS,
  sensitivity = DEFAULT_SENSITIVITY,
} = {}) {
  const safeDt = Number.isFinite(dt) && dt > 0 ? dt : 0;
  const inp = input || {};

  // Heading: mouse look (cursor right → yaw decreases, same as stepPlayer) plus
  // A/D rein turn. left raises yaw, right lowers it.
  const reins = (inp.left ? 1 : 0) - (inp.right ? 1 : 0);
  const nextYaw = yaw - (inp.lookDx || 0) * sensitivity + reins * gaits.turnRate * safeDt;

  // Throttle: W forward, S brake/back. Target speed depends on the gait held.
  const throttle = (inp.forward ? 1 : 0) - (inp.back ? 1 : 0);
  const targetSpeed = throttle > 0 ? (inp.shift ? gaits.gallopSpeed : gaits.trotSpeed) : 0;

  const rate = targetSpeed > speed ? gaits.accel : gaits.decel;
  const step = Math.sign(targetSpeed - speed) * rate * safeDt;
  let nextSpeed = speed + step;
  // Don't overshoot the target in either direction.
  if (targetSpeed >= speed) nextSpeed = Math.min(nextSpeed, targetSpeed);
  else nextSpeed = Math.max(nextSpeed, targetSpeed);
  if (nextSpeed < 0) nextSpeed = 0;

  const fwd = forwardVector(nextYaw);
  return {
    position: {
      x: position.x + fwd.x * nextSpeed * safeDt,
      z: position.z + fwd.z * nextSpeed * safeDt,
    },
    yaw: nextYaw,
    speed: nextSpeed,
  };
}
