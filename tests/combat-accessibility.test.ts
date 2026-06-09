import { describe, it, expect } from "vitest";
import { createCombatSubtitleState, recordCombatEvent, tickCombatSubtitles, COMBAT_EVENTS } from "../src/combatAccessibility.js";

describe("combatAccessibility — recordCombatEvent", () => {
  it("queues an event", () => {
    const state = createCombatSubtitleState();
    recordCombatEvent(state, "hit");
    expect(state.queue).toHaveLength(1);
    expect(state.queue[0].type).toBe("hit");
  });

  it("ignores unknown event types", () => {
    const state = createCombatSubtitleState();
    recordCombatEvent(state, "not_real" as any);
    expect(state.queue).toHaveLength(0);
  });

  it("all COMBAT_EVENTS types are accepted", () => {
    for (const type of Object.keys(COMBAT_EVENTS)) {
      const state = createCombatSubtitleState();
      recordCombatEvent(state, type);
      expect(state.queue.length).toBeGreaterThan(0);
    }
  });

  it("dedupes the current event using the active subtitle life", () => {
    const state = createCombatSubtitleState();
    recordCombatEvent(state, "hit");
    tickCombatSubtitles(state, 0.016);
    recordCombatEvent(state, "hit");
    expect(state.queue).toHaveLength(0);
  });

  it("caps the backlog so a long fight can't grow the queue unbounded", () => {
    const state = createCombatSubtitleState();
    for (let i = 0; i < 30; i++) recordCombatEvent(state, "hit");
    expect(state.queue).toHaveLength(12);
  });
});

describe("combatAccessibility — tickCombatSubtitles", () => {
  it("promotes from queue to current", () => {
    const state = createCombatSubtitleState();
    recordCombatEvent(state, "perfect_parry");
    tickCombatSubtitles(state, 0.016);
    expect(state.current?.type).toBe("perfect_parry");
  });

  it("decrements life on current event", () => {
    const state = createCombatSubtitleState();
    recordCombatEvent(state, "hit");
    tickCombatSubtitles(state, 0.016);
    const lifeBefore = state.current!.life;
    tickCombatSubtitles(state, 0.1);
    expect(state.current!.life).toBeLessThan(lifeBefore);
  });

  it("clears current when life runs out", () => {
    const state = createCombatSubtitleState();
    recordCombatEvent(state, "hit");
    tickCombatSubtitles(state, 0.016);
    tickCombatSubtitles(state, 100); // way past duration
    expect(state.current).toBeNull();
  });

  it("handles null state gracefully", () => {
    expect(() => tickCombatSubtitles(null as any, 0.016)).not.toThrow();
  });
});
