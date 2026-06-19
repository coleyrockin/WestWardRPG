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

// ── Road-verge scatter ───────────────────────────────────────────────────────
// A denser, VARIED ground-cover pass hugging the road SHOULDERS along the open-
// range corridor east of town (x≈24–62), where the broad ground scatter thins
// out and the route reads bare at close range. Complements the route sage field
// (flora.js, a single blade type) with tufts / dry grass / pebbles / cracked mud
// just off the lane. Deterministic sin-hash placement so the dusk golden frame
// stays stable; the road LANE itself stays empty (motes live in a 3.8–7.0u
// shoulder band, never on the centreline). Static: built once, never updated.

export const VERGE_X_MIN = 24;
export const VERGE_X_MAX = 62;

// Same fractional sin-hash flora.js uses — keeps placement deterministic and
// renderer-agnostic so the ?visual capture is byte-stable.
function vergeSeed(n) {
  const s = Math.sin(n * 91.7 + 17.13) * 43758.5453;
  return s - Math.floor(s);
}

// Pure: expand a route into shoulder-band mote descriptors (no THREE objects),
// in a stable order, clipped to the east corridor. Unit-testable in isolation.
export function roadVergePlacements(route, opts = {}) {
  const {
    xMin = VERGE_X_MIN, xMax = VERGE_X_MAX,
    density = 2.4, minOff = 3.8, maxOff = 7.0,
  } = opts;
  const points = route.filter((p) => p.kind !== "returnJobBoard");
  const motes = [];
  for (let seg = 1; seg < points.length; seg++) {
    const from = points[seg - 1];
    const to = points[seg];
    // Skip segments that never touch the corridor x window.
    if (Math.max(from.x, to.x) < xMin || Math.min(from.x, to.x) > xMax) continue;
    const dx = to.x - from.x;
    const dz = to.y - from.y; // layout y IS world z
    const len = Math.hypot(dx, dz);
    if (len < 0.1) continue;
    const nx = -dz / len; // road normal (perpendicular)
    const nz = dx / len;
    const tx = dx / len; // road tangent (along)
    const tz = dz / len;
    const count = Math.max(4, Math.floor(len * density));
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5 + vergeSeed(seg * 7 + i) * 0.5) / count;
      const cx = from.x + dx * t;
      const cz = from.y + dz * t;
      const side = vergeSeed(seg * 31 + i * 3) > 0.5 ? 1 : -1;
      const off = side * (minOff + vergeSeed(seg * 11 + i * 5) * (maxOff - minOff));
      const along = (vergeSeed(seg * 23 + i * 7) - 0.5) * 1.2; // tangential only → perp dist stays |off|
      const x = cx + nx * off + tx * along;
      const z = cz + nz * off + tz * along;
      if (x < xMin || x > xMax) continue; // keep the whole mote inside the corridor
      const roll = vergeSeed(seg * 17 + i * 13);
      let kindIdx;
      if (roll < 0.44) kindIdx = 0;       // TUFT  — lush verge grass
      else if (roll < 0.7) kindIdx = 2;   // DRY   — dead-grass spikes
      else if (roll < 0.88) kindIdx = 1;  // PEBBLE
      else kindIdx = 3;                    // MUD   — cracked-mud disk
      const scale = 0.62 + vergeSeed(seg * 43 + i * 19) * 0.85;
      const rot = vergeSeed(seg * 53 + i * 29) * Math.PI * 2;
      motes.push({ kindIdx, x, z, scale, rot });
    }
  }
  return motes;
}

// Build the verge scatter as one InstancedMesh per KIND (≤4 draws total) —
// mirrors createScatter/flora batching. One representative hue per kind keeps it
// M0-frugal; the four kinds already carry the palette variety. Halves on the
// reduced path (WebGL2 fallback) like createScatter.
export function createRoadVergeScatter(scene, opts = {}) {
  const { route = [], backend = "webgpu", reducedFidelity = false } = opts;
  const group = new THREE.Group();
  group.name = "road-verge-scatter";

  const geoFor = [
    () => new THREE.ConeGeometry(0.12, 0.34, 5),       // 0 TUFT
    () => new THREE.IcosahedronGeometry(0.18, 0),      // 1 PEBBLE
    () => new THREE.ConeGeometry(0.05, 0.5, 4),        // 2 DRY spike
    () => new THREE.CylinderGeometry(0.34, 0.36, 0.05, 6), // 3 MUD disk
  ];
  const palettes = [TUFT, PEBBLE, DRY, MUD];
  const baseY = [0.17, 0.1, 0.25, 0.025];

  const all = roadVergePlacements(route, opts);
  const reduce = backend === "webgl" || reducedFidelity;
  const motes = reduce ? all.filter((_, i) => i % 2 === 0) : all;

  const buckets = new Map(); // kindIdx -> Matrix4[]
  const matrix = new THREE.Matrix4();
  for (const m of motes) {
    const position = new THREE.Vector3(m.x, groundHeight(m.x, m.z) + baseY[m.kindIdx] * m.scale, m.z);
    const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, m.rot, 0));
    const scale = new THREE.Vector3(m.scale, m.scale, m.scale);
    matrix.compose(position, quaternion, scale);
    if (!buckets.has(m.kindIdx)) buckets.set(m.kindIdx, []);
    buckets.get(m.kindIdx).push(matrix.clone());
  }

  for (const [kindIdx, matrices] of buckets) {
    const mat = createNprMaterial(palettes[kindIdx][1], { rimStrength: 0 });
    const inst = new THREE.InstancedMesh(geoFor[kindIdx](), mat, matrices.length);
    for (let i = 0; i < matrices.length; i++) inst.setMatrixAt(i, matrices[i]);
    inst.instanceMatrix.needsUpdate = true;
    inst.castShadow = false;
    inst.receiveShadow = true;
    group.add(inst);
  }

  if (scene) scene.add(group);
  return group;
}
