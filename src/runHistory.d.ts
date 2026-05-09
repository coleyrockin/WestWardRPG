export interface RunRecord {
  savedAt: number;
  victory: boolean;
  endingId: string | null;
  durationSeconds: number;
  durationLabel: string;
  kills: number;
  level: number;
  deaths: number;
  questOutcomesCount: number;
  latestDecisions: string[];
  companion: string | null;
  timeToFirstKill: number | null;
  timeToFirstJobAccepted: number | null;
  deathCause: string | null;
  chapterReached: number;
  settingChanges: number;
}
export function appendRunRecord(summary: any, metrics?: any): void;
export function getRunHistory(): RunRecord[];
export function clearRunHistory(): void;
export function formatRunRecord(record: Partial<RunRecord> | null): string | null;
