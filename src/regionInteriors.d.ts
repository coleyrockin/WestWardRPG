export interface RegionInterior {
  id: string;
  region: string;
  label: string;
  propLabel: string;
  propColor: string;
  spawn: { x: number; y: number; angle: number };
  exit: { x: number; y: number };
  entryLog: string;
  firstVisitLore: string;
  firstVisitLoot: { gold?: number; items?: Record<string, number> };
}

export const REGION_INTERIORS: Record<string, RegionInterior>;
export function buildRegionInteriorMap(interiorId: string): number[][] | null;
export function getRegionInteriorByRegion(regionId: string): RegionInterior | null;
export function listRegionInteriors(): RegionInterior[];
export function ensureInteriorVisitState(regions: any): void;
export function hasVisitedInterior(regions: any, interiorId: string): boolean;
export function markInteriorVisited(regions: any, interiorId: string): void;
