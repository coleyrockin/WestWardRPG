export type LoopPhase =
  | "spawn"
  | "board_choice"
  | "road_sign"
  | "road_walk"
  | "cache_clue"
  | "slime_tell"
  | "slime_fight"
  | "wagon_salvage"
  | "return_to_boone"
  | "survey_teaser";

export interface BoardOption {
  id: string;
  label: string;
  followUp: string;
}

export const LOOP_PHASES: ReadonlyArray<LoopPhase>;
export const BOARD_OPTIONS: ReadonlyArray<BoardOption>;

export interface RouteBeats {
  boardChoice: boolean;
  roadSign: boolean;
  townBark: boolean;
  cacheClue: boolean;
  slimeTell: boolean;
  slimeDefeated: boolean;
  wagonSalvage: boolean;
  returnToBoone: boolean;
}

export interface LoopState {
  phase: LoopPhase;
  boardChoice: string | null;
  routeBeats: RouteBeats;
  inventoryPreview: Record<string, number>;
  completedInteractions: string[];
  encounterState: Record<string, any>;
}

export interface LoopStateView extends LoopState {
  activePrompt: string;
  activeTargetKind: string;
  objectiveText: string;
  objectiveLabel: string;
  objectiveMeta: string[];
}

export type LoopEvent = string | { type: string; optionId?: string | null };

export function createInitialLoopState(overrides?: Partial<LoopState>): LoopState;
export function transitionLoopPhase(state: LoopState, event: LoopEvent): LoopState;
export function getPhaseView(phase: LoopPhase | string, state?: Partial<LoopState> | null): {
  phase: LoopPhase;
  label: string;
  objectiveText: string;
  objectiveMeta: string[];
  activeTargetKind: string;
  promptText: string;
};
export function createLoopStateMachine(overrides?: Partial<LoopState>): {
  transition(event: LoopEvent): LoopStateView;
  chooseBoardOption(optionId: string): LoopStateView;
  isTargetEnabled(target: any): boolean;
  getPromptForTarget(target: any): string;
  readonly phase: LoopPhase;
  readonly state: LoopStateView;
};
