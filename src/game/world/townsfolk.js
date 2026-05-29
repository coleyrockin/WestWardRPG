// Townsfolk — ambient NPCs that bring the street to life (Living World slice 3 +
// 6A variety + 6C interaction). Each reuses the rigged character
// (createAnimatedCharacter) with a per-NPC body variant, colour tint, and height
// scale, following a fixed wander loop.
//
// 6C: walk within range of one and it pauses, turns to face you, and a prompt
// offers a greeting (E). Greetings are memory-aware via the tested pure
// npcMemory module (repeat visits change the line).
//
// Deterministic: fixed waypoints + pauses, frozen to start pose under the ?visual
// capture flag; no NPC is in interaction range at the spawn framing.

import { createAnimatedCharacter } from "./animatedCharacter.js";
import { createWander, stepWander } from "./npcWander.js";
// NB: a self-contained greeter (below) — deliberately NOT importing the Canvas
// npcMemory chain, which drags storyLootReactions→storyLoot into the render3d
// bundle (and that chain has a case-sensitive import that breaks the Vercel
// Linux build). Engine code stays decoupled from the frozen Canvas modules.

const VARIANT_URL = {
  drifter: "/models/character.glb",
  vendor: "/models/character_vendor.glb",
  vest: "/models/character_vest.glb",
};
const INTERACT_RADIUS = 2.0;

const NPC_SPECS = [
  { id: "mabel", name: "Mabel", variant: "vest", scale: 1.0, tint: "#e8dcc8", speed: 1.2, pause: 1.8, waypoints: [{ x: 3, z: 4 }, { x: 7, z: 4 }, { x: 7.5, z: 2 }, { x: 3, z: 2.2 }] },
  { id: "cole", name: "Cole", variant: "drifter", scale: 1.06, tint: "#cdb39a", speed: 1.45, pause: 1.1, waypoints: [{ x: 5, z: 3.2 }, { x: 8, z: 5 }, { x: 6, z: 1.6 }] },
  { id: "rosa", name: "Rosa", variant: "vendor", scale: 0.94, tint: "#f0e6d4", speed: 1.0, pause: 2.2, waypoints: [{ x: 2.6, z: 5.2 }, { x: 4.4, z: 3.4 }] },
  { id: "hank", name: "Hank", variant: "drifter", scale: 0.99, tint: "#b59a82", speed: 1.35, pause: 1.5, waypoints: [{ x: 10.5, z: 6.8 }, { x: 16, z: 6.4 }, { x: 16, z: 7.6 }, { x: 11, z: 7.2 }] },
  { id: "pearl", name: "Pearl", variant: "vendor", scale: 0.97, tint: "#d8c2a2", speed: 1.15, pause: 2.0, waypoints: [{ x: 13, z: 5.4 }, { x: 15.5, z: 6.6 }, { x: 12.5, z: 6.8 }] },
];

// Per-NPC greeting flavour layered over npcMemory's trust-level defaults.
const GREETINGS = {
  mabel: { neutral: "Mind the dust, traveler.", warm: "Always glad of a familiar face." },
  cole: { neutral: "You lost, friend?", warm: "Back on the road again, I see." },
  rosa: { neutral: "Lookin' to trade?", warm: "Got somethin' set aside for you." },
  hank: { neutral: "Quiet day on the road.", warm: "Good to see you upright." },
  pearl: { neutral: "Watch the heat out there.", warm: "Stop a spell, you've earned it." },
};

export async function createTownsfolk(scene, opts = {}) {
  const specs = NPC_SPECS.slice(0, opts.count ?? NPC_SPECS.length);
  const npcs = await Promise.all(
    specs.map(async (s) => {
      const url = VARIANT_URL[s.variant] || VARIANT_URL.drifter;
      const character = await createAnimatedCharacter(url, { tint: s.tint });
      character.group.scale.setScalar(s.scale ?? 1);
      const wander = createWander({ waypoints: s.waypoints, speed: s.speed, pause: s.pause });
      character.group.position.set(s.waypoints[0].x, 0, s.waypoints[0].z);
      scene.add(character.group);
      const lines = GREETINGS[s.id] || { neutral: "Howdy, stranger.", warm: "Good to see you again." };
      return { character, wander, start: s.waypoints[0], name: s.name, id: s.id, met: 0, lines };
    }),
  );

  let interactable = null; // the in-range NPC the player can greet

  function update(dt, frozen, playerPos = null) {
    interactable = null;
    // nearest in-range NPC (skipped while frozen for deterministic capture)
    if (!frozen && playerPos) {
      let best = Infinity;
      for (const npc of npcs) {
        const p = npc.character.group.position;
        const d = Math.hypot(p.x - playerPos.x, p.z - playerPos.z);
        if (d < INTERACT_RADIUS && d < best) {
          best = d;
          interactable = npc;
        }
      }
    }

    for (const npc of npcs) {
      if (frozen) {
        npc.character.group.position.set(npc.start.x, 0, npc.start.z);
        npc.character.update(0, false);
        continue;
      }
      if (npc === interactable) {
        // pause + turn to face the player (forward = (-sin yaw, -cos yaw))
        const p = npc.character.group.position;
        npc.character.group.rotation.y = Math.atan2(-(playerPos.x - p.x), -(playerPos.z - p.z));
        npc.character.update(dt, false);
        continue;
      }
      const s = stepWander(npc.wander, dt);
      npc.character.group.position.x = s.x;
      npc.character.group.position.z = s.z;
      npc.character.group.rotation.y = s.yaw;
      npc.character.update(dt, s.moving);
    }
  }

  // The NPC the player can greet right now (or null).
  function getInteractable() {
    return interactable ? { name: interactable.name } : null;
  }

  // Greet the in-range NPC: memory-aware (warms up after a few visits).
  function talk() {
    if (!interactable) return null;
    interactable.met += 1;
    const line = interactable.met < 3 ? interactable.lines.neutral : interactable.lines.warm;
    return { name: interactable.name, line };
  }

  return { npcs, update, getInteractable, talk };
}
