import { describe, it, expect } from "vitest";
import { resolveVictoryPanelLayout } from "../src/modalController.js";

describe("resolveVictoryPanelLayout", () => {
  it("centers panel horizontally on wide canvas", () => {
    const layout = resolveVictoryPanelLayout({ canvasWidth: 1280, canvasHeight: 800, margin: 16, decisionsCount: 3, trophyCount: 3 });
    expect(layout.panelW).toBe(620);
    expect(layout.px).toBe(Math.floor((1280 - 620) / 2));
  });

  it("constrains panel width on compact canvas", () => {
    const layout = resolveVictoryPanelLayout({ canvasWidth: 480, canvasHeight: 700, margin: 12, decisionsCount: 1, trophyCount: 1 });
    expect(layout.panelW).toBe(480 - 12 * 2);
  });

  it("panel height scales with decisions and trophies", () => {
    const single = resolveVictoryPanelLayout({ canvasWidth: 800, canvasHeight: 900, margin: 16, decisionsCount: 1, trophyCount: 1 });
    const multi = resolveVictoryPanelLayout({ canvasWidth: 800, canvasHeight: 900, margin: 16, decisionsCount: 3, trophyCount: 3 });
    expect(multi.panelH).toBeGreaterThan(single.panelH);
  });

  it("trophyFirstY is below trophyHeaderY", () => {
    const layout = resolveVictoryPanelLayout({ canvasWidth: 800, canvasHeight: 900, margin: 16, decisionsCount: 2, trophyCount: 2 });
    expect(layout.trophyFirstY).toBeGreaterThan(layout.trophyHeaderY);
  });

  it("footerY is below trophyFirstY", () => {
    const layout = resolveVictoryPanelLayout({ canvasWidth: 800, canvasHeight: 900, margin: 16, decisionsCount: 2, trophyCount: 2 });
    expect(layout.footerY).toBeGreaterThan(layout.trophyFirstY);
  });

  it("py respects margin minimum", () => {
    const layout = resolveVictoryPanelLayout({ canvasWidth: 400, canvasHeight: 200, margin: 8, decisionsCount: 3, trophyCount: 3 });
    expect(layout.py).toBeGreaterThanOrEqual(8);
  });
});
