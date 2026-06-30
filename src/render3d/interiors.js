// Interior definitions for Rustwater's loaded buildings + room builders. Each
// interior is built in its own faraway coordinate pocket (the street is hidden
// while you're inside, so there's never any overlap) and shown/hidden by
// locationView on enter/exit. Data (spawn/proxies/targets) is plain; the room is
// a THREE.Group. Built once per location, then cached.
//
// Breadth pass: all five buildings are enterable, each with a character you can
// talk to. The saloon (The Rusty Spur) is dressed; the other four use a generic
// character-room until their depth pass. Adding a building is just data — the
// enter/exit + talk wiring is generic in locationView + spike.js.

import * as THREE from "three";

function aabb(cx, cz, w, d, src = "interior") {
  return { minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2, source: src };
}

// Shared room shell: floor + ceiling + 4 walls with a doorway gap on the +Z wall.
function roomShell(group, origin, { W, D, wallH = 3.4, wallT = 0.3, doorHW = 1.1, floorMat, wallMat }) {
  const hw = W / 2, hd = D / 2;
  const add = (geo, mat, x, y, z, rot = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(origin.x + x, y, origin.z + z);
    if (rot) m.rotation.y = rot;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };
  add(new THREE.BoxGeometry(W, 0.2, D), floorMat, 0, -0.1, 0);
  add(new THREE.BoxGeometry(W, 0.2, D), wallMat, 0, wallH, 0);
  add(new THREE.BoxGeometry(W, wallH, wallT), wallMat, 0, wallH / 2, -hd);
  add(new THREE.BoxGeometry(wallT, wallH, D), wallMat, -hw, wallH / 2, 0);
  add(new THREE.BoxGeometry(wallT, wallH, D), wallMat, hw, wallH / 2, 0);
  const segW = hw - doorHW;
  add(new THREE.BoxGeometry(segW, wallH, wallT), wallMat, -(doorHW + hw) / 2, wallH / 2, hd);
  add(new THREE.BoxGeometry(segW, wallH, wallT), wallMat, (doorHW + hw) / 2, wallH / 2, hd);
  const proxies = [
    aabb(origin.x, origin.z - hd, W, wallT),
    aabb(origin.x - hw, origin.z, wallT, D),
    aabb(origin.x + hw, origin.z, wallT, D),
    aabb(origin.x - (doorHW + hw) / 2, origin.z + hd, segW, wallT),
    aabb(origin.x + (doorHW + hw) / 2, origin.z + hd, segW, wallT),
  ];
  return { add, proxies, hw, hd, segW, doorHW, wallH };
}

// A stylized standing NPC figure (a few primitives). `accent` is the right arm —
// salvaged iron, a med-gauntlet, etc. — the cyber note that distinguishes them.
function buildNpcFigure(add, x, z, { body = "#5a4a3a", head = "#caa07e", accent = "#8a8f98" } = {}) {
  const bodyMat = new THREE.MeshStandardMaterial({ color: body, roughness: 0.85 });
  const headMat = new THREE.MeshStandardMaterial({ color: head, roughness: 0.7 });
  const accMat = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.4, metalness: 0.7 });
  add(new THREE.CylinderGeometry(0.26, 0.34, 1.1, 12), bodyMat, x, 0.55, z);
  add(new THREE.SphereGeometry(0.22, 16, 12), headMat, x, 1.28, z);
  add(new THREE.CylinderGeometry(0.07, 0.07, 0.7, 8), headMat, x - 0.34, 0.9, z, 0.3);
  add(new THREE.CylinderGeometry(0.08, 0.08, 0.72, 8), accMat, x + 0.34, 0.9, z, -0.3);
}

// The Rusty Spur — a dust-and-neon frontier saloon (the dressed reference build).
function buildSaloonInterior(origin) {
  const group = new THREE.Group();
  group.name = "interior-saloon";
  const plank = new THREE.MeshStandardMaterial({ color: "#2e2218", roughness: 0.95 });
  const wood = new THREE.MeshStandardMaterial({ color: "#3a2a1c", roughness: 0.92 });
  const bar = new THREE.MeshStandardMaterial({ color: "#4a3120", roughness: 0.55, metalness: 0.06 });
  const metal = new THREE.MeshStandardMaterial({ color: "#4a4a52", roughness: 0.5, metalness: 0.6 });
  const bottle = new THREE.MeshStandardMaterial({ color: "#3a5a42", roughness: 0.25, metalness: 0.1 });
  const neon = new THREE.MeshStandardMaterial({ color: "#0a0a0a", emissive: "#27d6ff", emissiveIntensity: 2.4, roughness: 0.4 });

  const { add, proxies, hd } = roomShell(group, origin, { W: 10, D: 9, floorMat: plank, wallMat: wood });
  const barZ = -hd + 1.7;
  add(new THREE.BoxGeometry(8, 1.1, 0.8), bar, 0, 0.55, barZ);
  add(new THREE.BoxGeometry(7.4, 1.5, 0.3), wood, 0, 1.75, -hd + 0.25);
  for (let i = -3; i <= 3; i++) add(new THREE.CylinderGeometry(0.07, 0.08, 0.42, 8), bottle, i * 0.7, 1.6, -hd + 0.3);
  add(new THREE.BoxGeometry(2.6, 0.5, 0.08), neon, 0, 2.55, -hd + 0.18);
  for (const sx of [-2.4, -1.2, 0, 1.2, 2.4]) {
    add(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 12), bar, sx, 0.78, barZ + 1.0);
    add(new THREE.CylinderGeometry(0.05, 0.05, 0.72, 8), metal, sx, 0.4, barZ + 1.0);
  }
  const table = (tx, tz) => {
    add(new THREE.CylinderGeometry(0.6, 0.6, 0.1, 16), wood, tx, 0.78, tz);
    add(new THREE.CylinderGeometry(0.06, 0.06, 0.7, 8), metal, tx, 0.4, tz);
    for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) add(new THREE.BoxGeometry(0.42, 0.5, 0.42), wood, tx + Math.cos(a) * 0.98, 0.5, tz + Math.sin(a) * 0.98);
  };
  table(-2.8, 2.2);
  table(2.8, 1.6);
  buildNpcFigure(add, 0, barZ - 0.7, { body: "#5a3b34", accent: "#8a8f98" }); // Mabel — iron arm
  const lamp = new THREE.PointLight("#ffcf8a", 8, 22, 1.6); lamp.position.set(origin.x, 2.9, origin.z + 0.5); group.add(lamp);
  const neonLight = new THREE.PointLight("#27d6ff", 2.4, 11, 2.0); neonLight.position.set(origin.x, 2.55, origin.z - hd + 0.6); group.add(neonLight);

  proxies.push(aabb(origin.x, origin.z + barZ, 8, 0.8), aabb(origin.x - 2.8, origin.z + 2.2, 1.3, 1.3), aabb(origin.x + 2.8, origin.z + 1.6, 1.3, 1.3));
  const targets = [
    { kind: "exitDoor", x: origin.x, y: origin.z + hd - 0.5 },
    { kind: "npcTalk", id: "mabel", name: "Mabel", x: origin.x, y: origin.z + barZ, line: "Cross's kid. I'd know that jaw anywhere. Sit — first drink's on the house, the talk never is." },
  ];
  return { group, proxies, targets };
}

// Generic character room — a plain interior with a counter + one named NPC (or a
// figure-less anchor like a desk). Used by the four not-yet-dressed buildings.
function buildCharacterRoom(origin, { tint = "#3a2c1f", neon = "#ffcf8a", npc, figure = true, npcTints }) {
  const group = new THREE.Group();
  group.name = `interior-${npc?.id || "room"}`;
  const floorMat = new THREE.MeshStandardMaterial({ color: "#2a2018", roughness: 0.96 });
  const wallMat = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.9 });
  const counterMat = new THREE.MeshStandardMaterial({ color: "#5a3d25", roughness: 0.7 });
  const { add, proxies, hd } = roomShell(group, origin, { W: 9, D: 9, floorMat, wallMat });

  const counterZ = -hd + 1.4;
  add(new THREE.BoxGeometry(5.4, 1.1, 0.8), counterMat, 0, 0.55, counterZ);
  if (figure) buildNpcFigure(add, 0, counterZ - 0.7, npcTints);
  const lamp = new THREE.PointLight(neon, 7, 20, 1.6); lamp.position.set(origin.x, 2.8, origin.z); group.add(lamp);

  proxies.push(aabb(origin.x, origin.z + counterZ, 5.4, 0.8));
  const targets = [{ kind: "exitDoor", x: origin.x, y: origin.z + hd - 0.5 }];
  if (npc) targets.push({ kind: "npcTalk", id: npc.id, name: npc.name, x: origin.x, y: origin.z + counterZ, line: npc.line });
  return { group, proxies, targets };
}

// Each interior gets its own faraway pocket (only one is ever shown; distinct
// pockets keep the cached-but-hidden groups from overlapping).
const POCKETS = { saloon: { x: 400, z: 0 }, bounty: { x: 430, z: 0 }, clinic: { x: 460, z: 0 }, store: { x: 490, z: 0 }, home: { x: 520, z: 0 } };
const spawnAt = (p) => ({ x: p.x, z: p.z + 3.0, yaw: 0 });

export const INTERIORS = {
  saloon: { id: "saloon", label: "The Rusty Spur", spawn: spawnAt(POCKETS.saloon), build: () => buildSaloonInterior(POCKETS.saloon) },
  bounty: {
    id: "bounty", label: "The Marshal's Post", spawn: spawnAt(POCKETS.bounty),
    build: () => buildCharacterRoom(POCKETS.bounty, { tint: "#33302a", neon: "#ffd9a0", npcTints: { body: "#3b4a5a", accent: "#b8b8c0" },
      npc: { id: "boone", name: "Sheriff Boone Vance", line: "Bounties go up on that board, kid, but they come from me. You want work — there's a road out east that needs clearing." } }),
  },
  clinic: {
    id: "clinic", label: "Okafor's Clinic", spawn: spawnAt(POCKETS.clinic),
    build: () => buildCharacterRoom(POCKETS.clinic, { tint: "#26302e", neon: "#7fe9d8", npcTints: { body: "#2f5a52", accent: "#9fe6da" },
      npc: { id: "okafor", name: "Dr. Okafor", line: "Hold still and I'll have you walking straight. Want more than mending? I do iron too — first augment's cheap, the second costs you something you'll miss." } }),
  },
  store: {
    id: "store", label: "Hale's Provisions", spawn: spawnAt(POCKETS.store),
    build: () => buildCharacterRoom(POCKETS.store, { tint: "#332b22", neon: "#ffe0a8", npcTints: { body: "#5a5048", accent: "#7a7a82" },
      npc: { id: "cole", name: "Cole Hale", line: "Supplies, ammunition, whatever keeps you breathing. Pay in full — I'm into the water-barons deep enough already." } }),
  },
  home: {
    id: "home", label: "The Cross House", spawn: spawnAt(POCKETS.home),
    build: () => buildCharacterRoom(POCKETS.home, { tint: "#2c2a30", neon: "#cfd6ff", figure: false,
      npc: { id: "home", name: "Abram's Desk", line: "Your father's things, just as he left them. The empire's yours now, kid — and so's the debt that came with it." } }),
  },
};

export const INTERIOR_IDS = Object.freeze(Object.keys(INTERIORS));
