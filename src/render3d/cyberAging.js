// Restrained cyber-aging — Westward Believability Pass, Phase C item 11.
//
// The "Cyberpunk" half of the identity: SPARSE rusted future-tech grafted onto a
// FEW weathered Westward buildings — a flickering neon beer sign, a rooftop solar
// panel, a peeling corp ad, a broken holo-board, an antenna whip. Owner rule: "no
// asset spam" — at most a couple props per building, exactly ONE flickering
// emissive each. Emissive-only (bloom-driven, threshold 0.95) — NO extra real
// lights. Materials are plain MeshStandardNodeMaterial so they reflect the
// golden-hour IBL (scene.environment) like the rest of the PBR town; flicker mats
// are built FRESH (never cache-shared) so each animates independently.
//
// Golden-safe: every flicker is a userData tag collected at scene assembly and
// animated only when fdt>0 in stepWorld — under ?visual (dusk, fdt=0) emissives
// hold at their authored base, so the dusk frame is a static authored prop.

import * as THREE from "three";
import { MeshStandardNodeMaterial } from "three/webgpu";

// The buildings that get aged (Westward-only; far-west/east copies stay clean).
export const CYBER_AGED_KINDS = new Set(["walkInSaloon", "blacksmith", "hotel"]);

// PURE flicker waveform — the emissiveIntensity MULTIPLIER for a dying neon/holo
// tube: mostly steady with an occasional brief dropout. Deterministic in (t,cfg).
export function flickerValue(t, cfg) {
  const buzz = 0.9 + 0.07 * Math.sin(t * cfg.freq + cfg.phase);
  const dropout = Math.sin(t * 19.0 + cfg.phase * 2.0) > 0.9 ? 0.28 : 0; // brief blackout
  return Math.max(0.5, Math.min(1.0, buzz - dropout));
}

const col = (hex) => new THREE.Color(hex);
const v = (x, y, h = 0) => new THREE.Vector3(x, h, y); // mirror spike.js toVec (y→world z, h→world up)

// Fresh PBR material (never cached, so flicker mats animate independently).
function mat(hex, o = {}) {
  const m = new MeshStandardNodeMaterial({
    color: col(hex),
    roughness: o.roughness ?? 0.7,
    metalness: o.metalness ?? 0.0,
    transparent: !!o.transparent,
    opacity: o.opacity ?? 1,
  });
  m.flatShading = true;
  if (o.transparent) m.depthWrite = (o.opacity ?? 1) > 0.92; // holo decals don't punch depth
  if (o.emissive) { m.emissive = col(o.emissive); m.emissiveIntensity = o.emissiveIntensity ?? 1; }
  if (o.flicker) m.userData.cyberFlicker = { freq: o.flicker.freq, phase: o.flicker.phase };
  return m;
}

function box(group, w, h, d, m, pos, rot) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.copy(pos);
  mesh.position.y += h / 2;
  if (rot) { mesh.rotation.x = rot.x || 0; mesh.rotation.z = rot.z || 0; }
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

const RUST = { roughness: 0.85, metalness: 0.2 };

// Graft the aged props onto a building. Positions are derived from the placement
// (p.x/p.y/p.size) + per-kind building proportions — no host-builder coupling.
export function applyCyberAging(group, p) {
  const s = p.size || 1;
  const phase = (p.x * 7.3 + p.y * 3.1) % (Math.PI * 2);
  switch (p.kind) {
    case "walkInSaloon": {
      // The Lucky Lantern (x19.3 y2.7): a buzzing warm-red neon tube on the front
      // (street-facing, +y) wall, a tilted rooftop solar panel, and a sagging cable.
      const front = p.y + 2.4, roofY = 4.0;
      box(group, 1.0, 0.5, 0.06, mat("#ff5638", { emissive: "#ff5638", emissiveIntensity: 2.4, flicker: { freq: 9.0, phase } }), v(p.x + 1.3, front + 0.07, 2.9));
      box(group, 1.2, 0.06, 0.9, mat("#1a2230", { roughness: 0.3, metalness: 0.5 }), v(p.x - 0.9, p.y, roofY + 0.35), { x: -0.35 });
      box(group, 0.05, 1.0, 0.05, mat("#7a4a2c", RUST), v(p.x + 0.4, p.y + 0.6, roofY - 0.1), { z: 0.5 });
      break;
    }
    case "blacksmith": {
      // Westward Forge (x24.8 y13.8): a peeling, mostly-dark corp ad on the
      // street-facing (-y, north) timber wall + a rust cable down the chimney.
      box(group, 0.9, 1.2, 0.05, mat("#caa24f", { emissive: "#caa24f", emissiveIntensity: 0.5 }), v(p.x - 1.0, p.y - 0.13, 1.6), { z: 0.05 });
      box(group, 0.05, 1.3, 0.05, mat("#7a4a2c", RUST), v(p.x + 1.55, p.y + 0.5, 3.4), { z: 0.32 });
      break;
    }
    case "hotel": {
      // The Frontier Hotel (x18.4 y13.6, HT≈5.5): a broken holo-marshal board on the
      // rooftop (yaw-safe centred prop) with a harsher stutter, + an antenna whip.
      const HT = 5.5 * s;
      box(group, 0.7, 0.85, 0.04, mat("#29c6ff", { emissive: "#29c6ff", emissiveIntensity: 2.2, transparent: true, opacity: 0.7, flicker: { freq: 14.0, phase: phase + 1.7 } }), v(p.x - 0.6, p.y, HT + 0.1));
      box(group, 0.05, 1.2, 0.05, mat("#6b6256", { roughness: 0.6, metalness: 0.4 }), v(p.x + 0.9, p.y, HT));
      box(group, 0.18, 0.18, 0.18, mat("#ff3b30", { emissive: "#ff3b30", emissiveIntensity: 2.4, flicker: { freq: 2.5, phase } }), v(p.x + 0.9, p.y, HT + 1.2));
      break;
    }
  }
}
