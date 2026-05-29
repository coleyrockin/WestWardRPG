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

const PEBBLE = ["#6a5f55", "#5a5048", "#766a5e"];
const TUFT = ["#4f6a32", "#5c7a3a", "#445c2c"];

export function createScatter(scene, opts = {}) {
  const { center = { x: 16, z: 9 }, area = 34, count = 90, seed = 7 } = opts;
  const group = new THREE.Group();
  let s = (seed >>> 0) || 1;
  const rnd = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };

  const pebbleGeo = new THREE.IcosahedronGeometry(0.18, 0);
  const tuftGeo = new THREE.ConeGeometry(0.12, 0.34, 5);

  for (let i = 0; i < count; i++) {
    const x = center.x + (rnd() - 0.5) * area;
    const z = center.z + (rnd() - 0.5) * area;
    const tuft = rnd() < 0.5;
    const hex = (tuft ? TUFT : PEBBLE)[i % 3];
    const mesh = new THREE.Mesh(tuft ? tuftGeo : pebbleGeo, createNprMaterial(hex, { rimStrength: 0 }));
    const sc = 0.6 + rnd() * 0.9;
    mesh.scale.setScalar(sc);
    mesh.position.set(x, (tuft ? 0.17 : 0.1) * sc, z);
    mesh.rotation.y = rnd() * Math.PI * 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  scene.add(group);
  return group;
}
