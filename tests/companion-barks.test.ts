import { describe, it, expect } from "vitest";
import {
  BARK_EVENTS,
  BARK_LIBRARY,
  ensureBarkState,
  pickBark,
  markBarkSpoken,
  trySpeakBark,
  resetBarkState,
} from "../src/companionBarks.js";
import { createInitialCompanionRuntime, COMPANION_DEFINITIONS } from "../src/companion.js";

function makeRuntime(id = "smith") {
  const r = createInitialCompanionRuntime();
  const def = COMPANION_DEFINITIONS[id];
  r.active = true;
  r.id = def.id;
  r.name = def.name;
  return r;
}

describe("companionBarks — data integrity", () => {
  it("covers the major events", () => {
    expect(BARK_EVENTS).toEqual(expect.arrayContaining([
      "low_hp", "first_kill", "mini_boss", "region_entry",
      "house_unlock", "perfect_dodge", "perfect_parry", "level_up", "boss_phase",
    ]));
  });

  it("each companion has lines for every event", () => {
    for (const id of Object.keys(BARK_LIBRARY)) {
      const lib = BARK_LIBRARY[id];
      for (const ev of BARK_EVENTS) {
        expect(Array.isArray(lib[ev])).toBe(true);
        expect(lib[ev].length).toBeGreaterThan(0);
      }
    }
  });

  it("each line starts with the companion's name", () => {
    for (const [id, lib] of Object.entries(BARK_LIBRARY)) {
      for (const lines of Object.values(lib)) {
        for (const line of lines) {
          expect(line).toMatch(/^[A-Z][a-zA-Z' ]+:/);
        }
      }
    }
  });
});

describe("companionBarks — pickBark", () => {
  it("returns null for inactive runtime", () => {
    const r = makeRuntime("smith");
    r.active = false;
    expect(pickBark(r, "first_kill", 0)).toBeNull();
  });

  it("returns a line on first call when eligible", () => {
    const r = makeRuntime("smith");
    expect(pickBark(r, "first_kill", 0)).toMatch(/Cogwheel/);
  });

  it("respects global cooldown across events", () => {
    const r = makeRuntime("smith");
    trySpeakBark(r, "first_kill", 0);
    // Within 8s, any other event should be suppressed.
    expect(pickBark(r, "perfect_dodge", 2)).toBeNull();
    // After global cd, allowed.
    expect(pickBark(r, "perfect_dodge", 10)).toMatch(/Cogwheel/);
  });

  it("respects per-event cooldown", () => {
    const r = makeRuntime("smith");
    trySpeakBark(r, "perfect_dodge", 0);
    expect(pickBark(r, "perfect_dodge", 12)).toBeNull(); // 18s event cd not elapsed
    expect(pickBark(r, "perfect_dodge", 25)).toMatch(/Cogwheel/);
  });

  it("Infinity event cd means once per run", () => {
    const r = makeRuntime("smith");
    trySpeakBark(r, "first_kill", 0);
    expect(pickBark(r, "first_kill", 1000000)).toBeNull();
  });

  it("returns null for unknown event", () => {
    const r = makeRuntime("smith");
    expect(pickBark(r, "garbage", 0)).toBeNull();
  });
});

describe("companionBarks — state lifecycle", () => {
  it("ensureBarkState seeds an empty state", () => {
    const r: any = {};
    ensureBarkState(r);
    expect(r.barkState).toEqual({ lastSpokenAt: null, eventCooldowns: {}, eventsFired: {} });
  });

  it("markBarkSpoken records timestamps + counts", () => {
    const r = makeRuntime("smith");
    markBarkSpoken(r, "level_up", 5);
    expect(r.barkState.eventsFired.level_up).toBe(1);
    expect(r.barkState.lastSpokenAt).toBe(5);
  });

  it("resetBarkState wipes the bark cooldowns", () => {
    const r = makeRuntime("smith");
    markBarkSpoken(r, "level_up", 5);
    resetBarkState(r);
    expect(r.barkState.eventsFired).toEqual({});
  });

  it("eventsFired counter rotates lines for repeat events", () => {
    const r = makeRuntime("smith");
    // low_hp has 2 lines.
    const a = pickBark(r, "low_hp", 0);
    markBarkSpoken(r, "low_hp", 0);
    const b = pickBark(r, "low_hp", 30);
    expect(a).not.toBe(b);
  });
});

describe("companionBarks — trySpeakBark", () => {
  it("speaks once then returns null on the same event within cd", () => {
    const r = makeRuntime("warden");
    const first = trySpeakBark(r, "perfect_dodge", 0);
    expect(first).toMatch(/Boone/);
    expect(trySpeakBark(r, "perfect_dodge", 1)).toBeNull();
  });
});
