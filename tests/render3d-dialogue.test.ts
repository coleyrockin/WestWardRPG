import { describe, it, expect, vi } from "vitest";
// @ts-expect-error — JS module, no types
import { createDialogueRunner } from "../src/render3d/dialogueModal.js";

// A dialogue SCRIPT is an ordered list of beats:
//   { speaker, text }                       — a spoken line, advance() moves on
//   { speaker, text, choices: [{id,label,outcome}] } — a terminal choice node
// The runner is pure (no DOM / Three.js) so the conversation flow is unit-tested
// in isolation; dialogueDom binds buttons/keys to it.
const SCRIPT = [
  { speaker: "Boone", text: "You're Abram's kid. Figured." },
  { speaker: "Boone", text: "There's a slime fouling the road. Clear it and there's coin in it." },
  {
    speaker: "Boone",
    text: "So — you taking the bounty, or not?",
    choices: [
      { id: "accept", label: "I'll take it.", outcome: "accept_bounty" },
      { id: "decline", label: "Not yet.", outcome: "decline" },
    ],
  },
];

describe("dialogueRunner — linear flow", () => {
  it("starts closed, opens at the first beat", () => {
    const r = createDialogueRunner(SCRIPT);
    expect(r.isOpen()).toBe(false);
    r.open();
    expect(r.isOpen()).toBe(true);
    expect(r.current()).toEqual(SCRIPT[0]);
    expect(r.atChoice()).toBe(false);
  });

  it("advances through spoken lines to the choice node", () => {
    const r = createDialogueRunner(SCRIPT);
    r.open();
    expect(r.advance()).toEqual(SCRIPT[1]);
    expect(r.atChoice()).toBe(false);
    expect(r.advance()).toEqual(SCRIPT[2]);
    expect(r.atChoice()).toBe(true);
  });

  it("advance() at a choice node is a no-op — you must choose", () => {
    const r = createDialogueRunner(SCRIPT);
    r.open();
    r.advance();
    r.advance(); // now at the choice node
    expect(r.atChoice()).toBe(true);
    expect(r.advance()).toEqual(SCRIPT[2]); // unchanged
    expect(r.isOpen()).toBe(true);
  });
});

describe("dialogueRunner — choices + outcomes", () => {
  it("choose() fires onOutcome with the chosen outcome, then ends + closes", () => {
    const onOutcome = vi.fn();
    const onEnd = vi.fn();
    const r = createDialogueRunner(SCRIPT, { onOutcome, onEnd });
    r.open();
    r.advance();
    r.advance();
    r.choose("accept");
    expect(onOutcome).toHaveBeenCalledWith("accept_bounty", "accept");
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(r.isOpen()).toBe(false);
  });

  it("an unknown choice id is ignored (no outcome, stays open)", () => {
    const onOutcome = vi.fn();
    const r = createDialogueRunner(SCRIPT, { onOutcome });
    r.open();
    r.advance();
    r.advance();
    r.choose("nope");
    expect(onOutcome).not.toHaveBeenCalled();
    expect(r.isOpen()).toBe(true);
  });
});

describe("dialogueRunner — a script with no choices ends on advance", () => {
  it("advancing past the last spoken line ends + closes", () => {
    const onEnd = vi.fn();
    const r = createDialogueRunner(
      [{ speaker: "Pearl", text: "Mind the marsh." }],
      { onEnd },
    );
    r.open();
    expect(r.atChoice()).toBe(false);
    expect(r.advance()).toBe(null); // nothing after the last line
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(r.isOpen()).toBe(false);
  });
});

describe("dialogueRunner — guards", () => {
  it("tolerates an empty / missing script without throwing", () => {
    const r = createDialogueRunner([]);
    r.open();
    expect(r.current()).toBe(null);
    expect(r.atChoice()).toBe(false);
    expect(() => r.advance()).not.toThrow();
    expect(r.isOpen()).toBe(false); // empty script closes immediately on advance
  });
});
