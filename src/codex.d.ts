export const CODEX_TABS: string[];

export interface CodexEntry {
  id: string;
  title: string;
  body: string;
  unlocked?: boolean;
}

export const CODEX_ENTRIES: Record<string, CodexEntry[]>;

export function ensureCodexState(state: any): void;
export function unlockCodexEntry(state: any, tab: string, id: string): boolean;
export function isCodexEntryUnlocked(state: any, tab: string, id: string): boolean;
export function listEntriesForTab(state: any, tab: string): CodexEntry[];
export function getEntry(tab: string, id: string): CodexEntry | null;
export function totalCodexProgress(state: any): { unlocked: number; total: number };
