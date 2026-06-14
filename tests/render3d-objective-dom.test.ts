import { describe, expect, it } from "vitest";
import { createObjectiveDomRefs, syncObjectiveDom } from "../src/render3d/objectiveDom.js";

function makeElement() {
  return {
    textContent: "",
    children: [] as any[],
    style: {} as Record<string, string>,
    replaceChildren(...nodes: any[]) {
      this.children = nodes;
    },
  };
}

function makeDocument() {
  const nodes: Record<string, any> = {
    "#objective .label": makeElement(),
    "#objective .text": makeElement(),
    "#objective .meta": makeElement(),
    "#route-progress": makeElement(),
    "#route-progress .progress-label": makeElement(),
    "#route-progress .progress-fill": makeElement(),
    "#tag": makeElement(),
  };
  return {
    nodes,
    querySelector(selector: string) {
      return nodes[selector] || null;
    },
    createElement() {
      return makeElement();
    },
  };
}

describe("render3d objective DOM helpers", () => {
  it("caches objective DOM refs from the document once", () => {
    const doc = makeDocument();
    const refs = createObjectiveDomRefs(doc);

    expect(refs.label).toBe(doc.nodes["#objective .label"]);
    expect(refs.text).toBe(doc.nodes["#objective .text"]);
    expect(refs.meta).toBe(doc.nodes["#objective .meta"]);
    expect(refs.progress).toBe(doc.nodes["#route-progress"]);
    expect(refs.progressLabel).toBe(doc.nodes["#route-progress .progress-label"]);
    expect(refs.progressFill).toBe(doc.nodes["#route-progress .progress-fill"]);
    expect(refs.tag).toBe(doc.nodes["#tag"]);
  });

  it("renders phase objective text and metadata without string HTML", () => {
    const doc = makeDocument();
    const refs = createObjectiveDomRefs(doc);

    syncObjectiveDom(
      refs,
      { region: { label: "Westward Frontier" } },
      {
        phase: "road_walk",
        objectiveLabel: "Follow The Marshal Road",
        objectiveText: "Follow the lantern road to Smoke Cache.",
        objectiveMeta: ["Target: Smoke Cache", "Threat: Unknown in marsh", "Hidden: ignored"],
      },
    );

    expect(refs.label?.textContent).toBe("Follow The Marshal Road");
    expect(refs.text?.textContent).toBe("Follow the lantern road to Smoke Cache.");
    expect(refs.meta?.children.map((child: any) => child.textContent)).toEqual([
      "Target: Smoke Cache",
      "Threat: Unknown in marsh",
    ]);
    expect(refs.progressLabel?.textContent).toBe("Road beat 4/10");
    expect(refs.progressFill?.style.width).toBe("33%");
    expect(refs.tag?.textContent).toBe("Dustwater · Westward Frontier · road_walk");
  });

  it("reads mission-aware progress during the Dust to Dust funeral/implant beats", () => {
    const doc = makeDocument();
    const refs = createObjectiveDomRefs(doc);

    // funeral is beat 1 of the 12-phase dust_to_dust chain — not a default-loop phase
    syncObjectiveDom(refs, {}, { phase: "funeral", activeMission: "dust_to_dust" });
    expect(refs.progressLabel?.textContent).toBe("Road beat 1/12");
    expect(refs.progressFill?.style.width).toBe("0%");

    syncObjectiveDom(refs, {}, { phase: "implant", activeMission: "dust_to_dust" });
    expect(refs.progressLabel?.textContent).toBe("Road beat 2/12");
  });

  it("falls back to snapshot objective copy when no loop state is supplied", () => {
    const doc = makeDocument();
    const refs = createObjectiveDomRefs(doc);

    syncObjectiveDom(refs, {
      region: { label: "Westward Frontier" },
      objective: { title: "Mission", currentTarget: "Boone", nextAction: "Open board" },
    });

    expect(refs.label?.textContent).toBe("Mission");
    expect(refs.text?.textContent).toBe("Boone - Open board");
    expect(refs.meta?.children).toEqual([]);
  });
});
