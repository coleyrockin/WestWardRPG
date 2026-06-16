// Type declarations for hudDim.js — the free-roam HUD melt (pure logic, no Three.js).
// spike.js polls hudIsActive() per frame and toggles a `hud-dimmed` class via
// computeHudDimState()'s hysteresis on the three clutter panels.

export const HUD_DIM_DELAY: number;

export const HUD_DIM_PANEL_IDS: ReadonlyArray<string>;

export interface HudActiveInput {
  nearestPresent?: boolean;
  boardOpen?: boolean;
  inCombat?: boolean;
}

export function hudIsActive(input?: HudActiveInput): boolean;

export interface HudDimState {
  dimmed: boolean;
  idleT: number;
}

export function computeHudDimState(
  prev: HudDimState | null | undefined,
  step: { active?: boolean; dt?: number },
): HudDimState;
