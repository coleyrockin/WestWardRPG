// Unit tests for the proximity-based interaction system. Exercises pickNearest
// directly and drives createInteractionSystem with a fake document + spy.

import { describe, expect, it, vi } from "vitest";
import {
  INTERACTABLE_KINDS,
  createInteractionSystem,
  pickNearest,
  promptFor,
} from "../src/render3d/interactionSystem.js";

const JOB_BOARD    = { kind: "jobBoard",    label: "Boone's Board",   x: 12.35, y: 8.55 };
const SMOKE_CACHE  = { kind: "smokeCache",  label: "Smoke Cache",     x: 12.6,  y: 8.85 };
const BROKEN_WAGON = { kind: "brokenWagon", label: "Broken Wagon",    x: 13.5,  y: 10.5 };
const ROAD_SLIME   = { kind: "roadSlime",   label: "Road Slime",      x: 14.4,  y: 9.4 };

const WORLD = [JOB_BOARD, SMOKE_CACHE, BROKEN_WAGON, ROAD_SLIME];

function makeFakeDocument() {
  const handlers: Record<string, Set<(e: any) => void>> = {};
  return {
    addEventListener(type: string, fn: (e: any) => void) {
      (handlers[type] ||= new Set()).add(fn);
    },
    removeEventListener(type: string, fn: (e: any) => void) {
      handlers[type]?.delete(fn);
    },
    dispatch(type: string, event: any) {
      for (const fn of Array.from(handlers[type] || [])) fn(event);
    },
  };
}

describe("interactionSystem — INTERACTABLE_KINDS", () => {
  it("includes the three Step-3 interactables and excludes roadSlime", () => {
    expect(new Set(INTERACTABLE_KINDS)).toEqual(
      new Set(["jobBoard", "smokeCache", "brokenWagon"]),
    );
  });
});

describe("interactionSystem — pickNearest", () => {
  it("returns the closest in-range interactable", () => {
    // Sit on top of the job board so it wins regardless of the cluster's
    // packing — distance 0 < anything else within radius.
    const pos = { x: JOB_BOARD.x, z: JOB_BOARD.y };
    expect(pickNearest(pos, WORLD)).toBe(JOB_BOARD);
  });

  it("returns null when every interactable is out of range", () => {
    const pos = { x: 0, z: 0 };
    expect(pickNearest(pos, WORLD)).toBeNull();
  });

  it("ignores roadSlime placements even when standing on one", () => {
    // Construct a tiny world with ONLY a slime so no other prop can shadow
    // the assertion. Sit on top — expect null.
    const slime = { kind: "roadSlime", label: "Road Slime", x: 5, y: 5 };
    expect(pickNearest({ x: 5, z: 5 }, [slime])).toBeNull();
  });

  it("breaks ties by actual distance, not array order", () => {
    // Pos closer to cache than board, both within radius.
    const pos = { x: SMOKE_CACHE.x, z: SMOKE_CACHE.y + 0.1 };
    expect(pickNearest(pos, WORLD)).toBe(SMOKE_CACHE);
  });

  it("handles missing inputs without throwing", () => {
    expect(pickNearest(null as any, WORLD)).toBeNull();
    expect(pickNearest({ x: 0, z: 0 }, [])).toBeNull();
    expect(pickNearest({ x: 0, z: 0 }, null as any)).toBeNull();
  });
});

describe("interactionSystem — promptFor", () => {
  it("emits the correct prompt for each interactable kind", () => {
    expect(promptFor(JOB_BOARD)).toBe("E — Open Boone's Board");
    expect(promptFor(SMOKE_CACHE)).toBe("E — Open Smoke Cache");
    expect(promptFor(BROKEN_WAGON)).toBe("E — Inspect Wagon");
  });

  it("returns empty string for null or non-interactable targets", () => {
    expect(promptFor(null)).toBe("");
    expect(promptFor(ROAD_SLIME)).toBe("");
  });
});

describe("interactionSystem — createInteractionSystem", () => {
  it("calls setPromptText with the matching prompt as the player moves", () => {
    const doc = makeFakeDocument();
    const setPromptText = vi.fn();
    const sys = createInteractionSystem({
      worldObjects: WORLD, setPromptText, document: doc as any,
    });

    sys.update({ x: JOB_BOARD.x, z: JOB_BOARD.y });
    expect(setPromptText).toHaveBeenLastCalledWith("E — Open Boone's Board");

    sys.update({ x: SMOKE_CACHE.x, z: SMOKE_CACHE.y });
    expect(setPromptText).toHaveBeenLastCalledWith("E — Open Smoke Cache");

    sys.update({ x: 0, z: 0 });
    expect(setPromptText).toHaveBeenLastCalledWith("");

    sys.dispose();
  });

  it("fires the registered handler for the current nearest on E keydown", () => {
    const doc = makeFakeDocument();
    const onBoard = vi.fn();
    const onCache = vi.fn();
    const sys = createInteractionSystem({
      worldObjects: WORLD, document: doc as any,
    });
    sys.registerHandler("jobBoard", onBoard);
    sys.registerHandler("smokeCache", onCache);

    sys.update({ x: JOB_BOARD.x, z: JOB_BOARD.y });
    doc.dispatch("keydown", { code: "KeyE" });
    expect(onBoard).toHaveBeenCalledTimes(1);
    expect(onCache).not.toHaveBeenCalled();

    sys.update({ x: SMOKE_CACHE.x, z: SMOKE_CACHE.y });
    doc.dispatch("keydown", { code: "KeyE" });
    expect(onCache).toHaveBeenCalledTimes(1);
    expect(onBoard).toHaveBeenCalledTimes(1);

    sys.dispose();
  });

  it("does not fire any handler when nothing is in range", () => {
    const doc = makeFakeDocument();
    const onBoard = vi.fn();
    const sys = createInteractionSystem({
      worldObjects: WORLD, document: doc as any,
    });
    sys.registerHandler("jobBoard", onBoard);

    sys.update({ x: 0, z: 0 });
    doc.dispatch("keydown", { code: "KeyE" });
    expect(onBoard).not.toHaveBeenCalled();

    sys.dispose();
  });

  it("ignores keys other than E", () => {
    const doc = makeFakeDocument();
    const onBoard = vi.fn();
    const sys = createInteractionSystem({
      worldObjects: WORLD, document: doc as any,
    });
    sys.registerHandler("jobBoard", onBoard);

    sys.update({ x: JOB_BOARD.x, z: JOB_BOARD.y });
    doc.dispatch("keydown", { code: "KeyF" });
    doc.dispatch("keydown", { code: "Space" });
    expect(onBoard).not.toHaveBeenCalled();

    sys.dispose();
  });

  it("dispose unbinds the keydown listener", () => {
    const doc = makeFakeDocument();
    const onBoard = vi.fn();
    const sys = createInteractionSystem({
      worldObjects: WORLD, document: doc as any,
    });
    sys.registerHandler("jobBoard", onBoard);
    sys.update({ x: JOB_BOARD.x, z: JOB_BOARD.y });

    sys.dispose();

    doc.dispatch("keydown", { code: "KeyE" });
    expect(onBoard).not.toHaveBeenCalled();
  });
});
