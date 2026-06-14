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

// Region-keyed casts. "westward" is the home-ground ambient crowd; "calico" is the
// free-town cast drawn from the treatment's named characters (Marisol Vega, Silas
// Tally, Dr. Adaeze Okafor) plus role-keyed locals (the elected sheriff, a Caldera
// freeholder), each anchored to its building in CALICO_FLATS/CALICO_DRESSING and
// reading as a distinct faction silhouette (saloon warm / Tally cold-black / iron-
// doctor teal-chrome / law steel-blue / freeholder sun-bleached dust).
const NPC_SPECS_BY_LOCALE = {
  westward: [
    // Diversified tints + wider height range so the street reads as a distinct cast
    // (rust coat / dark duster / pale linen / warm mids), not a sea of beige clones.
    // Home-ground townsfolk read as Civic (the town that keeps the lamps lit).
    { id: "mabel", name: "Mabel", variant: "vest", scale: 0.92, tint: "#6b3822", faction: "civic", speed: 1.2, pause: 1.8, waypoints: [{ x: 3, z: 4 }, { x: 7, z: 4 }, { x: 7.5, z: 2 }, { x: 3, z: 2.2 }] },
    { id: "cole", name: "Cole", variant: "drifter", scale: 1.12, tint: "#1c1410", faction: "civic", speed: 1.45, pause: 1.1, waypoints: [{ x: 5, z: 3.2 }, { x: 8, z: 5 }, { x: 6, z: 1.6 }] },
    { id: "rosa", name: "Rosa", variant: "vendor", scale: 0.9, tint: "#f5eed8", faction: "civic", speed: 1.0, pause: 2.2, waypoints: [{ x: 2.6, z: 5.2 }, { x: 4.4, z: 3.4 }] },
    { id: "hank", name: "Hank", variant: "drifter", scale: 1.04, tint: "#7a3020", faction: "civic", speed: 1.35, pause: 1.5, waypoints: [{ x: 10.5, z: 6.8 }, { x: 16, z: 6.4 }, { x: 16, z: 7.6 }, { x: 11, z: 7.2 }] },
    { id: "pearl", name: "Pearl", variant: "vendor", scale: 0.98, tint: "#cdb39a", faction: "civic", speed: 1.15, pause: 2.0, waypoints: [{ x: 13, z: 5.4 }, { x: 15.5, z: 6.6 }, { x: 12.5, z: 6.8 }] },
  ],
  calico: [
    // Marisol Vega — saloon owner of the Neutral Ground, your competitor (§133).
    // Works the north boardwalk fronting the saloon row (saloons at y≈5.4). Civic —
    // a free-town keeper, not a corp hand.
    { id: "marisol", name: "Marisol Vega", variant: "vendor", scale: 0.98, tint: "#7a4a55", faction: "civic", speed: 1.05, pause: 2.1, waypoints: [{ x: -47.4, z: 6.7 }, { x: -49.2, z: 6.7 }, { x: -48.3, z: 7.5 }] },
    // Silas Tally — yes, that Tally (§136). The collector works the gallows end of
    // the street; lean, dark, unhurried. They don't take scrip.
    { id: "silas", name: "Silas Tally", variant: "drifter", scale: 1.14, tint: "#15171c", faction: "tally", speed: 1.3, pause: 1.0, waypoints: [{ x: -47.6, z: 11.0 }, { x: -50.2, z: 11.2 }, { x: -48.6, z: 10.1 }] },
    // Dr. Adaeze Okafor — your iron doctor, knows the Executor better than anyone
    // (§135). Anchored to the iron-doctor wagon on the eastern approach (-39.5,5.5).
    // Iron doctors are the Circuit Riders' hands on the chrome.
    { id: "adaeze", name: "Dr. Okafor", variant: "vest", scale: 0.96, tint: "#2f6b66", faction: "circuit", speed: 1.0, pause: 2.3, waypoints: [{ x: -40.6, z: 6.2 }, { x: -41.9, z: 6.9 }, { x: -39.5, z: 6.6 }] },
    // The elected sheriff — Calico's civic anchor (§27). Steel-blue law, patrols the
    // south shoulder in front of the Sheriff's Office (-51,12.6). Role, not a named.
    { id: "sheriff_calico", name: "Calico Sheriff", variant: "vest", scale: 1.06, tint: "#4a5a6e", faction: "civic", speed: 1.2, pause: 1.6, waypoints: [{ x: -50.0, z: 11.9 }, { x: -52.6, z: 12.0 }, { x: -51.0, z: 11.2 }] },
    // A Caldera freeholder — off-grid, devout, armed (§28), down from the rim and
    // wary of the Cross name. Drifts the unlit west run by the water tower.
    { id: "freeholder", name: "Caldera Freeholder", variant: "drifter", scale: 1.0, tint: "#8a6f3e", faction: "freeholder", speed: 1.1, pause: 1.9, waypoints: [{ x: -56.0, z: 7.6 }, { x: -58.6, z: 7.8 }, { x: -55.0, z: 7.2 }] },
  ],
};

// Per-NPC greeting flavour layered over npcMemory's trust-level defaults. ids are
// globally unique across locales, so one table serves every cast.
const GREETINGS = {
  mabel: { neutral: "Mind the dust, traveler.", warm: "Always glad of a familiar face." },
  cole: { neutral: "You lost, friend?", warm: "Back on the road again, I see." },
  rosa: { neutral: "Lookin' to trade?", warm: "Got somethin' set aside for you." },
  hank: { neutral: "Quiet day on the road.", warm: "Good to see you upright." },
  pearl: { neutral: "Watch the heat out there.", warm: "Stop a spell, you've earned it." },
  marisol: {
    neutral: "Marisol Vega — I run the Neutral Ground. I know who you are, Cross. We drink together or we bury each other. Could be both.",
    warm: "Back at my bar, Cross? Good. The Flats runs smoother when we're not pointing iron at each other.",
  },
  silas: {
    neutral: "Tally Men collect, friend. Your father knew that. The marker doesn't care whose neck it rides now.",
    warm: "Still walking, Cross. The Tally Men do appreciate a debtor who stays easy to find.",
  },
  adaeze: {
    neutral: "Dr. Okafor. I put that ghost in your skull — I'd know if it started lying to you. Come see me before it does.",
    warm: "The implant holding steady? Tell me everything. Abram's voice has a way of getting louder when no one's listening.",
  },
  sheriff_calico: {
    neutral: "Sheriff of Calico Flats — elected, and unbought. This is a free town. Keep it that way and we'll have no quarrel.",
    warm: "You've kept it clean in my town. Out here, that buys a measure of trust most coin can't.",
  },
  freeholder: {
    neutral: "Caldera rim, born and staying. We remember what the water cost. You'd do well to remember too, Cross.",
    warm: "You keep coming back to the Flats. Maybe there's more rim in you than there is Cross.",
  },
};

export async function createTownsfolk(scene, opts = {}) {
  const roster = NPC_SPECS_BY_LOCALE[opts.locale] || NPC_SPECS_BY_LOCALE.westward;
  const specs = roster.slice(0, opts.count ?? roster.length);
  const npcs = await Promise.all(
    specs.map(async (s) => {
      const url = VARIANT_URL[s.variant] || VARIANT_URL.drifter;
      const character = await createAnimatedCharacter(url, { tint: s.tint });
      character.group.scale.setScalar(s.scale ?? 1);
      const wander = createWander({ waypoints: s.waypoints, speed: s.speed, pause: s.pause });
      character.group.position.set(s.waypoints[0].x, 0, s.waypoints[0].z);
      scene.add(character.group);
      const lines = GREETINGS[s.id] || { neutral: "Howdy, stranger.", warm: "Good to see you again." };
      return { character, wander, start: s.waypoints[0], name: s.name, id: s.id, faction: s.faction ?? null, met: 0, lines };
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
    return { name: interactable.name, line, id: interactable.id, faction: interactable.faction };
  }

  return { npcs, update, getInteractable, talk };
}
