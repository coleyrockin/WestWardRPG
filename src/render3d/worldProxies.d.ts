// Type declarations for worldProxies.js. Mirrors the JS exports.

export interface AABB {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  source: any;
}

export interface CollisionStep {
  from: { x: number; z: number };
  to: { x: number; z: number };
}

export function buildProxies(placements: any[]): AABB[];

export function resolveCollision(
  step: CollisionStep,
  proxies: AABB[] | null | undefined,
  radius?: number,
): { x: number; z: number };
