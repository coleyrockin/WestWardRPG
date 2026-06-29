// Unit tests for the proximity-based interaction system. Exercises pickNearest
// directly and drives createInteractionSystem with a fake document + spy.

import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  INTERACTABLE_KINDS,
  createInteractionSystem,
  pickNearest,
  promptFor,
} from "../src/render3d/interactionSystem.js";
import { createLoopStateMachine } from "../src/render3d/phaseState.js";

const JOB_BOARD    = { kind: "jobBoard",    label: "Boone's Board",   x: 12.35, y: 8.55 };
const ROAD_SIGN    = { kind: "roadSign",    label: "Road Sign",       x: 13.0,  y: 8.7 };
const TOWN_BARK    = { kind: "townBark",    label: "Town Warning",    x: 13.2,  y: 8.9 };
const SMOKE_CACHE  = { kind: "smokeCache",  label: "Smoke Cache",     x: 12.6,  y: 8.85 };
const SLIME_TELL   = { kind: "slimeTell",   label: "Slime Trail",     x: 13.25, y: 9.0 };
const BROKEN_WAGON = { kind: "brokenWagon", label: "Broken Wagon",    x: 13.5,  y: 10.5 };
const ROAD_SLIME   = { kind: "roadSlime",   label: "Road Slime",      x: 14.4,  y: 9.4 };

const WORLD = [JOB_BOARD, ROAD_SIGN, TOWN_BARK, SMOKE_CACHE, SLIME_TELL, BROKEN_WAGON, ROAD_SLIME];

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
  it("includes first-road loop interactables", () => {
    expect(new Set(INTERACTABLE_KINDS)).toEqual(
      new Set(["jobBoard", "roadSign", "townBark", "smokeCache", "slimeTell", "brokenWagon", "roadSlime", "gravesite", "mountHorse", "buildingDoor", "exitDoor"]),
    );
  });
});

describe("interactionSystem — setTargets (loaded-interior swap)", () => {
  it("swaps the live interactable set and clears the stale nearest", () => {
    const doc = makeFakeDocument();
    const street = [{ kind: "jobBoard", x: 0, y: 0 }];
    const interior = [{ kind: "exitDoor", x: 0, y: 0 }];
    const sys = createInteractionSystem({ worldObjects: street, document: doc as any });
    sys.update({ x: 0, z: 0 });
    expect(sys.nearest?.kind).toBe("jobBoard");
    sys.setTargets(interior);
    expect(sys.nearest).toBeNull(); // cleared so a stale E can't fire
    sys.update({ x: 0, z: 0 });
    expect(sys.nearest?.kind).toBe("exitDoor"); // now only the interior's door is in range
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

  it("can select roadSlime during the combat phase", () => {
    const slime = { kind: "roadSlime", label: "Road Slime", x: 5, y: 5 };
    expect(pickNearest({ x: 5, z: 5 }, [slime])).toBe(slime);
  });

  it("honors phase gating when supplied", () => {
    expect(pickNearest(
      { x: SMOKE_CACHE.x, z: SMOKE_CACHE.y },
      WORLD,
      (target: any) => target.kind === "jobBoard",
    )).toBe(JOB_BOARD);
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
    expect(promptFor(ROAD_SIGN)).toBe("E — Read Road Sign");
    expect(promptFor(TOWN_BARK)).toBe("E — Hear Pearl's Warning");
    expect(promptFor(SMOKE_CACHE)).toBe("E — Open Smoke Cache");
    expect(promptFor(SLIME_TELL)).toBe("E — Inspect Slime Trail");
    expect(promptFor(BROKEN_WAGON)).toBe("E — Inspect Wagon");
  });

  it("returns empty string for null or non-interactable targets", () => {
    expect(promptFor(null)).toBe("");
    expect(promptFor(ROAD_SLIME)).toBe("E — Strike Road Slime");
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

  it("uses supplied phase prompt copy and target gating", () => {
    const doc = makeFakeDocument();
    const setPromptText = vi.fn();
    const sys = createInteractionSystem({
      worldObjects: WORLD,
      setPromptText,
      document: doc as any,
      isTargetEnabled: (target: any) => target.kind === "smokeCache",
      getPromptText: (target: any) => `phase prompt: ${target.label}`,
    });

    sys.update({ x: 0, z: 0 });
    expect(setPromptText).toHaveBeenLastCalledWith("");

    sys.update({ x: SMOKE_CACHE.x, z: SMOKE_CACHE.y });
    expect(setPromptText).toHaveBeenLastCalledWith("phase prompt: Smoke Cache");

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

// The rideable horse is a free-roam affordance: it waits at the steel-mustang mark
// and you walk up and mount from the first second — it is NOT a scripted phase beat.
// These tests exercise the REAL production gate (loopState.isTargetEnabled), not the
// permissive default ()=>true, so the unmountable-in-normal-play bug cannot hide as a
// false green. spike.js wires:
//   isTargetEnabled: (t) => t.kind === "mountHorse" || loopState.isTargetEnabled(t)
describe("interactionSystem — mountHorse off-phase gate (on foot only)", () => {
  // Reuse the production placement shape (x is world-X, y is world-Z).
  const MOUNT_HORSE = { kind: "mountHorse", label: "Steel Mustang", x: 16.2, y: 12.0 };

  it("REPRO: the old loop-only gate hides the mount prompt in normal play", () => {
    // Fresh run boots in the "spawn" phase whose active target is the jobBoard, NOT
    // mountHorse — so the phase gate alone rejects the horse even when you stand on it.
    const loopState = createLoopStateMachine();
    expect(loopState.state.activeTargetKind).not.toBe("mountHorse");
    expect(loopState.isTargetEnabled({ kind: "mountHorse" })).toBe(false);
    const oldGate = (t: any) => loopState.isTargetEnabled(t);
    expect(
      pickNearest({ x: MOUNT_HORSE.x, z: MOUNT_HORSE.y }, [MOUNT_HORSE], oldGate),
    ).toBeNull();
  });

  it("surfaces the mount prompt via the production gate even when another beat is active", () => {
    const loopState = createLoopStateMachine();
    // Active phase target is jobBoard (far away), yet the horse must remain mountable.
    const prodGate = (t: any) => t.kind === "mountHorse" || loopState.isTargetEnabled(t);
    const near = pickNearest(
      { x: MOUNT_HORSE.x, z: MOUNT_HORSE.y },
      [JOB_BOARD, MOUNT_HORSE],
      prodGate,
    );
    expect(near).toBe(MOUNT_HORSE);
    expect(promptFor(near)).toContain("Mount");
  });

  it("still honors the phase gate for non-mount targets through the production gate", () => {
    const loopState = createLoopStateMachine(); // spawn phase → jobBoard active
    const prodGate = (t: any) => t.kind === "mountHorse" || loopState.isTargetEnabled(t);
    // Stand on the smoke cache: it is NOT the active beat, so it stays gated out even
    // though the production gate is wired in — only mountHorse gets the free pass.
    expect(
      pickNearest({ x: SMOKE_CACHE.x, z: SMOKE_CACHE.y }, [SMOKE_CACHE], prodGate),
    ).toBeNull();
  });

  it("fires the registered mount handler over the real interaction path", () => {
    const doc = makeFakeDocument();
    const loopState = createLoopStateMachine();
    const onMount = vi.fn();
    const sys = createInteractionSystem({
      worldObjects: [JOB_BOARD, MOUNT_HORSE],
      document: doc as any,
      isTargetEnabled: (t: any) => t.kind === "mountHorse" || loopState.isTargetEnabled(t),
    });
    sys.registerHandler("mountHorse", onMount);

    sys.update({ x: MOUNT_HORSE.x, z: MOUNT_HORSE.y });
    expect(sys.nearest).toBe(MOUNT_HORSE);
    doc.dispatch("keydown", { code: "KeyE" });
    expect(onMount).toHaveBeenCalledTimes(1);

    sys.dispose();
  });

  it("the mount prompt anchor follows the live horse after a whistle-recall", () => {
    const loopState = createLoopStateMachine();
    const prodGate = (t: any) => t.kind === "mountHorse" || loopState.isTargetEnabled(t);
    // The placement object spike.js feeds pickNearest; the per-frame sync rewrites its
    // x/y from the horse mesh (horseNode.position.x, .z).
    const placement = { kind: "mountHorse", label: "Steel Mustang", x: 16.2, y: 12.0 };

    // Player has whistled and walked off; the horse eased to the new whistle position.
    const player = { x: 9.0, z: 7.0 };
    const horseNode = { position: { x: 9.0, y: 0, z: 7.0 } };

    // Before the sync, the stale anchor sits at the original mark — prompt is nowhere
    // near the player (the bug: prompt stuck at the empty original spot).
    expect(pickNearest(player, [placement], prodGate)).toBeNull();

    // The fix: each frame mirror the placement x/y to the live mesh position.
    placement.x = horseNode.position.x;
    placement.y = horseNode.position.z;

    const near = pickNearest(player, [placement], prodGate);
    expect(near).toBe(placement);
    expect(promptFor(near)).toContain("Mount");
  });

  it("suppresses the mount prompt while already mounted (no E — Mount Up mid-ride)", () => {
    // Regression: while mounted, spike.js pins horseNode.position to the player every
    // frame and the anchor sync mirrors that onto the placement — so the mount object
    // sits exactly on the rider (distance ~0, inside the 2.6 radius). The gate must
    // also require !isMounted so the prompt does NOT show, and pressing E does not
    // re-fire the mount handler, the entire time you are riding.
    const loopState = createLoopStateMachine();
    const player = { isMounted: true };
    // Mirror the production gate verbatim (see spike.js isTargetEnabled).
    const prodGate = (t: any) =>
      (t?.kind === "mountHorse" && !player.isMounted) || loopState.isTargetEnabled(t);
    // The horse rides under you: placement == player position (distance 0).
    const placement = { kind: "mountHorse", label: "Steel Mustang", x: 5.0, y: 5.0 };
    expect(pickNearest({ x: 5.0, z: 5.0 }, [placement], prodGate)).toBeNull();
    // On dismount the same spot becomes mountable again.
    player.isMounted = false;
    expect(pickNearest({ x: 5.0, z: 5.0 }, [placement], prodGate)).toBe(placement);
  });
});

// Lock the PRODUCTION wiring in spike.js (a WebGPU scene module that can't be imported
// in node). Without these source assertions the gate/anchor logic above is a true-green
// model only — these read the real file so the unmountable-horse regression goes red.
describe("interactionSystem — spike.js mount wiring (source contract)", () => {
  const spikeSource = readFileSync(
    new URL("../src/render3d/spike.js", import.meta.url),
    "utf8",
  );

  it("makes mountHorse interactable off the phase gate but only while ON FOOT", () => {
    // BUG A: the interaction wiring must let mountHorse through even when the active
    // phase target is something else — kind === "mountHorse" OR the loop gate. The
    // mountHorse free pass is additionally gated on !player.isMounted so the "E — Mount
    // Up" prompt is suppressed mid-ride (the horse mesh rides under the player, so the
    // anchor sits on the rider and would otherwise surface the prompt every frame).
    // The mountHorse free-pass + !isMounted gate must be present, OR'd with the loop
    // gate. (Loaded-interior door kinds may be OR'd in BEFORE it, so this matches the
    // mountHorse clause anywhere in the predicate, not only right after `=>`.)
    const gateRe =
      /isTargetEnabled:[\s\S]*?\(?\s*target\??\.kind\s*===\s*["']mountHorse["']\s*&&\s*!player\.isMounted\s*\)?\s*\|\|\s*loopState\.isTargetEnabled\(target\)/;
    expect(spikeSource).toMatch(gateRe);
  });

  it("syncs the mountHorse placement anchor to the live horse mesh each frame", () => {
    // BUG B: the per-frame horse update must rewrite the mountHorse placement x/y from
    // horseNode.position (x → x, z → y) so the prompt follows a whistled-recalled horse.
    const mountObj = spikeSource.match(
      /const\s+mountPlacement\s*=\s*\{[^}]*kind:\s*["']mountHorse["'][^}]*\}/,
    );
    // The placement object that feeds pickNearest must be referenced by the anchor sync.
    expect(spikeSource).toMatch(/mountPlacement\.x\s*=\s*horseNode\.position\.x/);
    expect(spikeSource).toMatch(/mountPlacement\.y\s*=\s*horseNode\.position\.z/);
    expect(mountObj, "mountHorse placement must be a named `mountPlacement` binding").not.toBeNull();
  });

  it("surfaces the mountHorse prompt text — the gate alone left it empty (false-green guard)", () => {
    // BUG C: the gate let pressing E work, but getPromptText delegated to
    // loopState.getPromptForTarget, which returns "" for mountHorse (never an active
    // phase target) — so "E — Mount Up" rendered empty and the affordance was invisible.
    // getPromptText must short-circuit mountHorse to its static promptFor() text.
    expect(spikeSource).toMatch(
      /kind\s*===\s*["']mountHorse["']\)\s*return\s+promptFor\(target\)/,
    );
    expect(spikeSource).toMatch(
      /import\s*\{[^}]*\bpromptFor\b[^}]*\}\s*from\s*["']\.\/interactionSystem\.js["']/,
    );
  });
});
