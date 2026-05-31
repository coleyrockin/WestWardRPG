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

export interface CameraPreset {
  distance: number;
  height: number;
  lookHeight: number;
  lookAhead: number;
  shoulder: number;
  smoothing: number;
}

export interface CameraPose {
  camera: { x: number; y: number; z: number };
  lookAt: { x: number; y: number; z: number };
}

export function forwardVector(yaw: number): Vec2;
export function rightVector(yaw: number): Vec2;
export const CAMERA_PRESETS: Readonly<Record<string, CameraPreset>>;
export function resolveCameraPreset(name?: string | null, overrides?: Partial<CameraPreset>): CameraPreset;
export function cameraSmoothingAlpha(dt: number, smoothing?: number): number;
export function computeFollowCameraPose(args?: {
  position?: Vec2;
  yaw?: number;
  pitch?: number;
  preset?: Partial<CameraPreset>;
}): CameraPose;
export function stepPlayer(args: StepPlayerArgs): StepPlayerResult;

export interface CreatePlayerControllerOptions {
  canvas?: any;
  document?: any;
  window?: any;
  eyeHeight?: number;
  speeds?: Speeds;
  sensitivity?: number;
  thirdPerson?: boolean;
  character?: any;
  cameraPreset?: string;
  camDistance?: number | null;
  camHeight?: number | null;
  camLookHeight?: number | null;
  camLookAhead?: number | null;
  camShoulder?: number | null;
  camSmoothing?: number | null;
}

export interface PlayerController {
  update(dt: number, proxies?: any[] | null): void;
  setPosition(position: Vec2): void;
  setCameraPreset(name: string, overrides?: Partial<CameraPreset>): void;
  dispose(): void;
  readonly position: Vec2;
  readonly yaw: number;
  readonly pitch: number;
}

export function createPlayerController(camera: any, opts?: CreatePlayerControllerOptions): PlayerController;
