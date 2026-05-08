export interface DialogueChoice {
  id: string;
  prompt: string;
  response: string;
  gate?: {
    origin?: string | string[];
    factionLean?: string;
    attribute?: Record<string, number>;
  };
  effects?: {
    axes?: Record<string, number>;
    factionRep?: Record<string, number>;
    npcAffinity?: Record<string, number>;
    flags?: Record<string, any>;
  };
  chapter?: number;
}

export const DIALOGUE_CHOICES: Record<string, Record<string, DialogueChoice[]>>;
export const DIALOGUE_NPC_IDS: string[];

export function ensureDialogueChoiceState(narrative: any): void;
export function passesIdentityGate(choice: DialogueChoice, identity?: any): boolean;
export function getAvailableDialogueChoices(narrative: any, npcId: string, identity?: any): DialogueChoice[];
export function applyDialogueChoice(narrative: any, npcId: string, choiceId: string): DialogueChoice | null;
export function dialogueChoiceCount(narrative: any): number;
