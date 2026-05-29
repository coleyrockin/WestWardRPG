import { describe, it, expect } from "vitest";
import {
  createWorld,
  spawn,
  addComponent,
  getComponent,
  removeEntity,
  query,
  cloneWorld,
} from "../src/game/ecs.js";

describe("ecs", () => {
  it("assigns monotonic ids and tracks entities", () => {
    const w = createWorld();
    const a = spawn(w, { position: { x: 1, z: 2 } });
    const b = spawn(w, { position: { x: 3, z: 4 } });
    expect(a).toBe(1);
    expect(b).toBe(2);
    expect(w.entities).toEqual([1, 2]);
  });

  it("query returns ascending ids owning every named component", () => {
    const w = createWorld();
    const a = spawn(w, { position: {}, velocity: {} });
    spawn(w, { position: {} }); // no velocity
    const c = spawn(w, { position: {}, velocity: {} });
    expect(query(w, "position", "velocity")).toEqual([a, c]);
    expect(query(w, "position")).toEqual([1, 2, 3]);
  });

  it("getComponent / addComponent round-trip", () => {
    const w = createWorld();
    const id = spawn(w, { tag: { kind: "player" } });
    expect(getComponent(w, id, "tag")).toEqual({ kind: "player" });
    addComponent(w, id, "health", { hp: 10 });
    expect(getComponent(w, id, "health")).toEqual({ hp: 10 });
  });

  it("removeEntity drops it from entities and all component maps", () => {
    const w = createWorld();
    const id = spawn(w, { position: {}, velocity: {} });
    removeEntity(w, id);
    expect(w.entities).not.toContain(id);
    expect(getComponent(w, id, "position")).toBeUndefined();
    expect(query(w, "position")).toEqual([]);
  });

  it("cloneWorld is an independent deep copy", () => {
    const w = createWorld();
    const id = spawn(w, { position: { x: 1, z: 1 } });
    const copy = cloneWorld(w);
    (getComponent(copy, id, "position") as { x: number }).x = 999;
    expect((getComponent(w, id, "position") as { x: number }).x).toBe(1);
    spawn(copy, { position: {} });
    expect(w.entities).toEqual([1]);
  });
});
