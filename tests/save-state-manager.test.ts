import { describe, it, expect, vi } from "vitest";
import { createSaveStateManager, makeSaveResult } from "../src/saveStateManager.js";

describe("saveStateManager — tick", () => {
  it("does not auto-save when mode is not playing", () => {
    const sm = createSaveStateManager({ interval: 10 });
    const onAutoSave = vi.fn();
    sm.markDirty();
    sm.tick(20, "menu", { onAutoSave });
    expect(onAutoSave).not.toHaveBeenCalled();
  });

  it("auto-saves when interval elapses and dirty", () => {
    const sm = createSaveStateManager({ interval: 10 });
    const onAutoSave = vi.fn();
    sm.markDirty();
    sm.tick(11, "playing", { onAutoSave });
    expect(onAutoSave).toHaveBeenCalledOnce();
  });

  it("does not auto-save when not dirty", () => {
    const sm = createSaveStateManager({ interval: 10 });
    const onAutoSave = vi.fn();
    sm.tick(11, "playing", { onAutoSave });
    expect(onAutoSave).not.toHaveBeenCalled();
  });
});

describe("saveStateManager — dirty tracking", () => {
  it("starts clean", () => {
    const sm = createSaveStateManager();
    expect(sm.isDirty).toBe(false);
  });

  it("markDirty sets isDirty", () => {
    const sm = createSaveStateManager();
    sm.markDirty();
    expect(sm.isDirty).toBe(true);
  });

  it("onSaveSuccess clears isDirty", () => {
    const sm = createSaveStateManager();
    sm.markDirty();
    sm.onSaveSuccess();
    expect(sm.isDirty).toBe(false);
  });
});

describe("saveStateManager — timing", () => {
  it("secondsSinceLastSave returns Infinity before first save", () => {
    const sm = createSaveStateManager();
    expect(sm.secondsSinceLastSave()).toBe(Infinity);
  });

  it("secondsSinceLastSave returns finite value after save", () => {
    const sm = createSaveStateManager();
    sm.onSaveSuccess(Date.now() - 5000);
    expect(sm.secondsSinceLastSave()).toBeGreaterThanOrEqual(4);
  });
});

describe("makeSaveResult", () => {
  it("creates success result", () => {
    const r = makeSaveResult(true, null, "slot1");
    expect(r.ok).toBe(true);
    expect(r.slot).toBe("slot1");
  });

  it("creates failure result", () => {
    const r = makeSaveResult(false, "corrupt");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("corrupt");
  });
});
