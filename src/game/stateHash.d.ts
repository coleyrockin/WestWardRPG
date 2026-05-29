// Type declarations for stateHash.js — canonical serialize + FNV-1a digest.

export function canonicalize(value: unknown): string;
export function fnv1a(str: string): string;
export function hashState(state: unknown): string;
