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
import { pass, uniform, mix, clamp, smoothstep, vec3, vec2, uv, dot, float, mrt, output, normalView } from "three/tsl";
import { sobel } from "three/addons/tsl/display/SobelOperatorNode.js";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { film } from "three/addons/tsl/display/FilmNode.js";
import { godrays } from "three/addons/tsl/display/GodraysNode.js";
import { ao } from "three/addons/tsl/display/GTAONode.js";

// Per-region post constants. Ink + bloom-shape are region identity; bloom
// strength and grade come live from the palette.
export const REGION_POST = {
  frontier: {
    inkColor: "#0a0408",
    // Westward Believability Pass (Phase B): the frontier pivots OFF cel/ink to a
    // grounded, naturalistic read (Red Dead-lite). The screen-space Sobel ink is a
    // GLOBAL pass, so it's dropped to 0 — the town now reads through PBR materials
    // + golden-hour light, and the open range simply reads softer without linework.
    // (Restore ~2.5 to bring the comic outline back if the pivot is reverted.)
    edgeStrength: 0,
    // Sobel response below `edgeLo` is ignored (kills faint ground gradients) and
    // ramps to full ink by `edgeHi`. Tighter gate (0.06→0.08) culls more faint
    // gradient lines; narrower ramp (0.28→0.25) makes the ink commit harder.
    edgeLo: 0.08,
    edgeHi: 0.25,
    // GTAO: grounds props/buildings where they meet the ground and each other —
    // the "everything floats" fix (art doc pillar 3). Strength is the mix toward
    // the occluded frame; radius in world units (hero ≈ 1.8u tall).
    aoStrength: 0.85,
    aoRadius: 0.5,
    bloomBase: 0.16, // multiplied by palette.bloom — lifted from 0.11 so lamps/slime/beacon/neon read radiant (threshold 0.95 keeps walls/sky crisp)
    bloomRadius: 0.7, // wider painterly glow
    bloomThreshold: 0.95, // only true emissives (lamps/beacon/sun disc) bloom — sky/walls stay crisp
    grainIntensity: 0.05, // grain whisper, not texture (was 0.08)
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
  // MRT: color + view-space normals, so GTAO has the normal buffer it needs.
  scenePass.setMRT(mrt({ output, normal: normalView }));
  const color = scenePass.getTextureNode("output");
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
    contrast: uniform(1.08),
    saturation: uniform(1.08),
    // Split-tone hues (centred on grey ~0.5 — only the offset from 0.5 matters,
    // so these shift colour, not brightness): cool-blue shadows, warm-amber lights.
    shadowTint: uniform(new THREE.Color("#3a4a7a")),
    highlightTint: uniform(new THREE.Color("#ffb050")),
    // How hard the split-tone bites (palette-driven so dusk can push cinematic
    // cool-shadow/warm-highlight separation; was a hardcoded 0.06 = invisible).
    splitStrength: uniform(opts.splitStrength ?? 0.06),
    // grain is time-animated (non-deterministic) — visual-capture passes 0.
    grainIntensity: uniform(opts.grainIntensity ?? region.grainIntensity),
    godrayStrength: uniform(opts.godrayStrength ?? 0.08),
    // Vignette: darken toward the frame corners to draw the eye to the street.
    // Deterministic (static) so it's safe under the ?visual capture.
    vignetteStrength: uniform(opts.vignetteStrength ?? 0.045),
    // Final exposure multiplier — PostProcessing ignores renderer.toneMappingExposure,
    // so day/night exposure and weather darkening ride this uniform instead.
    exposure: uniform(1),
  };

  // 0. GTAO — screen-space ambient occlusion. Darkens creases, prop/ground
  //    contacts, and building junctions so the world stops floating. Multiplied
  //    into the scene color BEFORE bloom so emissives still glow over it.
  //    Disable with opts.ao === false (headless/unit paths).
  // GTAO + god-rays both sample the scene depth (and AO also the normal) texture.
  // three r184's WebGL2 backend does NOT expose those MRT targets —
  // `scenePass.getTextureNode("depth")` resolves to null and GodraysNode/GTAO
  // crash on build (boot hangs). They're fidelity extras, so the reduced-fidelity
  // WebGL2 fallback (CI / software-GL / old GPUs) drops them; real WebGPU keeps
  // them. opts.backend is threaded from createRenderer; default to the safe path.
  const depthOK = opts.backend ? opts.backend === "webgpu" : !!renderer?.backend?.isWebGPUBackend;
  let occluded = color.rgb;
  if (opts.ao !== false && depthOK) {
    const aoPass = ao(scenePass.getTextureNode("depth"), scenePass.getTextureNode("normal"), camera);
    aoPass.radius.value = opts.aoRadius ?? region.aoRadius ?? 0.5;
    // Half-res AO: ~4× cheaper and visually identical for this low-frequency
    // grounding effect — full-res GTAO was the #1 frame cost on HiDPI.
    aoPass.resolutionScale = 0.5;
    const aoTex = aoPass.getTextureNode();
    uniforms.aoStrength = uniform(opts.aoStrength ?? region.aoStrength ?? 0.85);
    occluded = color.rgb.mul(mix(float(1), aoTex.r, uniforms.aoStrength));
  }

  // 1. Bloom — soft glow on the brightest emissives (lamps, beacon, slime, sun).
  const bloomPass = bloom(occluded, region.bloomBase, region.bloomRadius, region.bloomThreshold);
  let lit = occluded.add(bloomPass);

  // 1b. Volumetric god-rays from the sun, beaming past the mesa/building
  //     silhouettes (the western's "soul" — docs/roadmap.md §3, Bet 4). Optional:
  //     only when a sun light is supplied, so headless/unit paths stay simple.
  if (opts.sunLight && depthOK) {
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
  const luma = clamp(dot(contrasted, vec3(0.2126, 0.7152, 0.0722)), 0, 1);
  const saturated = mix(vec3(luma), contrasted, uniforms.saturation).clamp(0, 1);
  // split-tone: ADD a hue shift biased by luma (cool into shadows, warm into
  // highlights), centred on grey so it shifts colour WITHOUT crushing value —
  // (tint-0.5) is signed, scaled by a gentle weight. Shadows get the shadowTint,
  // highlights the highlightTint; midtones barely move. This spreads warm/cool
  // drama across the whole frame instead of darkening it.
  const shTint = vec3(uniforms.shadowTint).sub(0.5);
  const hlTint = vec3(uniforms.highlightTint).sub(0.5);
  const split = mix(shTint, hlTint, luma).mul(uniforms.splitStrength); // palette-driven split-tone
  const splitToned = saturated.add(split).clamp(0, 1);
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
      // Newly palette-driven so dusk can dial in full cinematic drama. Each guarded
      // so palettes that omit them keep the constructor defaults (tests unaffected).
      if (typeof p.grade.splitStrength === "number") uniforms.splitStrength.value = p.grade.splitStrength;
      if (typeof p.grade.godrayStrength === "number") uniforms.godrayStrength.value = p.grade.godrayStrength;
      if (typeof p.grade.vignetteStrength === "number") uniforms.vignetteStrength.value = p.grade.vignetteStrength;
      if (typeof p.grade.bloomThreshold === "number" && bloomPass.threshold) {
        bloomPass.threshold.value = p.grade.bloomThreshold;
      }
    }
  }

  return { post, uniforms, applyPalette, bloomPass };
}
