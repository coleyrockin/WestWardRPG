import { describe, it, expect } from "vitest";
import { DEFAULT_KEYBINDS, createInitialKeybinds, normalizeKeybinds, resolveKey, actionsForCode, rebindAction } from "../src/keybinds.js";

describe("keybinds — defaults", () => {
  it("createInitialKeybinds matches DEFAULT_KEYBINDS", () => {
    expect(createInitialKeybinds()).toEqual(DEFAULT_KEYBINDS);
  });

  it("DEFAULT_KEYBINDS has required actions", () => {
    expect(DEFAULT_KEYBINDS.interact).toBe("KeyE");
    expect(DEFAULT_KEYBINDS.attack).toBe("Space");
    expect(DEFAULT_KEYBINDS.quickSave).toBe("KeyK");
  });
});

describe("keybinds — normalizeKeybinds", () => {
  it("returns defaults for null input", () => {
    expect(normalizeKeybinds(null)).toEqual(DEFAULT_KEYBINDS);
  });

  it("merges partial overrides", () => {
    const kb = normalizeKeybinds({ interact: "KeyF" });
    expect(kb.interact).toBe("KeyF");
    expect(kb.attack).toBe(DEFAULT_KEYBINDS.attack);
  });

  it("ignores invalid (non-string) overrides", () => {
    const kb = normalizeKeybinds({ interact: 42 });
    expect(kb.interact).toBe(DEFAULT_KEYBINDS.interact);
  });
});

describe("keybinds — resolveKey", () => {
  it("returns the bound key for an action", () => {
    const kb = createInitialKeybinds();
    expect(resolveKey(kb, "interact")).toBe("KeyE");
  });

  it("falls back to default when keybinds is null", () => {
    expect(resolveKey(null, "attack")).toBe("Space");
  });

  it("returns null for unknown action", () => {
    expect(resolveKey(createInitialKeybinds(), "nonexistent")).toBeNull();
  });
});

describe("keybinds — actionsForCode", () => {
  it("returns actions bound to a code", () => {
    const kb = createInitialKeybinds();
    const actions = actionsForCode(kb, "KeyE");
    expect(actions).toContain("interact");
  });

  it("returns empty array for unbound code", () => {
    expect(actionsForCode(createInitialKeybinds(), "F99")).toEqual([]);
  });
});

describe("keybinds — rebindAction", () => {
  it("rebinds an action to a new code", () => {
    const kb = createInitialKeybinds();
    const result = rebindAction(kb, "interact", "KeyH");
    expect(result).toBe(true);
    expect(kb.interact).toBe("KeyH");
  });

  it("refuses rebind if code conflicts with another action", () => {
    const kb = createInitialKeybinds();
    const result = rebindAction(kb, "interact", "Space"); // Space = attack
    expect(result).toBe(false);
    expect(kb.interact).toBe("KeyE");
  });

  it("allows rebind with allowConflict flag", () => {
    const kb = createInitialKeybinds();
    const result = rebindAction(kb, "interact", "Space", { allowConflict: true });
    expect(result).toBe(true);
    expect(kb.interact).toBe("Space");
  });

  it("returns false for null inputs", () => {
    expect(rebindAction(null as any, "interact", "KeyH")).toBe(false);
  });
});
