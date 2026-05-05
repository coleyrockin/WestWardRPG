export function resolveStoryLootNpcReaction(npcId: string, inventory?: any): {
  itemName: string;
  npcId: string;
  priority: number;
  line: string;
} | null;

export function resolveStoryLootBoardReaction(inventory?: any, regionId?: string): {
  itemName: string;
  regionId: string;
  priority: number;
  line: string;
} | null;
