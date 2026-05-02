export const DEFAULT_PARTICLE_CAP: number;

export interface ParticleSlot {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface ParticlePool {
  slots: ParticleSlot[];
  capacity: number;
  cursor: number;
  activeCount: number;
}

export function createParticlePool(capacity?: number): ParticlePool;
export function spawnParticleInto(
  pool: ParticlePool,
  x: number,
  y: number,
  vx: number,
  vy: number,
  life: number,
  color: string,
  size: number
): ParticleSlot;
export function updateParticlePool(pool: ParticlePool, dt: number): void;
export function forEachActive(pool: ParticlePool, fn: (slot: ParticleSlot) => void): void;
export function clearPool(pool: ParticlePool): void;
export function getActiveCount(pool: ParticlePool): number;
