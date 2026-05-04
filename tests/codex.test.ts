import { describe, it, expect } from "vitest";
import {
  CODEX_TABS,
  CODEX_ENTRIES,
  ensureCodexState,
  unlockCodexEntry,
  isCodexEntryUnlocked,
  listEntriesForTab,
  getEntry,
  resolveCodexUnlockForPOI,
  totalCodexProgress,
} from "../src/codex.js";

describe("codex — data integrity", () => {
  it("has all lore tabs including POI letters", () => {
    expect(CODEX_TABS).toEqual(["regions", "enemies", "items", "factions", "ideology", "letters"]);
  });

  it("each tab has at least one entry", () => {
    for (const t of CODEX_TABS) {
      expect((CODEX_ENTRIES[t] || []).length).toBeGreaterThan(0);
    }
  });

  it("entries have id/title/body", () => {
    for (const t of CODEX_TABS) {
      for (const e of CODEX_ENTRIES[t]) {
        expect(typeof e.id).toBe("string");
        expect(typeof e.title).toBe("string");
        expect(typeof e.body).toBe("string");
      }
    }
  });
});

describe("codex — state lifecycle", () => {
  it("ensureCodexState seeds empty arrays for all tabs", () => {
    const s: any = {};
    ensureCodexState(s);
    expect(s.codex).toBeTruthy();
    for (const t of CODEX_TABS) {
      expect(Array.isArray(s.codex.unlocked[t])).toBe(true);
      expect(s.codex.unlocked[t].length).toBe(0);
    }
  });

  it("ensureCodexState preserves existing unlocks", () => {
    const s: any = { codex: { unlocked: { enemies: ["slime"] } } };
    ensureCodexState(s);
    expect(s.codex.unlocked.enemies).toEqual(["slime"]);
    expect(Array.isArray(s.codex.unlocked.regions)).toBe(true);
  });

  it("unlockCodexEntry adds an entry id (idempotent)", () => {
    const s: any = {};
    expect(unlockCodexEntry(s, "enemies", "slime")).toBe(true);
    expect(unlockCodexEntry(s, "enemies", "slime")).toBe(false);
    expect(s.codex.unlocked.enemies).toEqual(["slime"]);
  });

  it("unlockCodexEntry returns false for unknown entries", () => {
    const s: any = {};
    expect(unlockCodexEntry(s, "enemies", "ghost")).toBe(false);
    expect(unlockCodexEntry(s, "garbage", "anything")).toBe(false);
  });

  it("isCodexEntryUnlocked tracks state", () => {
    const s: any = {};
    expect(isCodexEntryUnlocked(s, "enemies", "slime")).toBe(false);
    unlockCodexEntry(s, "enemies", "slime");
    expect(isCodexEntryUnlocked(s, "enemies", "slime")).toBe(true);
  });
});

describe("codex — listing + progress", () => {
  it("listEntriesForTab returns full entries with unlocked flags", () => {
    const s: any = {};
    unlockCodexEntry(s, "regions", "frontier");
    const out = listEntriesForTab(s, "regions");
    const f = out.find((e) => e.id === "frontier");
    const a = out.find((e) => e.id === "ashfall");
    expect(f?.unlocked).toBe(true);
    expect(a?.unlocked).toBe(false);
  });

  it("getEntry pulls a single record", () => {
    const e = getEntry("enemies", "slime");
    expect(e?.title).toBe("Slime");
  });

  it("getEntry returns null for unknown id", () => {
    expect(getEntry("enemies", "elephant")).toBeNull();
  });

  it("totalCodexProgress counts unlocks across tabs", () => {
    const s: any = {};
    unlockCodexEntry(s, "enemies", "slime");
    unlockCodexEntry(s, "regions", "frontier");
    const p = totalCodexProgress(s);
    expect(p.unlocked).toBe(2);
    expect(p.total).toBeGreaterThan(p.unlocked);
  });

  it("totalCodexProgress for an empty state is 0", () => {
    expect(totalCodexProgress({}).unlocked).toBe(0);
    expect(totalCodexProgress(null as any).unlocked).toBe(0);
  });

  it("maps POI discoveries to letter codex unlocks", () => {
    const unlock = resolveCodexUnlockForPOI({ id: "frontier_old_well", label: "Old Well" });

    expect(unlock).toEqual({
      tab: "letters",
      id: "frontier_old_well",
      title: "Old Well",
    });
  });

  it("unlocks a POI letter through the standard codex path", () => {
    const s: any = {};
    const unlock = resolveCodexUnlockForPOI({ id: "frontier_old_well", label: "Old Well" });

    expect(unlockCodexEntry(s, unlock!.tab, unlock!.id)).toBe(true);
    expect(isCodexEntryUnlocked(s, "letters", "frontier_old_well")).toBe(true);
    expect(getEntry("letters", "frontier_old_well")?.body).toContain("well");
  });
});
