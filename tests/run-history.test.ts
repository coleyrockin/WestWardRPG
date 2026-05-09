import { describe, it, expect, beforeEach } from "vitest";
import { appendRunRecord, getRunHistory, clearRunHistory, formatRunRecord } from "../src/runHistory.js";

describe("runHistory", () => {
  beforeEach(() => {
    clearRunHistory();
  });

  it("starts empty", () => {
    expect(getRunHistory()).toEqual([]);
  });

  it("appends a record and retrieves it", () => {
    appendRunRecord({ victory: true, endingId: "solidarity", durationSeconds: 300, durationLabel: "5:00", kills: 42, level: 5, deaths: 1, questOutcomesCount: 3, latestDecisions: [], companion: "Nora active" }, { timeToFirstKill: 45, chapterReached: 2 });
    const history = getRunHistory();
    expect(history).toHaveLength(1);
    expect(history[0].victory).toBe(true);
    expect(history[0].endingId).toBe("solidarity");
    expect(history[0].kills).toBe(42);
    expect(history[0].timeToFirstKill).toBe(45);
    expect(history[0].chapterReached).toBe(2);
  });

  it("prepends new records (most recent first)", () => {
    appendRunRecord({ victory: false, endingId: null, durationSeconds: 60, durationLabel: "1:00", kills: 1, level: 1, deaths: 1, questOutcomesCount: 0, latestDecisions: [], companion: null }, {});
    appendRunRecord({ victory: true, endingId: "control", durationSeconds: 900, durationLabel: "15:00", kills: 88, level: 7, deaths: 0, questOutcomesCount: 4, latestDecisions: [], companion: null }, {});
    const history = getRunHistory();
    expect(history[0].victory).toBe(true);
    expect(history[1].victory).toBe(false);
  });

  it("caps at 10 runs", () => {
    for (let i = 0; i < 12; i++) {
      appendRunRecord({ victory: false, endingId: null, durationSeconds: i * 10, durationLabel: `${i}:00`, kills: i, level: 1, deaths: 1, questOutcomesCount: 0, latestDecisions: [], companion: null }, {});
    }
    expect(getRunHistory()).toHaveLength(10);
  });

  it("handles null/missing summary gracefully", () => {
    appendRunRecord(null as any, {});
    expect(getRunHistory()).toEqual([]);
  });

  it("formatRunRecord returns a non-empty string for a valid record", () => {
    const record = { victory: true, endingId: "solidarity", durationLabel: "5:00", level: 5, kills: 42, deathCause: null };
    const line = formatRunRecord(record);
    expect(typeof line).toBe("string");
    expect(line!.length).toBeGreaterThan(0);
    expect(line).toMatch(/5:00/);
  });

  it("formatRunRecord includes death cause for non-victory runs", () => {
    const record = { victory: false, endingId: null, durationLabel: "2:30", level: 2, kills: 5, deathCause: "charge in frontier" };
    const line = formatRunRecord(record);
    expect(line).toMatch(/frontier/i);
  });

  it("clearRunHistory empties the history", () => {
    appendRunRecord({ victory: false, endingId: null, durationSeconds: 10, durationLabel: "0:10", kills: 0, level: 1, deaths: 1, questOutcomesCount: 0, latestDecisions: [], companion: null }, {});
    clearRunHistory();
    expect(getRunHistory()).toEqual([]);
  });
});

describe("runSummary — playtest metric fields", () => {
  it("createInitialRunStats includes playtest metric fields", async () => {
    const { createInitialRunStats } = await import("../src/runSummary.js");
    const stats = createInitialRunStats(100);
    expect(stats.timeToFirstKill).toBeNull();
    expect(stats.timeToFirstJobAccepted).toBeNull();
    expect(stats.deathCause).toBeNull();
    expect(stats.chapterReached).toBe(1);
    expect(stats.settingChanges).toBe(0);
  });

  it("ensureRunStats normalizes playtest metrics", async () => {
    const { ensureRunStats } = await import("../src/runSummary.js");
    const world = { runStats: { kills: 5, timeToFirstKill: 30.7, chapterReached: 2, settingChanges: 3 } };
    const stats = ensureRunStats(world);
    expect(stats.timeToFirstKill).toBeCloseTo(30.7);
    expect(stats.chapterReached).toBe(2);
    expect(stats.settingChanges).toBe(3);
  });
});
