// Type declarations for executorBarks.js — the Executor's place/event barks.
// Pure data + selector (no Three.js); spike.js fires the chosen line through the
// cyan npcSpeech prompt channel.

export type ExecutorBand = "low" | "neutral" | "high";

export const EXECUTOR_BANDS: ReadonlyArray<ExecutorBand>;

export interface ExecutorBarkSet {
  low: string;
  neutral: string;
  high: string;
}

export const EXECUTOR_BARKS: Readonly<Record<string, ExecutorBarkSet>>;

export function bandForApproval(approval?: number): ExecutorBand;
export function pickExecutorBark(
  trigger: string,
  opts?: { approval?: number },
): string | null;
export function approvalCrossingTrigger(
  prevApproval: number,
  nextApproval: number,
): "approval_high" | "approval_low" | null;
