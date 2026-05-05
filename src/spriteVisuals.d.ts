export function isSelfLitSprite(sprite?: any): boolean;
export function resolveSpriteLightOverlayAlpha(sprite?: any, lightFactor?: number): number;

export interface SpriteLightHelpers {
  drawSpriteGlow(cx: number, cy: number, radius: number, color: string, alpha: number, innerRatio?: number): void;
  drawSpritePulseRing(cx: number, cy: number, radius: number, color: string, alpha: number, lineWidth?: number): void;
}

export function createSpriteLightHelpers(ctx: any, options?: { hexToRgba?: (color: string, alpha: number) => string }): SpriteLightHelpers;
