export interface DialogueChoice {
  id: string;
  prompt: string;
  response: string;
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
export function getAvailableDialogueChoices(narrative: any, npcId: string): DialogueChoice[];
export function applyDialogueChoice(narrative: any, npcId: string, choiceId: string): DialogueChoice | null;
export function dialogueChoiceCount(narrative: any): number;
