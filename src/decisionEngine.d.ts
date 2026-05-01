export const STORY_CHAPTERS: any[];
export const MAJOR_NPCS: Record<string, any>;
export function createInitialNarrativeState(): any;
export function syncChapterFromProgress(state: any, level: number): void;
export function applyMajorDecision(state: any, npcId: string): any;
export function createDecisionRecap(state: any): string;
export function resolveNarrativeEnding(state: any): any;
export function migrateNarrativeState(save: any): any;
