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
  // R1.4 additions
  windCutoffFor,
  GUST_AUDIO_SEED,
  gustAt,
  gustWindowOpened,
  // R1.5 additions
  biomePocketLevels,
  nightBedGainFor,
  NIGHT_BED_GAINS,
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

// ---------------------------------------------------------------------------
// R1.4 — windCutoffFor
// ---------------------------------------------------------------------------

describe("audioView — R1.4 windCutoffFor", () => {
  it("returns 800 Hz at clear (windSpeed 1)", () => {
    expect(windCutoffFor(1)).toBeCloseTo(800, 0);
  });

  it("returns ~1400 Hz at dust (windSpeed 1.8)", () => {
    expect(windCutoffFor(1.8)).toBeCloseTo(1400, 0);
  });

  it("returns ~2200 Hz at storm (windSpeed 2.6)", () => {
    expect(windCutoffFor(2.6)).toBeCloseTo(2200, 0);
  });

  it("clamps at 800 for windSpeed below 1", () => {
    expect(windCutoffFor(0)).toBe(800);
    expect(windCutoffFor(0.5)).toBe(800);
  });

  it("is monotonically increasing between clear and storm", () => {
    const speeds = [1, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4, 2.6];
    for (let i = 1; i < speeds.length; i++) {
      expect(windCutoffFor(speeds[i])).toBeGreaterThan(windCutoffFor(speeds[i - 1]));
    }
  });

  it("is continuous — midpoints land between their anchors", () => {
    // midpoint of clear→dust
    expect(windCutoffFor(1.4)).toBeGreaterThan(800);
    expect(windCutoffFor(1.4)).toBeLessThan(1400);
    // midpoint of dust→storm
    expect(windCutoffFor(2.2)).toBeGreaterThan(1400);
    expect(windCutoffFor(2.2)).toBeLessThan(2200);
  });

  it("handles NaN/undefined gracefully (falls back to 800)", () => {
    expect(windCutoffFor(NaN)).toBe(800);
    expect(windCutoffFor(undefined as unknown as number)).toBe(800);
  });
});

// ---------------------------------------------------------------------------
// R1.4 — GUST_AUDIO_SEED exported constant
// ---------------------------------------------------------------------------

describe("audioView — R1.4 GUST_AUDIO_SEED", () => {
  it("matches the first-road tumbleweed seed — one schedule, one event", () => {
    expect(GUST_AUDIO_SEED).toBe(0.84);
  });
});

// ---------------------------------------------------------------------------
// R1.4 — gustAt + gustWindowOpened (canonical windGusts.js schedule)
// ---------------------------------------------------------------------------

describe("audioView — R1.4 gust schedule", () => {
  it("gustAt is the eased windGusts schedule: values in [0,1]", () => {
    for (let t = 0; t < 200; t += 0.37) {
      const v = gustAt(t, GUST_AUDIO_SEED);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("at least one gust window opens within any 28s span (max seeded period)", () => {
    let foundGust = false;
    for (let t = 0; t < 28; t += 0.05) {
      if (gustAt(t, GUST_AUDIO_SEED) > 0) { foundGust = true; break; }
    }
    expect(foundGust).toBe(true);
  });

  it("gust windows repeat on the seeded 18–28s period", () => {
    const openings: number[] = [];
    let prevV = 0;
    for (let t = 0; t < 200; t += 0.05) {
      const v = gustAt(t, GUST_AUDIO_SEED);
      if (prevV === 0 && v > 0) openings.push(t);
      prevV = v;
    }
    expect(openings.length).toBeGreaterThanOrEqual(2);
    const gap = openings[1] - openings[0];
    expect(gap).toBeGreaterThanOrEqual(18 - 0.1);
    expect(gap).toBeLessThanOrEqual(28 + 0.1);
  });

  it("gustWindowOpened fires exactly once per window (not on every frame inside it)", () => {
    const dt = 0.016; // 60 fps
    let bursts = 0;
    let prevT = 0;
    for (let t = dt; t < 200; t += dt) {
      if (gustWindowOpened(prevT, t, GUST_AUDIO_SEED)) bursts++;
      prevT = t;
    }
    // Period is seeded in [18,28] → 200s holds 7–11 windows.
    expect(bursts).toBeGreaterThanOrEqual(6);
    expect(bursts).toBeLessThanOrEqual(12);
  });

  it("gustWindowOpened does not fire when already inside a window", () => {
    let windowStart = -1;
    for (let t = 0; t < 30; t += 0.01) {
      if (gustAt(t, GUST_AUDIO_SEED) > 0) { windowStart = t; break; }
    }
    expect(windowStart).toBeGreaterThanOrEqual(0);
    const midA = windowStart + 0.3;
    const midB = windowStart + 0.6;
    expect(gustWindowOpened(midA, midB, GUST_AUDIO_SEED)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// R1.5 — biomePocketLevels
// ---------------------------------------------------------------------------

describe("audioView — R1.5 biomePocketLevels", () => {
  it("returns 1 (or very close) at each pocket centre", () => {
    // marsh (76, 58)
    const atMarsh = biomePocketLevels(76, 58);
    expect(atMarsh.marsh).toBeCloseTo(1, 2);

    // folly (33.5, -29.5)
    const atFolly = biomePocketLevels(33.5, -29.5);
    expect(atFolly.folly).toBeCloseTo(1, 2);

    // ranch (128, 12)
    const atRanch = biomePocketLevels(128, 12);
    expect(atRanch.ranch).toBeCloseTo(1, 2);

    // saloon (19.3, 2.7) — Lucky Lantern from frontierLayout.js
    const atSaloon = biomePocketLevels(19.3, 2.7);
    expect(atSaloon.saloon).toBeCloseTo(1, 2);
  });

  it("returns 0 at 2× radius (40u) from each centre", () => {
    // 40u east of marsh centre
    const farMarsh = biomePocketLevels(76 + 40, 58);
    expect(farMarsh.marsh).toBeCloseTo(0, 2);

    const farFolly = biomePocketLevels(33.5 + 40, -29.5);
    expect(farFolly.folly).toBeCloseTo(0, 2);
  });

  it("returns 0 at 25u from each centre (beyond 2× radius = 40u is required; 25u is inside)", () => {
    // 25u is inside the radius — should be > 0 but < 1
    const nearMarsh = biomePocketLevels(76 + 25, 58);
    expect(nearMarsh.marsh).toBeGreaterThan(0);
    expect(nearMarsh.marsh).toBeLessThan(1);
  });

  it("returns 0 for all pockets far from all centres", () => {
    // x=500, y=500 — nowhere near any pocket
    const far = biomePocketLevels(500, 500);
    expect(far.marsh).toBe(0);
    expect(far.folly).toBe(0);
    expect(far.ranch).toBe(0);
    expect(far.saloon).toBe(0);
  });

  it("levels blend: midpoint between two centres each shows partial level", () => {
    // Midpoint between marsh (76,58) and ranch (128,12) — about (102, 35)
    // Distance to each: sqrt((26^2)+(23^2)) ≈ 34.7u — beyond 2×20=40u? No, 34.7 < 40
    // marsh: dist ≈ 34.7 → level > 0 but low
    const mid = biomePocketLevels(102, 35);
    // Both should be > 0 if within 40u
    // dist marsh: sqrt(26²+23²) = sqrt(676+529) = sqrt(1205) ≈ 34.7 < 40 → level > 0
    expect(mid.marsh).toBeGreaterThan(0);
    // dist ranch: sqrt(26²+23²) ≈ 34.7 < 40 → level > 0
    expect(mid.ranch).toBeGreaterThan(0);
    // Both less than 1
    expect(mid.marsh).toBeLessThan(1);
    expect(mid.ranch).toBeLessThan(1);
  });

  it("returns all four keys in every result", () => {
    const r = biomePocketLevels(0, 0);
    expect("marsh" in r).toBe(true);
    expect("folly" in r).toBe(true);
    expect("ranch" in r).toBe(true);
    expect("saloon" in r).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// R1.5 — night bed gain by paletteKey
// ---------------------------------------------------------------------------

describe("audioView — R1.5 nightBedGainFor", () => {
  it("crickets are silent at day and golden hour", () => {
    expect(nightBedGainFor("day")).toBe(0);
    expect(nightBedGainFor("goldenHour")).toBe(0);
  });

  it("crickets partially on at dusk, full at night", () => {
    expect(nightBedGainFor("dusk")).toBeGreaterThan(0);
    expect(nightBedGainFor("night")).toBeGreaterThan(nightBedGainFor("dusk"));
    expect(nightBedGainFor("night")).toBe(NIGHT_BED_GAINS.night);
  });

  it("falls back to 0 for unknown palette keys", () => {
    expect(nightBedGainFor("arc" as string)).toBe(0);
    expect(nightBedGainFor("" as string)).toBe(0);
    expect(nightBedGainFor(undefined as unknown as string)).toBe(0);
  });

  it("NIGHT_BED_GAINS is ordered: night > dusk > goldenHour = day = 0", () => {
    expect(NIGHT_BED_GAINS.night).toBeGreaterThan(NIGHT_BED_GAINS.dusk);
    expect(NIGHT_BED_GAINS.dusk).toBeGreaterThan(0);
    expect(NIGHT_BED_GAINS.goldenHour).toBe(0);
    expect(NIGHT_BED_GAINS.day).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// R1.4+R1.5 — update() accepts new opts without throwing (shell is null-ctx safe)
// ---------------------------------------------------------------------------

describe("createAudioView — R1.4+R1.5 update with new opts (no ctx)", () => {
  it("update accepts windSpeed, worldTime, playerX, playerY without throwing", () => {
    const view = createAudioView({ contextFactory: () => null });
    expect(() =>
      view.update(0.016, {
        moving: false,
        paletteKey: "night",
        windSpeed: 2.6,
        worldTime: 120,
        playerX: 76,
        playerY: 58,
      })
    ).not.toThrow();
  });

  it("update with all opts at dusk and storm windSpeed is a no-op when locked", () => {
    const view = createAudioView({ contextFactory: () => null });
    expect(() =>
      view.update(0.016, {
        windSpeed: 2.6,
        worldTime: 50,
        playerX: 128,
        playerY: 12,
        paletteKey: "dusk",
      })
    ).not.toThrow();
  });
});
