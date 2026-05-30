// Post-processing stacks — the screen-space half of the "moving graphic novel"
// look (docs/roadmap.md §3, Bets 1 & 4). Built on the TSL PostProcessing class
// so one node graph runs on the WebGPURenderer's WebGPU and WebGL2 backends.
//
// Frontier composition (the showcase region):
//   scene color ─┐
//   linear depth ┴ Sobel → ink edges ─→ bloom (glow) ─→ warm grade ─→ film grain ─→ out
//
// The time-of-day palette drives bloom strength + grade tint/amount each frame
// (applyPalette below), so dusk → golden hour → night re-grades the whole frame.
// Per-region identities (Ashfall heat-haze/bleach, Ironlantern CRT/neon) are
// scaffolded as data and shipped region-by-region (Phase 6); only Frontier is
// wired now.

import * as THREE from "three";
import { PostProcessing } from "three/webgpu";
import { pass, uniform, mix, clamp, smoothstep, vec3, vec2, uv, dot, float } from "three/tsl";
import { sobel } from "three/addons/tsl/display/SobelOperatorNode.js";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { film } from "three/addons/tsl/display/FilmNode.js";
import { godrays } from "three/addons/tsl/display/GodraysNode.js";

// Per-region post constants. Ink + bloom-shape are region identity; bloom
// strength and grade come live from the palette.
export const REGION_POST = {
  frontier: {
    inkColor: "#0a0408",
    edgeStrength: 3.4, // bold, confident comic linework
    // Sobel response below `edgeLo` is ignored (kills faint ground gradients) and
    // ramps to full ink by `edgeHi`.
    edgeLo: 0.045,
    edgeHi: 0.28,
    bloomBase: 0.11, // multiplied by palette.bloom
    bloomRadius: 0.7, // wider painterly glow
    bloomThreshold: 0.9, // only true highlights bloom — keeps the sky/haze from washing milky
    grainIntensity: 0.14,
  },
  // Scaffolded — shipped in Phase 6.
  ashfall: { inkColor: "#1a0d06", edgeStrength: 2.0, edgeLo: 0.06, edgeHi: 0.24, bloomBase: 0.3, bloomRadius: 0.6, bloomThreshold: 0.82, grainIntensity: 0.14 },
  ironlantern: { inkColor: "#05080f", edgeStrength: 2.4, edgeLo: 0.05, edgeHi: 0.2, bloomBase: 0.5, bloomRadius: 0.7, bloomThreshold: 0.7, grainIntensity: 0.2 },
};

// Build the PostProcessing pipeline for a region. Returns the pipeline, the live
// uniforms, and applyPalette() so the day/night arc re-grades the frame.
export function createPostProcessing(renderer, scene, camera, opts = {}) {
  const region = REGION_POST[opts.region] || REGION_POST.frontier;

  const post = new PostProcessing(renderer);
  const scenePass = pass(scene, camera);
  const color = scenePass.getTextureNode();
  const depth = scenePass.getLinearDepthNode();

  const uniforms = {
    inkColor: uniform(new THREE.Color(opts.inkColor ?? region.inkColor)),
    edgeStrength: uniform(opts.edgeStrength ?? region.edgeStrength),
    edgeLo: uniform(opts.edgeLo ?? region.edgeLo),
    edgeHi: uniform(opts.edgeHi ?? region.edgeHi),
    gradeTint: uniform(new THREE.Color("#ff9a4a")),
    gradeAmount: uniform(0.12),
    // Cinematic grade (replaces the old flat tint-multiply which couldn't make
    // contrast). contrast = S-curve strength around 0.5; saturation lifts the
    // cream wash; split-tone pushes shadows cool + highlights warm so the whole
    // frame gets drama, not just the lamp pool. All palette-driven (applyPalette).
    contrast: uniform(1.55),
    saturation: uniform(1.4),
    shadowTint: uniform(new THREE.Color("#1a0a2e")), // cool purple in the darks
    highlightTint: uniform(new THREE.Color("#ffb040")), // warm amber in the lights
    // grain is time-animated (non-deterministic) — visual-capture passes 0.
    grainIntensity: uniform(opts.grainIntensity ?? region.grainIntensity),
    godrayStrength: uniform(opts.godrayStrength ?? 1.3),
    // Vignette: darken toward the frame corners to draw the eye to the street.
    // Deterministic (static) so it's safe under the ?visual capture.
    vignetteStrength: uniform(opts.vignetteStrength ?? 0.4),
    // Final exposure multiplier — PostProcessing ignores renderer.toneMappingExposure,
    // so day/night exposure and weather darkening ride this uniform instead.
    exposure: uniform(1),
  };

  // 1. Bloom — soft glow on the brightest emissives (lamps, beacon, slime, sun).
  const bloomPass = bloom(color.rgb, region.bloomBase, region.bloomRadius, region.bloomThreshold);
  let lit = color.rgb.add(bloomPass);

  // 1b. Volumetric god-rays from the sun, beaming past the mesa/building
  //     silhouettes (the western's "soul" — docs/roadmap.md §3, Bet 4). Optional:
  //     only when a sun light is supplied, so headless/unit paths stay simple.
  if (opts.sunLight) {
    const rays = godrays(scenePass.getTextureNode("depth"), camera, opts.sunLight);
    lit = lit.add(rays.mul(uniforms.godrayStrength));
  }

  // 2. Depth-discontinuity ink edges, drawn ON TOP of the glow so the comic
  //    linework stays crisp instead of being washed out by bloom.
  const edge = sobel(depth);
  const edgeAmt = clamp(
    smoothstep(uniforms.edgeLo, uniforms.edgeHi, edge.r.mul(uniforms.edgeStrength)),
    0,
    1,
  );
  const inked = mix(lit, vec3(uniforms.inkColor), edgeAmt);

  // 3. Cinematic grade — a real chain that CREATES contrast (the old flat
  //    tint-multiply couldn't, which read as uniform cream):
  //    (a) contrast S-curve around 0.5 → deep shadows + lifted highlights;
  //    (b) saturation around luma → kills the desaturated cream wash;
  //    (c) split-tone → cool shadows × warm highlights spread drama across the
  //        whole frame; lerp weight by luma so darks/lights tint differently;
  //    (d) the legacy warm tint-multiply, now a gentle finishing nudge;
  //    (e) exposure (day/night + weather darkening).
  const contrasted = inked.sub(0.5).mul(uniforms.contrast).add(0.5).clamp(0, 1);
  const luma = dot(contrasted, vec3(0.2126, 0.7152, 0.0722));
  const saturated = mix(vec3(luma), contrasted, uniforms.saturation).clamp(0, 1);
  // split-tone: lerp each pixel between a shadow-tinted and highlight-tinted
  // version by its own luma, then blend that over the saturated colour.
  const splitColor = mix(
    saturated.mul(vec3(uniforms.shadowTint).mul(2.0)),
    saturated.mul(vec3(uniforms.highlightTint).mul(2.0)),
    clamp(luma, 0, 1),
  );
  const splitToned = mix(saturated, splitColor, float(0.35));
  const graded = splitToned
    .mul(mix(vec3(1, 1, 1), vec3(uniforms.gradeTint).mul(1.6), uniforms.gradeAmount))
    .mul(uniforms.exposure);

  // 3b. Vignette — radial darken from frame centre (UV distance), eases the eye
  //     toward the street. factor = 1 - strength·t as distance goes 0.32 → 0.85.
  const vigT = smoothstep(0.32, 0.85, uv().sub(vec2(0.5, 0.5)).length());
  const vignetted = graded.mul(uniforms.vignetteStrength.mul(vigT).oneMinus());

  // 4. Film grain — paper-grain tooth over the whole frame.
  const grained = film(vignetted, uniforms.grainIntensity);

  // debugEdges renders the raw ink mask (white-on-black) for tuning the Sobel.
  post.outputNode = opts.debugEdges ? vec3(edgeAmt) : grained;

  // Re-grade from the time-of-day palette: palette.bloom scales glow,
  // palette.grade re-tints. Safe to call every frame / on tween.
  function applyPalette(p) {
    if (!p) return;
    if (typeof p.bloom === "number") bloomPass.strength.value = region.bloomBase * p.bloom;
    if (p.grade) {
      if (p.grade.tint) uniforms.gradeTint.value.set(p.grade.tint);
      if (typeof p.grade.amount === "number") uniforms.gradeAmount.value = p.grade.amount;
      // Cinematic-grade knobs are optional palette fields; day/night can push
      // contrast/saturation and re-tint the split-tone (e.g. cooler at night).
      if (typeof p.grade.contrast === "number") uniforms.contrast.value = p.grade.contrast;
      if (typeof p.grade.saturation === "number") uniforms.saturation.value = p.grade.saturation;
      if (p.grade.shadowTint) uniforms.shadowTint.value.set(p.grade.shadowTint);
      if (p.grade.highlightTint) uniforms.highlightTint.value.set(p.grade.highlightTint);
    }
  }

  return { post, uniforms, applyPalette, bloomPass };
}
