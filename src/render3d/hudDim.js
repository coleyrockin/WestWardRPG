// HUD melt — during quiet free-roam the road-loop clutter (bounty toast, field
// map, job tracker) fades to near-invisible so the WORLD fills the frame; it
// snaps back the instant the player has something to act on (near an
// interactable, the board open, mid-combat). The objective strip, prompt bar,
// and hero panel are NOT melted — they keep the player oriented.
//
// Pure logic + a per-frame timer; spike.js polls the active signal each frame
// and toggles a `hud-dimmed` CSS class (an opacity fade) on the three panels.
// Kept renderer-agnostic and unit-tested so the dim/reveal hysteresis can't
// regress into flicker. The fade itself is the CSS transition, not this code.

// Seconds of continuous inactivity before the clutter HUD melts. Long enough
// that crossing a POI radius or pausing at a sign doesn't strobe the panels.
export const HUD_DIM_DELAY = 3.0;

// The panels that melt. Intentionally excludes objective/prompt/hero-panel.
export const HUD_DIM_PANEL_IDS = Object.freeze(["job-toast", "field-map", "job-tracker"]);

// The HUD stays up whenever the player has a live thing to act on.
export function hudIsActive({ nearestPresent = false, boardOpen = false, inCombat = false } = {}) {
  return Boolean(nearestPresent || boardOpen || inCombat);
}

// Advance the melt timer one frame. `prev` is the last { dimmed, idleT } (or
// null on the first frame). Any activity reveals instantly and zeroes the
// timer; otherwise idle time accumulates and the HUD dims once it passes the
// delay (and stays dimmed while idle). Non-finite dt/idle are treated as 0.
export function computeHudDimState(prev, { active = false, dt = 0 } = {}) {
  if (active) return { dimmed: false, idleT: 0 };
  const prevIdle = Number.isFinite(prev?.idleT) ? prev.idleT : 0;
  const step = Number.isFinite(dt) && dt > 0 ? dt : 0;
  const idleT = prevIdle + step;
  const dimmed = Boolean(prev?.dimmed) || idleT >= HUD_DIM_DELAY;
  return { dimmed, idleT };
}
