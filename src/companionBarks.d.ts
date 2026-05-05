export const BARK_EVENTS: string[];
export const BARK_LIBRARY: Record<string, Record<string, string[]>>;

export function ensureBarkState(runtime: any): void;
export function pickBark(runtime: any, eventType: string, now?: number, opts?: any): string | null;
export function markBarkSpoken(runtime: any, eventType: string, now?: number): void;
export function trySpeakBark(runtime: any, eventType: string, now?: number, opts?: any): string | null;
export function resetBarkState(runtime: any): void;
