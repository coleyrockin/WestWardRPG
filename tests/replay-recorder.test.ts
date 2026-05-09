import { describe, it, expect, beforeEach } from "vitest";
import { createReplaySession, recordInputEvent, finalizeReplay, saveReplayLocally, loadLastReplay, getReplaySummary } from "../src/replayRecorder.js";

describe("replayRecorder", () => {
  it("createReplaySession initializes with seed and empty events", () => {
    const session = createReplaySession(12345);
    expect(session.seed).toBe(12345);
    expect(session.events).toEqual([]);
    expect(session.version).toBe(1);
  });

  it("recordInputEvent appends events", () => {
    const session = createReplaySession();
    recordInputEvent(session, "keydown", "KeyW");
    recordInputEvent(session, "keyup", "KeyW");
    expect(session.events).toHaveLength(2);
    expect(session.events[0].type).toBe("keydown");
    expect(session.events[0].code).toBe("KeyW");
  });

  it("recordInputEvent is no-op for null session", () => {
    expect(() => recordInputEvent(null, "keydown", "KeyW")).not.toThrow();
  });

  it("finalizeReplay adds endedAt, kills, victory", () => {
    const session = createReplaySession();
    const replay = finalizeReplay(session, { kills: 10, victory: true });
    expect(replay.kills).toBe(10);
    expect(replay.victory).toBe(true);
    expect(typeof replay.endedAt).toBe("number");
  });

  it("finalizeReplay returns null for null session", () => {
    expect(finalizeReplay(null)).toBeNull();
  });

  it("saveReplayLocally and loadLastReplay round-trip", () => {
    const session = createReplaySession(999);
    recordInputEvent(session, "keydown", "Space");
    const replay = finalizeReplay(session, { kills: 5 });
    saveReplayLocally(replay);
    const loaded = loadLastReplay();
    expect(loaded?.seed).toBe(999);
    expect(loaded?.kills).toBe(5);
  });

  it("getReplaySummary returns summary with duration and event count", () => {
    const session = createReplaySession();
    recordInputEvent(session, "keydown", "KeyA");
    const replay = { ...finalizeReplay(session), durationMs: 62000 };
    const summary = getReplaySummary(replay);
    expect(summary?.duration).toMatch(/\d+:\d{2}/);
    expect(summary?.eventCount).toBe(1);
  });
});
