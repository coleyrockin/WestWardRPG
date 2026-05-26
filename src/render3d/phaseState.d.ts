export type LoopPhase =
  | "spawn"
  | "accept_bounty"
  | "road_walk"
  | "cache_open"
  | "slime_fight"
  | "wagon_inspect"
  | "scrap_earned"
  | "return_to_boone"
  | "survey_offered";

export const LOOP_PHASES: ReadonlyArray<LoopPhase>;

export interface LoopState {
  phase: LoopPhase;
  inventoryPreview: Record<string, number>;
  completedInteractions: string[];
  encounterState: Record<string, any>;
}

export interface LoopStateView extends LoopState {
  activePrompt: string;
  activeTargetKind: string;
  objectiveText: string;
  objectiveLabel: string;
}

export function createInitialLoopState(overrides?: Partial<LoopState>): LoopState;
export function transitionLoopPhase(state: LoopState, event: string): LoopState;
export function getPhaseView(phase: LoopPhase | string): {
  phase: LoopPhase;
  label: string;
  objectiveText: string;
  activeTargetKind: string;
  promptText: string;
};
export function createLoopStateMachine(overrides?: Partial<LoopState>): {
  transition(event: string): LoopStateView;
  isTargetEnabled(target: any): boolean;
  getPromptForTarget(target: any): string;
  readonly phase: LoopPhase;
  readonly state: LoopStateView;
};
