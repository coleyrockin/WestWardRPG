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

const PEBBLE = ["#76675a", "#6a5848", "#806d5d"];
const TUFT = ["#58713a", "#657f3f", "#4f6332"];
const MUD = ["#6a4d35", "#7a593d", "#5c432f"]; // cracked-mud disks
const DRY = ["#a08a54", "#ad965d", "#8d7948"]; // dry dead-grass spikes

export function createScatter(scene, opts = {}) {
  const { center = { x: 16, z: 9 }, area = 34, count = 90, seed = 7, backend = "webgpu" } = opts;
  const group = new THREE.Group();
  let s = (seed >>> 0) || 1;
  const rnd = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };

  const isWebGL = backend === "webgl";
  const finalCount = isWebGL ? Math.floor(count / 2) : count;

  // Four shared geometries
  const pebbleGeo = new THREE.IcosahedronGeometry(0.18, 0);
  const tuftGeo = new THREE.ConeGeometry(0.12, 0.34, 5);
  const mudGeo = new THREE.CylinderGeometry(0.34, 0.36, 0.05, 6);
  const spikeGeo = new THREE.ConeGeometry(0.05, 0.5, 4);

  if (isWebGL) {
    // WebGL2 Fallback: Create individual meshes, halved count, no instancing
    for (let i = 0; i < finalCount; i++) {
      const x = center.x + (rnd() - 0.5) * area;
      const z = center.z + (rnd() - 0.5) * area;
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
      mesh.position.set(x, groundHeight(x, z) + baseY * sc, z);
      mesh.rotation.y = rnd() * Math.PI * 2;
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  } else {
    // WebGPU High-Fidelity: Group by geometry & color, batch using InstancedMesh
    const geometries = [tuftGeo, pebbleGeo, spikeGeo, mudGeo];
    const kinds = [TUFT, PEBBLE, DRY, MUD];
    const baseYs = [0.17, 0.1, 0.25, 0.025];
    const groups = {};

    for (let i = 0; i < finalCount; i++) {
      const x = center.x + (rnd() - 0.5) * area;
      const z = center.z + (rnd() - 0.5) * area;
      const corridor = 1 - Math.min(1, Math.abs(z - 8.9) / 3.2);
      if (rnd() < corridor * 0.72) continue;

      const roll = rnd();
      let kindIdx, baseY;
      if (roll < 0.4) { kindIdx = 0; baseY = 0.17; }      // TUFT
      else if (roll < 0.7) { kindIdx = 1; baseY = 0.1; }     // PEBBLE
      else if (roll < 0.86) { kindIdx = 2; baseY = 0.25; }   // DRY
      else { kindIdx = 3; baseY = 0.025; }                    // MUD

      const hex = kinds[kindIdx][i % 3];
      const sc = 0.6 + rnd() * 0.9;

      const matrix = new THREE.Matrix4();
      const position = new THREE.Vector3(x, groundHeight(x, z) + baseY * sc, z);
      const rotation = new THREE.Euler(0, rnd() * Math.PI * 2, 0);
      const scale = new THREE.Vector3(sc, sc, sc);
      matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);

      const key = `${kindIdx}_${hex}`;
      if (!groups[key]) {
        groups[key] = {
          geo: geometries[kindIdx],
          hex,
          matrices: []
        };
      }
      groups[key].matrices.push(matrix);
    }

    for (const key of Object.keys(groups)) {
      const { geo, hex, matrices } = groups[key];
      const mat = createNprMaterial(hex, { rimStrength: 0 });
      const instMesh = new THREE.InstancedMesh(geo, mat, matrices.length);
      for (let i = 0; i < matrices.length; i++) {
        instMesh.setMatrixAt(i, matrices[i]);
      }
      instMesh.castShadow = false;
      instMesh.receiveShadow = true;
      group.add(instMesh);
    }
  }

  scene.add(group);
  return group;
}
