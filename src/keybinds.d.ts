export declare const DEFAULT_KEYBINDS: Record<string, string>;
export declare const KEYBIND_LABELS: Record<string, string>;
export function createInitialKeybinds(): Record<string, string>;
export function normalizeKeybinds(source: unknown): Record<string, string>;
export function resolveKey(keybinds: Record<string, string> | null | undefined, action: string): string | null;
export function actionsForCode(keybinds: Record<string, string> | null | undefined, code: string): string[];
export function rebindAction(keybinds: Record<string, string>, action: string, newCode: string, opts?: { allowConflict?: boolean }): boolean;
