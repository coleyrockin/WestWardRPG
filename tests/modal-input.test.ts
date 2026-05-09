import { describe, expect, it } from "vitest";
import {
  resolveHorizontalStepKey,
  resolveVerticalMenuKey,
  wrapSelection,
} from "../src/modalInput.js";

describe("modalInput", () => {
  it("wraps menu selection safely", () => {
    expect(wrapSelection(0, 3, -1)).toBe(2);
    expect(wrapSelection(2, 3, 1)).toBe(0);
    expect(wrapSelection(8, 0, 1)).toBe(0);
  });

  it("resolves vertical movement and confirmation keys", () => {
    expect(resolveVerticalMenuKey("ArrowUp", 0, 4).selection).toBe(3);
    expect(resolveVerticalMenuKey("KeyS", 1, 4).selection).toBe(2);
    expect(resolveVerticalMenuKey("Enter", 1, 4)).toMatchObject({ handled: true, action: "confirm", selection: 1 });
    expect(resolveVerticalMenuKey("Escape", 1, 4)).toMatchObject({ handled: true, action: "close", selection: 1 });
  });

  it("optionally treats horizontal keys as list movement", () => {
    expect(resolveVerticalMenuKey("ArrowLeft", 0, 2, { horizontal: true }).selection).toBe(1);
    expect(resolveVerticalMenuKey("KeyD", 0, 2, { horizontal: true }).selection).toBe(1);
  });

  it("blocks unknown keys only when requested", () => {
    expect(resolveVerticalMenuKey("KeyX", 0, 2).handled).toBe(false);
    expect(resolveVerticalMenuKey("KeyX", 0, 2, { blockUnhandled: true })).toMatchObject({ handled: true, action: "block" });
  });

  it("maps horizontal step keys", () => {
    expect(resolveHorizontalStepKey("ArrowLeft")).toBe(-1);
    expect(resolveHorizontalStepKey("KeyD")).toBe(1);
    expect(resolveHorizontalStepKey("Enter")).toBe(0);
  });
});
