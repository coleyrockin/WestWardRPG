export declare const PATROL_FACTION: Record<string, string>;
export declare const PATROL_DEFS: Record<string, any>;
export type PatrolStance = "allied" | "neutral" | "hostile";
export function resolvePatrolStance(regionId: string, factionRep?: Record<string, number>): PatrolStance;
export function resolvePatrolDescriptor(regionId: string, factionRep?: Record<string, number>): { factionId: string; label: string; stance: PatrolStance; color: string; suppressRadiusTiles: number; engagesPlayer: boolean };
export function resolvePatrolDensityMult(regionId: string, factionRep?: Record<string, number>): number;
