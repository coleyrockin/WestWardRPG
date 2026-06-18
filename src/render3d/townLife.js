// A little town life — Westward Believability Pass, Phase D.
//
// Visual-only ambient life on the Westward main street: a knot of gathered
// silhouettes outside the glowing saloon, a couple of market stalls, and horses
// tied at the rail. "Alive, not crowded." ALL of it is added by the caller ONLY
// inside the `if (!visualCapture)` block, so it is suppressed under the ?visual
// dusk capture exactly like the animated townsfolk crowd — the golden frame never
// sees it. (Chimney smoke + animated NPCs live elsewhere; this is the static set.)
//
// Self-contained like envLight/wetStreet/cyberAging: it imports the GLB loader and
// the ground-height field directly, so spike.js only calls one awaited function.

import * as THREE from "three";
import { MeshStandardNodeMaterial } from "three/webgpu";
import { instanceModel } from "../game/renderer/assetLoader.js";
import { groundHeight } from "../game/world/ground.js";

const col = (hex) => new THREE.Color(hex);

async function tryModel(group, url, opts) {
  try {
    const n = await instanceModel(url, opts);
    if (n) group.add(n);
  } catch {
    /* a missing/failed model just means one fewer prop — never break the scene */
  }
}

export async function addTownLife(scene) {
  const group = new THREE.Group();
  group.name = "townLife";

  // 1. Gathered silhouettes outside the Lucky Lantern saloon (x19.3 y2.7), strung
  //    along the boardwalk facing the saloon glow (yaw ≈ π toward the door).
  const crowd = [
    [20.4, 3.5, 0.10], [21.1, 3.4, -0.18], [21.8, 3.7, 0.28], [22.4, 4.0, -0.10], [20.8, 4.25, 0.16],
  ];
  for (const [x, y, dy] of crowd) {
    await tryModel(group, "/models/npc_silhouette.glb", {
      x, z: y, y: groundHeight(x, y), yaw: Math.PI + dy, scale: 0.95 + (x % 0.3),
    });
  }

  // 2. Market stalls on the shoulders, off the central lane — a plank table on two
  //    posts under a slanted cloth awning, with a crate cluster alongside.
  const canvas = new MeshStandardNodeMaterial({ color: col("#c8a878"), roughness: 0.9 });
  const wood = new MeshStandardNodeMaterial({ color: col("#6b4a2c"), roughness: 0.9 });
  canvas.flatShading = true; wood.flatShading = true;
  for (const [sx, sy] of [[8.6, 11.6], [22.8, 4.3]]) {
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.9), wood);
    top.position.set(sx, 0.92, sy); top.castShadow = true; top.receiveShadow = true; group.add(top);
    for (const [dx, dz] of [[-0.65, -0.38], [0.65, -0.38], [-0.65, 0.38], [0.65, 0.38]]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.92, 0.08), wood);
      post.position.set(sx + dx, 0.46, sy + dz); post.castShadow = true; group.add(post);
    }
    const awning = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.04, 1.1), canvas);
    awning.position.set(sx, 1.7, sy - 0.1); awning.rotation.x = -0.28; awning.castShadow = true; group.add(awning);
    await tryModel(group, "/models/barrel_crate_cluster.glb", {
      x: sx + 0.95, z: sy + 0.1, y: groundHeight(sx + 0.95, sy + 0.1), yaw: 0.3, scale: 0.8,
    });
  }

  // 3. Horses tied broadside at the south hitching rail (≈15.6, 12.55).
  for (const [hx, hy, hyaw] of [[14.9, 12.2, 1.6], [16.3, 12.3, 1.5]]) {
    await tryModel(group, "/models/horse_hitched.glb", {
      x: hx, z: hy, y: groundHeight(hx, hy), yaw: hyaw, scale: 1.0,
    });
  }

  scene.add(group);
  return group;
}
