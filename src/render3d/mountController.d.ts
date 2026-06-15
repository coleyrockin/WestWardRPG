// Type declarations for mountController.js. Mirrors the JS exports.

import type { Vec2 } from "./playerController.js";

export interface MountGaits {
  trotSpeed: number;
  gallopSpeed: number;
  accel: number;
  decel: number;
  turnRate: number;
}

export interface MountInput {
  forward?: boolean;
  back?: boolean;
  left?: boolean;
  right?: boolean;
  shift?: boolean;
  lookDx?: number;
}

export interface StepMountArgs {
  position: Vec2;
  yaw: number;
  speed?: number;
  input?: MountInput;
  dt: number;
  gaits?: MountGaits;
  sensitivity?: number;
}

export interface StepMountResult {
  position: Vec2;
  yaw: number;
  speed: number;
}

export const MOUNT_GAITS: Readonly<MountGaits>;
export function stepMount(args?: StepMountArgs): StepMountResult;
