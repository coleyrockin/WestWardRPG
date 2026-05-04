export function hexToRgba(hex: string, alpha?: number): string;
export function gradientBucket(value: number, bucketCount?: number): number;

export interface GradientCache {
  readonly size: number;
  has(key: string): boolean;
  clear(): void;
  fetch<T>(key: string, buildFn: () => T, enabled: boolean): T;
}

export function createGradientCache(): GradientCache;
export function resolveWallProjection(options?: any): any;
export function resolveNearWallVisualTreatment(options?: any): any;
export function resolveObjectiveStripLayout(options?: any): any;

export interface RenderHelpers {
  roundedRectPath(x: number, y: number, w: number, h: number, radius?: number): void;
  fillRoundedRect(x: number, y: number, w: number, h: number, radius: number, fillStyle: any): void;
  strokeRoundedRect(x: number, y: number, w: number, h: number, radius: number, strokeStyle: any, lineWidth?: number): void;
  drawSoftPanel(x: number, y: number, w: number, h: number, options?: Record<string, any>): void;
  fitText(text: string, maxWidth: number): string;
  drawClippedText(text: string, x: number, y: number, maxWidth: number, fillStyle: any): void;
  drawPillLabel(text: string, x: number, y: number, fillStyle?: any, textStyle?: any): void;
}

export function createRenderHelpers(ctx: any): RenderHelpers;
