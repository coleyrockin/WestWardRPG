import { describe, it, expect } from "vitest";
// @ts-expect-error — JS module, no types
import { seedValue, routeSageBlades, createRouteSageField, floraVisibleAt, FLORA_CULL_SHOW, FLORA_CULL_HIDE } from "../src/game/world/flora.js";

// A small synthetic route mirroring FIRST_FIVE_ROUTE's point shape ({ x, y, kind }).
// flora.js must reproduce the original per-blade placement byte-for-byte so the
// dusk golden frame is unchanged after the InstancedMesh batch — these tests pin
// the determinism + the batching contract that guarantees it.
const ROUTE = [
  { x: 9.5, y: 8.5, kind: "spawn" },
  { x: 16, y: 9, kind: "roadSign" },
  { x: 30, y: 9.5, kind: "townBark" },
  { x: 52, y: 12, kind: "roadSlime" },
];

describe("flora — seedValue (deterministic sin-hash)", () => {
  it("stays in [0,1) and is deterministic", () => {
    for (let i = 0; i < 60; i++) {
      const v = seedValue(i * 3.1 - 7);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    expect(seedValue(42)).toBe(seedValue(42));
  });
});

describe("flora — routeSageBlades (pure placement)", () => {
  it("produces a deterministic, order-stable blade list", () => {
    const a = routeSageBlades(ROUTE);
    const b = routeSageBlades(ROUTE);
    expect(a.length).toBeGreaterThan(0);
    expect(a).toEqual(b); // byte-stable => golden frame holds
  });

  it("emits finite transforms and positive scale for every blade", () => {
    for (const bd of routeSageBlades(ROUTE)) {
      for (const k of ["x", "y", "z", "rotX", "rotY", "rotZ"] as const) {
        expect(Number.isFinite(bd[k])).toBe(true);
      }
      expect(bd.scaleX).toBeGreaterThan(0);
      expect(bd.scaleY).toBeGreaterThan(0);
      expect(bd.scaleZ).toBeGreaterThan(0);
      expect(bd.colorIndex).toBeGreaterThanOrEqual(0);
      expect(bd.colorIndex).toBeLessThan(4);
    }
  });

  it("produces no blades when every segment is degenerate (zero length)", () => {
    const flat = [
      { x: 5, y: 5 },
      { x: 5, y: 5 },
      { x: 5, y: 5 },
    ];
    expect(routeSageBlades(flat).length).toBe(0);
  });

  it("ignores returnJobBoard waypoints (matches the original filter)", () => {
    const withReturn = [
      { x: 9.5, y: 8.5, kind: "spawn" },
      { x: 16, y: 9, kind: "roadSign" },
      { x: 0, y: 0, kind: "returnJobBoard" },
    ];
    const withoutReturn = [
      { x: 9.5, y: 8.5, kind: "spawn" },
      { x: 16, y: 9, kind: "roadSign" },
    ];
    expect(routeSageBlades(withReturn)).toEqual(routeSageBlades(withoutReturn));
  });
});

describe("flora — createRouteSageField (InstancedMesh batching)", () => {
  it("batches every blade into <=4 InstancedMeshes (one per colour bucket)", () => {
    const field = createRouteSageField(null, { route: ROUTE });
    expect(field.name).toBe("route-sage-field");
    expect(field.children.length).toBeGreaterThan(0);
    expect(field.children.length).toBeLessThanOrEqual(4);
    for (const c of field.children) {
      expect(c.isInstancedMesh).toBe(true);
      expect(c.castShadow).toBe(false);
      expect(c.receiveShadow).toBe(true);
    }
  });

  it("preserves every blade as exactly one instance (no drops)", () => {
    const blades = routeSageBlades(ROUTE);
    const field = createRouteSageField(null, { route: ROUTE });
    const totalInstances = field.children.reduce((sum: number, c: any) => sum + c.count, 0);
    expect(totalInstances).toBe(blades.length);
  });

  it("adds the field to the scene when one is provided", () => {
    const fakeScene = { added: [] as any[], add(o: any) { this.added.push(o); } };
    const field = createRouteSageField(fakeScene, { route: ROUTE });
    expect(fakeScene.added).toContain(field);
  });
});

describe("flora — floraVisibleAt (hysteresis distance cull)", () => {
  const showSq = FLORA_CULL_SHOW * FLORA_CULL_SHOW;
  const hideSq = FLORA_CULL_HIDE * FLORA_CULL_HIDE;

  it("has a real hysteresis gap (show radius < hide radius)", () => {
    expect(FLORA_CULL_SHOW).toBeLessThan(FLORA_CULL_HIDE);
  });

  it("keeps a visible node visible until it passes the hide radius", () => {
    expect(floraVisibleAt(true, 50 * 50, showSq, hideSq)).toBe(true);
    expect(floraVisibleAt(true, 80 * 80, showSq, hideSq)).toBe(true); // inside the gap: sticky
    expect(floraVisibleAt(true, 90 * 90, showSq, hideSq)).toBe(false); // beyond hide: cull
  });

  it("keeps a hidden node hidden until it re-enters the show radius", () => {
    expect(floraVisibleAt(false, 100 * 100, showSq, hideSq)).toBe(false);
    expect(floraVisibleAt(false, 80 * 80, showSq, hideSq)).toBe(false); // inside the gap: sticky
    expect(floraVisibleAt(false, 70 * 70, showSq, hideSq)).toBe(true); // within show: re-show
  });

  it("is boundary-stable at exactly the hide radius (no flicker)", () => {
    expect(floraVisibleAt(true, FLORA_CULL_HIDE * FLORA_CULL_HIDE)).toBe(true);
    expect(floraVisibleAt(true, (FLORA_CULL_HIDE + 1) * (FLORA_CULL_HIDE + 1))).toBe(false);
  });
});
