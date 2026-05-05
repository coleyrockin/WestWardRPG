export const REGION_VISUAL_IDENTITIES: Record<string, any>;
export function getRegionVisualIdentity(regionId: string): any;
export function buildRegionIdentityLine(regionId: string): string;
export function buildRegionWorldPresentation(regionId: string, context?: any): any;
export function buildRegionRoutePolyline(presentation: any, options?: any): any[];
export function resolveRoadSignPrompt(roadSigns: any[], x: number, y: number, options?: any): any;
