// Ground scatter — small pebbles + grass tufts strewn across the terrain so the
// ground reads as real dirt rather than a painted plane. Deterministic placement
// (seeded LCG) so the scene is stable for the golden-image gate. Static: built
// once, never updated.
//
// Both backends batch motes via InstancedMesh (shared geometry + per-instance
// matrix) — the old "no instancing on the WebGL2 fallback" ban was re-probed on
// three r184 (scripts/backend_caps_probe.mjs) and is stale: InstancedMesh renders
// fine on both. The fallback keeps a halved count as a reduced-fidelity measure.

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

  // Group by geometry & colour, then one InstancedMesh per group (≤12 total) —
  // hundreds of motes collapse to a handful of draws + materials on BOTH
  // backends. Deterministic order preserved so the golden frame is unchanged.
  const geometries = [tuftGeo, pebbleGeo, spikeGeo, mudGeo];
  const kinds = [TUFT, PEBBLE, DRY, MUD];
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
    if (!groups[key]) groups[key] = { geo: geometries[kindIdx], hex, matrices: [] };
    groups[key].matrices.push(matrix);
  }

  for (const key of Object.keys(groups)) {
    const { geo, hex, matrices } = groups[key];
    const mat = createNprMaterial(hex, { rimStrength: 0 });
    const instMesh = new THREE.InstancedMesh(geo, mat, matrices.length);
    for (let i = 0; i < matrices.length; i++) instMesh.setMatrixAt(i, matrices[i]);
    instMesh.instanceMatrix.needsUpdate = true;
    instMesh.castShadow = false;
    instMesh.receiveShadow = true;
    group.add(instMesh);
  }

  scene.add(group);
  return group;
}
