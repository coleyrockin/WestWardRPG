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
export const FIRST_ROAD_ART_STYLE: Readonly<{
  roadWidth: number;
  openingRoadWidth: number;
  shoulderWidth: number;
  minNaturalClusters: number;
  minProductionStreetProps: number;
  minStorefronts: number;
  minNpcSilhouettes: number;
  minWindowLights: number;
}>;
export const FIRST_FIVE_ROUTE: ReadonlyArray<{ kind: string; label: string; x: number; y: number }>;
export const OPEN_RANGE_BOUNDS: Readonly<{ minX: number; maxX: number; minY: number; maxY: number }>;
export const OPEN_RANGE_ROADS: ReadonlyArray<{ from: { x: number; y: number }; to: { x: number; y: number }; width: number }>;
export const WORLD_MAP_POIS: ReadonlyArray<{ id: string; label: string; x: number; y: number }>;

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
export function getArtDirectionLayoutMetrics(placements?: Placement[]): {
  style: typeof FIRST_ROAD_ART_STYLE;
  heroPolishKinds: string[];
  naturalClusterCount: number;
  firstFrameNaturalCount: number;
  firstFrameSlabBlockers: string[];
};
export function getProductionFrameLayoutMetrics(placements?: Placement[]): {
  style: typeof FIRST_ROAD_ART_STYLE;
  productionKinds: string[];
  productionStreetPropCount: number;
  storefrontCount: number;
  windowLightCount: number;
  npcSilhouetteCount: number;
  firstStreetBounds: { minX: number; maxX: number; minY: number; maxY: number };
};
