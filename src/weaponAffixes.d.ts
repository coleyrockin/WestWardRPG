export interface WeaponAffix {
  id: string;
  label: string;
  slot: "prefix" | "suffix";
  tier: 1 | 2 | 3;
  description: string;
  arcBonus?: number;
  reachBonus?: number;
  staggerBonus?: number;
  lifestealPct?: number;
  statusOnHit?: "burn" | "bleed" | "shock" | "frost";
  statusMagnitude?: number;
}

export interface AffixModifiers {
  arcBonus: number;
  reachBonus: number;
  staggerBonus: number;
  lifestealPct: number;
  statusOnHit: { kind: string; magnitude: number }[];
}

export interface EquipmentWithAffixes {
  affixes?: string[];
  [key: string]: unknown;
}

export const AFFIX_SLOTS: readonly ("prefix" | "suffix")[];
export const AFFIXES: Record<string, WeaponAffix>;

export function listAffixes(): WeaponAffix[];
export function getAffix(id: string): WeaponAffix | null;
export function affixesForSlot(slot: "prefix" | "suffix"): WeaponAffix[];
export function rollAffix(slot: "prefix" | "suffix", rng?: () => number): WeaponAffix | null;
export function attachAffix(equipment: EquipmentWithAffixes, affixId: string): boolean;
export function buildAffixModifiers(affixIds: string[] | undefined | null): AffixModifiers;
export function describeAffixes(affixIds: string[] | undefined | null): string;
