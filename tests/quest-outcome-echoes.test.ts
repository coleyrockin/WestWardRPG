import { describe, expect, it } from "vitest";
import { resolveQuestOutcomeEcho } from "../src/questOutcomeEchoes.js";

describe("questOutcomeEchoes", () => {
  it("returns null for unknown quest id", () => {
    expect(resolveQuestOutcomeEcho("not-a-quest", "any")).toBeNull();
  });

  it("returns null for unknown outcome id on a known quest", () => {
    expect(resolveQuestOutcomeEcho("archive", "not-a-real-outcome")).toBeNull();
  });

  it("returns null on null/undefined inputs", () => {
    expect(resolveQuestOutcomeEcho(null as any, null as any)).toBeNull();
    expect(resolveQuestOutcomeEcho(undefined as any, undefined as any)).toBeNull();
  });

  it("archive truth has a non-empty echo line", () => {
    const echo = resolveQuestOutcomeEcho("archive", "truth");
    expect(echo).toBeTruthy();
    expect(echo?.line.length).toBeGreaterThan(0);
    expect(echo?.title.length).toBeGreaterThan(0);
  });

  it("archive truth and comfort produce different copy", () => {
    const truth = resolveQuestOutcomeEcho("archive", "truth");
    const comfort = resolveQuestOutcomeEcho("archive", "comfort");
    expect(truth).toBeTruthy();
    expect(comfort).toBeTruthy();
    expect(truth?.line).not.toBe(comfort?.line);
  });

  it("covers every outcome-bearing quest in QUEST_DEFINITIONS", () => {
    const expectedQuests = [
      ["crystal", "truth"], ["crystal", "comfort"],
      ["wood", "solidarity"], ["wood", "status"],
      ["archive", "truth"], ["archive", "comfort"],
      ["ashfall_intro", "salvage"], ["ashfall_intro", "monopoly"],
      ["ashfall_boss", "mercy"], ["ashfall_boss", "purge"],
      ["lantern_probe", "broadcast"], ["lantern_probe", "decrypt"],
      ["lantern_revolt", "guild"], ["lantern_revolt", "council"],
    ];
    for (const [questId, outcomeId] of expectedQuests) {
      const echo = resolveQuestOutcomeEcho(questId, outcomeId);
      expect(echo, `missing echo for ${questId}/${outcomeId}`).toBeTruthy();
      expect(echo?.line.length, `empty line for ${questId}/${outcomeId}`).toBeGreaterThan(0);
    }
  });

  it("returns a stable object shape (title, line, color)", () => {
    const echo = resolveQuestOutcomeEcho("lantern_revolt", "guild");
    expect(echo).toMatchObject({
      title: expect.any(String),
      line: expect.any(String),
      color: expect.any(String),
    });
  });
});
