export function parseLightColor(color?: string): { r: number; g: number; b: number };
export function normalizeDynamicLight(light?: any): any | null;
export function selectDynamicLights(lights: any[], reference?: any, options?: any): any[];
export function resolveDynamicLightAtPoint(point?: any, lights?: any[], options?: any): any;
