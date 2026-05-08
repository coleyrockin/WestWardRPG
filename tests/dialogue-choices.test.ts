import { describe, it, expect } from "vitest";
import {
  DIALOGUE_CHOICES,
  DIALOGUE_NPC_IDS,
  ensureDialogueChoiceState,
  getAvailableDialogueChoices,
  applyDialogueChoice,
  dialogueChoiceCount,
  passesIdentityGate,
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

describe("dialogueChoices — identity gates", () => {
  it("ungated choices pass any identity", () => {
    expect(passesIdentityGate({ id: "x" } as any, {})).toBe(true);
    expect(passesIdentityGate({ id: "x", gate: null } as any, {})).toBe(true);
  });

  it("origin gate requires matching originId", () => {
    const choice = { id: "x", gate: { origin: "exiled_marshal" } } as any;
    expect(passesIdentityGate(choice, { originId: "exiled_marshal" })).toBe(true);
    expect(passesIdentityGate(choice, { originId: "ash_salvager" })).toBe(false);
    expect(passesIdentityGate(choice, {})).toBe(false);
  });

  it("origin gate accepts an array of allowed origins", () => {
    const choice = { id: "x", gate: { origin: ["exiled_marshal", "lantern_defector"] } } as any;
    expect(passesIdentityGate(choice, { originId: "exiled_marshal" })).toBe(true);
    expect(passesIdentityGate(choice, { originId: "lantern_defector" })).toBe(true);
    expect(passesIdentityGate(choice, { originId: "ash_salvager" })).toBe(false);
  });

  it("attribute gate requires every attribute >= the threshold", () => {
    const choice = { id: "x", gate: { attribute: { speech: 4 } } } as any;
    expect(passesIdentityGate(choice, { attributes: { speech: 4 } })).toBe(true);
    expect(passesIdentityGate(choice, { attributes: { speech: 3 } })).toBe(false);
    expect(passesIdentityGate(choice, {})).toBe(false);
  });

  it("factionLean gate matches identity factionLean", () => {
    const choice = { id: "x", gate: { factionLean: "workersGuild" } } as any;
    expect(passesIdentityGate(choice, { factionLean: "workersGuild" })).toBe(true);
    expect(passesIdentityGate(choice, { factionLean: "marketCartel" })).toBe(false);
  });

  it("getAvailableDialogueChoices hides gated entries unless the identity matches", () => {
    const n = makeNarrative(0);
    const noIdentity = getAvailableDialogueChoices(n, "warden", {}).map((c) => c.id);
    expect(noIdentity).not.toContain("warden_ch1_speech_persuade");

    const persuasive = getAvailableDialogueChoices(n, "warden", { attributes: { speech: 4 } }).map((c) => c.id);
    expect(persuasive).toContain("warden_ch1_speech_persuade");
  });

  it("surfaces origin-flavored choices for matching origins", () => {
    const n = makeNarrative(0);
    const marshal = getAvailableDialogueChoices(n, "elder", { originId: "exiled_marshal" }).map((c) => c.id);
    expect(marshal).toContain("elder_ch1_marshal_pitch");

    const defector = getAvailableDialogueChoices(n, "elder", { originId: "lantern_defector" }).map((c) => c.id);
    expect(defector).toContain("elder_ch1_lantern_truth");

    const salvager = getAvailableDialogueChoices(n, "smith", { originId: "ash_salvager" }).map((c) => c.id);
    expect(salvager).toContain("smith_ch1_salvager_pitch");

    const errand = getAvailableDialogueChoices(n, "merchant", { originId: "guild_errandhand" }).map((c) => c.id);
    expect(errand).toContain("merchant_ch1_errandhand_pitch");
  });

  it("cap of 3 visible choices still applies after gating", () => {
    const n = makeNarrative(0);
    const marshalElder = getAvailableDialogueChoices(n, "elder", { originId: "exiled_marshal" });
    expect(marshalElder.length).toBeLessThanOrEqual(3);
  });
});
