import { describe, it, expect } from "vitest";
import { LETTERS, getLetterById, getLetterByPoiId, resolveLetterChain } from "../src/journalLetters.js";

describe("journalLetters — LETTERS", () => {
  it("has at least 7 letters", () => {
    expect(LETTERS.length).toBeGreaterThanOrEqual(7);
  });

  it("each letter has required fields", () => {
    for (const l of LETTERS) {
      expect(typeof l.id).toBe("string");
      expect(typeof l.poiId).toBe("string");
      expect(typeof l.title).toBe("string");
      expect(typeof l.author).toBe("string");
      expect(typeof l.body).toBe("string");
      expect(Array.isArray(l.refersTo)).toBe(true);
    }
  });

  it("ids are unique", () => {
    const ids = LETTERS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("refersTo ids resolve to real letters", () => {
    for (const l of LETTERS) {
      for (const ref of l.refersTo) {
        const found = LETTERS.find((x) => x.id === ref);
        expect(found).toBeTruthy();
      }
    }
  });
});

describe("journalLetters — getLetterById", () => {
  it("returns letter for known id", () => {
    const l = getLetterById("letter_frontier_outpost");
    expect(l).not.toBeNull();
    expect(l?.id).toBe("letter_frontier_outpost");
  });

  it("returns null for unknown id", () => {
    expect(getLetterById("nope")).toBeNull();
  });
});

describe("journalLetters — getLetterByPoiId", () => {
  it("returns letters for a POI that has one", () => {
    const letters = getLetterByPoiId("frontier_wayside_shrine");
    expect(letters.length).toBeGreaterThanOrEqual(1);
  });

  it("returns empty array for unknown POI", () => {
    expect(getLetterByPoiId("unknown_poi")).toEqual([]);
  });
});

describe("journalLetters — resolveLetterChain", () => {
  it("resolves a chain of cross-referenced letters", () => {
    const chain = resolveLetterChain("letter_frontier_outpost");
    expect(chain.length).toBeGreaterThanOrEqual(2);
    expect(chain.some((l) => l.id === "letter_frontier_outpost")).toBe(true);
    expect(chain.some((l) => l.id === "letter_lantern_patrol_log")).toBe(true);
  });

  it("does not infinite-loop on circular references", () => {
    expect(() => resolveLetterChain("letter_frontier_outpost")).not.toThrow();
  });

  it("returns empty array for unknown id", () => {
    expect(resolveLetterChain("nope")).toEqual([]);
  });
});
