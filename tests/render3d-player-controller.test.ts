// Unit tests for the Three.js spike's player controller. Exercises the pure
// stepPlayer() exports and the DOM shell's input handling against a fake
// document — no Three.js or real DOM required.

import { describe, expect, it, vi } from "vitest";
import {
  createPlayerController,
  forwardVector,
  rightVector,
  stepPlayer,
} from "../src/render3d/playerController.js";

const approx = (n: number, target: number, eps = 1e-6) =>
  Math.abs(n - target) <= eps;

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

function makeFakeCamera() {
  return {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0, order: "XYZ" },
    // Mirrors three.js: writes the camera's world forward into the passed
    // vector and returns it. Default forward is -Z.
    getWorldDirection(out: { x: number; y: number; z: number }) {
      out.x = 0; out.y = 0; out.z = -1;
      return out;
    },
  };
}

describe("playerController — basis vectors", () => {
  it("forward at yaw=0 looks toward -Z", () => {
    const f = forwardVector(0);
    expect(approx(f.x, 0)).toBe(true);
    expect(approx(f.z, -1)).toBe(true);
  });

  it("forward at yaw=-π/2 looks toward +X (east)", () => {
    const f = forwardVector(-Math.PI / 2);
    expect(approx(f.x, 1)).toBe(true);
    expect(approx(f.z, 0)).toBe(true);
  });

  it("right is forward rotated -90° around Y", () => {
    const r = rightVector(0);
    expect(approx(r.x, 1)).toBe(true);
    expect(approx(r.z, 0)).toBe(true);
  });
});

describe("playerController — stepPlayer movement", () => {
  const start = { position: { x: 0, z: 0 }, yaw: 0 };

  it("no input held → no movement, no yaw change", () => {
    const next = stepPlayer({ ...start, input: {}, dt: 1 });
    expect(next.position.x).toBe(0);
    expect(next.position.z).toBe(0);
    expect(next.yaw).toBe(0);
  });

  it("forward at yaw=0 walks toward -Z at 4 u/s", () => {
    const next = stepPlayer({ ...start, input: { forward: true }, dt: 1 });
    expect(approx(next.position.x, 0)).toBe(true);
    expect(approx(next.position.z, -4)).toBe(true);
  });

  it("forward + shift sprints at 8 u/s", () => {
    const next = stepPlayer({ ...start, input: { forward: true, shift: true }, dt: 1 });
    expect(approx(next.position.z, -8)).toBe(true);
  });

  it("back is opposite of forward", () => {
    const next = stepPlayer({ ...start, input: { back: true }, dt: 1 });
    expect(approx(next.position.z, 4)).toBe(true);
  });

  it("strafe right is orthogonal to forward", () => {
    const next = stepPlayer({ ...start, input: { right: true }, dt: 1 });
    expect(approx(next.position.x, 4)).toBe(true);
    expect(approx(next.position.z, 0)).toBe(true);
  });

  it("diagonal move normalizes — forward+right not faster than forward", () => {
    const diag = stepPlayer({ ...start, input: { forward: true, right: true }, dt: 1 });
    const dist = Math.hypot(diag.position.x, diag.position.z);
    expect(approx(dist, 4, 1e-6)).toBe(true);
  });

  it("dt scales linearly", () => {
    const half = stepPlayer({ ...start, input: { forward: true }, dt: 0.5 });
    expect(approx(half.position.z, -2)).toBe(true);
  });

  it("forward at yaw=-π/2 walks toward +X (east)", () => {
    const next = stepPlayer({
      position: { x: 0, z: 0 },
      yaw: -Math.PI / 2,
      input: { forward: true },
      dt: 1,
    });
    expect(approx(next.position.x, 4)).toBe(true);
    expect(approx(next.position.z, 0, 1e-6)).toBe(true);
  });
});

describe("playerController — stepPlayer look", () => {
  it("lookDx > 0 decreases yaw (turn right)", () => {
    const before = 0;
    const next = stepPlayer({
      position: { x: 0, z: 0 },
      yaw: before,
      input: { lookDx: 100, lookDy: 0 },
      dt: 0,
      sensitivity: 0.01,
    });
    expect(next.yaw).toBeLessThan(before);
    expect(approx(next.yaw, -1, 1e-9)).toBe(true);
  });

  it("lookDy > 0 decreases pitch (look down)", () => {
    const before = 0;
    const next = stepPlayer({
      position: { x: 0, z: 0 },
      yaw: 0,
      pitch: before,
      input: { lookDy: 50 },
      dt: 0,
      sensitivity: 0.01,
    });
    expect(next.pitch).toBeLessThan(before);
    expect(approx(next.pitch, -0.5, 1e-9)).toBe(true);
  });

  it("pitch is clamped to ±π/3", () => {
    // Drag down hard enough to demand -10 rad of pitch; result must clamp.
    const next = stepPlayer({
      position: { x: 0, z: 0 },
      yaw: 0,
      pitch: 0,
      input: { lookDy: 1000 },
      dt: 0,
      sensitivity: 0.01,
    });
    expect(approx(next.pitch, -Math.PI / 3, 1e-9)).toBe(true);
  });

  it("pitch does not affect XZ movement direction", () => {
    // Looking straight down with pitch=-π/3, walking forward still moves on XZ.
    const next = stepPlayer({
      position: { x: 0, z: 0 },
      yaw: 0,
      pitch: -Math.PI / 3,
      input: { forward: true },
      dt: 1,
    });
    expect(approx(next.position.z, -4, 1e-6)).toBe(true);
    expect(approx(next.position.x, 0, 1e-6)).toBe(true);
  });

  it("look is applied before movement — forward uses post-look heading", () => {
    // Starting yaw 0 (looking -Z), drag right by π/2 radians, then walk forward.
    // After look, yaw = -π/2 → forward = +X → move should be along +X.
    const dxForQuarterTurn = (Math.PI / 2) / 0.01; // sensitivity = 0.01
    const next = stepPlayer({
      position: { x: 0, z: 0 },
      yaw: 0,
      input: { forward: true, lookDx: dxForQuarterTurn },
      dt: 1,
      sensitivity: 0.01,
    });
    expect(approx(next.position.x, 4, 1e-6)).toBe(true);
    expect(approx(next.position.z, 0, 1e-6)).toBe(true);
  });
});

describe("playerController — DOM shell", () => {
  it("seeds yaw from camera.getWorldDirection (default looks -Z → yaw 0)", () => {
    const doc = makeFakeDocument();
    const camera = makeFakeCamera();
    const ctrl = createPlayerController(camera, { document: doc as any });
    expect(approx(ctrl.yaw, 0, 1e-9)).toBe(true);
    ctrl.dispose();
  });

  it("keydown W moves the camera forward over time", () => {
    const doc = makeFakeDocument();
    const camera = makeFakeCamera();
    const ctrl = createPlayerController(camera, { document: doc as any });
    doc.dispatch("keydown", { code: "KeyW" });
    ctrl.update(1);
    expect(approx(camera.position.z, -4, 1e-6)).toBe(true);
    expect(camera.position.y).toBe(1.8);
    ctrl.dispose();
  });

  it("keyup releases the key — subsequent update doesn't move", () => {
    const doc = makeFakeDocument();
    const camera = makeFakeCamera();
    const ctrl = createPlayerController(camera, { document: doc as any });
    doc.dispatch("keydown", { code: "KeyW" });
    ctrl.update(1);
    doc.dispatch("keyup", { code: "KeyW" });
    const zBefore = camera.position.z;
    ctrl.update(1);
    expect(camera.position.z).toBe(zBefore);
    ctrl.dispose();
  });

  it("mouse drag rotates yaw — deltas are consumed each update", () => {
    const doc = makeFakeDocument();
    const canvas: any = {
      _h: {} as Record<string, (e: any) => void>,
      addEventListener(t: string, fn: any) { this._h[t] = fn; },
      removeEventListener(t: string) { delete this._h[t]; },
    };
    const camera = makeFakeCamera();
    const ctrl = createPlayerController(camera, {
      document: doc as any, canvas, sensitivity: 0.01,
    });
    canvas._h.mousedown({ button: 0, clientX: 100, clientY: 100 });
    doc.dispatch("mousemove", { clientX: 200, clientY: 100 });
    doc.dispatch("mouseup", {});
    ctrl.update(0);
    expect(approx(ctrl.yaw, -1, 1e-9)).toBe(true);
    // Subsequent update with no new drag must NOT rotate again (deltas drained).
    ctrl.update(0);
    expect(approx(ctrl.yaw, -1, 1e-9)).toBe(true);
    ctrl.dispose();
  });

  it("dispose removes listeners — later keydown does not move the camera", () => {
    const doc = makeFakeDocument();
    const camera = makeFakeCamera();
    const ctrl = createPlayerController(camera, { document: doc as any });
    ctrl.dispose();
    doc.dispatch("keydown", { code: "KeyW" });
    ctrl.update(1);
    expect(camera.position.z).toBe(0);
  });
});
