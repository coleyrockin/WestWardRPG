export interface CursedItem {
  id: string; name: string; description: string;
  buff: { stat: string; delta: number };
  debuff: { stat: string; delta: number };
  npcReactionLine: string; loreHint: string; regionDrops: string[];
}
export declare const CURSED_ITEMS: CursedItem[];
export function getCursedItemById(id: string): CursedItem | null;
export function getCursedItemsForRegion(regionId: string): CursedItem[];
export function applyCarriedCurse(player: any, cursedItemId: string): boolean;
export function resolveActiveCurseEffects(player: any): Record<string, number>;
export function resolveCurseNpcReaction(npcId: string, playerCurses?: string[]): { curseId: string; line: string } | null;
