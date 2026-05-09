export const STATUS_KINDS: string[];
export const STATUS_DEFS: Record<string, {
  duration: number;
  tickHz: number;
  perTickDamage: number;
  slowMult: number;
  chainOnApply?: boolean;
  shatterStacks?: number;
}>;

export interface StatusEntry {
  kind: string;
  durationLeft: number;
  magnitude: number;
  sourceTier: string;
}

export interface StatusEntity {
  statuses?: StatusEntry[];
  _statusTickAccum?: Record<string, number>;
}

export interface StatusAdapter<T> {
  applyDamage?: (entity: T, amount: number, source: string) => void;
  spawnShatter?: (entity: T) => void;
  chainShock?: (entity: T) => void;
}

export function ensureStatusContainer<T extends StatusEntity>(entity: T): StatusEntry[];
export function applyStatus<T extends StatusEntity>(
  entity: T,
  kind: string,
  opts?: { duration?: number; magnitude?: number; cap?: number; sourceTier?: string }
): StatusEntry | null;
export function clearStatuses<T extends StatusEntity>(entity: T): void;
export function updateStatuses<T extends StatusEntity>(
  entity: T,
  dt: number,
  adapter?: StatusAdapter<T>
): void;
export function getStatusSpeedMult<T extends StatusEntity>(entity: T): number;
export function hasStatus<T extends StatusEntity>(entity: T, kind: string): boolean;
export function getStatusMagnitude<T extends StatusEntity>(entity: T, kind: string): number;

export function checkStatusSynergies(entity: any): Array<{ type: string; burst: number }>;
