import { describe, expect, it } from "vitest";
import { MOUNT_GAITS, stepMount } from "../src/render3d/mountController.js";

const approx = (n: number, t: number, eps = 1e-6) => Math.abs(n - t) <= eps;
const start = { position: { x: 0, z: 0 }, yaw: 0, speed: 0 };

describe("mountController — stepMount", () => {
  it("idle with no throttle stays put and at zero speed", () => {
    const next = stepMount({ ...start, input: {}, dt: 1 });
    expect(approx(next.position.x, 0)).toBe(true);
    expect(approx(next.position.z, 0)).toBe(true);
    expect(next.speed).toBe(0);
  });

  it("W accelerates from rest toward trot but not instantly", () => {
    const next = stepMount({ ...start, input: { forward: true }, dt: 0.1 });
    expect(next.speed).toBeGreaterThan(0);
    expect(next.speed).toBeLessThan(MOUNT_GAITS.trotSpeed);
  });

  it("W held long enough caps at trot speed; +Shift caps at gallop", () => {
    let s = { ...start };
    for (let i = 0; i < 200; i++) s = stepMount({ ...s, input: { forward: true }, dt: 0.1 });
    expect(approx(s.speed, MOUNT_GAITS.trotSpeed)).toBe(true);
    let g = { ...start };
    for (let i = 0; i < 200; i++) g = stepMount({ ...g, input: { forward: true, shift: true }, dt: 0.1 });
    expect(approx(g.speed, MOUNT_GAITS.gallopSpeed)).toBe(true);
  });

  it("releasing throttle decelerates back to a stop", () => {
    let s = { ...start, speed: MOUNT_GAITS.gallopSpeed };
    for (let i = 0; i < 200; i++) s = stepMount({ ...s, input: {}, dt: 0.1 });
    expect(s.speed).toBe(0);
  });

  it("the horse only moves where it faces (no strafing)", () => {
    // yaw=0 → forward is -Z. Holding 'right' must NOT translate sideways; it reins-turns.
    const next = stepMount({ ...start, speed: 5, input: { right: true, forward: true }, dt: 0.1 });
    expect(next.yaw).toBeLessThan(0); // reined toward the right (yaw decreases)
    // displacement is along the (new) facing, never along world +X with yaw≈0
    expect(Math.abs(next.position.x)).toBeLessThan(Math.abs(next.position.z));
  });

  it("mouse look turns the heading using the stepPlayer convention", () => {
    const next = stepMount({ ...start, input: { lookDx: 100 }, dt: 0.016 });
    expect(next.yaw).toBeLessThan(0); // cursor right → yaw decreases, same as stepPlayer
  });
});
