export interface PostProcessor {
  glCanvas: HTMLCanvasElement;
  render(enabled: boolean, opts?: { vignette?: number; colorGrade?: number }): void;
  resize(w: number, h: number): void;
  destroy(): void;
}
export function createPostProcessor(sourceCanvas: HTMLCanvasElement): PostProcessor | null;
