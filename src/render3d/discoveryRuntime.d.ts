// Type declarations for discoveryRuntime.js. Mirrors the JS exports.

export interface DiscoveryEvent {
  id: string;
  kind: string;
  label: string;
  loot: { gold?: number; items?: Record<string, number> } | null;
  buff: { hp?: number; stamina?: number } | null;
  loreHint: string | null;
  line: string;
  renown: any;
}

export function resolveDiscovery(
  regions: any,
  regionId: string,
  x: number,
  y: number,
): DiscoveryEvent | null;
