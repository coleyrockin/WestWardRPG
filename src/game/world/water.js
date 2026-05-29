// Animated marsh water — stylised NPR surface (docs/roadmap.md §3, Bet 4).
//
// A TSL MeshBasicNodeMaterial (unlit — the look is hand-authored, not PBR):
// summed-sine vertex waves + moving ripple bands + a fresnel sky-tint edge and a
// sun-glint highlight. A `time` uniform drives the motion so the shell can freeze
// it for the deterministic golden-image gate. The wave height is also exported as
// a pure function for node tests.

import * as THREE from "three";
import { MeshBasicNodeMaterial } from "three/webgpu";
import {
  uniform,
  positionLocal,
  transformedNormalView,
  positionViewDirection,
  normalize,
  dot,
  sin,
  mix,
  pow,
  clamp,
  vec3,
} from "three/tsl";

const col = (hex) => new THREE.Color(hex);

// Pure wave height at plane-local (x,y) and time t. Bounded to ±0.08.
export function waveHeight(x, y, t) {
  return (Math.sin(x * 0.8 + t * 1.2) + Math.sin(y * 1.1 + t * 0.9)) * 0.04;
}

export function createWaterMaterial(opts = {}) {
  const uniforms = {
    time: uniform(0),
    skyTint: uniform(col(opts.skyTint ?? "#d0784a")),
    deep: uniform(col(opts.deep ?? "#23414a")),
    shallow: uniform(col(opts.shallow ?? "#3f6f74")),
  };
  const t = uniforms.time;

  const mat = new MeshBasicNodeMaterial({ transparent: true, opacity: 0.85, fog: true });

  // vertex waves (displace local Z; the plane is rotated flat so Z → world up)
  const px = positionLocal.x;
  const py = positionLocal.y;
  const wave = sin(px.mul(0.8).add(t.mul(1.2))).add(sin(py.mul(1.1).add(t.mul(0.9)))).mul(0.04);
  mat.positionNode = positionLocal.add(vec3(0, 0, wave));

  // moving ripple bands → subtle deep/shallow mix
  const band = sin(px.mul(1.6).add(py.mul(1.2)).add(t.mul(1.5))).mul(0.5).add(0.5);
  const base = mix(uniforms.deep, uniforms.shallow, band.mul(0.4));
  // fresnel sky tint at grazing angles
  const ndv = clamp(dot(normalize(transformedNormalView), normalize(positionViewDirection)), 0, 1);
  const fres = ndv.oneMinus().pow(3);
  const tinted = mix(base, vec3(uniforms.skyTint), fres.mul(0.5));
  // sun-glint highlight on the ripple crests
  const glint = pow(band, 8).mul(0.4);
  mat.colorNode = tinted.add(vec3(uniforms.skyTint).mul(glint));

  return { material: mat, uniforms };
}

// Build the marsh water surface mesh (caller positions/rotates it). Segmented so
// the vertex waves actually deform.
export function createWater(opts = {}) {
  const { width = 13, height = 5.5 } = opts;
  const { material, uniforms } = createWaterMaterial(opts);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height, 24, 12), material);
  return { mesh, uniforms };
}
