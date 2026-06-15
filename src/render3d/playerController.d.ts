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
  /** Target field-of-view in degrees; presets without one keep the camera's current fov. */
  fov?: number;
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
export function isCameraBlockingProxy(proxy: any): boolean;
export function avoidCameraObstacles(args?: {
  from?: { x: number; y?: number; z: number };
  desired?: { x: number; y?: number; z: number };
  proxies?: any[];
  radius?: number;
  padding?: number;
}): { x: number; y?: number; z: number };
export function stepPlayer(args: StepPlayerArgs): StepPlayerResult;

export const DODGE: { duration: number; iframes: number; speed: number };
export interface DodgeStepState {
  position: Vec2;
  dir: Vec2;
  elapsed?: number;
}
export function stepDodge(
  state: DodgeStepState,
  dt: number,
  cfg?: { duration: number; iframes: number; speed: number },
): { position: Vec2; dir: Vec2; elapsed: number; done: boolean };
export function dodgeIsInvulnerable(
  elapsed: number,
  cfg?: { duration: number; iframes: number; speed: number },
): boolean;

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
  pointerLock?: boolean;
  dragLookFallback?: boolean;
  resetKey?: string;
  resetYaw?: number | null;
}

export interface PlayerController {
  update(dt: number, proxies?: any[] | null): void;
  setPosition(position: Vec2): void;
  setCameraPreset(name: string, overrides?: Partial<CameraPreset>): void;
  /** Lock the camera gaze onto a world point (y defaults to head height), or null to restore the follow gaze. */
  setLookTarget(target: { x: number; y?: number; z: number } | null): void;
  resetCameraBehind(yaw?: number | null): void;
  releasePointerFocus(): void;
  dispose(): void;
  /** Toggle mounted mode: swaps the movement model to the horse momentum step and the saddle camera preset. */
  setMounted(on: boolean): void;
  readonly isMounted: boolean;
  /** Test-only seam: merge the given fields into the controller's internal input buffer. */
  pressForTest(partial?: PlayerInput): void;
  readonly position: Vec2;
  readonly yaw: number;
  readonly pitch: number;
  readonly isDodging: boolean;
  readonly isInvulnerable: boolean;
  readonly dodgeProgress: number;
}

export function createPlayerController(camera: any, opts?: CreatePlayerControllerOptions): PlayerController;
