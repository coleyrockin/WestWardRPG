// Placeholder third-person character — a blocky low-poly drifter the follow-cam
// tracks until the rigged/animated Blender model lands (slice 2 proper). Built
// from regular box meshes with per-mesh materials (this backend won't render
// shared materials / instancing — see memory). Origin at the feet (y=0); the
// group's local -Z is "forward" so the controller can face it by setting
// rotation.y = heading yaw. A gentle walk bob is exposed via animate(speed,t).

import * as THREE from "three";
import { createNprMaterial } from "../renderer/materials/nprMaterial.js";

function part(group, w, h, d, color, x, y, z, opts = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), createNprMaterial(color, { rimStrength: 0.35, ...opts }));
  m.position.set(x, y, z);
  m.castShadow = true;
  group.add(m);
  return m;
}

export function createPlaceholderCharacter() {
  const g = new THREE.Group();
  // legs (front -Z is forward; legs swing on this axis)
  const legL = part(g, 0.16, 0.7, 0.18, "#3a2a1c", -0.11, 0.35, 0);
  const legR = part(g, 0.16, 0.7, 0.18, "#3a2a1c", 0.11, 0.35, 0);
  // torso (vest) + a coat-tone belt
  part(g, 0.42, 0.6, 0.26, "#6a4a30", 0, 1.0, 0);
  part(g, 0.44, 0.1, 0.28, "#2c2118", 0, 0.72, 0);
  // arms
  const armL = part(g, 0.12, 0.55, 0.14, "#5a3f28", -0.29, 1.02, 0);
  const armR = part(g, 0.12, 0.55, 0.14, "#5a3f28", 0.29, 1.02, 0);
  // head + hat (brim + crown)
  part(g, 0.24, 0.24, 0.24, "#caa882", 0, 1.42, 0);
  part(g, 0.52, 0.06, 0.52, "#2a1c10", 0, 1.55, 0);
  part(g, 0.3, 0.18, 0.3, "#3a2614", 0, 1.66, 0);

  // simple procedural walk: swing limbs + bob, scaled by movement.
  // update(dt, moving) matches the animated-character interface (drop-in fallback).
  let t = 0;
  const update = (dt, moving) => {
    t += dt || 0;
    const speed = moving ? 1 : 0;
    const sw = Math.sin(t * 9) * 0.5 * speed;
    legL.rotation.x = sw;
    legR.rotation.x = -sw;
    armL.rotation.x = -sw;
    armR.rotation.x = sw;
    g.position.y = Math.abs(Math.sin(t * 9)) * 0.05 * speed;
  };

  return { group: g, update };
}
