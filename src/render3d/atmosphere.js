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

const col = (hex) => new THREE.Color(hex);

const SKY_VERT = `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// 3-stop gradient + sun/moon disc + halo glow + hashed star field.
const SKY_FRAG = `
  varying vec3 vDir;
  uniform vec3 topColor;
  uniform vec3 midColor;
  uniform vec3 horizonColor;
  uniform vec3 sunDir;
  uniform vec3 sunColor;
  uniform float sunDisc;
  uniform float sunGlow;
  uniform float starOpacity;

  float hash(vec3 p) {
    return fract(sin(dot(floor(p), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
  }

  void main() {
    vec3 dir = normalize(vDir);
    float t = clamp(pow(max(dir.y, 0.0), 0.55), 0.0, 1.0);
    vec3 c = t < 0.35
      ? mix(horizonColor, midColor, t / 0.35)
      : mix(midColor, topColor, (t - 0.35) / 0.65);
    c += horizonColor * (1.0 - t) * 0.12;

    // sun / moon disc + soft halo
    float d = dot(dir, normalize(sunDir));
    c += sunColor * smoothstep(1.0 - sunDisc, 1.0 - sunDisc * 0.25, d);
    c += sunColor * pow(max(d, 0.0), 6.0) * sunGlow;

    // hashed stars in the upper sky, faded in near the zenith
    if (starOpacity > 0.001 && dir.y > 0.02) {
      float h = hash(dir * 190.0);
      float star = step(0.9975, h) * starOpacity * smoothstep(0.0, 0.35, dir.y);
      c += vec3(star) * 1.4;
    }

    gl_FragColor = vec4(c, 1.0);
  }
`;

function makeSkyDome() {
  const geo = new THREE.SphereGeometry(140, 32, 18);
  const uniforms = {
    topColor: { value: col("#1a0f33") },
    midColor: { value: col("#472a6b") },
    horizonColor: { value: col("#d0784a") },
    sunDir: { value: new THREE.Vector3(-8, 6, -5).normalize() },
    sunColor: { value: col("#ffae6a") },
    sunDisc: { value: 0.02 },
    sunGlow: { value: 0.13 },
    starOpacity: { value: 0.12 },
  };
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms,
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
  });
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
  sun.shadow.camera.far = 80;
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -30;
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

  return {
    applyPalette,
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
