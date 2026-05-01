export const REGIONS: Record<string, any>;
export const REGION_RESOURCES: Record<string, string[]>;
export function createInitialRegionState(): any;
export function unlockRegion(regionState: any, regionId: string): boolean;
export function resolveRegionEventModifiers(events: any): any;
export function rollRegionEvent(regionState: any, dt: number, rng?: () => number): any;
