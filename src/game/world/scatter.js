// Ground scatter — small pebbles + grass tufts strewn across the terrain so the
// ground reads as real dirt rather than a painted plane. Deterministic placement
// (seeded LCG) so the scene is stable for the golden-image gate. Static: built
// once, never updated.
//
// Each mote is a regular mesh with a BUILT-IN geometry and its OWN material
// (createNprMaterial makes a fresh one per call) — required by this backend
// (see memory: shared materials / instancing don't render). Geometry is shared,
// which is fine.

import * as THREE from "three";
import { createNprMaterial } from "../renderer/materials/nprMaterial.js";
import { groundHeight } from "./ground.js";

const PEBBLE = ["#6a5f55", "#5a5048", "#766a5e"];
const TUFT = ["#4f6a32", "#5c7a3a", "#445c2c"];
const MUD = ["#5a4632", "#6b513a", "#4e3d2c"]; // cracked-mud disks
const DRY = ["#8a7a4a", "#9a8a55", "#7a6a3e"]; // dry dead-grass spikes

export function createScatter(scene, opts = {}) {
  const { center = { x: 16, z: 9 }, area = 34, count = 90, seed = 7 } = opts;
  const group = new THREE.Group();
  let s = (seed >>> 0) || 1;
  const rnd = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };

  // Four shared geometries; each mote still gets its own material (backend can't
  // share materials). Mud disks + dry-grass spikes add silhouette variety beyond
  // the original pebble/tuft pair so the denser field doesn't read as repetition.
  const pebbleGeo = new THREE.IcosahedronGeometry(0.18, 0);
  const tuftGeo = new THREE.ConeGeometry(0.12, 0.34, 5);
  const mudGeo = new THREE.CylinderGeometry(0.34, 0.36, 0.05, 6);
  const spikeGeo = new THREE.ConeGeometry(0.05, 0.5, 4);

  for (let i = 0; i < count; i++) {
    const x = center.x + (rnd() - 0.5) * area;
    const z = center.z + (rnd() - 0.5) * area;
    // Density gradient: thin the scatter out along the packed-dirt road corridor
    // (z ~ 8.9) so the street reads clean and the flanks read wild.
    const corridor = 1 - Math.min(1, Math.abs(z - 8.9) / 3.2);
    if (rnd() < corridor * 0.72) continue;
    const roll = rnd();
    let kind, geo, baseY;
    if (roll < 0.4) { kind = TUFT; geo = tuftGeo; baseY = 0.17; }
    else if (roll < 0.7) { kind = PEBBLE; geo = pebbleGeo; baseY = 0.1; }
    else if (roll < 0.86) { kind = DRY; geo = spikeGeo; baseY = 0.25; }
    else { kind = MUD; geo = mudGeo; baseY = 0.025; }
    const hex = kind[i % 3];
    const mesh = new THREE.Mesh(geo, createNprMaterial(hex, { rimStrength: 0 }));
    const sc = 0.6 + rnd() * 0.9;
    mesh.scale.setScalar(sc);
    // Seat on the terrain relief so motes ride dunes instead of floating on a
    // phantom flat plane (groundHeight is 0 in the flat corridor/marsh zones).
    mesh.position.set(x, groundHeight(x, z) + baseY * sc, z);
    mesh.rotation.y = rnd() * Math.PI * 2;
    // Sub-cm motes: their shadow is invisible at the 2048²→36m shadow res
    // (~0.017 m/texel), so casting from ~300 of them is pure shadow-pass cost.
    // receiveShadow keeps them sitting in the terrain's cast shadow.
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  scene.add(group);
  return group;
}
