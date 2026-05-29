// Terrain ground material — replaces the flat single-colour plane that made the
// map read as a cardboard table. A cel (toon) material whose base colour is a
// value-noise blend of dirt / sand / scrub tones over world XZ, so the ground has
// large patches + fine grain instead of one dead beige. Unlit colour variation;
// the toon ramp still bands it with the sun for the NPR look.

import * as THREE from "three";
import { MeshToonNodeMaterial } from "three/webgpu";
import { Fn, positionWorld, floor, fract, sin, dot, vec2, vec3, mix } from "three/tsl";
import { celGradientMap } from "../renderer/materials/nprMaterial.js";

const col = (h) => new THREE.Color(h);
const v3 = (c) => vec3(c.r, c.g, c.b);

// Pure value noise (bilinear, smoothstepped) in [0,1] — mirrors the TSL graph for
// node tests.
export function valueNoise2(x, y) {
  const hash = (ix, iy) => {
    const s = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  const d = hash(ix + 1, iy + 1);
  const top = a * (1 - u) + b * u;
  const bot = c * (1 - u) + d * u;
  return top * (1 - v) + bot * v;
}

const tslHash = (p) => fract(sin(dot(p, vec2(127.1, 311.7))).mul(43758.5453));
const tslNoise = Fn(([p]) => {
  const i = floor(p);
  const f = fract(p);
  const u = f.mul(f).mul(f.mul(-2.0).add(3.0));
  const a = tslHash(i);
  const b = tslHash(i.add(vec2(1, 0)));
  const c = tslHash(i.add(vec2(0, 1)));
  const d = tslHash(i.add(vec2(1, 1)));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
});

export function createGroundMaterial(opts = {}) {
  const dirt = col(opts.dirt ?? "#5a4128");
  const sand = col(opts.sand ?? "#856b44");
  const scrub = col(opts.scrub ?? "#515a30");
  const mat = new MeshToonNodeMaterial({ gradientMap: celGradientMap() });

  const p = vec2(positionWorld.x, positionWorld.z);
  const big = tslNoise(p.mul(0.045)); // broad dirt/sand patches
  const fine = tslNoise(p.mul(0.32)); // fine grain
  const base = mix(v3(dirt), v3(sand), big);
  // scrub only in the wetter/greener pockets (where both noises peak)
  mat.colorNode = mix(base, v3(scrub), big.mul(fine).mul(0.6));
  return mat;
}
