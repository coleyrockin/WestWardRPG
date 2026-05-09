export function resolveCombatProgression(narrativeState: any, level: number): any;
export function applySwingLoadout(baseSwing: any, combatProgression: any, context?: any): any;
export function resolveIncomingDamage(baseDamage: number, combatProgression: any, context?: any): any;
export function resolveGuardBreakState(player: any, dt?: number): { guardBroken: boolean; guardBrokenTimer: number };
export function getSprintModifier(combatProgression: any): number;
export const MOVESET_DEFINITIONS: Record<string, {
  label: string;
  arcMult: number;
  reachMult: number;
  staggerBonus: number;
  recoveryMult: number;
  notes: string;
}>;
export function resolveMovesetForWeapon(weaponTier: string): string;
export function applyMovesetGeometry(baseSwing: any, weaponTier: string): any;

export function applyBlockStaminaChip(player: any, staminaChip: number): boolean;
