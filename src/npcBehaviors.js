// NPC behavior trees. Each tree is evaluated once per frame via tick().
// Context shape: { dt, timeOfDay, isBlocking, dist, player, TAU }
//
// NPC wander state lives on the npc object itself (wanderAngle, wanderTimer)
// so save/load continues to work without changes.

import { selector, sequence, condition, action, tick } from "./behaviorTree.js";

const DUSK_THRESHOLD = 0.72;  // timeOfDay > this → return home, stay put
const NPC_WANDER_SPEED = 0.42;
const NPC_PLAYER_CLEARANCE = 0.9;

// Returns home at night, wanders during day.
const TOWNSPERSON_TREE = selector([
  // Night branch: return to home position and stay
  sequence([
    condition((npc, ctx) => ctx.timeOfDay > DUSK_THRESHOLD),
    action((npc, ctx) => {
      const dx = npc.homeX - npc.x;
      const dy = npc.homeY - npc.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.08) return true;
      const nx = npc.x + (dx / d) * NPC_WANDER_SPEED * ctx.dt;
      const ny = npc.y + (dy / d) * NPC_WANDER_SPEED * ctx.dt;
      if (!ctx.isBlocking(nx, npc.y) && ctx.dist({ x: nx, y: npc.y }, ctx.player) > NPC_PLAYER_CLEARANCE) npc.x = nx;
      if (!ctx.isBlocking(npc.x, ny) && ctx.dist({ x: npc.x, y: ny }, ctx.player) > NPC_PLAYER_CLEARANCE) npc.y = ny;
      return true;
    }),
  ]),
  // Day branch: wander within radius
  action((npc, ctx) => {
    npc.wanderTimer -= ctx.dt;
    if (npc.wanderTimer <= 0) {
      npc.wanderAngle = Math.random() * ctx.TAU;
      npc.wanderTimer = 1.8 + Math.random() * 2.2;
    }
    const tx = npc.homeX + Math.cos(npc.wanderAngle) * npc.wanderRadius;
    const ty = npc.homeY + Math.sin(npc.wanderAngle) * npc.wanderRadius;
    const dx = tx - npc.x;
    const dy = ty - npc.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.05) return true;
    const nx = npc.x + (dx / d) * NPC_WANDER_SPEED * ctx.dt;
    const ny = npc.y + (dy / d) * NPC_WANDER_SPEED * ctx.dt;
    if (!ctx.isBlocking(nx, npc.y) && ctx.dist({ x: nx, y: npc.y }, ctx.player) > NPC_PLAYER_CLEARANCE) npc.x = nx;
    if (!ctx.isBlocking(npc.x, ny) && ctx.dist({ x: npc.x, y: ny }, ctx.player) > NPC_PLAYER_CLEARANCE) npc.y = ny;
    return true;
  }),
]);

export function tickNpc(npc, ctx) {
  return tick(TOWNSPERSON_TREE, npc, ctx);
}

export { DUSK_THRESHOLD };
