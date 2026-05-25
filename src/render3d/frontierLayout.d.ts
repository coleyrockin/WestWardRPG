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
}

export const FRONTIER_ANCHOR: { x: number; y: number };
export const PLAYER_SPAWN: { x: number; y: number };

export function buildFrontierPlacements(): Placement[];
