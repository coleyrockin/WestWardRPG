export interface WalkCycle {
  phase: number;
  bob: number;
  swayX: number;
  legPhase: number;
  legAmp: number;
  breath: number;
  moving: boolean;
}

export interface AttackCycle {
  active: boolean;
  ratio: number;
  lunge: number;
}

export function resolveWalkCycle(input?: {
  id?: string;
  time?: number;
  kind?: string;
  rate?: number;
  moving?: boolean;
}): WalkCycle;

export function resolveAttackCycle(input?: {
  windupTimer?: number;
  windupMax?: number;
}): AttackCycle;
