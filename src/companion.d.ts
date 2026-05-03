export const COMPANION_DEFINITIONS: Record<string, any>;
export function createInitialCompanionRuntime(): any;
export function chooseEligibleCompanion(npcAffinity?: any, threshold?: number): any;
export function activateCompanion(runtime: any, def: any, player: any, savedHp?: number | null): boolean;
export function updateCompanionRuntime(runtime: any, player: any, enemies: any[], dt: number, isBlocking: (x: number, y: number) => boolean): any;
export function applyCompanionAttack(runtime: any, enemies: any[]): any;
export function applyCompanionDamage(runtime: any, amount: number, npcAffinity?: any): any;
export function tickCompanionRecovery(runtime: any, player: any, dt: number): boolean;
export function applyCompanionThreat(runtime: any, enemies: any[], dt: number, npcAffinity?: any): any;
