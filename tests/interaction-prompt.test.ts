import { describe, expect, it } from "vitest";
import {
  formatInteractionPrompt,
  resolveInteractionPrompt,
} from "../src/interactionPrompt.js";

describe("interactionPrompt", () => {
  it("selects the highest priority nearby action before lower priority entities", () => {
    const prompt = resolveInteractionPrompt([
      { kind: "npc", label: "Marshal Boone", distance: 0.5 },
      { kind: "job-board", label: "Boone's Board", distance: 1.4 },
      { kind: "road-sign", label: "Dustward Road Sign", distance: 1.7 },
    ]);

    expect(prompt).toMatchObject({
      kind: "road-sign",
      title: "E: Read sign",
      line: "Dustward Road Sign",
    });
  });

  it("uses distance as a tie breaker within the same action type", () => {
    const prompt = resolveInteractionPrompt([
      { kind: "resource", label: "Tree", distance: 1.2 },
      { kind: "resource", label: "Crystal", distance: 0.6 },
    ]);

    expect(prompt?.line).toBe("Crystal");
  });

  it("ignores unavailable candidates and formats the result", () => {
    const prompt = resolveInteractionPrompt([
      { kind: "bed", label: "Bed", available: false },
      { kind: "workbench", label: "House Stash", line: "Craft, repair, refine", distance: 1 },
    ]);

    expect(formatInteractionPrompt(prompt)).toBe("E: Use workbench - Craft, repair, refine");
  });

  it("returns no prompt when nothing is actionable", () => {
    expect(resolveInteractionPrompt([])).toBeNull();
    expect(formatInteractionPrompt(null)).toBe("");
  });
});
