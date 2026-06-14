import { describe, expect, it } from "vitest";
import { createBoardDomRefs, syncBoardDom } from "../src/render3d/boardDom.js";

function makeElement() {
  return {
    textContent: "",
    hidden: false,
    children: [] as any[],
    style: {} as Record<string, string>,
    replaceChildren(...nodes: any[]) {
      this.children = nodes;
    },
    appendChild(node: any) {
      this.children.push(node);
    },
  };
}

function makeDocument() {
  const nodes: Record<string, any> = {
    "#board-title": makeElement(),
    "#board-boone": makeElement(),
    "#board-body": makeElement(),
    "#board-reward": makeElement(),
    "#board-listings": makeElement(),
    "#board-accept": makeElement(),
    "#board-close": makeElement(),
  };
  const optionButtons = [makeElement(), makeElement()];
  return {
    nodes,
    optionButtons,
    querySelector(selector: string) {
      return nodes[selector] || null;
    },
    querySelectorAll(selector: string) {
      return selector === "[data-option]:not(#board-accept)" ? optionButtons : [];
    },
    createElement() {
      return makeElement();
    },
  };
}

const offerView = {
  mode: "offer" as const,
  title: "Marsh Slime Bounty",
  booneLine: "Marshal Boone: Stay on the posted roads.",
  bodyLines: ["Starter road loop: clear the marsh road.", "Follow the marsh road past the wagon."],
  rewardLine: "Reward: +38g, +18 XP, +1 Potion",
  progressLine: "",
  listings: [
    { title: "Roadside Salvage", detail: "Westward Frontier • Low threat", rewardLine: "+24g, +12 XP" },
    { title: "Sealed Orders Run", detail: "Westward Frontier • Low threat", rewardLine: "+30g, +16 XP" },
  ],
};

const completedView = {
  mode: "completed" as const,
  title: "Boone's Board — Bounty Paid",
  booneLine: "Marshal Boone: First road loop held.",
  bodyLines: ["Boone has marked the marshal road as watched."],
  rewardLine: "",
  progressLine: "",
  listings: [],
};

describe("render3d board DOM sync", () => {
  it("fills title, boone line, body, and reward from the view", () => {
    const doc = makeDocument();
    const refs = createBoardDomRefs(doc);
    syncBoardDom(refs, offerView);
    expect(doc.nodes["#board-title"].textContent).toBe("Marsh Slime Bounty");
    expect(doc.nodes["#board-boone"].textContent).toContain("posted roads");
    expect(doc.nodes["#board-boone"].hidden).toBe(false);
    expect(doc.nodes["#board-body"].textContent).toContain("clear the marsh road");
    expect(doc.nodes["#board-reward"].textContent).toContain("+38g");
    expect(doc.nodes["#board-reward"].hidden).toBe(false);
  });

  it("renders pinned listings as child nodes (no HTML strings)", () => {
    const doc = makeDocument();
    syncBoardDom(createBoardDomRefs(doc), offerView);
    const pinned = doc.nodes["#board-listings"];
    expect(pinned.hidden).toBe(false);
    expect(pinned.children.length).toBeGreaterThanOrEqual(2);
    const flat = JSON.stringify(pinned.children);
    expect(flat).toContain("Roadside Salvage");
    expect(flat).toContain("+24g");
  });

  it("hides the boone line / reward / listings when the view has none", () => {
    const doc = makeDocument();
    syncBoardDom(createBoardDomRefs(doc), { ...completedView, booneLine: "" });
    expect(doc.nodes["#board-boone"].hidden).toBe(true);
    expect(doc.nodes["#board-reward"].hidden).toBe(true);
    expect(doc.nodes["#board-listings"].hidden).toBe(true);
  });

  it("keeps choice buttons in offer mode, hides them in completed mode", () => {
    const doc = makeDocument();
    const refs = createBoardDomRefs(doc);
    syncBoardDom(refs, offerView);
    expect(doc.nodes["#board-accept"].hidden).toBe(false);
    expect(doc.optionButtons.every((b) => !b.hidden)).toBe(true);
    expect(doc.nodes["#board-close"].textContent).toBe("Not yet");

    syncBoardDom(refs, completedView);
    expect(doc.nodes["#board-accept"].hidden).toBe(true);
    expect(doc.optionButtons.every((b) => b.hidden)).toBe(true);
    expect(doc.nodes["#board-close"].textContent).toBe("Back to the road");
  });

  it("tolerates missing refs (headless / partial DOM)", () => {
    expect(() => syncBoardDom(createBoardDomRefs(null), offerView)).not.toThrow();
  });
});
