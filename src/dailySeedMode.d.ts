export interface ChallengeFlag { id: string; label: string; description: string; scoreMult: number; }
export declare const CHALLENGE_FLAGS: Record<string, ChallengeFlag>;
export function todaysSeedString(): string;
export function dailyRand(dateStr: string, subSeed: string): number;
export function resolveScoreMultiplier(challengeFlags?: Record<string, boolean>): number;
export function computeDailyScore(runStats?: any, challengeFlags?: Record<string, boolean>): number;
export function submitDailyScore(dateStr: string, score: number, challengeFlags?: Record<string, boolean>): void;
export function getLeaderboard(): Array<{ date: string; score: number; challengeFlags: Record<string, boolean>; submittedAt: number }>;
export function getTodaysPersonalBest(dateStr: string): number;
export function clearLeaderboard(): void;
