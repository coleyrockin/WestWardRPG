// Combat juice. The hit-stop + camera-shake are pure math (tested). The particle
// burst is a bounded pool of regular meshes with their OWN material — NOT
// THREE.Points/Instanced, which don't render on the WebGL2 fallback (see
// src/game/world/scatter.js + project memory).

import * as THREE from "three";
import { createNprMaterial } from "../../game/renderer/materials/nprMaterial.js";

// Freeze-frame punch: spike multiplies its loop dt by scale() each frame. The
// freeze is advanced by REAL dt so it lasts a wall-clock duration.
export function createHitStop() {
  let remaining = 0;
  let scaleVal = 1;
  return {
    punch(seconds = 0.07, scale = 0.05) {
      remaining = Math.max(remaining, seconds);
      scaleVal = scale;
    },
    scale(realDt) {
      if (remaining <= 0) return 1;
      remaining = Math.max(0, remaining - (Number.isFinite(realDt) ? realDt : 0));
      return remaining > 0 ? scaleVal : 1;
    },
    get active() {
      return remaining > 0;
    },
  };
}

// Trauma-based shake. add() on impact; sample(dt, t) decays trauma and returns a
// transient camera offset whose magnitude ~ trauma². t = wall-clock seconds.
export function createCameraShake({ decay = 1.6 } = {}) {
  let trauma = 0;
  return {
    add(amount) {
      trauma = Math.min(1, trauma + amount);
    },
    sample(dt, t) {
      trauma = Math.max(0, trauma - (Number.isFinite(dt) ? dt : 0) * decay);
      const s = trauma * trauma;
      return {
        x: Math.sin(t * 57.3) * 0.18 * s,
        y: Math.sin(t * 43.1) * 0.12 * s,
        z: Math.sin(t * 71.7) * 0.1 * s,
        yaw: Math.sin(t * 33.3) * 0.05 * s,
        trauma,
      };
    },
    get trauma() {
      return trauma;
    },
  };
}

// Goo burst pool. burst() flings n motes from pos; update() integrates + fades.
export function createBurstPool(scene, { count = 24 } = {}) {
  const geo = new THREE.IcosahedronGeometry(0.07, 0);
  const group = new THREE.Group();
  const slots = [];
  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(geo, createNprMaterial("#6be873", { rimStrength: 0 }));
    mesh.visible = false;
    mesh.castShadow = false;
    group.add(mesh);
    slots.push({ mesh, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 0 });
  }
  scene.add(group);
  let cursor = 0;
  // rand: app-runtime Math.random is fine (golden gate freezes spawns via visualCapture)
  function burst(pos, n = 12, color = "#6be873", speed = 3) {
    for (let i = 0; i < n; i++) {
      const sl = slots[cursor];
      cursor = (cursor + 1) % slots.length;
      sl.mesh.material.color?.set?.(color);
      sl.mesh.position.set(pos.x, pos.y ?? 0.6, pos.z);
      const a = (i / n) * Math.PI * 2;
      const sp = speed * (0.5 + Math.random() * 0.5);
      sl.vx = Math.cos(a) * sp;
      sl.vz = Math.sin(a) * sp;
      sl.vy = 2 + Math.random() * 2.5;
      sl.maxLife = 0.4 + Math.random() * 0.3;
      sl.life = sl.maxLife;
      sl.mesh.visible = true;
      sl.mesh.scale.setScalar(1);
    }
  }
  function update(dt) {
    for (const sl of slots) {
      if (sl.life <= 0) continue;
      sl.life -= dt;
      if (sl.life <= 0) {
        sl.mesh.visible = false;
        continue;
      }
      sl.vy -= 9.8 * dt;
      sl.mesh.position.x += sl.vx * dt;
      sl.mesh.position.y += sl.vy * dt;
      sl.mesh.position.z += sl.vz * dt;
      sl.mesh.scale.setScalar(Math.max(0.02, sl.life / sl.maxLife));
    }
  }
  return { burst, update, group };
}
