// Interior definitions for Rustwater's loaded buildings + a room builder. Each
// interior is built in its own faraway coordinate pocket (the street is hidden
// while you're inside, so there's never any overlap) and shown/hidden by
// locationView on enter/exit. Data (spawn/proxies/exit target) is plain; the room
// is a THREE.Group.
//
// STEP 2a: the saloon is a PLACEHOLDER room (floor + walls + a back-bar block +
// one warm light) — just enough to prove the enter/exit loop. Real dressing,
// Mabel, and the other four interiors land in 2b+.

import * as THREE from "three";

// A faraway pocket so an interior can never overlap the world (bounds are ±150).
const POCKET = { x: 400, z: 0 };

function aabb(cx, cz, w, d, src = "interior") {
  return { minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2, source: src };
}

// An enclosed room centred on `origin`, `size` square, doorway gap on the +Z wall.
// Returns { group, proxies, exitTarget }.
function buildPlaceholderRoom(origin, { size = 9, wallH = 3.4, wallT = 0.3, doorHW = 1.1, tint = "#3a2c1f" } = {}) {
  const group = new THREE.Group();
  group.name = "interior-room";
  const hw = size / 2;
  const floorMat = new THREE.MeshStandardMaterial({ color: "#2a2018", roughness: 0.96 });
  const wallMat = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.9 });

  const floor = new THREE.Mesh(new THREE.BoxGeometry(size, 0.2, size), floorMat);
  floor.position.set(origin.x, -0.1, origin.z);
  floor.receiveShadow = true;
  group.add(floor);

  const wall = (cx, cz, w, d) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallMat);
    m.position.set(cx, wallH / 2, cz);
    group.add(m);
  };
  wall(origin.x, origin.z - hw, size, wallT);                       // back
  wall(origin.x - hw, origin.z, wallT, size);                       // left
  wall(origin.x + hw, origin.z, wallT, size);                       // right
  const segW = hw - doorHW;
  wall(origin.x - (doorHW + hw) / 2, origin.z + hw, segW, wallT);   // front-left of door
  wall(origin.x + (doorHW + hw) / 2, origin.z + hw, segW, wallT);   // front-right of door

  // A back-bar block so the room reads as a place, plus a warm interior light.
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(size * 0.6, 1.1, 0.8),
    new THREE.MeshStandardMaterial({ color: "#5a3d25", roughness: 0.7 }),
  );
  bar.position.set(origin.x, 0.55, origin.z - hw + 1.2);
  group.add(bar);
  const lamp = new THREE.PointLight("#ffcf8a", 7, 20, 1.6);
  lamp.position.set(origin.x, wallH - 0.6, origin.z);
  group.add(lamp);

  const proxies = [
    aabb(origin.x, origin.z - hw, size, wallT),
    aabb(origin.x - hw, origin.z, wallT, size),
    aabb(origin.x + hw, origin.z, wallT, size),
    aabb(origin.x - (doorHW + hw) / 2, origin.z + hw, segW, wallT),
    aabb(origin.x + (doorHW + hw) / 2, origin.z + hw, segW, wallT),
    aabb(origin.x, origin.z - hw + 1.2, size * 0.6, 0.8), // the bar
  ];

  // The way out — an interaction target just inside the doorway.
  const exitTarget = { kind: "exitDoor", x: origin.x, y: origin.z + hw - 0.5 };

  return { group, proxies, exitTarget };
}

// The interior registry. `spawn` = where the player stands on enter (just inside
// the door, facing into the room: yaw 0 looks toward −Z, the back bar).
export const INTERIORS = {
  saloon: {
    id: "saloon",
    label: "The Rusty Spur",
    spawn: { x: POCKET.x, z: POCKET.z + 3.0, yaw: 0 },
    build: () => buildPlaceholderRoom(POCKET, { tint: "#3a2c1f" }),
  },
};

export const INTERIOR_IDS = Object.freeze(Object.keys(INTERIORS));
