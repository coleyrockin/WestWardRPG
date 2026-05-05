import { describe, expect, it } from "vitest";
import {
  isSelfLitSprite,
  resolveSpriteLightOverlayAlpha,
} from "../src/spriteVisuals.js";

describe("spriteVisuals", () => {
  it("classifies gameplay light sources as self-lit", () => {
    expect(isSelfLitSprite({ kind: "pressure" })).toBe(true);
    expect(isSelfLitSprite({ kind: "job-route" })).toBe(true);
    expect(isSelfLitSprite({ kind: "job-board" })).toBe(true);
    expect(isSelfLitSprite({ kind: "poi", poiKind: "camp" })).toBe(true);
    expect(isSelfLitSprite({ kind: "poi", poiKind: "shrine" })).toBe(true);
    expect(isSelfLitSprite({ kind: "landmark", landmarkVariant: "signal_mast" })).toBe(true);
    expect(isSelfLitSprite({ kind: "world-prop", propKind: "lamp" })).toBe(true);
  });

  it("keeps ordinary sprites under the normal darkness overlay", () => {
    expect(isSelfLitSprite({ kind: "enemy" })).toBe(false);
    expect(isSelfLitSprite({ kind: "npc" })).toBe(false);
    expect(isSelfLitSprite({ kind: "poi", poiKind: "ruin" })).toBe(false);
    expect(isSelfLitSprite({ kind: "world-prop", propKind: "crate" })).toBe(false);
  });

  it("reduces darkness overlay for self-lit sprites only", () => {
    const normal = resolveSpriteLightOverlayAlpha({ kind: "enemy" }, 0.5);
    const selfLit = resolveSpriteLightOverlayAlpha({ kind: "world-prop", propKind: "lamp" }, 0.5);

    expect(selfLit).toBeCloseTo(normal * 0.56, 5);
    expect(resolveSpriteLightOverlayAlpha({ kind: "enemy" }, Number.NaN)).toBeCloseTo(0.0432, 5);
  });
});
