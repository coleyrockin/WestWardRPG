export interface UiModalState {
  dialogue: number;
  questOutcome: number;
  jobBoard: number;
  codexTab: number;
  settings: number;
}

export function createInitialUiModalState(): UiModalState;

export function normalizeUiModalState(input: unknown): UiModalState;
