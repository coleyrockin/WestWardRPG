import { describe, it, expect } from "vitest";
import {
  resolveDiscoveryBannerLayout,
  resolveInteractionPromptLayout,
} from "../src/hudRenderer.js";

describe("hudRenderer layout helpers", () => {
  describe("resolveDiscoveryBannerLayout", () => {
    it("centers banner horizontally on wide canvas", () => {
      const layout = resolveDiscoveryBannerLayout({ canvasWidth: 1280, margin: 16, bottomHudY: 700, lineCount: 2 });
      expect(layout.w).toBe(520);
      expect(layout.x).toBe(Math.round((1280 - 520) / 2));
      expect(layout.h).toBe(54 + 2 * 14);
    });

    it("constrains banner width on compact canvas", () => {
      const layout = resolveDiscoveryBannerLayout({ canvasWidth: 480, margin: 12, bottomHudY: 400, lineCount: 1 });
      expect(layout.w).toBe(480 - 12 * 2);
      expect(layout.h).toBe(54 + 1 * 14);
    });

    it("respects minimum line count of 1", () => {
      const layout = resolveDiscoveryBannerLayout({ canvasWidth: 800, margin: 16, bottomHudY: 600, lineCount: 0 });
      expect(layout.h).toBe(54 + 1 * 14);
    });

    it("caps line count at 3", () => {
      const layout = resolveDiscoveryBannerLayout({ canvasWidth: 800, margin: 16, bottomHudY: 600, lineCount: 10 });
      expect(layout.h).toBe(54 + 3 * 14);
    });
  });

  describe("resolveInteractionPromptLayout", () => {
    it("uses 360px max width on wide canvas", () => {
      const layout = resolveInteractionPromptLayout({ canvasWidth: 1280, margin: 16, bottomHudY: 700 });
      expect(layout.w).toBe(360);
      expect(layout.h).toBe(44);
    });

    it("uses compact height below 560px canvas width", () => {
      const layout = resolveInteractionPromptLayout({ canvasWidth: 480, margin: 12, bottomHudY: 400 });
      expect(layout.w).toBe(480 - 12 * 2);
      expect(layout.h).toBe(40);
    });

    it("centers horizontally", () => {
      const layout = resolveInteractionPromptLayout({ canvasWidth: 800, margin: 16, bottomHudY: 600 });
      expect(layout.x).toBe(Math.round((800 - layout.w) / 2));
    });
  });
});
