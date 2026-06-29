// Interior definitions for Rustwater's loaded buildings + room builders. Each
// interior is built in its own faraway coordinate pocket (the street is hidden
// while you're inside, so there's never any overlap) and shown/hidden by
// locationView on enter/exit. Data (spawn/proxies/exit target) is plain; the room
// is a THREE.Group. Built once per location, then cached.
//
// Step 2b: the saloon — The Rusty Spur — is a real room (bar, back-bar + bottles,
// a neon sign for the cyber edge, stools, tables, warm + neon light). The other
// four buildings reuse the generic placeholder room until their 2c+ dressing pass.

import * as THREE from "three";

// A faraway pocket so an interior can never overlap the world (bounds are ±150).
const POCKET = { x: 400, z: 0 };

function aabb(cx, cz, w, d, src = "interior") {
  return { minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2, source: src };
}

// Shared room shell: floor + ceiling + 4 walls with a doorway gap on the +Z wall.
// Returns { group, add(geo,mat,x,y,z,rot), proxies, hw, hd, segW, doorHW }.
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
  add(new THREE.BoxGeometry(W, 0.2, D), floorMat, 0, -0.1, 0);     // floor
  add(new THREE.BoxGeometry(W, 0.2, D), wallMat, 0, wallH, 0);      // ceiling
  add(new THREE.BoxGeometry(W, wallH, wallT), wallMat, 0, wallH / 2, -hd);   // back
  add(new THREE.BoxGeometry(wallT, wallH, D), wallMat, -hw, wallH / 2, 0);   // left
  add(new THREE.BoxGeometry(wallT, wallH, D), wallMat, hw, wallH / 2, 0);    // right
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

// The Rusty Spur — a dust-and-neon frontier saloon.
function buildSaloonInterior(origin) {
  const group = new THREE.Group();
  group.name = "interior-saloon";
  const plank = new THREE.MeshStandardMaterial({ color: "#2e2218", roughness: 0.95 });
  const wood = new THREE.MeshStandardMaterial({ color: "#3a2a1c", roughness: 0.92 });
  const bar = new THREE.MeshStandardMaterial({ color: "#4a3120", roughness: 0.55, metalness: 0.06 });
  const metal = new THREE.MeshStandardMaterial({ color: "#4a4a52", roughness: 0.5, metalness: 0.6 });
  const bottle = new THREE.MeshStandardMaterial({ color: "#3a5a42", roughness: 0.25, metalness: 0.1 });
  const neon = new THREE.MeshStandardMaterial({ color: "#0a0a0a", emissive: "#27d6ff", emissiveIntensity: 2.4, roughness: 0.4 });

  const { add, proxies, hw, hd } = roomShell(group, origin, { W: 10, D: 9, floorMat: plank, wallMat: wood });

  const barZ = -hd + 1.7;
  add(new THREE.BoxGeometry(8, 1.1, 0.8), bar, 0, 0.55, barZ);                 // bar counter
  add(new THREE.BoxGeometry(7.4, 1.5, 0.3), wood, 0, 1.75, -hd + 0.25);        // back-bar shelf
  for (let i = -3; i <= 3; i++) add(new THREE.CylinderGeometry(0.07, 0.08, 0.42, 8), bottle, i * 0.7, 1.6, -hd + 0.3); // bottles
  add(new THREE.BoxGeometry(2.6, 0.5, 0.08), neon, 0, 2.55, -hd + 0.18);        // neon sign (cyber accent)
  for (const sx of [-2.4, -1.2, 0, 1.2, 2.4]) {                                  // stools
    add(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 12), bar, sx, 0.78, barZ + 1.0);
    add(new THREE.CylinderGeometry(0.05, 0.05, 0.72, 8), metal, sx, 0.4, barZ + 1.0);
  }
  const table = (tx, tz) => {                                                    // tables + chairs
    add(new THREE.CylinderGeometry(0.6, 0.6, 0.1, 16), wood, tx, 0.78, tz);
    add(new THREE.CylinderGeometry(0.06, 0.06, 0.7, 8), metal, tx, 0.4, tz);
    for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      add(new THREE.BoxGeometry(0.42, 0.5, 0.42), wood, tx + Math.cos(a) * 0.98, 0.5, tz + Math.sin(a) * 0.98);
    }
  };
  table(-2.8, 2.2);
  table(2.8, 1.6);

  const lamp = new THREE.PointLight("#ffcf8a", 8, 22, 1.6);
  lamp.position.set(origin.x, 2.9, origin.z + 0.5);
  group.add(lamp);
  const neonLight = new THREE.PointLight("#27d6ff", 2.4, 11, 2.0);
  neonLight.position.set(origin.x, 2.55, origin.z - hd + 0.6);
  group.add(neonLight);

  // Mabel Crane — owner of The Rusty Spur. Ex water-courier; the right arm is
  // salvaged iron (the cyber note). A simple stylized figure behind the bar.
  const apron = new THREE.MeshStandardMaterial({ color: "#5a3b34", roughness: 0.85 });
  const skin = new THREE.MeshStandardMaterial({ color: "#caa07e", roughness: 0.7 });
  const iron = new THREE.MeshStandardMaterial({ color: "#8a8f98", roughness: 0.4, metalness: 0.8 });
  const mz = barZ - 0.7; // behind the counter
  add(new THREE.CylinderGeometry(0.26, 0.34, 1.1, 12), apron, 0, 0.55, mz);          // torso
  add(new THREE.SphereGeometry(0.22, 16, 12), skin, 0, 1.28, mz);                     // head
  add(new THREE.CylinderGeometry(0.07, 0.07, 0.7, 8), skin, -0.34, 0.9, mz, 0.3);     // left (flesh) arm
  add(new THREE.CylinderGeometry(0.08, 0.08, 0.72, 8), iron, 0.34, 0.9, mz, -0.3);    // right (iron) arm

  const exitTarget = { kind: "exitDoor", x: origin.x, y: origin.z + hd - 0.5 };
  const mabel = {
    kind: "npcTalk",
    id: "mabel",
    name: "Mabel",
    x: origin.x,
    y: origin.z + mz,
    line: "Cross's kid. I'd know that jaw anywhere. Sit — first drink's on the house, the talk never is.",
  };

  proxies.push(
    aabb(origin.x, origin.z + barZ, 8, 0.8),          // bar counter
    aabb(origin.x - 2.8, origin.z + 2.2, 1.3, 1.3),   // table 1
    aabb(origin.x + 2.8, origin.z + 1.6, 1.3, 1.3),   // table 2
  );
  return { group, proxies, targets: [exitTarget, mabel] };
}

// Generic placeholder room — the four not-yet-dressed buildings until 2c+.
function buildPlaceholderRoom(origin, { tint = "#3a2c1f" } = {}) {
  const group = new THREE.Group();
  group.name = "interior-room";
  const floorMat = new THREE.MeshStandardMaterial({ color: "#2a2018", roughness: 0.96 });
  const wallMat = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.9 });
  const { add, proxies, hd } = roomShell(group, origin, { W: 9, D: 9, floorMat, wallMat });
  add(new THREE.BoxGeometry(5.4, 1.1, 0.8), new THREE.MeshStandardMaterial({ color: "#5a3d25", roughness: 0.7 }), 0, 0.55, -hd + 1.2);
  const lamp = new THREE.PointLight("#ffcf8a", 7, 20, 1.6);
  lamp.position.set(origin.x, 2.8, origin.z);
  group.add(lamp);
  proxies.push(aabb(origin.x, origin.z - hd + 1.2, 5.4, 0.8));
  const exitTarget = { kind: "exitDoor", x: origin.x, y: origin.z + hd - 0.5 };
  return { group, proxies, targets: [exitTarget] };
}

// The interior registry. `spawn` = where the player stands on enter (just inside
// the door, facing into the room: yaw 0 looks toward −Z, the back bar).
export const INTERIORS = {
  saloon: {
    id: "saloon",
    label: "The Rusty Spur",
    spawn: { x: POCKET.x, z: POCKET.z + 3.0, yaw: 0 },
    build: () => buildSaloonInterior(POCKET),
  },
};

export const INTERIOR_IDS = Object.freeze(Object.keys(INTERIORS));
