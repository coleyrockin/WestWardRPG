// Route sage field — the grass-blade scatter lining the first road's shoulders.
// Deterministic placement (seedValue sin-hash) so the scene is stable for the
// golden-image gate. Static: built once, never updated.
//
// This is the M0 batch of the old per-blade builder (was ~600 individual
// THREE.Mesh + per-blade material in spike.js). Blades are bucketed by colour
// and drawn as one THREE.InstancedMesh per bucket (≤4 draws for the whole
// field) — the scatter.js pattern. Placement order/seed are preserved exactly,
// so the dusk golden frame is byte-identical to the un-batched version (full
// density on BOTH backends; the WebGL2 fallback halving is deferred to the
// deliberate reduced-fidelity step so we don't move the blessed baseline here).

import * as THREE from "three";
import { createNprMaterial } from "../renderer/materials/nprMaterial.js";
import { groundHeight } from "./ground.js";

const ROUTE_SAGE_COLORS = ["#768a50", "#83925a", "#687d45", "#b19a62"];
const BLADE_GEOMETRY = () => new THREE.ConeGeometry(0.065, 0.62, 5);

// Distance-cull radii (world units) for discrete far flora (cactus/deadTree).
// The gap between SHOW and HIDE is hysteresis: a node hides only past HIDE and
// re-shows only within SHOW, so riding along the boundary never flickers.
export const FLORA_CULL_SHOW = 75;
export const FLORA_CULL_HIDE = 85;

// Pure hysteresis decision: given the node's current visibility and its squared
// distance to the player, return whether it should be visible. Squared distances
// (showSq/hideSq) keep the caller sqrt-free.
export function floraVisibleAt(
  currentlyVisible,
  distSq,
  showSq = FLORA_CULL_SHOW * FLORA_CULL_SHOW,
  hideSq = FLORA_CULL_HIDE * FLORA_CULL_HIDE,
) {
  return currentlyVisible ? distSq <= hideSq : distSq < showSq;
}

// Deterministic fractional sin-hash (the original createRouteSageField seed).
export function seedValue(x) {
  const s = Math.sin(x * 91.7 + 17.13) * 43758.5453;
  return s - Math.floor(s);
}

// Pure: expand a route into the per-blade transforms, in the exact order and
// with the exact values the original per-mesh builder produced. Returns plain
// descriptors (no THREE objects) so the placement is unit-testable in isolation.
export function routeSageBlades(route) {
  const points = route.filter((point) => point.kind !== "returnJobBoard");
  const blades = [];
  let n = 0;

  for (let seg = 1; seg < points.length; seg++) {
    const from = points[seg - 1];
    const to = points[seg];
    const dx = to.x - from.x;
    const dz = to.y - from.y;
    const len = Math.hypot(dx, dz);
    if (len < 0.1) continue;
    const nx = -dz / len;
    const nz = dx / len;
    const count = Math.max(16, Math.floor(len * 3.8));
    for (let i = 0; i < count; i++) {
      const t = (i + 0.35 + seedValue(seg * 19 + i) * 0.4) / count;
      const side = seedValue(seg * 41 + i * 3) > 0.5 ? 1 : -1;
      const shoulder = side * (3.8 + seedValue(seg * 13 + i * 5) * 3.4);
      const alongJitter = (seedValue(seg * 29 + i * 7) - 0.5) * 0.8;
      const x = from.x + dx * t + nx * shoulder + (dx / len) * alongJitter;
      const z = from.y + dz * t + nz * shoulder + (dz / len) * alongJitter;
      const bladeCount = 2 + Math.floor(seedValue(seg * 53 + i * 11) * 3);
      for (let b = 0; b < bladeCount; b++) {
        const a = seedValue(n * 7 + b) * Math.PI * 2;
        const r = seedValue(n * 13 + b) * 0.32;
        const h = 0.54 + seedValue(n * 17 + b) * 0.58;
        const sc = 0.82 + seedValue(n * 23 + b) * 0.72;
        blades.push({
          colorIndex: (n + b) % ROUTE_SAGE_COLORS.length,
          x: x + Math.cos(a) * r,
          y: groundHeight(x, z) + h * 0.24,
          z: z + Math.sin(a) * r,
          rotX: 0.08 * Math.sin(a),
          rotY: a,
          rotZ: 0.08 * Math.cos(a),
          scaleX: sc,
          scaleY: h,
          scaleZ: sc,
        });
      }
      n++;
    }
  }
  return blades;
}

// Build the route sage field as one InstancedMesh per colour bucket. Mirrors
// scatter.js: shared geometry + one cached NPR material per bucket + per-instance
// Matrix4. Adds the group to `scene` (if given) and returns it.
export function createRouteSageField(scene, opts = {}) {
  const { route = [] } = opts;
  const group = new THREE.Group();
  group.name = "route-sage-field";

  const bladeGeo = BLADE_GEOMETRY();
  const buckets = new Map();
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const scale = new THREE.Vector3();

  for (const bd of routeSageBlades(route)) {
    position.set(bd.x, bd.y, bd.z);
    euler.set(bd.rotX, bd.rotY, bd.rotZ);
    quaternion.setFromEuler(euler);
    scale.set(bd.scaleX, bd.scaleY, bd.scaleZ);
    matrix.compose(position, quaternion, scale);
    if (!buckets.has(bd.colorIndex)) buckets.set(bd.colorIndex, []);
    buckets.get(bd.colorIndex).push(matrix.clone());
  }

  for (const [colorIndex, matrices] of buckets) {
    const mat = createNprMaterial(ROUTE_SAGE_COLORS[colorIndex], { roughness: 1, rimStrength: 0 });
    const inst = new THREE.InstancedMesh(bladeGeo, mat, matrices.length);
    for (let i = 0; i < matrices.length; i++) inst.setMatrixAt(i, matrices[i]);
    inst.instanceMatrix.needsUpdate = true;
    inst.castShadow = false;
    inst.receiveShadow = true;
    group.add(inst);
  }

  if (scene) scene.add(group);
  return group;
}
