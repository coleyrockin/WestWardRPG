export interface POIDef {
  id: string;
  kind: string;
  x: number;
  y: number;
  label: string;
  loot?: { gold?: number; items?: Record<string, number> };
  buff?: { hp?: number; stamina?: number };
}

export const POI_KINDS: Record<string, { label: string; radius: number; color: string }>;
export const POI_DEFINITIONS: Record<string, POIDef[]>;

export function getPOIsForRegion(regionId: string): POIDef[];
export function ensurePoiDefaults(regions: any): void;
export function isPOIDiscovered(regions: any, poiId: string): boolean;
export function markPOIDiscovered(regions: any, poiId: string): boolean;
export function findNearbyPOIs(regions: any, regionId: string, x: number, y: number, pingRadius?: number): POIDef[];
export function poiUnderInteraction(regions: any, regionId: string, x: number, y: number): POIDef | null;
