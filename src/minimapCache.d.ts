export interface MinimapCache { canvas: OffscreenCanvas | null; ctx: OffscreenCanvasRenderingContext2D | null; regionId: string | null; tileRadius: number; dirty: boolean }
export function createMinimapCache(): MinimapCache;
export function invalidateMinimapCache(cache: MinimapCache): void;
export function bakeMinimapLayer(cache: MinimapCache, opts: { map: any; tileRadius: number; cells: number; cell: number; palette: string[] }): boolean;
export function getMinimapLayerCanvas(cache: MinimapCache): OffscreenCanvas | null;
