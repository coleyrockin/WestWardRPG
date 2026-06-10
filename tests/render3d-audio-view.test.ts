import { describe, it, expect } from "vitest";
import {
  SFX_NAMES,
  EVENT_SFX,
  sfxForLoopEvent,
  FOOTSTEP,
  stepFootstepClock,
  WIND_LEVELS,
  windLevelForPalette,
  createAudioView,
} from "../src/render3d/audioView.js";

describe("audioView — event routing", () => {
  it("freezes the sfx vocabulary and routing table", () => {
    expect(Object.isFrozen(SFX_NAMES)).toBe(true);
    expect(Object.isFrozen(EVENT_SFX)).toBe(true);
  });

  it("routes every loop event to a known sfx name", () => {
    for (const name of Object.values(EVENT_SFX)) {
      expect(SFX_NAMES).toContain(name);
    }
  });

  it("covers the full first-road event vocabulary from phaseState", () => {
    // One entry per transitionLoopPhase event type — keep in sync with phaseState.js.
    for (const event of [
      "board_reached",
      "choose_board",
      "accept_bounty",
      "read_sign",
      "hear_bark",
      "open_cache",
      "spot_slime_tell",
      "slime_appeared",
      "defeat_slime",
      "inspect_wagon",
      "report_to_boone",
    ]) {
      expect(sfxForLoopEvent(event), event).toBeTruthy();
    }
  });

  it("accepts object events ({type}) like transitionLoopPhase does", () => {
    expect(sfxForLoopEvent({ type: "choose_board" })).toBe("chalkScratch");
    expect(sfxForLoopEvent({ type: "defeat_slime" })).toBe("bigSplat");
  });

  it("returns null for unrouted or malformed events", () => {
    expect(sfxForLoopEvent("not_a_real_event")).toBeNull();
    expect(sfxForLoopEvent({})).toBeNull();
    expect(sfxForLoopEvent(null)).toBeNull();
    expect(sfxForLoopEvent(undefined)).toBeNull();
  });

  it("gives combat its dramatic beats: menace on reveal, bigSplat on kill", () => {
    expect(EVENT_SFX.slime_appeared).toBe("menace");
    expect(EVENT_SFX.defeat_slime).toBe("bigSplat");
    expect(EVENT_SFX.report_to_boone).toBe("resolveChime");
  });
});

describe("audioView — footstep cadence", () => {
  it("runs a faster cadence than walking", () => {
    expect(FOOTSTEP.runInterval).toBeLessThan(FOOTSTEP.walkInterval);
    expect(FOOTSTEP.runInterval).toBeGreaterThan(0);
  });

  it("does not fire while standing still, and primes a fast first step", () => {
    const idle = stepFootstepClock(0.1, 0.016, false, false);
    expect(idle.fire).toBe(false);
    expect(idle.clock).toBeCloseTo(FOOTSTEP.walkInterval * 0.5);
  });

  it("fires when the clock runs out and resets to the active interval", () => {
    const step = stepFootstepClock(0.01, 0.016, true, false);
    expect(step.fire).toBe(true);
    expect(step.clock).toBe(FOOTSTEP.walkInterval);
    const runStep = stepFootstepClock(0.01, 0.016, true, true);
    expect(runStep.fire).toBe(true);
    expect(runStep.clock).toBe(FOOTSTEP.runInterval);
  });

  it("counts down without firing mid-interval", () => {
    const step = stepFootstepClock(0.4, 0.016, true, false);
    expect(step.fire).toBe(false);
    expect(step.clock).toBeCloseTo(0.384);
  });

  it("produces a believable steps-per-second across a simulated second", () => {
    let clock = 0;
    let fires = 0;
    for (let i = 0; i < 60; i++) {
      const r = stepFootstepClock(clock, 1 / 60, true, false);
      clock = r.clock;
      if (r.fire) fires++;
    }
    // 1s / 0.46s interval ≈ 2 steps (first fires immediately).
    expect(fires).toBeGreaterThanOrEqual(2);
    expect(fires).toBeLessThanOrEqual(3);
  });
});

describe("audioView — wind levels", () => {
  it("night blows hardest, golden hour softest", () => {
    expect(WIND_LEVELS.night).toBeGreaterThan(WIND_LEVELS.dusk);
    expect(WIND_LEVELS.dusk).toBeGreaterThan(WIND_LEVELS.goldenHour);
  });

  it("falls back to dusk for unknown palettes (incl. the blended 'arc' key)", () => {
    expect(windLevelForPalette("arc")).toBe(WIND_LEVELS.dusk);
    expect(windLevelForPalette("")).toBe(WIND_LEVELS.dusk);
  });
});

describe("createAudioView — shell behaviour without an AudioContext", () => {
  it("is inert before unlock: play/update/onLoopEvent are safe no-ops", () => {
    const view = createAudioView({ contextFactory: () => null });
    expect(view.unlocked).toBe(false);
    expect(view.play("chime")).toBe(false);
    expect(view.onLoopEvent("defeat_slime")).toBe(false);
    expect(() => view.update(0.016, { moving: true })).not.toThrow();
    expect(() => view.dispose()).not.toThrow();
  });

  it("reports unlock failure when no AudioContext can be built", () => {
    const view = createAudioView({ contextFactory: () => null });
    expect(view.unlock()).toBe(false);
    expect(view.unlocked).toBe(false);
  });

  it("tracks mute state even while locked", () => {
    const view = createAudioView({ contextFactory: () => null });
    expect(view.muted).toBe(false);
    view.setMuted(true);
    expect(view.muted).toBe(true);
    expect(view.play("chime")).toBe(false);
  });
});
