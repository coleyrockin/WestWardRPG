// Terrain ground — relief + colour, the fix for the "cardboard table" read.
//
// Two jobs, both driven by one FBM value-noise field over world XZ so they agree:
//   1. RELIEF — a TSL `positionNode` pushes the plane up/down (dunes, dry-creek
//      undulation) so the ground is no longer dead flat. The SAME height field is
//      exported as the pure `groundHeight(x,z)` so props + scatter seat onto the
//      relief instead of floating (they must match the shader exactly).
//   2. COLOUR — a cel (toon) material whose base colour blends dirt / sand / scrub
//      patches, then darkens in the noise valleys (cheap baked-AO depth read).
//
// The relief is masked FLAT along the road/play corridor (|z-ROAD_Z| small) so the
// player, hero cluster, and road dressing stay on level ground; relief ramps in on
// the flanks (town, marsh, the mesa ring) where it reads as frontier terrain.
//
// TSL vertex displacement is already proven on the WebGPURenderer WebGL2 backend
// (water.js does the same) — see memory: skinned/displaced regular meshes render;
// instancing/lines/points do not.

import * as THREE from "three";
import { MeshToonNodeMaterial } from "three/webgpu";
import {
  Fn,
  positionWorld,
  positionLocal,
  floor,
  fract,
  sin,
  dot,
  abs,
  clamp,
  smoothstep,
  float,
  vec2,
  vec3,
  mix,
} from "three/tsl";
import { celGradientMap } from "../renderer/materials/nprMaterial.js";

const col = (h) => new THREE.Color(h);
const v3 = (c) => vec3(c.r, c.g, c.b);

// Relief tuning — shared by the pure height fn and the TSL graph so props seat
// exactly on the visible surface. Keep amplitude gentle: low slope across a
// building footprint avoids edge gaps; the corridor mask keeps gameplay flat.
const AMP = 0.48; // peak dune height — gentle flank undulation; kept low so off-corridor buildings don't tilt
const ROAD_Z = 8.9; // play/road corridor centreline (world z) kept flat
const MASK_LO = 2.6; // |z-ROAD_Z| below this → fully flat
const MASK_HI = 5.2; // above this → full relief
// South marsh basin (water + apron live ~z15-16) stays flat so relief never
// pokes up through the water surface. Relief ramps back out before the basin.
const MARSH_LO = 11.0; // relief still full at/below this z
const MARSH_HI = 12.5; // relief fully off (flat) at/above this z

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

// Pure smoothstep in [0,1] (matches TSL smoothstep).
function smooth01(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// Three-octave FBM over world XZ — the shared height/colour field.
// Two coarse octaves in [0,1]; third micro-relief octave adds ≤0.18 so the
// theoretical max is ≈1.18 (not renormalised per roadmap R2.3 spec).
export function groundFbm(x, z) {
  return (
    valueNoise2(x * 0.045, z * 0.045) * 0.65 +
    valueNoise2(x * 0.13 + 19, z * 0.13 + 7) * 0.35 +
    valueNoise2(x * 0.28 + 41, z * 0.28 + 23) * 0.18
  );
}

// Relief mask in [0,1]: 0 in the road/play corridor AND in the south marsh basin,
// ramping to 1 on the framing flanks.
export function reliefMask(z) {
  const corridor = smooth01(MASK_LO, MASK_HI, Math.abs(z - ROAD_Z));
  const marsh = 1 - smooth01(MARSH_LO, MARSH_HI, z); // → 0 in the basin
  return corridor * marsh;
}

// ---------------------------------------------------------------------------
// R2.1 — Biome zone masks (pure, mirrors the TSL smoothstep masks in
// createGroundMaterial exactly — same centres, radii, and smooth01 math).
//
// Each zone uses a radial smoothstep falloff from its centre:
//   inner radius → full weight (1.0); inner+fade → 0.0.
// The three zones are non-overlapping (min centre distance >> outer radii sum).
// ---------------------------------------------------------------------------

// Marsh — Sunken Wash lowland, centre (76, 58)
const MARSH_CX = 76, MARSH_CZ = 58, MARSH_R_IN = 16, MARSH_R_OUT = 26;
// Bluff — Prospector's Folly north bluffs, centre (33.5, -29)
const BLUFF_CX = 33.5, BLUFF_CZ = -29, BLUFF_R_IN = 14, BLUFF_R_OUT = 24;
// Ranch — Eastwater Ranch grassland, centre (125, 12)
const RANCH_CX = 125, RANCH_CZ = 12, RANCH_R_IN = 18, RANCH_R_OUT = 28;

/** Biome classification at world position (x, z).
 *  Returns { key: "marsh"|"bluff"|"ranch"|"range", marsh, bluff, ranch }
 *  where the three numbers are [0,1] mask weights (same values the shader uses).
 */
export function biomeAt(x, z) {
  const marshDist = Math.sqrt((x - MARSH_CX) ** 2 + (z - MARSH_CZ) ** 2);
  const bluffDist = Math.sqrt((x - BLUFF_CX) ** 2 + (z - BLUFF_CZ) ** 2);
  const ranchDist = Math.sqrt((x - RANCH_CX) ** 2 + (z - RANCH_CZ) ** 2);

  const marsh = 1 - smooth01(MARSH_R_IN, MARSH_R_OUT, marshDist);
  const bluff = 1 - smooth01(BLUFF_R_IN, BLUFF_R_OUT, bluffDist);
  const ranch = 1 - smooth01(RANCH_R_IN, RANCH_R_OUT, ranchDist);

  let key = "range";
  let best = 0;
  if (marsh > best) { best = marsh; key = "marsh"; }
  if (bluff > best) { best = bluff; key = "bluff"; }
  if (ranch > best) { best = ranch; key = "ranch"; }
  if (best < 0.5) key = "range";

  return { key, marsh, bluff, ranch };
}

// ---------------------------------------------------------------------------
// R2.2 — Per-zone fog density multiplier (pure, for stepWorld to consume).
//
// Returns a multiplicative factor scene.fog.density is multiplied by per frame.
//   marsh  +60% → 1.6   (ground mist you feel before you see water)
//   bluff  −20% → 0.8   (dry thin air)
//   ranch  +10% → 1.1
//   range  ±0%  → 1.0
// Blend is naturally smooth via the same biome masks (15u blend radius baked
// into the zone radii above — inner→outer span = 10u ≈ 15u effective read).
// ---------------------------------------------------------------------------

/** Multiplicative fog density factor at world position (x, z).
 *  stepWorld multiplies scene.fog.density by this value each frame.
 */
export function localFogBoost(x, z) {
  const { marsh, bluff, ranch } = biomeAt(x, z);
  return 1.0 + marsh * 0.6 - bluff * 0.2 + ranch * 0.1;
}

// World-space terrain height at (x,z). Pure + deterministic so props/scatter seat
// exactly on the rendered surface. Zero along the corridor; ±AMP on the flanks.
export function groundHeight(x, z, amp = AMP) {
  return (groundFbm(x, z) - 0.5) * 2 * amp * reliefMask(z);
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

// TSL three-octave FBM — must match groundFbm() numerically (same offsets/weights).
const tslFbm = Fn(([p]) =>
  tslNoise(p.mul(0.045))
    .mul(0.65)
    .add(tslNoise(p.mul(0.13).add(vec2(19, 7))).mul(0.35))
    .add(tslNoise(p.mul(0.28).add(vec2(41, 23))).mul(0.18)),
);

// opts: { dirt, sand, scrub, center:{x,z}, amp }. `center` is the ground mesh's
// world placement so the TSL height field lines up with the pure groundHeight().
export function createGroundMaterial(opts = {}) {
  const dirt = col(opts.dirt ?? "#6b4d30");
  const sand = col(opts.sand ?? "#a87a48");
  const scrub = col(opts.scrub ?? "#5e6a3a");
  const center = opts.center ?? { x: 14, z: 9 };
  const amp = opts.amp ?? AMP;
  const mat = new MeshToonNodeMaterial({ gradientMap: celGradientMap() });

  // R2.1 biome tint colours — tonal shifts inside warm-key/cool-shadow scheme.
  const marshTint = v3(col("#7a8a6a")); // desaturated grey-green
  const bluffTint = v3(col("#b87a45")); // ochre-rust
  const ranchTint = v3(col("#a0a868")); // dry sage-green

  // Colour: dirt/sand patches + scrub pockets, then darkened in valleys (baked-AO).
  const pc = vec2(positionWorld.x, positionWorld.z);
  const big = tslNoise(pc.mul(0.045)); // broad dirt/sand patches
  const fine = tslNoise(pc.mul(0.32)); // fine grain
  const base = mix(v3(dirt), v3(sand), big);
  // More scrub variation + a fine grain break so the ground reads as worn earth, not a flat wash.
  const tinted = mix(base, v3(scrub), big.mul(fine).mul(0.82)).mul(mix(float(0.94), float(1.06), fine));
  const fbmC = tslFbm(pc);
  // Valley shade → crest light.
  // Marsh deepens valley-AO floor (×1.15) — computed after biome mask.
  const aoBase = mix(float(0.68), float(1.24), fbmC);

  // R2.1 — Biome zone masks (TSL radial smoothstep, mirrors biomeAt() exactly).
  // smoothstep(inner, outer, dist) → 0 at centre; 1-smoothstep → 1 at centre.
  const marshDist = positionWorld.x.sub(MARSH_CX).pow(2).add(positionWorld.z.sub(MARSH_CZ).pow(2)).sqrt();
  const bluffDist = positionWorld.x.sub(BLUFF_CX).pow(2).add(positionWorld.z.sub(BLUFF_CZ).pow(2)).sqrt();
  const ranchDist = positionWorld.x.sub(RANCH_CX).pow(2).add(positionWorld.z.sub(RANCH_CZ).pow(2)).sqrt();
  const marshMask = smoothstep(MARSH_R_IN, MARSH_R_OUT, marshDist).oneMinus();
  const bluffMask = smoothstep(BLUFF_R_IN, BLUFF_R_OUT, bluffDist).oneMinus();
  const ranchMask = smoothstep(RANCH_R_IN, RANCH_R_OUT, ranchDist).oneMinus();

  // Blend tints into the base — tonal mix at ~0.55 strength.
  let biomed = mix(tinted, marshTint, marshMask.mul(0.55));
  biomed = mix(biomed, bluffTint, bluffMask.mul(0.55));
  biomed = mix(biomed, ranchTint, ranchMask.mul(0.55));

  // Marsh valley-AO deepens by ×1.15 inside the marsh zone.
  const aoFactor = aoBase.mul(float(1.0).add(marshMask.mul(0.15)));
  mat.colorNode = biomed.mul(aoFactor);

  // Relief: displace local +z (plane is rotated flat → local +z is world up).
  // Height input uses positionLocal mapped to world XZ to avoid positionWorld
  // recursion inside positionNode: worldX = center.x + lx, worldZ = center.z - ly.
  const wx = positionLocal.x.add(center.x);
  const wz = float(center.z).sub(positionLocal.y);
  const wp = vec2(wx, wz);
  const corridorM = clamp(smoothstep(MASK_LO, MASK_HI, abs(wz.sub(ROAD_Z))), 0, 1);
  const marshM = clamp(smoothstep(MARSH_LO, MARSH_HI, wz), 0, 1).oneMinus();
  const reliefH = corridorM.mul(marshM);
  const h = tslFbm(wp).sub(0.5).mul(2.0 * amp).mul(reliefH);
  mat.positionNode = positionLocal.add(vec3(0, 0, h));

  return mat;
}
