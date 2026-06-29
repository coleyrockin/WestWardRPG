import { describe, it, expect } from "vitest";
// @ts-expect-error — JS module, no types
import { createLocationState, STREET } from "../src/render3d/locationState.js";

// Pure location state for Rustwater's loaded-interior model: the player is either
// on the street or inside ONE building interior. Enter/exit transitions are
// validated here (no Three.js) so the scene-swap loop in locationView can't
// desync. interiors = the set of enterable building ids.
const INTERIORS = ["saloon", "clinic", "store"];

describe("locationState — defaults + constant", () => {
  it("exposes STREET and starts on the street", () => {
    expect(STREET).toBe("street");
    const loc = createLocationState({ interiors: INTERIORS });
    expect(loc.current()).toBe(STREET);
    expect(loc.isInterior()).toBe(false);
  });

  it("tolerates no options", () => {
    const loc = createLocationState();
    expect(loc.current()).toBe(STREET);
    expect(loc.enter("saloon")).toBe(null); // nothing registered
  });
});

describe("locationState — enter", () => {
  it("enters a known interior from the street", () => {
    const loc = createLocationState({ interiors: INTERIORS });
    expect(loc.enter("saloon")).toEqual({ from: STREET, to: "saloon" });
    expect(loc.current()).toBe("saloon");
    expect(loc.isInterior()).toBe(true);
  });

  it("refuses an unknown interior (stays put)", () => {
    const loc = createLocationState({ interiors: INTERIORS });
    expect(loc.enter("nowhere")).toBe(null);
    expect(loc.current()).toBe(STREET);
  });

  it("refuses to enter while already inside — must exit first", () => {
    const loc = createLocationState({ interiors: INTERIORS });
    loc.enter("saloon");
    expect(loc.enter("clinic")).toBe(null);
    expect(loc.current()).toBe("saloon");
  });
});

describe("locationState — exit", () => {
  it("exits an interior back to the street", () => {
    const loc = createLocationState({ interiors: INTERIORS });
    loc.enter("clinic");
    expect(loc.exit()).toEqual({ from: "clinic", to: STREET });
    expect(loc.current()).toBe(STREET);
    expect(loc.isInterior()).toBe(false);
  });

  it("exiting while already on the street is a no-op (null)", () => {
    const loc = createLocationState({ interiors: INTERIORS });
    expect(loc.exit()).toBe(null);
    expect(loc.current()).toBe(STREET);
  });

  it("round-trips — can re-enter after exiting", () => {
    const loc = createLocationState({ interiors: INTERIORS });
    loc.enter("saloon");
    loc.exit();
    expect(loc.enter("store")).toEqual({ from: STREET, to: "store" });
    expect(loc.current()).toBe("store");
  });
});

describe("locationState — restore from save", () => {
  it("restores into a saved interior, and exit still works", () => {
    const loc = createLocationState({ start: "saloon", interiors: INTERIORS });
    expect(loc.current()).toBe("saloon");
    expect(loc.isInterior()).toBe(true);
    expect(loc.exit()).toEqual({ from: "saloon", to: STREET });
  });

  it("clamps a stale save pointing at a removed building back to the street", () => {
    const loc = createLocationState({ start: "ghost_hall", interiors: INTERIORS });
    expect(loc.current()).toBe(STREET);
    expect(loc.isInterior()).toBe(false);
  });
});
