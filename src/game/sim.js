// @experimental — ARCHIVED / ORPHANED. Imported by nothing in production (not
// src/main.js, not the render3d spike). This is the deterministic renderer seam that
// was never wired in. Per the 2026-06-02 renderer decision, Canvas (src/main.js) is the
// source of truth; revive this only to route shipped systems through it. See
// docs/EXPERIMENTS.md.
//
// Event-sourced, fixed-timestep simulation core for the WestWard 3D engine.
//
// The whole game is a pure function of (seed, input-log): createInitialState
// seeds a world, stepSimulation(state, commands, dt) folds one tick WITHOUT
// mutating its input, and runSimulation replays a command log to a final state.
// hashState over the result is the determinism gate; toRenderState projects the
// sim into an immutable render-state the renderer consumes (renderer = pure,
// swappable, headless-skippable). No Three.js here — this runs in node.
//
// This is the seed of the engine, not the game: the demo world (a player + RNG
// wander critters in a bounded plane) exists only to exercise RNG + ECS +
// command-sourcing so the determinism gate is meaningful. Real systems replace
// the bodies; the (seed, input-log) contract stays.

import { createWorld, spawn, query, getComponent, cloneWorld } from "./ecs.js";
import { rngRange } from "./rng.js";
import { hashState } from "./stateHash.js";

export { hashState };
export const FIXED_DT = 1 / 60;

const BOUNDS = { minX: -20, maxX: 20, minZ: -20, maxZ: 20 };
const PLAYER_SPEED = 6;
const CRITTER_SPEED = 2;

const clampUnit = (n) => Math.max(-1, Math.min(1, Number.isFinite(n) ? n : 0));
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export function createInitialState(seed = 1) {
  const world = createWorld();
  const playerId = spawn(world, {
    tag: { kind: "player" },
    position: { x: 0, z: 0 },
    velocity: { dx: 0, dz: 0 },
    health: { hp: 100 },
  });
  return { tick: 0, rng: { seed: (seed >>> 0) || 1 }, playerId, world };
}

// One sim tick. Returns a NEW state; never mutates `state`.
export function stepSimulation(state, commands = [], dt = FIXED_DT) {
  const next = {
    tick: state.tick + 1,
    rng: { seed: state.rng.seed },
    playerId: state.playerId,
    world: cloneWorld(state.world),
  };
  for (const cmd of commands) applyCommand(next, cmd);
  integrate(next, dt);
  return next;
}

function applyCommand(next, cmd) {
  if (!cmd || typeof cmd.type !== "string") return;
  if (cmd.type === "move") {
    const vel = getComponent(next.world, next.playerId, "velocity");
    if (vel) {
      vel.dx = clampUnit(cmd.dx);
      vel.dz = clampUnit(cmd.dz);
    }
  } else if (cmd.type === "spawn") {
    const r1 = rngRange(next.rng, BOUNDS.minX, BOUNDS.maxX);
    const r2 = rngRange(r1.state, BOUNDS.minZ, BOUNDS.maxZ);
    next.rng = r2.state;
    spawn(next.world, {
      tag: { kind: cmd.kind || "critter" },
      position: { x: r1.value, z: r2.value },
      velocity: { dx: 0, dz: 0 },
      health: { hp: 30 },
    });
  }
}

function integrate(next, dt) {
  // Critter wander: each critter nudges its heading via the shared RNG, in
  // ascending-id order so the stream is consumed deterministically.
  for (const id of query(next.world, "tag", "velocity")) {
    if (getComponent(next.world, id, "tag").kind !== "critter") continue;
    const r1 = rngRange(next.rng, -1, 1);
    const r2 = rngRange(r1.state, -1, 1);
    next.rng = r2.state;
    const vel = getComponent(next.world, id, "velocity");
    vel.dx = clampUnit(vel.dx + r1.value * 0.5);
    vel.dz = clampUnit(vel.dz + r2.value * 0.5);
  }
  // Movement integration + bounds clamp for everything that moves.
  for (const id of query(next.world, "position", "velocity")) {
    const pos = getComponent(next.world, id, "position");
    const vel = getComponent(next.world, id, "velocity");
    const tag = getComponent(next.world, id, "tag");
    const speed = tag && tag.kind === "player" ? PLAYER_SPEED : CRITTER_SPEED;
    pos.x = clamp(pos.x + vel.dx * speed * dt, BOUNDS.minX, BOUNDS.maxX);
    pos.z = clamp(pos.z + vel.dz * speed * dt, BOUNDS.minZ, BOUNDS.maxZ);
  }
}

// Replay an input-log (array of per-frame command arrays) to a final state.
export function runSimulation(seed, inputLog = [], dt = FIXED_DT) {
  let state = createInitialState(seed);
  for (const frame of inputLog) state = stepSimulation(state, frame || [], dt);
  return state;
}

// Immutable render-state projection. Pure data, ascending id order; no Three.js.
export function toRenderState(state) {
  const drawables = query(state.world, "tag", "position").map((id) => {
    const pos = getComponent(state.world, id, "position");
    return { id, kind: getComponent(state.world, id, "tag").kind, x: pos.x, z: pos.z };
  });
  return { tick: state.tick, drawables };
}
