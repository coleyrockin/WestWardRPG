export const ATTRIBUTE_IDS: string[];
export const ATTRIBUTE_LABELS: Record<string, string>;
export const ORIGINS: Record<string, any>;
export function createInitialCharacterIdentity(originId?: string): any;
export function normalizeCharacterIdentity(source?: any): any;
export function applyOrigin(identity: any, originId: string): any;
export function spendAttributePoint(identity: any, attributeId: string): any;
export function deriveAttributeEffects(identity: any): any;
export function resolveIdentityShopPriceMultiplier(identity: any): number;
export function buildCharacterIdentitySummary(identity: any): any;

export declare const IDENTITY_ARCHETYPES: any[];
export declare const ARCHETYPE_NPC_REACTIONS: Record<string, string>;
export declare const ARCHETYPE_JOB_HOOKS: Record<string, any>;
export function resolvePlayerArchetype(identity: any, curses?: string[], factionRep?: Record<string, number>): any;
