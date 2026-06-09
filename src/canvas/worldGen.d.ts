export function createWorldMap(width: number, height: number, rng?: () => number): number[][];
export function createHouseInteriorMap(): number[][];
export function isInHouseLot(x: number, y: number): boolean;
export function findEmptyCell(
  map: number[][],
  minX?: number,
  minY?: number,
  maxX?: number,
  maxY?: number,
  extraCheck?: ((x: number, y: number) => boolean) | null,
  rng?: () => number,
): { x: number; y: number };
