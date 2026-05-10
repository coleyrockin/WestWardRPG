export interface HudRendererHelpers {
  fillRoundedRect: (x: number, y: number, w: number, h: number, radius: number, fillStyle: any) => void;
  strokeRoundedRect: (x: number, y: number, w: number, h: number, radius: number, strokeStyle: any, lineWidth?: number) => void;
  drawSoftPanel: (x: number, y: number, w: number, h: number, options?: any) => void;
  drawClippedText: (text: string, x: number, y: number, maxWidth: number, fillStyle: any) => void;
  fitText: (text: string, maxWidth: number) => string;
}

export interface HudRendererBundle {
  drawHudBar: (x: number, y: number, w: number, h: number, ratio: number, bg: any, fg: any, label: string) => void;
  drawHudNoticePanel: (notice: any, x: number, y: number, w: number) => number;
  drawDiscoveryBannerPanel: (banner: any, layout: { x: number; y: number; w: number; h: number }) => void;
  drawInteractionPromptPanel: (prompt: any, layout: { x: number; y: number; w: number; h: number }) => void;
}

export function createHudRenderer(options: {
  ctx: CanvasRenderingContext2D;
  helpers: HudRendererHelpers;
  hexToRgba: (hex: string, alpha?: number) => string;
}): HudRendererBundle;

export function resolveDiscoveryBannerLayout(options: {
  canvasWidth?: number;
  margin?: number;
  bottomHudY?: number;
  lineCount?: number;
}): { x: number; y: number; w: number; h: number };

export function resolveInteractionPromptLayout(options: {
  canvasWidth?: number;
  margin?: number;
  bottomHudY?: number;
}): { x: number; y: number; w: number; h: number };
