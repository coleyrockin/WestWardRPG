export interface SpatialHash {
  cellSize: number;
  cells: Map<string, any[]>;
  count: number;
}

export interface RebuildOptions<T> {
  filter?: (entity: T) => boolean;
}

export function createSpatialHash(cellSize?: number): SpatialHash;
export function clearSpatialHash(grid: SpatialHash): void;
export function rebuildSpatialHash<T extends { x: number; y: number }>(
  grid: SpatialHash,
  entities: T[],
  opts?: RebuildOptions<T>
): SpatialHash;
export function queryRadius<T extends { x: number; y: number }>(
  grid: SpatialHash,
  x: number,
  y: number,
  radius: number,
  out?: T[]
): T[];
