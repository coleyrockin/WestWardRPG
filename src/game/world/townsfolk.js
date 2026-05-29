// Townsfolk — ambient NPCs that bring the street to life (Living World slice 3).
// Each reuses the one rigged character (SkeletonUtils.clone inside
// createAnimatedCharacter) with a per-NPC colour tint, following a fixed wander
// loop and crossfading Idle↔Walk by movement. Non-interactive this slice.
//
// Deterministic: fixed waypoints + pauses, and frozen to their start pose under
// the ?visual capture flag so the golden-image gate stays stable.

import { createAnimatedCharacter } from "./animatedCharacter.js";
import { createWander, stepWander } from "./npcWander.js";

// Loops sit in the SW town cluster (saloon/storefront/porches ≈ x2–8, y2–5) and
// along the town-east road, clear of the player spawn (9.5,8.5) and the hero
// cluster (jobBoard/cache/wagon/slime ≈ x12–14, y8.5–10.5).
// Variety: per-NPC body variant (drifter/vendor/vest), colour tint, and height
// scale — so the townsfolk read as distinct people, not clones.
const VARIANT_URL = {
  drifter: "/models/character.glb",
  vendor: "/models/character_vendor.glb",
  vest: "/models/character_vest.glb",
};
const NPC_SPECS = [
  { variant: "vest", scale: 1.0, tint: "#e8dcc8", speed: 1.2, pause: 1.8, waypoints: [{ x: 3, z: 4 }, { x: 7, z: 4 }, { x: 7.5, z: 2 }, { x: 3, z: 2.2 }] },
  { variant: "drifter", scale: 1.06, tint: "#cdb39a", speed: 1.45, pause: 1.1, waypoints: [{ x: 5, z: 3.2 }, { x: 8, z: 5 }, { x: 6, z: 1.6 }] },
  { variant: "vendor", scale: 0.94, tint: "#f0e6d4", speed: 1.0, pause: 2.2, waypoints: [{ x: 2.6, z: 5.2 }, { x: 4.4, z: 3.4 }] },
  { variant: "drifter", scale: 0.99, tint: "#b59a82", speed: 1.35, pause: 1.5, waypoints: [{ x: 10.5, z: 6.8 }, { x: 16, z: 6.4 }, { x: 16, z: 7.6 }, { x: 11, z: 7.2 }] },
  { variant: "vendor", scale: 0.97, tint: "#d8c2a2", speed: 1.15, pause: 2.0, waypoints: [{ x: 13, z: 5.4 }, { x: 15.5, z: 6.6 }, { x: 12.5, z: 6.8 }] },
];

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
      return { character, wander, start: s.waypoints[0], scale: s.scale ?? 1 };
    }),
  );

  function update(dt, frozen) {
    for (const npc of npcs) {
      if (frozen) {
        npc.character.group.position.set(npc.start.x, 0, npc.start.z);
        npc.character.update(0, false);
        continue;
      }
      const s = stepWander(npc.wander, dt);
      npc.character.group.position.x = s.x;
      npc.character.group.position.z = s.z;
      npc.character.group.rotation.y = s.yaw;
      npc.character.update(dt, s.moving);
    }
  }

  return { npcs, update };
}
