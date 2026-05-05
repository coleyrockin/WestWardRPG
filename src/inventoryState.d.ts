export function createInitialInventoryState(): Record<string, number>;
export function normalizeInventoryState(inventory?: any): Record<string, number>;
export function getNotableInventorySummary(inventory?: any): {
  count: number;
  items: Array<{ name: string; count: number; line: string }>;
  line: string;
};
