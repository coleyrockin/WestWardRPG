export declare const FOG_GRID_SIZE: number;
export function createFogGrid(): boolean[];
export function normalizeFogGrid(source: unknown): boolean[];
export function worldToCell(regionId: string, wx: number, wy: number): { gx: number; gy: number };
export function revealAroundPlayer(grid: boolean[], regionId: string, wx: number, wy: number): void;
export function isCellDiscovered(grid: boolean[], gx: number, gy: number): boolean;
export function regionDiscoveryRatio(grid: boolean[]): number;
