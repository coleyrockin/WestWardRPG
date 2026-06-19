// Biome zones — pure classification + flora tint, NO THREE. Single source of
// truth shared by the ground material (TSL masks, ground.js) and the world
// layout (flora colouring, frontierLayout.js). Extracted from ground.js so the
// renderer-agnostic frontierLayout can tint flora per biome without pulling in
// three/webgpu.
//
// R2.1 — radial smoothstep falloff from each zone centre: inner radius → full
// weight (1.0); inner+fade → 0.0. Zones are non-overlapping (centre distance >>
// outer-radii sum). These centres/radii MUST match the TSL smoothstep masks in
// createGroundMaterial exactly (ground.js imports them from here).

// Marsh — Sunken Wash lowland, centre (76, 58)
export const MARSH_CX = 76, MARSH_CZ = 58, MARSH_R_IN = 16, MARSH_R_OUT = 26;
// Bluff — Prospector's Folly north bluffs, centre (33.5, -29)
export const BLUFF_CX = 33.5, BLUFF_CZ = -29, BLUFF_R_IN = 14, BLUFF_R_OUT = 24;
// Ranch — Eastwater Ranch grassland, centre (125, 12)
export const RANCH_CX = 125, RANCH_CZ = 12, RANCH_R_IN = 18, RANCH_R_OUT = 28;

// Local copy of ground.js's smooth01 (kept identical so biomeAt is byte-stable).
function smooth01(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

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

// 1.3 — flora biome tint. The ground tonal-shifts per biome (R2.1) but the
// scattered open-range flora used one flat palette, so marsh/bluff/ranch read
// identical up close. Blend a flora base colour toward its biome tint — the SAME
// hexes the ground material uses — so the zones read distinct. "range"/unknown
// key returns the base unchanged. Pure + deterministic; amount in [0,1].
const BIOME_FLORA_TINT = { marsh: "#7a8a6a", bluff: "#b87a45", ranch: "#a0a868" };

export function biomeFloraTint(baseHex, biomeKey = "range", amount = 0.35) {
  const target = BIOME_FLORA_TINT[biomeKey];
  if (!target) return baseHex;
  const a = Math.max(0, Math.min(1, amount));
  const parse = (h) => {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [br, bg, bb] = parse(baseHex);
  const [tr, tg, tb] = parse(target);
  const mix = (x, y) => Math.round(x + (y - x) * a);
  const to2 = (v) => v.toString(16).padStart(2, "0");
  return `#${to2(mix(br, tr))}${to2(mix(bg, tg))}${to2(mix(bb, tb))}`;
}
