// Atmosphere shell for the render3d spike: sky dome (gradient + sun/moon disc +
// glow + stars), key sun, hemisphere fill, cool/warm rim light, fog, and a few
// drifting cloud streaks. Everything is driven by a time-of-day palette
// (see timeOfDay.js) through applyPalette(), so switching dusk → golden hour →
// night is a single call.
//
// This is a Three.js shell — not unit-tested. The palette math it consumes is
// pure and tested in tests/render3d-time-of-day.test.ts. Smoke (spike_compare)
// covers that the scene renders without console errors.

import * as THREE from "three";
import { MeshBasicNodeMaterial } from "three/webgpu";
import {
  Fn,
  uniform,
  vec3,
  positionLocal,
  normalize,
  dot,
  max,
  pow,
  clamp,
  mix,
  smoothstep,
  step,
  floor,
  fract,
  sin,
} from "three/tsl";

const col = (hex) => new THREE.Color(hex);

// Sky dome authored in TSL so it runs on the WebGPURenderer's WebGPU *and* WebGL2
// backends from one graph (raw GLSL ShaderMaterial is rejected by the node
// pipeline). Same look as the previous shader: a 3-stop vertical gradient +
// sun/moon disc + halo glow + a hashed star field, all driven by palette
// uniforms that applyPalette() mutates in place (.value.set / = number).
function makeSkyDome() {
  const geo = new THREE.SphereGeometry(140, 32, 18);
  const uniforms = {
    topColor: uniform(col("#1a0f33")),
    midColor: uniform(col("#472a6b")),
    horizonColor: uniform(col("#d0784a")),
    sunDir: uniform(new THREE.Vector3(-8, 6, -5).normalize()),
    sunColor: uniform(col("#ffae6a")),
    sunDisc: uniform(0.02),
    sunGlow: uniform(0.13),
    starOpacity: uniform(0.12),
  };

  const skyColor = Fn(() => {
    const dir = normalize(positionLocal);
    const t = clamp(pow(max(dir.y, 0.0), 0.55), 0.0, 1.0);

    // Branchless 3-stop gradient: pick the lower (horizon→mid) or upper
    // (mid→top) band by step(0.35, t) — exact match to the old ternary.
    const lower = mix(uniforms.horizonColor, uniforms.midColor, clamp(t.div(0.35), 0.0, 1.0));
    const upper = mix(uniforms.midColor, uniforms.topColor, clamp(t.sub(0.35).div(0.65), 0.0, 1.0));
    const c = mix(lower, upper, step(0.35, t)).toVar();
    c.addAssign(uniforms.horizonColor.mul(t.oneMinus()).mul(0.12));

    // sun / moon disc + soft halo
    const d = dot(dir, normalize(uniforms.sunDir));
    c.addAssign(
      uniforms.sunColor.mul(smoothstep(uniforms.sunDisc.oneMinus(), uniforms.sunDisc.mul(0.25).oneMinus(), d)),
    );
    c.addAssign(uniforms.sunColor.mul(pow(max(d, 0.0), 6.0)).mul(uniforms.sunGlow));

    // hashed stars in the upper sky, faded in near the zenith
    const hp = floor(dir.mul(190.0));
    const h = fract(sin(dot(hp, vec3(12.9898, 78.233, 37.719))).mul(43758.5453));
    const star = step(0.9975, h).mul(uniforms.starOpacity).mul(smoothstep(0.0, 0.35, dir.y)).mul(step(0.02, dir.y));
    c.addAssign(vec3(star).mul(1.4));

    return c;
  });

  const mat = new MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false, fog: false });
  mat.colorNode = skyColor();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return { mesh, uniforms };
}

// A few soft cloud streaks high near the horizon. Tinted by the palette;
// drift is added in the world-animation phase.
function makeClouds(anchor) {
  const group = new THREE.Group();
  const specs = [
    { x: -10, y: 34, z: -28, w: 26, h: 6 },
    { x: 18, y: 40, z: -34, w: 34, h: 7 },
    { x: 6, y: 30, z: 30, w: 30, h: 6 },
  ];
  const meshes = [];
  for (const s of specs) {
    const mat = new THREE.MeshBasicMaterial({
      color: col("#5a4a6a"),
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      fog: false,
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.h), mat);
    m.position.set(anchor.x + s.x, s.y, anchor.y + s.z);
    m.lookAt(anchor.x, s.y * 0.4, anchor.y);
    m.renderOrder = -1;
    group.add(m);
    meshes.push(m);
  }
  return { group, meshes };
}

export function createAtmosphere(scene, renderer, opts = {}) {
  const anchor = opts.anchor || { x: 9.5, y: 8.5 };
  const playCore = opts.playCore || { x: anchor.x + 6, y: anchor.y };

  const sky = makeSkyDome();
  scene.add(sky.mesh);

  scene.fog = new THREE.FogExp2(col("#8a6a9a"), 0.02);

  const hemi = new THREE.HemisphereLight(col("#5a2890"), col("#1e0e04"), 0.6);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(col("#ffae6a"), 1.3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 60;
  // Tightened to the play wedge (still covers the ~30-unit world) for higher
  // effective shadow resolution = crisper, more dramatic raking shadows.
  sun.shadow.camera.left = -18;
  sun.shadow.camera.right = 18;
  sun.shadow.camera.top = 18;
  sun.shadow.camera.bottom = -18;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 3; // softer PCF penumbra — painterly raking shadows
  sun.target.position.set(playCore.x, 0, playCore.y);
  scene.add(sun);
  scene.add(sun.target);

  // Cool/warm fill from the opposite side — separates silhouettes from the dark.
  const rim = new THREE.DirectionalLight(col("#5a6bd0"), 0.35);
  rim.target.position.set(playCore.x, 0, playCore.y);
  scene.add(rim);
  scene.add(rim.target);

  const clouds = makeClouds(anchor);
  scene.add(clouds.group);

  let current = null;

  function applyPalette(p) {
    current = p;
    const u = sky.uniforms;
    u.topColor.value.set(p.sky.top);
    u.midColor.value.set(p.sky.mid);
    u.horizonColor.value.set(p.sky.horizon);
    u.sunColor.value.set(p.sun.color);
    u.sunDir.value.set(p.sun.dir.x, p.sun.dir.y, p.sun.dir.z).normalize();
    u.sunDisc.value = p.sun.disc;
    u.sunGlow.value = p.sun.glow;
    u.starOpacity.value = p.stars;

    scene.fog.color.set(p.fog.color);
    scene.fog.density = p.fog.density;

    hemi.color.set(p.hemi.sky);
    hemi.groundColor.set(p.hemi.ground);
    hemi.intensity = p.hemi.intensity;

    sun.color.set(p.sun.color);
    sun.intensity = p.sun.intensity;
    sun.position.set(anchor.x + p.sun.dir.x, p.sun.dir.y, anchor.y + p.sun.dir.z);

    rim.color.set(p.rim.color);
    rim.intensity = p.rim.intensity;
    rim.position.set(anchor.x + p.rim.dir.x, p.rim.dir.y, anchor.y + p.rim.dir.z);

    renderer.toneMappingExposure = p.exposure;

    // tint the cloud streaks toward the sky mid color
    const cloudTint = col(p.sky.mid).lerp(col(p.sky.horizon), 0.4);
    for (const m of clouds.meshes) {
      m.material.color.copy(cloudTint);
      m.material.opacity = p.key === "night" ? 0.16 : 0.3;
    }

    if (typeof document !== "undefined" && document.body) {
      document.body.style.background = p.bodyBg;
    }
  }

  // Drift the cloud streaks across the sky and wrap, so the sky reads as alive.
  // windScale lets weather speed the drift; no-op when dt is 0 (frozen capture).
  function driftClouds(dt, windScale = 1) {
    if (!dt) return;
    for (const m of clouds.meshes) {
      m.position.x += dt * 0.5 * windScale;
      if (m.position.x > anchor.x + 55) m.position.x -= 110;
    }
  }

  return {
    applyPalette,
    driftClouds,
    get palette() {
      return current;
    },
    sky,
    sun,
    rim,
    hemi,
    clouds,
  };
}
