export interface ModelManifestEntry {
  url: string;
  scale?: number;
  yaw?: number;
  vary?: boolean;
  light?: {
    color: string;
    intensity: number;
    distance?: number;
    decay?: number;
    height?: number;
  };
  windowLight?: {
    color: string;
    intensity: number;
    distance?: number;
    height?: number;
  };
}

export const MODELS: Record<string, ModelManifestEntry>;
export function modelFor(kind: string): ModelManifestEntry | null;
