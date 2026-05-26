// Type declarations for playerController.js. Mirrors the JS exports.

export interface Vec2 { x: number; z: number; }
export interface Speeds { walk: number; run: number; }

export interface PlayerInput {
  forward?: boolean; back?: boolean; left?: boolean; right?: boolean;
  shift?: boolean;
  lookDx?: number; lookDy?: number;
}

export interface StepPlayerArgs {
  position: Vec2;
  yaw: number;
  pitch?: number;
  input?: PlayerInput;
  dt: number;
  speeds?: Speeds;
  sensitivity?: number;
}

export interface StepPlayerResult {
  position: Vec2;
  yaw: number;
  pitch: number;
}

export function forwardVector(yaw: number): Vec2;
export function rightVector(yaw: number): Vec2;
export function stepPlayer(args: StepPlayerArgs): StepPlayerResult;

export interface CreatePlayerControllerOptions {
  canvas?: any;
  document?: any;
  window?: any;
  eyeHeight?: number;
  speeds?: Speeds;
  sensitivity?: number;
}

export interface PlayerController {
  update(dt: number, proxies?: any[] | null): void;
  dispose(): void;
  readonly position: Vec2;
  readonly yaw: number;
  readonly pitch: number;
}

export function createPlayerController(camera: any, opts?: CreatePlayerControllerOptions): PlayerController;
