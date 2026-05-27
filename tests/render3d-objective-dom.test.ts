import { describe, expect, it } from "vitest";
import { createObjectiveDomRefs, syncObjectiveDom } from "../src/render3d/objectiveDom.js";

function makeElement() {
  return {
    textContent: "",
    children: [] as any[],
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
    expect(refs.tag).toBe(doc.nodes["#tag"]);
  });

  it("renders phase objective text and metadata without string HTML", () => {
    const doc = makeDocument();
    const refs = createObjectiveDomRefs(doc);

    syncObjectiveDom(
      refs,
      { region: { label: "Dustward Frontier" } },
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
    expect(refs.tag?.textContent).toBe("WestWard · Dustward Frontier · road_walk");
  });

  it("falls back to snapshot objective copy when no loop state is supplied", () => {
    const doc = makeDocument();
    const refs = createObjectiveDomRefs(doc);

    syncObjectiveDom(refs, {
      region: { label: "Dustward Frontier" },
      objective: { title: "Mission", currentTarget: "Boone", nextAction: "Open board" },
    });

    expect(refs.label?.textContent).toBe("Mission");
    expect(refs.text?.textContent).toBe("Boone - Open board");
    expect(refs.meta?.children).toEqual([]);
  });
});
