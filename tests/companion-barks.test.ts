import { describe, it, expect } from "vitest";
import {
  BARK_EVENTS,
  BARK_LIBRARY,
  BARK_QUEST_OUTCOMES,
  ensureBarkState,
  pickBark,
  markBarkSpoken,
  trySpeakBark,
  tryQuestOutcomeBark,
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
    expect(r.barkState).toEqual({ lastSpokenAt: null, eventCooldowns: {}, eventsFired: {}, questOutcomesSpoken: {} });
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

describe("companionBarks — quest outcomes", () => {
  it("each companion has lines for the seven branching quests", () => {
    const expectedQuests = ["crystal", "wood", "archive", "ashfall_intro", "ashfall_boss", "lantern_probe", "lantern_revolt"];
    for (const cid of ["smith", "innkeeper", "warden"]) {
      for (const qid of expectedQuests) {
        expect(BARK_QUEST_OUTCOMES[cid][qid]).toBeDefined();
        const outcomes = Object.values(BARK_QUEST_OUTCOMES[cid][qid]);
        expect(outcomes.length).toBeGreaterThanOrEqual(2);
        for (const line of outcomes) expect(line.length).toBeGreaterThan(0);
      }
    }
  });

  it("returns the matching line for known quest+outcome", () => {
    const r = makeRuntime("smith");
    const line = tryQuestOutcomeBark(r, "crystal", "truth", 0);
    expect(line).toMatch(/Cogwheel/);
  });

  it("dedups per quest within a run", () => {
    const r = makeRuntime("warden");
    const first = tryQuestOutcomeBark(r, "archive", "truth", 0);
    expect(first).toMatch(/Boone/);
    expect(tryQuestOutcomeBark(r, "archive", "comfort", 100)).toBeNull();
  });

  it("respects the global cooldown after a recent bark", () => {
    const r = makeRuntime("innkeeper");
    markBarkSpoken(r, "first_kill", 5);
    expect(tryQuestOutcomeBark(r, "wood", "solidarity", 6)).toBeNull();
    expect(tryQuestOutcomeBark(r, "wood", "solidarity", 30)).toMatch(/Nora/);
  });

  it("returns null when companion is not active or data is missing", () => {
    const r = makeRuntime("smith");
    r.active = false;
    expect(tryQuestOutcomeBark(r, "crystal", "truth", 0)).toBeNull();
    r.active = true;
    expect(tryQuestOutcomeBark(r, "missingQuest", "truth", 0)).toBeNull();
    expect(tryQuestOutcomeBark(r, "crystal", "missingOutcome", 0)).toBeNull();
  });

  it("resetBarkState wipes quest dedup so a new run can re-bark", () => {
    const r = makeRuntime("smith");
    expect(tryQuestOutcomeBark(r, "crystal", "truth", 0)).toBeTruthy();
    expect(tryQuestOutcomeBark(r, "crystal", "truth", 100)).toBeNull();
    resetBarkState(r);
    expect(tryQuestOutcomeBark(r, "crystal", "truth", 200)).toBeTruthy();
  });
});
