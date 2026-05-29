import { describe, it, expect } from "vitest";
import {
  createInitialState,
  stepSimulation,
  runSimulation,
  toRenderState,
  hashState,
  FIXED_DT,
} from "../src/game/sim.js";
import type { Command } from "../src/game/sim.js";

const LOG: Command[][] = [
  [{ type: "spawn", kind: "critter" }],
  [{ type: "move", dx: 1, dz: 0 }],
  [{ type: "spawn", kind: "critter" }, { type: "move", dx: 0, dz: 1 }],
  [],
  [{ type: "move", dx: -1, dz: -1 }],
];

describe("sim — event-sourced determinism gate", () => {
  it("createInitialState is deterministic for a seed", () => {
    expect(hashState(createInitialState(7))).toBe(hashState(createInitialState(7)));
  });

  it("replaying (seed, input-log) reproduces an identical state hash", () => {
    expect(hashState(runSimulation(7, LOG))).toBe(hashState(runSimulation(7, LOG)));
  });

  it("tick-by-tick stepping equals a single replay fold", () => {
    let state = createInitialState(7);
    for (const frame of LOG) state = stepSimulation(state, frame);
    expect(hashState(state)).toBe(hashState(runSimulation(7, LOG)));
  });

  it("different seeds diverge (RNG actually drives state)", () => {
    expect(hashState(runSimulation(7, LOG))).not.toBe(hashState(runSimulation(8, LOG)));
  });

  it("stepSimulation does not mutate its input", () => {
    const state = createInitialState(7);
    const before = hashState(state);
    stepSimulation(state, [
      { type: "spawn", kind: "critter" },
      { type: "move", dx: 1, dz: 1 },
    ]);
    expect(hashState(state)).toBe(before);
  });

  it("fixed dt is the 60 Hz sim step", () => {
    expect(FIXED_DT).toBeCloseTo(1 / 60, 10);
  });
});

describe("sim — render-command projection", () => {
  it("toRenderState is a pure projection with stable ordering", () => {
    const state = runSimulation(3, LOG);
    const rs = toRenderState(state);
    expect(rs.tick).toBe(LOG.length);
    expect(rs.drawables[0]).toMatchObject({ id: 1, kind: "player" });
    const ids = rs.drawables.map((d) => d.id);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
    expect(toRenderState(state)).toEqual(rs); // read-only: repeatable
  });

  it("player movement is reflected in the render state", () => {
    const moved = runSimulation(1, [[{ type: "move", dx: 1, dz: 0 }], [], []]);
    const player = toRenderState(moved).drawables.find((d) => d.kind === "player");
    expect(player).toBeDefined();
    expect(player!.x).toBeGreaterThan(0);
  });
});
