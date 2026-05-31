// Type declarations for frontierLayout.js. Placement records use a loose
// shape — only the fields collision / interaction care about are pinned.

export interface Placement {
  kind: string;
  label: string;
  x: number;
  y: number;
  color: string;
  size: number;
  depthLane?: string;
  yaw?: number;
}

export const FRONTIER_ANCHOR: { x: number; y: number };
export const PLAYER_SPAWN: { x: number; y: number };
export const ROUTE_BEAT_SECONDS: Readonly<Record<string, number>>;
export const FIRST_FIVE_ROUTE: ReadonlyArray<{ kind: string; label: string; x: number; y: number }>;

export function buildFrontierPlacements(): Placement[];
export function getRouteMetrics(placements?: Placement[], options?: {
  walkSpeed?: number;
  runSpeed?: number;
}): {
  targetKinds: string[];
  legs: Array<{ from: string; to: string; distance: number }>;
  totalDistance: number;
  walkSeconds: number;
  runSeconds: number;
  expectedBeatSeconds: number;
  estimatedPlaySeconds: number;
};
