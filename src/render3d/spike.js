// WestWard engine-rewrite spike — static Dustward opening scene in Three.js.
//
// Milestone 1 of docs/roadmap.md. This renders ONE static first-view scene with
// placeholder low-poly geometry to prove the new visual direction beats the
// Canvas screenshot. No gameplay is wired; the Canvas game is untouched.
//
// Served via the render3d.html dev route. Sets window.__spikeReady after the
// first frame so the comparison capture script knows when to screenshot.

import * as THREE from "three";
import { createRenderSnapshot } from "../bridge/stateSnapshot.js";
import { buildFrontierPlacements, PLAYER_SPAWN } from "./frontierLayout.js";

// world (x = east, y = south) -> 3D (X = east, Z = south, Y = up)
const toVec = (x, y, h = 0) => new THREE.Vector3(x, h, y);
const col = (hex) => new THREE.Color(hex);

const DUSK_TOP = "#2a1d3a"; // deep purple zenith
const DUSK_HORIZON = "#e8915a"; // warm sunset band
const GROUND_TINT = "#6f5536"; // dusty road dirt

function makeSkyDome() {
  const geo = new THREE.SphereGeometry(120, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: col(DUSK_TOP) },
      horizonColor: { value: col(DUSK_HORIZON) },
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vPos;
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      void main() {
        float t = clamp(pow(max(vPos.y, 0.0), 0.55), 0.0, 1.0);
        vec3 c = mix(horizonColor, topColor, t);
        // subtle warm glow lifting from the horizon
        c += horizonColor * (1.0 - t) * 0.18;
        gl_FragColor = vec4(c, 1.0);
      }
    `,
  });
  return new THREE.Mesh(geo, mat);
}

function standard(hex, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color: col(hex),
    roughness: opts.roughness ?? 0.92,
    metalness: opts.metalness ?? 0.02,
    emissive: opts.emissive ? col(opts.emissive) : col("#000000"),
    emissiveIntensity: opts.emissiveIntensity ?? 1.0,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1.0,
    flatShading: true,
  });
}

function addBox(group, w, h, d, mat, pos) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.copy(pos);
  m.position.y += h / 2;
  m.castShadow = true;
  m.receiveShadow = true;
  group.add(m);
  return m;
}

// --- per-kind placeholder builders ---------------------------------------

function buildBuilding(group, p, heightScale) {
  const h = 2.4 * heightScale;
  const w = 1.3 * p.size;
  addBox(group, w, h, w, standard(p.color, { roughness: 0.95 }), toVec(p.x, p.y));
  // roof cap, slightly darker, for a readable silhouette ridge
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(w * 0.82, h * 0.45, 4),
    standard("#3c2c1e"),
  );
  roof.rotation.y = Math.PI / 4;
  roof.position.copy(toVec(p.x, p.y, h + h * 0.225));
  roof.castShadow = true;
  group.add(roof);
}

function buildWatchtower(group, p) {
  const h = 5.5 * (p.size / 1.84);
  addBox(group, 1.1, h, 1.1, standard("#4a3526"), toVec(p.x, p.y));
  // glowing beacon at the top
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 16, 12),
    standard("#ffcf7a", { emissive: "#ffb84d", emissiveIntensity: 1.5 }),
  );
  beacon.position.copy(toVec(p.x, p.y, h + 0.4));
  group.add(beacon);
  const light = new THREE.PointLight(col(p.color), 14, 18, 2);
  light.position.copy(toVec(p.x, p.y, h + 0.4));
  group.add(light);
}

function buildLamp(group, p) {
  // post
  addBox(group, 0.14, 1.6, 0.14, standard("#2c2118"), toVec(p.x, p.y));
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 14, 10),
    standard("#ffb866", { emissive: "#ffa64d", emissiveIntensity: 1.4 }),
  );
  glow.position.copy(toVec(p.x, p.y, 1.7));
  group.add(glow);
  const light = new THREE.PointLight(col("#ffcaa0"), 9, 7, 2);
  light.position.copy(toVec(p.x, p.y, 1.7));
  group.add(light);
}

function buildFence(group, p) {
  const len = 1.6 * p.size + 0.6;
  const mat = standard(p.color);
  // two posts
  addBox(group, 0.12, 0.9, 0.12, mat, toVec(p.x - len / 2, p.y));
  addBox(group, 0.12, 0.9, 0.12, mat, toVec(p.x + len / 2, p.y));
  // two rails
  for (const ry of [0.4, 0.72]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, 0.08), mat);
    rail.position.copy(toVec(p.x, p.y, ry));
    rail.castShadow = true;
    group.add(rail);
  }
}

function buildSign(group, p) {
  addBox(group, 0.1, 1.0, 0.1, standard("#3a2a1c"), toVec(p.x, p.y));
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.42, 0.06),
    standard(p.color, { emissive: p.color, emissiveIntensity: 0.5 }),
  );
  panel.position.copy(toVec(p.x, p.y, 1.05));
  panel.castShadow = true;
  group.add(panel);
}

function buildJobBoard(group, p) {
  const mat = standard("#5a4128");
  addBox(group, 0.14, 1.3, 0.14, mat, toVec(p.x - 0.5, p.y));
  addBox(group, 0.14, 1.3, 0.14, mat, toVec(p.x + 0.5, p.y));
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(1.35, 0.95, 0.1),
    standard(p.color, { emissive: p.color, emissiveIntensity: 0.45 }),
  );
  board.position.copy(toVec(p.x, p.y, 1.05));
  board.castShadow = true;
  group.add(board);
  // warm reading light over the board
  const light = new THREE.PointLight(col("#ffd9a0"), 6, 6, 2);
  light.position.copy(toVec(p.x, p.y, 1.9));
  group.add(light);
}

function buildSmokeCache(group, p) {
  // chest
  addBox(group, 0.7, 0.5, 0.5, standard(p.color, { emissive: "#5a3a12", emissiveIntensity: 0.3 }), toVec(p.x, p.y));
  // rising smoke plume — stacked translucent cones
  for (let i = 0; i < 4; i++) {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.4 - i * 0.06, 0.7, 10, 1, true),
      standard("#cdbfa6", { transparent: true, opacity: 0.32 - i * 0.05, roughness: 1 }),
    );
    cone.position.copy(toVec(p.x, p.y, 0.8 + i * 0.55));
    group.add(cone);
  }
}

function buildWagon(group, p) {
  // tilted bed
  const bed = addBox(group, 1.4, 0.6, 0.8, standard(p.color), toVec(p.x, p.y, 0.4));
  bed.rotation.z = -0.25;
  // wheels
  for (const dx of [-0.55, 0.55]) {
    const wheel = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.09, 8, 16),
      standard("#2c2118"),
    );
    wheel.position.copy(toVec(p.x + dx, p.y + 0.45, 0.45));
    wheel.castShadow = true;
    group.add(wheel);
  }
}

function buildSlime(group, p) {
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 18, 14, 0, Math.PI * 2, 0, Math.PI / 1.8),
    standard(p.color, { emissive: "#1f4d18", emissiveIntensity: 0.6, roughness: 0.4 }),
  );
  body.scale.set(1.1, 0.8, 1.1);
  body.position.copy(toVec(p.x, p.y, 0.05));
  body.castShadow = true;
  group.add(body);
  // hostile glowing eyes
  for (const dx of [-0.16, 0.16]) {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 8, 6),
      standard("#fff2c0", { emissive: "#ffd24d", emissiveIntensity: 3 }),
    );
    eye.position.copy(toVec(p.x + dx, p.y - 0.45, 0.5));
    group.add(eye);
  }
}

function buildGeneric(group, p, h = 0.6) {
  addBox(group, 0.6 * p.size, h, 0.6 * p.size, standard(p.color), toVec(p.x, p.y));
}

function buildPlacement(group, p) {
  switch (p.kind) {
    case "town":
    case "ranch": return buildBuilding(group, p, p.depthLane === "background" ? 1.3 : 1.0);
    case "gate": return buildBuilding(group, p, 0.8);
    case "watchtower":
    case "landmark": return buildWatchtower(group, p);
    case "lamp": return buildLamp(group, p);
    case "fence": return buildFence(group, p);
    case "sign":
    case "road": return buildSign(group, p);
    case "jobBoard": return buildJobBoard(group, p);
    case "smokeCache": return buildSmokeCache(group, p);
    case "brokenWagon": return buildWagon(group, p);
    case "roadSlime": return buildSlime(group, p);
    case "cart":
    case "crate": return buildGeneric(group, p, 0.7);
    default: return buildGeneric(group, p);
  }
}

function buildGround(scene, snapshot) {
  const spawn = snapshot?.player || PLAYER_SPAWN;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    standard(GROUND_TINT, { roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(spawn.x + 6, 0, spawn.y);
  ground.receiveShadow = true;
  scene.add(ground);

  // dusty road strip running east from spawn through town toward the tower
  const ROAD_LEN = 22;
  const ROAD_CX = spawn.x + 9;
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(ROAD_LEN, 1.9),
    standard("#9a7c4f", { roughness: 1 }),
  );
  road.rotation.x = -Math.PI / 2;
  road.position.set(ROAD_CX, 0.02, spawn.y + 0.4);
  road.receiveShadow = true;
  scene.add(road);

  // bright dust edges for readability
  for (const off of [-1.05, 1.05]) {
    const edge = new THREE.Mesh(
      new THREE.PlaneGeometry(ROAD_LEN, 0.2),
      standard("#d8be8c", { roughness: 1, emissive: "#3a2c14", emissiveIntensity: 0.2 }),
    );
    edge.rotation.x = -Math.PI / 2;
    edge.position.set(ROAD_CX, 0.03, spawn.y + 0.4 + off);
    scene.add(edge);
  }
}

function createSpikeSnapshot() {
  const worldObjects = buildFrontierPlacements();
  return createRenderSnapshot({
    mode: "playing",
    time: 8,
    player: { x: PLAYER_SPAWN.x, y: PLAYER_SPAWN.y, angle: 0, inHouse: false },
    regions: { activeRegion: "frontier", activeRegionLabel: "Dustward Frontier", poisDiscovered: [] },
    inventory: {},
    quests: { slime: { progress: 0 }, crystal: { progress: 0 } },
    weather: { kind: "clear", rain: 0, fog: 0.18, wind: 0.15, lightning: 0, quality: "high" },
    world: { timeOfDay: 0.7, jobs: { activeJobId: null, completedJobIds: [], progressByJobId: {} } },
    house: { unlocked: false },
    narrative: { npcMemory: { byNpc: {} } },
    chest: { opened: false },
  }, {
    boardProp: worldObjects.find((p) => p.kind === "jobBoard"),
    roadDiscoveryLead: worldObjects.find((p) => p.kind === "brokenWagon"),
    enemies: worldObjects
      .filter((p) => p.kind === "roadSlime")
      .map((p) => ({
        id: "opening-patrol",
        type: "slime",
        label: "Road Slime",
        behavior: "balanced",
        x: p.x,
        y: p.y,
        hp: 38,
        alive: true,
        color: p.color,
        openingPatrol: true,
      })),
    worldObjects,
  });
}

function syncObjectiveDom(snapshot) {
  const label = document.querySelector("#objective .label");
  const text = document.querySelector("#objective .text");
  const tag = document.querySelector("#tag");
  if (label) label.textContent = snapshot.objective?.title || "Objective";
  if (text) text.textContent = snapshot.objective?.currentTarget
    ? `${snapshot.objective.currentTarget} - ${snapshot.objective.nextAction}`
    : "Open Boone's board - accept the Marsh Slime Bounty.";
  if (tag) tag.textContent = `WestWard - render3d spike - ${snapshot.region.label} - ${snapshot.objective?.phase || "static"}`;
}

export function startSpike(canvas, snapshot = createSpikeSnapshot()) {
  syncObjectiveDom(snapshot);
  window.__westwardRenderSnapshot = snapshot;
  // preserveDrawingBuffer lets the spike-compare script grab a frame via
  // canvas.toDataURL() between RAF frames. Minimal cost for a spike route.
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(col("#c39a72"), 0.02);

  scene.add(makeSkyDome());

  // lighting: dim warm ambient + low sunset key + cool sky fill
  scene.add(new THREE.HemisphereLight(col("#c9a6ff"), col("#4a3826"), 0.55));
  const sun = new THREE.DirectionalLight(col("#ffae6a"), 1.6);
  sun.position.set(snapshot.player.x - 8, 6, snapshot.player.y - 5); // low west sun
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 60;
  sun.shadow.camera.left = -25;
  sun.shadow.camera.right = 25;
  sun.shadow.camera.top = 25;
  sun.shadow.camera.bottom = -25;
  sun.target.position.set(snapshot.player.x + 6, 0, snapshot.player.y);
  scene.add(sun);
  scene.add(sun.target);

  buildGround(scene, snapshot);

  const props = new THREE.Group();
  for (const p of snapshot.worldObjects) buildPlacement(props, p);
  scene.add(props);

  // hero vista: pulled back behind spawn and raised, looking east down the road
  // toward the board / cache / wagon / slime cluster and the watchtower beacon.
  const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(snapshot.player.x - 4.0, 3.4, snapshot.player.y + 0.3);
  camera.lookAt(snapshot.player.x + 6.0, 0.6, snapshot.player.y + 0.5);

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener("resize", onResize);

  let frames = 0;
  function loop() {
    renderer.render(scene, camera);
    frames++;
    if (frames === 2) window.__spikeReady = true; // captured after a settled frame
    requestAnimationFrame(loop);
  }
  loop();

  return { scene, camera, renderer, snapshot };
}

// Auto-start when loaded as the render3d.html entry.
const canvas = document.getElementById("scene");
if (canvas) startSpike(canvas);
