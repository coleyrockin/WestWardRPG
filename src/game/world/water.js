// Stylised NPR water — the Meridian system (river / reservoir / ocean) and the
// original marsh all ride this one factory (docs/water-plan.md, docs/roadmap.md §3).
//
// A TSL MeshBasicNodeMaterial (unlit — the look is hand-authored, not PBR):
// summed-sine vertex waves + moving ripple bands + a fresnel sky-tint edge and a
// sun-glint highlight. A `time` uniform drives the motion so the shell can freeze
// it for the deterministic golden-image gate. Per-body knobs (flow, cel bands,
// wave amplitude/scale, reduced fidelity) let one factory dress every body:
// reservoir = calm long-wavelength mirror, river = banded directional flow, ocean
// = big slow swells. Defaults reproduce the original marsh surface exactly.
//
// The depth-discontinuity Sobel ink (postStacks.js) draws the shoreline for free —
// no shoreline code here. Day/night is the per-frame `skyTint` uniform (spike.js).

import * as THREE from "three";
import { MeshBasicNodeMaterial } from "three/webgpu";
import {
  uniform,
  positionLocal,
  normalView,
  positionViewDirection,
  normalize,
  dot,
  sin,
  mix,
  pow,
  clamp,
  floor,
  vec3,
} from "three/tsl";

const col = (hex) => new THREE.Color(hex);

// Pure wave height at plane-local (x,y) and time t. Bounded to ±0.08.
export function waveHeight(x, y, t) {
  return (Math.sin(x * 0.8 + t * 1.2) + Math.sin(y * 1.1 + t * 0.9)) * 0.04;
}

// Pure: the scrolled sample coordinate for directional flow — the ripple pattern
// translates along +flow over time. Mirrors the shader's `coord + flow*t` so a
// river reads as moving downstream. Tested so flow stays monotonic in t.
export function flowOffset(coord, t, flowComponent) {
  return coord + flowComponent * t;
}

// Pure: quantize a 0..1 value into `bands` flat cel steps — matches the shader's
// floor(v*n)/n. bands < 2 returns v unchanged (continuous mix, the marsh default).
export function bandQuantize(v, bands) {
  const n = Math.floor(bands);
  if (!(n >= 2)) return v;
  const c = Math.min(Math.max(v, 0), 1);
  return Math.floor(c * n) / n;
}

export function createWaterMaterial(opts = {}) {
  const {
    skyTint = "#d0784a",
    deep = "#23414a",
    shallow = "#3f6f74",
    opacity = 0.74,
    waveAmp = 0.06, // vertex displacement height
    waveScale = 1, // spatial frequency multiplier (>1 = shorter waves; <1 = long swells)
    bands = 0, // 0/1 = continuous; >=2 = flat cel bands
    flow = [0, 0], // [fx, fy] directional scroll — the river's downstream drift
    reduced = false, // WebGL2 fallback: flatten the surface (no per-frame vertex waves)
    glint = 0.4,
  } = opts;
  const uniforms = {
    time: uniform(0),
    skyTint: uniform(col(skyTint)),
    deep: uniform(col(deep)),
    shallow: uniform(col(shallow)),
  };
  const t = uniforms.time;

  const mat = new MeshBasicNodeMaterial({ transparent: true, opacity, fog: true }); // lower opacity reads as deeper water

  const px = positionLocal.x;
  const py = positionLocal.y;

  // Vertex waves (displace local Z; the plane is rotated flat so Z → world up).
  // Skipped on the reduced (WebGL2) path so the fallback pays no per-frame vertex
  // cost — a flat plane. waveScale stretches the wavelength, waveAmp the height.
  if (!reduced && waveAmp > 0) {
    const wave = sin(px.mul(0.8 * waveScale).add(t.mul(1.2)))
      .add(sin(py.mul(1.1 * waveScale).add(t.mul(0.9))))
      .mul(waveAmp);
    mat.positionNode = positionLocal.add(vec3(0, 0, wave));
  }

  // Moving ripple bands → subtle deep/shallow mix, scrolled along flowDir.
  const fx = flow[0] || 0;
  const fy = flow[1] || 0;
  const sx = px.add(t.mul(fx));
  const sy = py.add(t.mul(fy));
  let band = sin(sx.mul(1.6 * waveScale).add(sy.mul(1.2 * waveScale)).add(t.mul(1.5))).mul(0.5).add(0.5);
  // Quantize to flat cel bands when requested (2–3 reads as graphic-novel water).
  const nBands = Math.floor(bands);
  if (nBands >= 2) band = floor(band.mul(nBands)).div(nBands);

  const base = mix(uniforms.deep, uniforms.shallow, band.mul(0.4));
  // fresnel sky tint at grazing angles
  const ndv = clamp(dot(normalize(normalView), normalize(positionViewDirection)), 0, 1);
  const fres = ndv.oneMinus().pow(3);
  const tinted = mix(base, vec3(uniforms.skyTint), fres.mul(0.72));
  // sun-glint highlight on the ripple crests
  const glintNode = pow(band, 8).mul(glint);
  mat.colorNode = tinted.add(vec3(uniforms.skyTint).mul(glintNode));

  return { material: mat, uniforms };
}

// Build a water surface mesh (caller positions/rotates it). Segmented so the
// vertex waves actually deform; the reduced path drops to a 1×1 quad (flat).
export function createWater(opts = {}) {
  const { width = 13, height = 5.5 } = opts;
  const reduced = !!opts.reduced;
  const segX = opts.segments ?? (reduced ? 1 : 24);
  const segY = opts.segments ? Math.max(1, Math.round(opts.segments / 2)) : reduced ? 1 : 12;
  const { material, uniforms } = createWaterMaterial(opts);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height, segX, segY), material);
  return { mesh, uniforms };
}
