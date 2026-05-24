import { describe, expect, it } from "vitest";
import {
  formatInteractionPrompt,
  resolveInteractionPrompt,
} from "../src/interactionPrompt.js";

describe("interactionPrompt", () => {
  it("prioritizes authored gameplay objects before decorative or ambient entities", () => {
    const prompt = resolveInteractionPrompt([
      { kind: "npc", label: "Marshal Boone", distance: 0.5 },
      { kind: "job-board", label: "Boone's Board", distance: 1.4 },
      { kind: "road-sign", label: "Dustward Road Sign", distance: 1.7 },
    ]);

    expect(prompt).toMatchObject({
      kind: "job-board",
      title: "E: Open jobs",
      line: "Boone's Board",
    });
  });

  it("keeps active job markers and discoveries above the job board", () => {
    expect(resolveInteractionPrompt([
      { kind: "job-board", label: "Boone's Board", distance: 0.4 },
      { kind: "job-route", label: "Survey Cairn", distance: 1.1 },
    ])).toMatchObject({ kind: "job-route", title: "E: Advance job" });

    expect(resolveInteractionPrompt([
      { kind: "job-board", label: "Boone's Board", distance: 0.4 },
      { kind: "poi", label: "Broken Wagon", distance: 1.2 },
    ])).toMatchObject({ kind: "poi", title: "E: Inspect" });
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
