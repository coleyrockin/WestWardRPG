// Wet/muddy main street — Westward Believability Pass, Phase B step 7.
//
// The reference (docs/art/westward-target.png) is a muddy, PUDDLE-REFLECTIVE main
// street under golden-hour haze. This lays a PBR WET LAYER over the Westward town
// road: it is TRANSPARENT and only opaque where there's a puddle, so the dirt
// road's ruts/edges/centre still read through the dry majority of the street, and
// the puddles are dark + smooth and REFLECT the golden-hour env (the IBL in
// envLight.js) as real specular — approximate wet ground, not true SSR.
//
// Idiomatic to this TSL/WebGPU codebase (mirrors ground.js's createGroundMaterial):
// the puddle FIELD is a world-XZ noise driving the material's opacity + roughness +
// colour procedurally — no UV unwrap, no texture atlas. The field is ANISOTROPIC,
// stretched along the street's +x travel axis, so puddles pool into streaks running
// down the road (a wet track) instead of round blobs clinging to the edges.
// "No uniform gloss": roughness genuinely varies, glassy in the puddle, damp at its
// rim; and the dry road is simply not painted at all (alpha 0).
//
// The puddle FIELD is also a pure JS function (wetnessAt) using the ground's own
// valueNoise2, so the design — anisotropy, coverage, that wet AND dry both exist —
// is unit-tested even though the GPU shader can't be.

import * as THREE from "three";
import { MeshStandardNodeMaterial } from "three/webgpu";
import { Fn, positionWorld, floor, fract, sin, dot, smoothstep, float, vec2, vec3, mix } from "three/tsl";
import { valueNoise2 } from "../game/world/ground.js";

const col = (hex) => new THREE.Color(hex);
const v3 = (c) => vec3(c.r, c.g, c.b); // Color → TSL vec3 (mirrors ground.js)

// Puddle field controls — shared by the pure helper and the TSL graph so they
// describe the same surface (valueNoise2 and tslNoise use identical hash consts).
// X scales are LOWER than Z so features stretch ~2.5x along the street (+x travel
// axis) → puddles read as pooled streaks down the road, not round edge-blobs.
export const PUDDLE_SCALE_X1 = 0.24; // primary pool, along-street (low freq → long)
export const PUDDLE_SCALE_Z1 = 0.6; // primary pool, across-street
export const PUDDLE_SCALE_X2 = 0.55; // fine break-up, along-street
export const PUDDLE_SCALE_Z2 = 1.35; // fine break-up, across-street
export const PUDDLE_OFFSET = [19, 7]; // decorrelate the second octave
export const PUDDLE_LO = 0.52; // field below → fully dry (alpha 0)
export const PUDDLE_HI = 0.66; // field above → full puddle (soft rim between)

export const WET_ROUGHNESS = 0.08; // glassy puddle centre → sharp env reflection
export const DAMP_ROUGHNESS = 0.42; // damp rim → softer reflection

const DAMP_MUD = "#2a1f14"; // wet-darkened mud at a puddle's rim
const WET_MUD = "#140d08"; // near-black water at the puddle centre

const smooth01 = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Pure: the raw puddle field in ~[0,1] (before the wet/dry threshold). Anisotropic
// (x stretched) so it pools along the street.
export function wetnessField(x, z) {
  const n1 = valueNoise2(x * PUDDLE_SCALE_X1, z * PUDDLE_SCALE_Z1);
  const n2 = valueNoise2(x * PUDDLE_SCALE_X2 + PUDDLE_OFFSET[0], z * PUDDLE_SCALE_Z2 + PUDDLE_OFFSET[1]);
  return n1 * 0.65 + n2 * 0.35;
}

// Pure: wetness in [0,1] at world (x,z). 1 = puddle, 0 = dry mud. This is also the
// wet layer's ALPHA — 0 means the dirt road shows through untouched. Matches the
// TSL node below (same scales/offset/thresholds, same underlying value noise).
export function wetnessAt(x, z) {
  return smooth01(PUDDLE_LO, PUDDLE_HI, wetnessField(x, z));
}

// --- TSL value noise (mirror of ground.js; kept local so this module stands alone) ---
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

// The wet-street layer. TRANSPARENT — opaque only in puddles (alpha = the field),
// so the underlying dirt road's ruts/edges/centre read through the dry majority of
// the street. Shared across the town road segments; the puddle field is world-XZ
// so it lines up seamlessly wherever the road runs. Lay it just above the road with
// depthWrite off + a renderOrder so it composites cleanly (no z-fight on the centre
// stripe). Caller sets renderOrder + receiveShadow (shadows darken puddles → the
// reflection pops on the WebGPU path).
export function createWetStreetMaterial() {
  const mat = new MeshStandardNodeMaterial({ transparent: true, depthWrite: false });
  mat.metalness = 0; // dielectric mud/water; puddle reflection is Fresnel env, not metal

  const pc = positionWorld;
  const n1 = tslNoise(vec2(pc.x.mul(PUDDLE_SCALE_X1), pc.z.mul(PUDDLE_SCALE_Z1)));
  const n2 = tslNoise(vec2(pc.x.mul(PUDDLE_SCALE_X2).add(PUDDLE_OFFSET[0]), pc.z.mul(PUDDLE_SCALE_Z2).add(PUDDLE_OFFSET[1])));
  const field = n1.mul(0.65).add(n2.mul(0.35));
  const puddle = smoothstep(float(PUDDLE_LO), float(PUDDLE_HI), field); // 0 dry → 1 wet

  // Alpha IS the puddle: dry road shows through, puddle paints over.
  mat.opacityNode = puddle;
  // Centre is near-black water (deepest reflection); the rim is wet-darkened mud.
  mat.colorNode = mix(v3(col(DAMP_MUD)), v3(col(WET_MUD)), puddle);
  // The roughness that actually varies: damp rim → glassy centre. Low-roughness
  // dielectric + scene.environment = the warm sky reflected as wet-street specular,
  // strongest at the grazing angle the hero frame looks down the street.
  mat.roughnessNode = mix(float(DAMP_ROUGHNESS), float(WET_ROUGHNESS), puddle);

  return mat;
}
