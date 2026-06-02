export function createHitStop(): {
  punch(seconds?: number, scale?: number): void;
  scale(realDt: number): number;
  readonly active: boolean;
};
export function createCameraShake(opts?: { decay?: number }): {
  add(amount: number): void;
  sample(dt: number, t: number): { x: number; y: number; z: number; yaw: number; trauma: number };
  readonly trauma: number;
};
export function createBurstPool(
  scene: any,
  opts?: { count?: number },
): {
  burst(pos: { x: number; y?: number; z: number }, n?: number, color?: string, speed?: number): void;
  update(dt: number): void;
  group: any;
};
