export const ATTACK_TIMING: { windup: number; active: number; recovery: number };
export const HITBOX: { range: number; halfAngle: number };
export function hitboxHitsTarget(
  playerPos: { x: number; z: number },
  yaw: number,
  targetPos: { x: number; z: number },
  opts?: { range?: number; halfAngle?: number },
): boolean;
export interface PlayerCombat {
  tryAttack(): boolean;
  update(dt: number): void;
  tryRegisterHit(): boolean;
  readonly phase: "ready" | "windup" | "active" | "recovery";
  readonly isHitboxLive: boolean;
  readonly isAttacking: boolean;
  readonly windupProgress: number;
}
export function createPlayerCombat(opts?: {
  timing?: Partial<{ windup: number; active: number; recovery: number }>;
}): PlayerCombat;
