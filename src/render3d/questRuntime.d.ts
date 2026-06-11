// Type declarations for questRuntime.js — pure quest helpers for the
// "Ranch Ledger Run" courier quest (frontier_eastwater_run).

export const EASTWATER_JOB_ID: "frontier_eastwater_run";

/** Object shape required by questTargetEnabled / questPromptFor. */
export interface QuestTarget {
  kind: string;
  [key: string]: unknown;
}

/** {x, y, label} for the minimap to highlight the current beat. */
export interface MapTarget {
  x: number;
  y: number;
  label: string;
}

/**
 * Object shape consumed by syncObjectiveDom.
 * Mirrors the loopState shape from phaseState's createLoopStateMachine snapshot.
 */
export interface QuestObjectiveView {
  phase: string;
  objectiveLabel: string;
  objectiveText: string;
  objectiveMeta: string[];
}

/**
 * questTargetEnabled — gates questPickup / questDropoff interactable targets.
 * true only when frontier_eastwater_run is the active job and the target kind
 * matches the current beat (pickup at count 0, dropoff at count 1).
 */
export function questTargetEnabled(jobState: any, target: QuestTarget | null | undefined): boolean;

/**
 * questPromptFor — "E — …" prompt string for the current beat's interactable.
 * Returns "" when the target is not currently enabled.
 */
export function questPromptFor(jobState: any, target: QuestTarget | null | undefined): string;

/**
 * questObjectiveView — loopState-shaped view for syncObjectiveDom.
 * Returns null when frontier_eastwater_run is not the active job.
 */
export function questObjectiveView(jobState: any): QuestObjectiveView | null;

/**
 * questMapTarget — world position for the minimap's current beat highlight.
 * Returns null when frontier_eastwater_run is not the active job.
 */
export function questMapTarget(jobState: any): MapTarget | null;
