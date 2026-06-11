export interface WorldPoiPoint {
  id: string;
  label: string;
  x: number;
  y: number;
  shape: string;
  color: string;
  size: number;
  active: boolean;
  completed: boolean;
  warning: boolean;
  muted: boolean;
  choice: boolean;
}

export interface WorldJobTarget {
  x: number;
  y: number;
  label: string;
}

export interface WorldMapModel {
  roads: string[];
  pois: WorldPoiPoint[];
  playerPoint: { x: number; y: number; worldX: number; worldY: number; label: string };
  playerYaw: number | null;
  yawDeg: number | null;
  jobTarget: WorldJobTarget | null;
  statusLabel: string;
  targetLabel: string;
}

export function buildFieldMapRouteModel(loopState?: any, options?: any): any;
export function buildFieldMapWorldModel(loopState?: any, options?: {
  playerPosition?: { x: number; y?: number; z?: number };
  playerYaw?: number;
  jobTarget?: { x: number; y: number; label?: string };
  size?: { width: number; height: number; padding: number };
}): WorldMapModel;
export function resolveFieldMapMode(loopState?: any, override?: string | null): "route" | "world";
export function createFieldMapDomRefs(rootDocument?: any): any;
export function syncFieldMapDom(refs: any, loopState?: any, options?: any): any;
