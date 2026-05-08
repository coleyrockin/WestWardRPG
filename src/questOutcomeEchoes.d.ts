export interface QuestOutcomeEcho {
  title: string;
  line: string;
  color: string;
}

export function resolveQuestOutcomeEcho(
  questId: string,
  outcomeId: string,
): QuestOutcomeEcho | null;
