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
import { pass, uniform, mix, clamp, smoothstep, vec3 } from "three/tsl";
import { sobel } from "three/addons/tsl/display/SobelOperatorNode.js";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { film } from "three/addons/tsl/display/FilmNode.js";
import { godrays } from "three/addons/tsl/display/GodraysNode.js";

// Per-region post constants. Ink + bloom-shape are region identity; bloom
// strength and grade come live from the palette.
export const REGION_POST = {
  frontier: {
    inkColor: "#0a0408",
    edgeStrength: 2.2,
    // Sobel response below `edgeLo` is ignored (kills faint ground gradients) and
    // ramps to full ink by `edgeHi`.
    edgeLo: 0.06,
    edgeHi: 0.22,
    bloomBase: 0.16, // multiplied by palette.bloom
    bloomRadius: 0.55,
    bloomThreshold: 0.88, // only the brightest emissives/sun glow bloom
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
    gradeTint: uniform(new THREE.Color("#ff8a4a")),
    gradeAmount: uniform(0.12),
    // grain is time-animated (non-deterministic) — visual-capture passes 0.
    grainIntensity: uniform(opts.grainIntensity ?? region.grainIntensity),
    godrayStrength: uniform(opts.godrayStrength ?? 0.45),
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

  // 3. Warm grade — brightness-preserving multiply toward the palette tint,
  //    then the exposure multiplier (day/night + weather darkening).
  const graded = inked
    .mul(mix(vec3(1, 1, 1), vec3(uniforms.gradeTint).mul(1.6), uniforms.gradeAmount))
    .mul(uniforms.exposure);

  // 4. Film grain — paper-grain tooth over the whole frame.
  const grained = film(graded, uniforms.grainIntensity);

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
    }
  }

  return { post, uniforms, applyPalette, bloomPass };
}
