import { describe, it, expect } from "vitest";
import {
  DIALOGUE_CHOICES,
  DIALOGUE_NPC_IDS,
  ensureDialogueChoiceState,
  getAvailableDialogueChoices,
  applyDialogueChoice,
  dialogueChoiceCount,
} from "../src/dialogueChoices.js";
import { createInitialNarrativeState } from "../src/decisionEngine.js";

function makeNarrative(chapterIndex = 0) {
  const n = createInitialNarrativeState();
  n.chapterIndex = chapterIndex;
  return n;
}

describe("dialogueChoices — data integrity", () => {
  it("covers all five major NPCs", () => {
    expect(DIALOGUE_NPC_IDS).toEqual(expect.arrayContaining(["elder", "warden", "smith", "merchant", "innkeeper"]));
  });

  it("every choice has id/prompt/response", () => {
    for (const npc of DIALOGUE_NPC_IDS) {
      const lib = DIALOGUE_CHOICES[npc];
      for (const chapterList of Object.values(lib)) {
        for (const c of chapterList) {
          expect(c.id).toMatch(/^[a-z_]+_ch[1-3]_[a-z_]+$/);
          expect(c.prompt.length).toBeGreaterThan(8);
          expect(c.response.length).toBeGreaterThan(8);
        }
      }
    }
  });

  it("every choice id is globally unique", () => {
    const seen = new Set();
    for (const lib of Object.values(DIALOGUE_CHOICES)) {
      for (const chapterList of Object.values(lib)) {
        for (const c of chapterList) {
          expect(seen.has(c.id), `duplicate choice id ${c.id}`).toBe(false);
          seen.add(c.id);
        }
      }
    }
  });
});

describe("dialogueChoices — chapter gating", () => {
  it("chapter 0 only exposes chapter-1 choices", () => {
    const n = makeNarrative(0);
    const choices = getAvailableDialogueChoices(n, "elder");
    expect(choices.length).toBeGreaterThan(0);
    expect(choices.every((c) => c.chapter === 1)).toBe(true);
  });

  it("chapter 1 cumulatively exposes ch1 + ch2 choices", () => {
    const n = makeNarrative(1);
    const all = getAvailableDialogueChoices(n, "elder");
    expect(all.some((c) => c.chapter === 1)).toBe(true);
    expect(all.some((c) => c.chapter === 2)).toBe(true);
  });

  it("chapter 2 exposes ch1 + ch2 + ch3 choices (capped at 3 visible)", () => {
    const n = makeNarrative(2);
    const all = getAvailableDialogueChoices(n, "elder");
    expect(all.length).toBeLessThanOrEqual(3);
  });

  it("returns [] for unknown npc", () => {
    const n = makeNarrative(0);
    expect(getAvailableDialogueChoices(n, "ghost")).toEqual([]);
  });
});

describe("dialogueChoices — applyDialogueChoice effects", () => {
  it("applies axis delta, records flag, and removes choice from list", () => {
    const n = makeNarrative(0);
    const baseTruth = n.thematicAxes.truthVsComfort;
    const before = getAvailableDialogueChoices(n, "elder");
    const target = before.find((c) => c.id === "elder_ch1_question_council")!;
    expect(target).toBeTruthy();
    applyDialogueChoice(n, "elder", target.id);
    expect(n.thematicAxes.truthVsComfort).toBe(baseTruth + 1);
    const after = getAvailableDialogueChoices(n, "elder");
    expect(after.find((c) => c.id === target.id)).toBeUndefined();
  });

  it("does not apply twice", () => {
    const n = makeNarrative(0);
    const baseTruth = n.thematicAxes.truthVsComfort;
    applyDialogueChoice(n, "elder", "elder_ch1_question_council");
    const second = applyDialogueChoice(n, "elder", "elder_ch1_question_council");
    expect(second).toBeNull();
    expect(n.thematicAxes.truthVsComfort).toBe(baseTruth + 1);
  });

  it("clamps axis to [-100,100]", () => {
    const n = makeNarrative(2);
    n.thematicAxes.controlVsFreedom = 99;
    applyDialogueChoice(n, "elder", "elder_ch3_endorse_change");
    expect(n.thematicAxes.controlVsFreedom).toBeGreaterThanOrEqual(-100);
    expect(n.thematicAxes.controlVsFreedom).toBeLessThanOrEqual(100);
  });

  it("applies factionRep delta", () => {
    const n = makeNarrative(0);
    const before = n.factionRep.civicCouncil;
    applyDialogueChoice(n, "elder", "elder_ch1_play_loyal");
    expect(n.factionRep.civicCouncil).toBe(before + 3);
  });

  it("applies npcAffinity delta", () => {
    const n = makeNarrative(0);
    const before = n.npcAffinity.elder || 0;
    applyDialogueChoice(n, "elder", "elder_ch1_offer_help");
    expect(n.npcAffinity.elder).toBe(before + 4);
  });

  it("appends to decisions log", () => {
    const n = makeNarrative(0);
    const before = n.decisions.length;
    applyDialogueChoice(n, "elder", "elder_ch1_offer_help");
    expect(n.decisions.length).toBe(before + 1);
    expect(n.decisions[n.decisions.length - 1].prompt).toContain("road");
  });

  it("returns null for unknown choice", () => {
    const n = makeNarrative(0);
    expect(applyDialogueChoice(n, "elder", "garbage")).toBeNull();
  });
});

describe("dialogueChoices — state lifecycle", () => {
  it("ensureDialogueChoiceState seeds an empty record", () => {
    const n: any = {};
    ensureDialogueChoiceState(n);
    expect(n.dialogueChoicesTaken).toEqual({});
  });

  it("ensureDialogueChoiceState preserves existing record", () => {
    const n: any = { dialogueChoicesTaken: { elder_ch1_offer_help: true } };
    ensureDialogueChoiceState(n);
    expect(n.dialogueChoicesTaken.elder_ch1_offer_help).toBe(true);
  });

  it("dialogueChoiceCount counts taken choices", () => {
    const n = makeNarrative(0);
    expect(dialogueChoiceCount(n)).toBe(0);
    applyDialogueChoice(n, "elder", "elder_ch1_offer_help");
    applyDialogueChoice(n, "warden", "warden_ch1_share_drink");
    expect(dialogueChoiceCount(n)).toBe(2);
  });
});
