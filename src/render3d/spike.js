// WestWard engine-rewrite spike — static Dustward opening scene in Three.js.
//
// Milestone 1 of docs/roadmap.md. This renders ONE static first-view scene with
// placeholder low-poly geometry to prove the new visual direction beats the
// Canvas screenshot. No gameplay is wired; the Canvas game is untouched.
//
// Served via the render3d.html dev route. Sets window.__spikeReady after the
// first frame so the comparison capture script knows when to screenshot.

import * as THREE from "three";
import { createRenderer } from "../game/renderer/createRenderer.js";
import { createNprMaterial } from "../game/renderer/materials/nprMaterial.js";
import { createPostProcessing } from "../game/renderer/postStacks.js";
import { instanceModel, hashYaw } from "../game/renderer/assetLoader.js";
import { modelFor } from "../game/renderer/assetManifest.js";
import { createRenderSnapshot } from "../bridge/stateSnapshot.js";
import { buildFrontierPlacements, FIRST_FIVE_ROUTE, getRouteMetrics, PLAYER_SPAWN } from "./frontierLayout.js";
import { createPlayerController } from "./playerController.js";
import { buildProxies } from "./worldProxies.js";
import { createInteractionSystem } from "./interactionSystem.js";
import { createLoopStateMachine } from "./phaseState.js";
import { createObjectiveDomRefs, syncObjectiveDom } from "./objectiveDom.js";
import { createBoardModalController } from "./boardModal.js";
import { createEncounterSystem } from "./encounterSystem.js";
import { createAtmosphere } from "./atmosphere.js";
import { sunArc } from "./timeOfDay.js";
import { createWorldClock, tickClock, pinClock, cycleClock, dayTimeToKey } from "../game/world/worldClock.js";
import { createWater } from "../game/world/water.js";
import { createGroundMaterial, groundHeight } from "../game/world/ground.js";
import { createScatter } from "../game/world/scatter.js";
import { createPlaceholderCharacter } from "../game/world/character.js";
import { createAnimatedCharacter } from "../game/world/animatedCharacter.js";
import { createTownsfolk } from "../game/world/townsfolk.js";
import { resolveWeather, nextWeatherKind } from "../game/world/weather.js";
import { createWeatherSystem } from "../game/world/weatherView.js";

// world (x = east, y = south) -> 3D (X = east, Z = south, Y = up)
const toVec = (x, y, h = 0) => new THREE.Vector3(x, h, y);
const col = (hex) => new THREE.Color(hex);
const HERO_KINDS = Object.freeze(["jobBoard", "roadSign", "townBark", "smokeCache", "slimeTell", "roadSlime", "brokenWagon"]);

// Sky dome, sun/rim/hemi lights, fog, and clouds now live in atmosphere.js,
// driven by the time-of-day palettes in timeOfDay.js.

// All opaque/translucent surfaces use the NPR cel+rim uber-material (see
// nprMaterial.js). Kept named `standard` so the ~30 call sites read unchanged;
// roughness/metalness opts are accepted and ignored (toon has no microfacet).
function standard(hex, opts = {}) {
  return createNprMaterial(hex, opts);
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

// Graphic-novel silhouettes are now real depth-discontinuity ink edges in the
// post stack (postStacks.js, Sobel on linear depth) — the backface-expansion
// outline hack and its per-mesh duplicate draws are retired.

// Blob shadow projected under a world-space point.
function addContactShadow(group, x, z, rx = 1.0, rz = 0.7) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(1, 24),
    new THREE.MeshBasicMaterial({ color: col("#000000"), transparent: true, opacity: 0.38, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.scale.set(rx, 1, rz);
  m.position.set(x, 0.012, z);
  group.add(m);
}

// --- per-kind placeholder builders ---------------------------------------

function buildBuilding(group, p, heightScale) {
  const h = 2.4 * heightScale;
  const w = 1.3 * p.size;
  // Slightly cooler/darker for background depth cue
  const wallColor = p.depthLane === "background" ? "#6a4a30" : p.color;
  const box = addBox(group, w, h, w, standard(wallColor, { roughness: 0.95 }), toVec(p.x, p.y));
  // dark triangular silhouette roof
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(w * 0.82, h * 0.48, 4),
    standard("#241810"),
  );
  roof.rotation.y = Math.PI / 4;
  roof.position.copy(toVec(p.x, p.y, h + h * 0.24));
  roof.castShadow = true;
  group.add(roof);
  addContactShadow(group, p.x, p.y, w * 0.9, w * 0.9);
}

function buildWatchtower(group, p) {
  const h = 5.5 * (p.size / 1.84);
  const tower = addBox(group, 1.1, h, 1.1, standard("#3a2718"), toVec(p.x, p.y));
  addContactShadow(group, p.x, p.y, 1.4, 1.4);
  // glowing amber beacon at the top
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 16, 12),
    standard("#ffcf7a", { emissive: "#ffb030", emissiveIntensity: 2.2 }),
  );
  beacon.position.copy(toVec(p.x, p.y, h + 0.5));
  group.add(beacon);
  const light = new THREE.PointLight(col("#ffcc80"), 18, 22, 1.8);
  light.position.copy(toVec(p.x, p.y, h + 0.5));
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

function buildRoadPlank(group, p) {
  const plank = addBox(group, 1.25 * p.size, 0.08, 0.28 * p.size, standard(p.color || "#87633c"), toVec(p.x, p.y));
  plank.rotation.y = p.yaw || 0;
  addContactShadow(group, p.x, p.y, 0.55 * p.size, 0.16 * p.size);
  return plank;
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

function buildTownBarkMarker(group, p) {
  const base = addBox(group, 0.42, 0.14, 0.42, standard("#4a3218"), toVec(p.x, p.y));
  const pole = addBox(group, 0.08, 1.35, 0.08, standard("#3a2a1c"), toVec(p.x, p.y));
  const marker = new THREE.Mesh(
    new THREE.ConeGeometry(0.24, 0.34, 4),
    standard("#fff0b8", { emissive: "#ffd77b", emissiveIntensity: 0.7 }),
  );
  marker.rotation.y = Math.PI / 4;
  marker.position.copy(toVec(p.x, p.y, 1.62));
  group.add(marker);
  addContactShadow(group, p.x, p.y, 0.45, 0.45);
  return pole || base;
}

function buildSlimeTell(group, p) {
  const tell = new THREE.Group();
  tell.name = "slime-tell";
  const smearMat = standard("#75d06b", {
    emissive: "#2a6820",
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.72,
    rimStrength: 0,
  });
  for (let i = 0; i < 4; i++) {
    const smear = new THREE.Mesh(new THREE.CircleGeometry(0.34 - i * 0.035, 18), smearMat);
    smear.rotation.x = -Math.PI / 2;
    smear.scale.set(1.65, 1, 0.48);
    smear.position.set(p.x + i * 0.48, 0.07, p.y + Math.sin(i) * 0.22);
    tell.add(smear);
  }
  const reeds = standard("#5f7a4a", { roughness: 1 });
  for (const [dx, dz] of [[-0.35, 0.28], [0.1, -0.32], [0.5, 0.18]]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.72, 0.06), reeds);
    blade.position.copy(toVec(p.x + dx, p.y + dz, 0.36));
    blade.rotation.z = dx;
    tell.add(blade);
  }
  group.add(tell);
  return tell;
}

function buildJobBoard(group, p) {
  const mat = standard("#4a3218");
  addBox(group, 0.14, 1.6, 0.14, mat, toVec(p.x - 0.56, p.y));
  addBox(group, 0.14, 1.6, 0.14, mat, toVec(p.x + 0.56, p.y));
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(1.55, 1.08, 0.1),
    standard(p.color, { emissive: p.color, emissiveIntensity: 0.72 }),
  );
  board.position.copy(toVec(p.x, p.y, 1.14));
  board.castShadow = true;
  group.add(board);
  // warm reading lantern over the board
  const light = new THREE.PointLight(col("#ffd090"), 9, 7, 1.8);
  light.position.copy(toVec(p.x, p.y, 2.3));
  group.add(light);
  addContactShadow(group, p.x, p.y, 0.8, 0.8);
  return board;
}

function buildSmokeCache(group, p) {
  // chest
  const chest = addBox(group, 0.72, 0.54, 0.54, standard(p.color, { emissive: "#5a3a12", emissiveIntensity: 0.4 }), toVec(p.x, p.y));
  addContactShadow(group, p.x, p.y, 0.55, 0.55);
  // low soft wisp marking the cache — a few small faint cones near the chest.
  // Kept small/low so the depth-edge ink pass can't inflate it into a central
  // triangle and bloom can't blow it out.
  for (let i = 0; i < 3; i++) {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.16 + i * 0.05, 0.4, 7, 1, true),
      standard("#7d756a", { transparent: true, opacity: Math.max(0.04, 0.16 - i * 0.04), roughness: 1, rimStrength: 0 }),
    );
    cone.position.copy(toVec(p.x + i * 0.05, p.y, 0.55 + i * 0.32));
    group.add(cone);
  }
  return chest;
}

function buildWagon(group, p) {
  // broken/tilted bed
  const bed = addBox(group, 1.4, 0.6, 0.8, standard(p.color), toVec(p.x, p.y, 0.34));
  bed.rotation.z = -0.38;
  addContactShadow(group, p.x, p.y, 1.2, 0.9);
  // wheels — one intact, one splayed to sell the broken read
  const wheelGeo = new THREE.TorusGeometry(0.42, 0.09, 8, 16);
  const wheelMat = standard("#261c10");
  for (const [dx, rx] of [[-0.55, 0], [0.55, 0.38]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.position.copy(toVec(p.x + dx, p.y + 0.45, 0.42));
    wheel.rotation.x = rx;
    wheel.castShadow = true;
    group.add(wheel);
  }
  return bed;
}

function buildSlime(group, p) {
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.72, 18, 14, 0, Math.PI * 2, 0, Math.PI / 1.75),
    standard(p.color, { emissive: "#2a6820", emissiveIntensity: 1.1, roughness: 0.35 }),
  );
  body.scale.set(1.2, 0.82, 1.2);
  body.position.copy(toVec(p.x, p.y, 0.04));
  body.castShadow = true;
  group.add(body);
  addContactShadow(group, p.x, p.y, 1.0, 0.8);
  // sickly green ambient glow
  const slimeLight = new THREE.PointLight(col("#58d040"), 5, 5, 2);
  slimeLight.position.copy(toVec(p.x, p.y, 0.6));
  group.add(slimeLight);
  // hostile glowing eyes
  for (const dx of [-0.18, 0.18]) {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.085, 8, 6),
      standard("#fff2c0", { emissive: "#ffd24d", emissiveIntensity: 4 }),
    );
    eye.position.copy(toVec(p.x + dx, p.y - 0.52, 0.6));
    group.add(eye);
  }
  return body;
}

function buildGeneric(group, p, h = 0.6) {
  addBox(group, 0.6 * p.size, h, 0.6 * p.size, standard(p.color), toVec(p.x, p.y));
}

// --- bigger-world builders (no PointLights — keep the scene light budget tight) ---

// Mesa / cliff: tall flat-top earth silhouette that frames the horizon and
// walls the playable area. cliff uses a thinner, lower profile.
function buildMesa(group, p) {
  const isCliff = p.kind === "cliff";
  const w = (isCliff ? 2.2 : 2.9) * p.size;
  const d = (isCliff ? 1.3 : 2.9) * p.size;
  const h = (isCliff ? 2.6 : 3.5) * p.size;
  const mat = standard(p.color, { roughness: 1 });
  const base = addBox(group, w, h, d, mat, toVec(p.x, p.y));
  // inset flat-top cap for the classic mesa read
  const cap = addBox(group, w * 0.72, h * 0.4, d * 0.72, mat, toVec(p.x, p.y, h));
  addContactShadow(group, p.x, p.y, w * 0.62, d * 0.62);
  return base;
}

// Rock / boulder: low-poly stone lump. Deterministic tumble from position.
function buildRock(group, p) {
  const r = (p.kind === "boulder" ? 0.72 : 0.46) * p.size;
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), standard(p.color, { roughness: 1 }));
  m.position.copy(toVec(p.x, p.y, r * 0.6));
  m.rotation.set(0.3, p.x, p.y * 0.5);
  m.castShadow = true;
  m.receiveShadow = true;
  group.add(m);
  addContactShadow(group, p.x, p.y, r * 1.1, r * 0.9);
  return m;
}

// Saguaro-style cactus: trunk + two raised arms.
function buildCactus(group, p) {
  const h = 1.4 * p.size;
  const mat = standard(p.color, { roughness: 0.85 });
  const trunk = addBox(group, 0.28 * p.size, h, 0.28 * p.size, mat, toVec(p.x, p.y));
  const arm = (dir, baseY) => {
    const across = new THREE.Mesh(new THREE.BoxGeometry(0.46 * p.size, 0.16 * p.size, 0.18 * p.size), mat);
    across.position.copy(toVec(p.x + dir * 0.22 * p.size, p.y, baseY));
    across.castShadow = true;
    group.add(across);
    const up = new THREE.Mesh(new THREE.BoxGeometry(0.16 * p.size, 0.46 * p.size, 0.18 * p.size), mat);
    up.position.copy(toVec(p.x + dir * 0.4 * p.size, p.y, baseY + 0.28 * p.size));
    up.castShadow = true;
    group.add(up);
  };
  arm(1, h * 0.56);
  arm(-1, h * 0.42);
  addContactShadow(group, p.x, p.y, 0.42, 0.42);
  return trunk;
}

// Bare dead tree: thin trunk with a few angled snag branches.
function buildDeadTree(group, p) {
  const h = 1.8 * p.size;
  const mat = standard(p.color, { roughness: 1 });
  const trunk = addBox(group, 0.22 * p.size, h, 0.22 * p.size, mat, toVec(p.x, p.y));
  const branch = (ang, len, atY) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(len, 0.12 * p.size, 0.12 * p.size), mat);
    b.position.copy(toVec(p.x, p.y, atY));
    b.rotation.z = ang;
    b.castShadow = true;
    group.add(b);
  };
  branch(0.6, 0.7 * p.size, h * 0.82);
  branch(-0.7, 0.6 * p.size, h * 0.64);
  branch(0.35, 0.5 * p.size, h * 0.96);
  addContactShadow(group, p.x, p.y, 0.36, 0.36);
  return trunk;
}

// Low desert scrub — passthrough dressing, no outline (mesh budget).
function buildBrush(group, p) {
  const mat = standard(p.color, { roughness: 1 });
  for (const [dx, dz, s] of [[0, 0, 1], [0.18, 0.1, 0.72], [-0.15, -0.12, 0.78]]) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.22 * p.size * s, 0.42 * p.size * s, 5), mat);
    c.position.copy(toVec(p.x + dx, p.y + dz, 0.21 * p.size * s));
    c.castShadow = true;
    group.add(c);
  }
  return null;
}

// Marsh reeds — thin emissive blades over the water, passthrough, no outline.
function buildReeds(group, p) {
  const mat = standard(p.color, { roughness: 1, emissive: p.color, emissiveIntensity: 0.12 });
  for (const [dx, dz] of [[0, 0], [0.12, 0.08], [-0.1, 0.06], [0.05, -0.1]]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06 * p.size, 0.95 * p.size, 0.06 * p.size), mat);
    blade.position.copy(toVec(p.x + dx, p.y + dz, 0.47 * p.size));
    blade.rotation.z = dx;
    group.add(blade);
  }
  return null;
}

// Wooden porch deck fronting a town building.
function buildPorch(group, p) {
  const mat = standard(p.color, { roughness: 1 });
  const deck = addBox(group, 1.4 * p.size, 0.18 * p.size, 0.5 * p.size, mat, toVec(p.x, p.y));
  const postMat = standard("#3a2a1c");
  for (const dx of [-0.6 * p.size, 0.6 * p.size]) {
    for (const dz of [-0.2 * p.size, 0.2 * p.size]) {
      addBox(group, 0.1, 0.6 * p.size, 0.1, postMat, toVec(p.x + dx, p.y + dz));
    }
  }
  addContactShadow(group, p.x, p.y, 0.7 * p.size, 0.3 * p.size);
  return deck;
}

function buildPlacement(group, p) {
  // Guard size once here: every per-kind builder multiplies p.size, so an entry
  // missing it (undefined * k = NaN) would silently produce zero-scaled geometry.
  if (typeof p.size !== "number" || !Number.isFinite(p.size)) p = { ...p, size: 1 };
  switch (p.kind) {
    case "town":
    case "ranch": return buildBuilding(group, p, p.depthLane === "background" ? 1.3 : 1.0);
    case "gate": return buildBuilding(group, p, 0.8);
    case "watchtower":
    case "landmark": return buildWatchtower(group, p);
    case "lamp":
    case "lampTall":
    case "lampLow": return buildLamp(group, p);
    case "fence": return buildFence(group, p);
    case "sign":
    case "roadSign":
    case "road": return buildSign(group, p);
    case "townBark": return buildTownBarkMarker(group, p);
    case "jobBoard": return buildJobBoard(group, p);
    case "smokeCache": return buildSmokeCache(group, p);
    case "slimeTell": return buildSlimeTell(group, p);
    case "brokenWagon":
    case "wagonSalvage": return buildWagon(group, p);
    case "roadSlime": return buildSlime(group, p);
    case "saloon":
    case "saloonFacade": return buildBuilding(group, p, 1.15);
    case "storefront": return buildBuilding(group, p, 0.95);
    case "porch": return buildPorch(group, p);
    case "mesa":
    case "mesaSilhouette":
    case "cliff": return buildMesa(group, p);
    case "rock":
    case "boulder": return buildRock(group, p);
    case "cactus": return buildCactus(group, p);
    case "deadTree": return buildDeadTree(group, p);
    case "roadPlank": return buildRoadPlank(group, p);
    case "brush": return buildBrush(group, p);
    case "reeds": return buildReeds(group, p);
    case "cart":
    case "crate": return buildGeneric(group, p, 0.7);
    default: return buildGeneric(group, p);
  }
}

// PointLight attached to a model placement (lamp/beacon/board). height is in the
// model's local units; multiply by the effective scale to land in world space.
function attachLight(group, p, light, effScale) {
  const l = new THREE.PointLight(
    col(light.color),
    light.intensity,
    light.distance ?? 0,
    light.decay ?? 2,
  );
  l.position.copy(toVec(p.x, p.y, (light.height ?? 1) * effScale));
  group.add(l);
}

// Warm a building so it reads as occupied at dusk: a couple of emissive window
// panes + a soft interior PointLight, placed on the side facing the road/player so
// the glow is visible from the street. `face` is the +z (south) road-facing offset.
function attachBuildingWarmth(group, p, wl) {
  const faceZ = p.y + 1.05; // toward the road (south, +z in world→3D)
  const winMat = standard(wl.color, { emissive: wl.color, emissiveIntensity: 0.9, rimStrength: 0 });
  for (const [dx, wy] of [[-0.42, 1.55], [0.42, 1.55], [0, 0.62]]) {
    // two upper windows + a low door-glow slit, all on the road face
    const isDoor = wy < 1.0;
    const pane = new THREE.Mesh(
      new THREE.PlaneGeometry(isDoor ? 0.5 : 0.42, isDoor ? 1.05 : 0.5),
      winMat,
    );
    pane.position.set(p.x + dx, wy, faceZ);
    pane.renderOrder = 1;
    group.add(pane);
  }
  const l = new THREE.PointLight(col(wl.color), wl.intensity, wl.distance ?? 8, 2);
  l.position.set(p.x, wl.height ?? 1.5, p.y + 0.4);
  group.add(l);
}

function recolorAccepted(mat) {
  if (!mat) return;
  if (mat.color?.set) mat.color.set("#e1a34c");
  if (mat.emissive?.set) mat.emissive.set("#ffb84a");
  if ("emissiveIntensity" in mat) mat.emissiveIntensity = 1.35;
}

// Recolor the job board on accept. Works for the procedural mesh (has .material)
// and for a loaded model Group (recolor its emissive board panel meshes).
function markJobBoardAccepted(target) {
  if (!target) return;
  if (target.material) {
    recolorAccepted(target.material);
    return;
  }
  if (typeof target.traverse === "function") {
    target.traverse((o) => {
      const m = o.material;
      if (m && m.emissive && m.emissive.getHexString() !== "000000") recolorAccepted(m);
    });
  }
}

function getHeroVisibility(heroMeshes, camera) {
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
  const box = new THREE.Box3();
  const center = new THREE.Vector3();
  return Object.fromEntries(
    Object.entries(heroMeshes).map(([kind, mesh]) => {
      box.setFromObject(mesh);
      box.getCenter(center);
      const projected = center.clone().project(camera);
      return [kind, {
        inFrame: Math.abs(projected.x) <= 0.92 && Math.abs(projected.y) <= 0.92 && projected.z >= -1 && projected.z <= 1,
        ndc: {
          x: Number(projected.x.toFixed(3)),
          y: Number(projected.y.toFixed(3)),
          z: Number(projected.z.toFixed(3)),
        },
        distance: Number(camera.position.distanceTo(center).toFixed(2)),
      }];
    }),
  );
}

function setNodeOpacity(node, opacity) {
  if (!node || typeof node.traverse !== "function") return;
  const apply = (mat) => {
    if (!mat || !("opacity" in mat)) return;
    if (!mat.userData) mat.userData = {};
    if (!mat.userData.westwardBaseOpacity) mat.userData.westwardBaseOpacity = mat.opacity ?? 1;
    const base = mat.userData.westwardBaseOpacity;
    mat.opacity = Math.min(base, opacity);
    mat.transparent = mat.opacity < 0.98 || mat.transparent === true;
    mat.depthWrite = mat.opacity > 0.92;
  };
  node.traverse((o) => {
    if (!o.material) return;
    if (Array.isArray(o.material)) o.material.forEach(apply);
    else apply(o.material);
  });
}

function updateOcclusionFades(placementNodes, camera, playerPos) {
  if (!placementNodes?.length || !camera || !playerPos) return;
  const cameraPoint = camera.position.clone();
  // Sample a small cone of rays toward the player — centre mass plus head and
  // shoulder offsets — so a roof overhang or wall that crowds the frame edge in
  // front of the hero fades too, not only geometry on the exact centre ray.
  const targets = [
    new THREE.Vector3(playerPos.x, 1.2, playerPos.z),       // chest
    new THREE.Vector3(playerPos.x, 2.0, playerPos.z),       // head
    new THREE.Vector3(playerPos.x + 0.9, 1.4, playerPos.z), // right shoulder
    new THREE.Vector3(playerPos.x - 0.9, 1.4, playerPos.z), // left shoulder
  ];
  const rays = targets.map((t) => {
    const dir = t.clone().sub(cameraPoint);
    return { ray: new THREE.Ray(cameraPoint, dir.clone().normalize()), dist: dir.length() };
  });
  const box = new THREE.Box3();
  const hitPt = new THREE.Vector3();
  for (const record of placementNodes) {
    if (!record?.node || HERO_KINDS.includes(record.kind)) {
      continue;
    }
    box.setFromObject(record.node);
    if (box.max.y <= 0.8) {
      setNodeOpacity(record.node, 1);
      continue;
    }
    let blocks = false;
    for (const { ray, dist } of rays) {
      const hit = ray.intersectBox(box, hitPt);
      if (hit && hit.distanceTo(cameraPoint) < dist - 0.7) {
        blocks = true;
        break;
      }
    }
    setNodeOpacity(record.node, blocks ? 0.18 : 1);
  }
}

function createPlayerReadabilityRig() {
  const group = new THREE.Group();
  group.name = "player-readability-rig";

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.58, 0.035, 8, 42),
    standard("#ffd77b", {
      emissive: "#ffb84a",
      emissiveIntensity: 0.9,
      transparent: true,
      opacity: 0.76,
      rimStrength: 0,
    }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.045;
  group.add(ring);

  const marker = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 0.32, 4),
    standard("#fff1b8", {
      emissive: "#ffd77b",
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: 0.92,
      rimStrength: 0.15,
    }),
  );
  marker.rotation.y = Math.PI / 4;
  marker.position.y = 2.28;
  group.add(marker);

  return {
    group,
    update(t) {
      const pulse = 0.92 + Math.sin(t * 4.2) * 0.08;
      ring.scale.set(pulse, pulse, pulse);
      marker.position.y = 2.26 + Math.sin(t * 3.4) * 0.055;
      marker.rotation.y += 0.018;
    },
  };
}

function createObjectiveGuidance(snapshot) {
  const group = new THREE.Group();
  group.name = "objective-guidance";
  const byKind = new Map(snapshot.worldObjects.map((p) => [p.kind, p]));
  const targetRings = new Map();
  const targetPointers = new Map();
  for (const kind of HERO_KINDS) {
    const target = byKind.get(kind);
    if (!target) continue;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(kind === "jobBoard" ? 0.92 : 0.72, 0.04, 8, 44),
      standard("#ffd77b", {
        emissive: "#ffb84a",
        emissiveIntensity: 1.15,
        transparent: true,
        opacity: 0.8,
        rimStrength: 0,
      }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.copy(toVec(target.x, target.y, 1.58));
    group.add(ring);
    targetRings.set(kind, ring);

    const pointer = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.42, 4),
      standard("#fff0b8", {
        emissive: "#ffd77b",
        emissiveIntensity: 1.45,
        transparent: true,
        opacity: 0.88,
        rimStrength: 0.1,
      }),
    );
    pointer.rotation.x = Math.PI;
    pointer.rotation.y = Math.PI / 4;
    pointer.position.copy(toVec(target.x, target.y, 2.52));
    group.add(pointer);
    targetPointers.set(kind, pointer);
  }

  const beads = [];
  const route = FIRST_FIVE_ROUTE.filter((point) => point.kind !== "returnJobBoard");
  for (let seg = 1; seg < route.length; seg++) {
    const from = route[seg - 1];
    const to = route[seg];
    for (let i = 1; i <= 3; i++) {
      const t = i / 4;
      const bead = new THREE.Mesh(
        new THREE.CircleGeometry(0.12 + i * 0.012, 18),
        new THREE.MeshBasicMaterial({
          color: col("#ffd77b"),
          transparent: true,
          opacity: 0.26,
          depthWrite: false,
        }),
      );
      bead.rotation.x = -Math.PI / 2;
      bead.position.set(from.x + (to.x - from.x) * t, 0.075, from.y + (to.y - from.y) * t);
      group.add(bead);
      beads.push(bead);
    }
  }

  return {
    group,
    update(t, state) {
      const targetKind = state?.activeTargetKind || (typeof state === "string" ? null : "jobBoard");
      const active = Boolean(targetKind && targetRings.has(targetKind));
      group.visible = active;
      targetRings.forEach((ring, kind) => {
        ring.visible = kind === targetKind;
      });
      targetPointers.forEach((pointer, kind) => {
        pointer.visible = kind === targetKind;
      });
      if (!active) return;
      const pulse = 1 + Math.sin(t * 3.2) * 0.08;
      const ring = targetRings.get(targetKind);
      const pointer = targetPointers.get(targetKind);
      ring?.scale.set(pulse, pulse, pulse);
      if (pointer) pointer.position.y = 2.52 + Math.sin(t * 3.6) * 0.08;
      beads.forEach((bead, index) => {
        bead.material.opacity = 0.18 + Math.max(0, Math.sin(t * 3 - index * 0.5)) * 0.22;
      });
    },
  };
}

function buildGround(scene, snapshot) {
  const spawn = snapshot?.player || PLAYER_SPAWN;
  // Big enough to comfortably hold the full ~30×20 explorable rectangle plus a
  // fog margin so the plane edge never shows. One plane — one draw call.
  // Subdivided so the TSL relief (positionNode FBM in createGroundMaterial) has
  // vertices to displace; center passed so the shader's height field lines up
  // with the pure groundHeight() that seats props/scatter.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 110, 96, 88),
    createGroundMaterial({ center: { x: 35, z: 13 } }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(35, 0, 13);
  ground.receiveShadow = true;
  scene.add(ground);

  // Greenish marsh apron over the southern lowland (thin tinted plane).
  const marsh = new THREE.Mesh(
    new THREE.PlaneGeometry(31, 10),
    standard("#3c4a2e", { roughness: 1 }),
  );
  marsh.rotation.x = -Math.PI / 2;
  marsh.position.set(47, 0.005, 18);
  marsh.receiveShadow = true;
  scene.add(marsh);

  // (Marsh water is now an animated TSL surface created in startSpike — see createWater.)

  // Dusty S-road ribbon running through the entire first-five-minute route.
  // Segmenting it by route points makes the path visibly turn toward the marsh
  // instead of reading as a short flat alley.
  const ROAD_W = 8.2;
  const roadMat = standard("#906a42", { roughness: 1, emissive: "#2f2112", emissiveIntensity: 0.08 });
  const edgeMat = standard("#b08657", { roughness: 1, emissive: "#362414", emissiveIntensity: 0.08 });
  const rutMat = standard("#6c4f31", { roughness: 1 });
  const centerMat = standard("#7b5b37", { roughness: 1 });
  const route = FIRST_FIVE_ROUTE.filter((point) => point.kind !== "returnJobBoard");

  function addRoadPlane(from, to, width, y, mat) {
    const dx = to.x - from.x;
    const dz = to.y - from.y;
    const len = Math.hypot(dx, dz);
    if (len <= 0.01) return null;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(len, width), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = Math.atan2(dz, dx);
    mesh.position.set((from.x + to.x) / 2, y, (from.y + to.y) / 2);
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  for (let i = 1; i < route.length; i++) {
    const from = route[i - 1];
    const to = route[i];
    const dx = to.x - from.x;
    const dz = to.y - from.y;
    const len = Math.hypot(dx, dz);
    const nx = len > 0 ? -dz / len : 0;
    const nz = len > 0 ? dx / len : 1;

    addRoadPlane(from, to, ROAD_W, 0.02, roadMat);
    for (const off of [-(ROAD_W / 2 + 0.18), ROAD_W / 2 + 0.18]) {
      addRoadPlane(
        { x: from.x + nx * off, y: from.y + nz * off },
        { x: to.x + nx * off, y: to.y + nz * off },
        0.42,
        0.03,
        edgeMat,
      );
    }
    for (const off of [-1.65, 1.65]) {
      addRoadPlane(
        { x: from.x + nx * off, y: from.y + nz * off },
        { x: to.x + nx * off, y: to.y + nz * off },
        0.28,
        0.027,
        rutMat,
      );
    }
    addRoadPlane(from, to, 0.16, 0.028, centerMat);
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

export async function startSpike(canvas, snapshot = createSpikeSnapshot()) {
  const loopState = createLoopStateMachine();
  const objectiveRefs = createObjectiveDomRefs(document);
  syncObjectiveDom(objectiveRefs, snapshot, loopState.state);
  const publishLoopDebug = (state) => {
    if (!import.meta.env.DEV || typeof window === "undefined") return;
    window.__westward3dLoop = state;
  };
  if (import.meta.env.DEV && typeof window !== "undefined") {
    window.__westwardRenderSnapshot = snapshot;
    publishLoopDebug(loopState.state);
  }
  // Backend-adaptive WebGPU renderer (WebGPU when available, WebGL2 fallback
  // otherwise — see createRenderer). await init() before the loop renders
  // anything. No preserveDrawingBuffer: under the WebGL2 backend it forces a
  // per-frame ReadPixels stall; spike-compare screenshots the element directly.
  const { renderer, backend } = await createRenderer(canvas);
  if (import.meta.env.DEV && typeof window !== "undefined") {
    window.__westward3dBackend = backend;
  }

  const scene = new THREE.Scene();

  // Atmosphere shell owns the sky dome, sun/rim/hemi lights, fog, and clouds,
  // all driven by a time-of-day palette. Default to dusk so first-load framing
  // (and the spike_compare screenshot) matches the established art-proof look.
  const atmosphere = createAtmosphere(scene, renderer, {
    anchor: { x: snapshot.player.x, y: snapshot.player.y },
    playCore: { x: snapshot.player.x + 6, y: snapshot.player.y },
  });
  // Continuous day/night: a slow world clock advances dayTime; sunArc(dayTime)
  // is the live palette so the sun arcs and colours drift. Starts at dusk. The
  // golden-image gate loads ?visual to freeze everything time-animated (sun,
  // clouds, water, weather, film grain) for a stable pixelmatch baseline.
  const visualCapture =
    typeof location !== "undefined" && new URLSearchParams(location.search).has("visual");
  const clock = createWorldClock(); // defaults to dusk (dayTime 1/3)
  if (visualCapture) pinClock(clock, "dusk");
  let appliedPalette = sunArc(clock.dayTime);
  atmosphere.applyPalette(appliedPalette);

  buildGround(scene, snapshot);
  createScatter(scene, { center: { x: 35, z: 13 }, area: 78, count: 520 });

  // Animated marsh water (replaces the flat plane that used to live in buildGround).
  const water = createWater({ width: 29, height: 6.2, skyTint: appliedPalette.sky.horizon });
  water.mesh.rotation.x = -Math.PI / 2;
  water.mesh.position.set(48, 0.05, 19);
  scene.add(water.mesh);

  const props = new THREE.Group();
  const heroMeshes = {};
  const placementNodes = [];
  const modelJobs = [];
  for (const p of snapshot.worldObjects) {
    const entry = modelFor(p.kind);
    if (entry) {
      // Authored .glb model for this kind; fall back to the procedural builder if
      // it fails to load so the scene is never missing a placement.
      const effScale = (entry.scale ?? 1) * (p.size ?? 1);
      const yaw = (entry.yaw ?? 0) + (p.yaw ?? 0) + (entry.vary ? hashYaw(p.x, p.y) : 0);
      modelJobs.push(
        instanceModel(entry.url, { x: p.x, z: p.y, y: groundHeight(p.x, p.y), yaw, scale: effScale })
          .then((node) => {
            props.add(node);
            placementNodes.push({ kind: p.kind, node });
            // lamps/beacon/board carried their PointLight inside the old builder;
            // re-add it here for the model path (height is in local model units).
            if (entry.light) attachLight(props, p, entry.light, effScale);
            if (entry.windowLight) attachBuildingWarmth(props, p, entry.windowLight);
            if (HERO_KINDS.includes(p.kind)) {
              heroMeshes[p.kind] = node;
            }
          })
          .catch((err) => {
            console.warn(`[render3d] model load failed for ${p.kind}, using fallback`, err);
            const mesh = buildPlacement(props, p);
            if (mesh) placementNodes.push({ kind: p.kind, node: mesh });
            if (HERO_KINDS.includes(p.kind) && mesh) {
              heroMeshes[p.kind] = mesh;
            }
          }),
      );
      continue;
    }
    const mesh = buildPlacement(props, p);
    if (mesh) placementNodes.push({ kind: p.kind, node: mesh });
    if (HERO_KINDS.includes(p.kind) && mesh) {
      heroMeshes[p.kind] = mesh;
    }
  }
  await Promise.all(modelJobs);
  scene.add(props);
  const objectiveGuidance = createObjectiveGuidance(snapshot);
  scene.add(objectiveGuidance.group);

  // Ambient townsfolk — NPCs reusing the rig, wandering the town to bring the
  // street to life. Non-blocking fallback so a load failure never breaks the scene.
  let townsfolk = { update() {}, getInteractable: () => null, talk: () => null };
  try {
    townsfolk = await createTownsfolk(scene, { count: 5 });
  } catch (err) {
    console.warn("[render3d] townsfolk failed to load", err);
  }
  // 6C: greet the nearest townsperson with E. A short "speech" timer holds the
  // line in the prompt; the loop shows the "E — Talk to …" cue when in range.
  let npcSpeechT = 0;
  let npcSpeechMsg = "";
  if (typeof window !== "undefined") {
    window.addEventListener("keydown", (e) => {
      if (e.code !== "KeyE") return;
      const r = townsfolk.talk?.();
      if (r) {
        npcSpeechMsg = `${r.name}: "${r.line}"`;
        npcSpeechT = 3.5;
      }
    });
  }

  // Start at the real road spawn and aim at Boone's board cluster. This keeps
  // first-load framing honest for both play and spike_compare screenshots.
  const _vw = (typeof window !== "undefined" && window.innerWidth) || 1280;
  const _vh = (typeof window !== "undefined" && window.innerHeight) || 720;
  const camera = new THREE.PerspectiveCamera(65, _vw / _vh, 0.1, 200);
  const openingTarget = snapshot.worldObjects.find((p) => p.kind === "jobBoard") || snapshot.player;
  camera.position.set(snapshot.player.x, 1.8, snapshot.player.y);
  camera.lookAt(openingTarget.x + 0.3, 1.0, openingTarget.y + 0.12);

  // Cinematic hero pose for the golden-image capture (?visual). The eye-level
  // "down a flat alley" gameplay framing reads as cardboard; this elevated SE→NW
  // 3/4 angle (tighter FOV for mesa compression) reveals the ground relief, leads
  // the eye down the street to the town + mesa ring, and looks toward the low sun
  // so silhouettes rim-light and the god-ray shafts rake toward camera. Gameplay
  // third-person follow is untouched — this only applies under capture.
  function applyHeroCamera() {
    camera.fov = 50;
    // Elevated establishing 3/4: high + back enough to clear the ~3-tall
    // rooflines and look DOWN onto the town + road junction, so the ground,
    // street, and mesa ring all read instead of staring into a canyon of boxes.
    camera.position.set(19, 11.5, 18);
    camera.lookAt(9, 0.5, 6);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }
  if (visualCapture) applyHeroCamera();

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener("resize", onResize);

  // Ensure the world matrix is current so getWorldDirection() reads the
  // correct forward vector when seeding yaw/pitch from the hero pose lookAt.
  camera.updateMatrixWorld();

  // Post stack: depth-discontinuity ink edges + bloom + warm grade + film grain.
  // The renderer draws THROUGH this; the grade replaces the old DOM vignette.
  // Film grain is time-animated, so ?visual capture disables it (visualCapture
  // set above) alongside the other frozen motion for a stable baseline.
  const { post, applyPalette: applyPostPalette, uniforms: postUniforms } = createPostProcessing(renderer, scene, camera, {
    region: "frontier",
    sunLight: atmosphere.sun,
    ...(visualCapture ? { grainIntensity: 0 } : {}),
  });
  applyPostPalette(appliedPalette);

  // Apply the clock's current dayTime to atmosphere + post (called every frame
  // and on dev/test jumps). sunArc gives a continuously-blended palette.
  const applyDayTime = () => {
    appliedPalette = sunArc(clock.dayTime);
    atmosphere.applyPalette(appliedPalette);
    applyPostPalette(appliedPalette);
  };
  // Dev/test API (preserved): T cycles to the next key; setTimeOfDay pins a key
  // (pauses auto-advance for determinism); getTimeOfDay reports the nearest key.
  const cycleTimeOfDay = () => {
    const key = cycleClock(clock);
    applyDayTime();
    return key;
  };
  const setTimeOfDay = (key) => {
    pinClock(clock, key);
    applyDayTime();
    return dayTimeToKey(clock.dayTime);
  };

  // Weather: resolve the snapshot state to visual intensities; G cycles
  // clear → dust → storm to show it off. The particle/lightning shell lives in
  // weatherView; fog + exposure are modulated on top of the palette here.
  let weatherKind = snapshot.weather?.kind || "clear";
  let weather = resolveWeather(snapshot.weather);
  const weatherSys = createWeatherSystem(scene, { x: 14, z: 9 });
  const cycleWeather = () => {
    weatherKind = nextWeatherKind(weatherKind);
    // pass only kind + wind so the preset drives rain/dust (the snapshot's stale
    // rain:0 would otherwise override the storm preset via resolveWeather).
    weather = resolveWeather({ kind: weatherKind, wind: snapshot.weather?.wind });
    return weatherKind;
  };

  // One call per frame: advance the world (or hold it all still under ?visual).
  let waterTime = 0;
  const stepWorld = (dt) => {
    const fdt = visualCapture ? 0 : dt;
    tickClock(clock, fdt);
    applyDayTime();
    atmosphere.driftClouds(fdt, 1 + weather.wind * 2);
    waterTime += fdt;
    water.uniforms.time.value = waterTime;
    water.uniforms.skyTint.value.set(appliedPalette.sky.horizon);
    const { flash } = weatherSys.update(weather, fdt, {
      frozen: visualCapture,
      cx: camera.position.x,
      cz: camera.position.z,
    });
    if (scene.fog) scene.fog.density = appliedPalette.fog.density + weather.fogBoost;
    // PostProcessing ignores renderer.toneMappingExposure — drive exposure via the
    // post uniform so day/night, weather darkening, and lightning flashes show.
    postUniforms.exposure.value = appliedPalette.exposure * weather.darken * (1 + flash * 0.8);
  };

  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyT") cycleTimeOfDay();
    if (e.code === "KeyG") cycleWeather();
  });

  // Third-person: a visible rigged character the follow-cam tracks. The
  // controller stands it at the player's feet facing the heading; the loop
  // crossfades its Idle/Walk clips by movement. Falls back to the procedural
  // placeholder if the glTF fails to load.
  let character;
  try {
    character = await createAnimatedCharacter("/models/character.glb");
  } catch (err) {
    console.warn("[render3d] animated character failed, using placeholder", err);
    character = createPlaceholderCharacter();
  }
  const playerReadability = createPlayerReadabilityRig();
  character.group.add(playerReadability.group);
  scene.add(character.group);
  // F → play the one-shot "draw" clip (no-op on the placeholder fallback)
  if (typeof window !== "undefined") {
    window.addEventListener("keydown", (e) => {
      if (e.code === "KeyF") character.playOnce?.("draw");
    });
  }

  // Milestone 3B step 1–3: walkable, collidable, promptable.
  // Player owns input + camera each frame; proxies block movement; interaction
  // surfaces the nearest prompt and dispatches handlers on E.
  if (!visualCapture) {
    camera.fov = 54;
    camera.updateProjectionMatrix();
  }
  const player = createPlayerController(camera, {
    canvas,
    thirdPerson: true,
    character: character.group,
    cameraPreset: "exploration",
    resetYaw: -Math.PI / 2,
  });
  const proxies = buildProxies(snapshot.worldObjects);
  const promptEl = document.getElementById("prompt");
  let currentPromptText = "";
  const setPromptText = (t) => {
    currentPromptText = t || "";
    if (!promptEl) return;
    if (promptEl.textContent !== t) promptEl.textContent = t;
    promptEl.hidden = !t;
  };
  const interaction = createInteractionSystem({
    worldObjects: snapshot.worldObjects,
    setPromptText,
    isTargetEnabled: (target) => loopState.isTargetEnabled(target),
    getPromptText: (target) => loopState.getPromptForTarget(target),
  });
  const boardModal = document.getElementById("board-modal");
  const boardAccept = document.getElementById("board-accept");
  const boardOptionButtons = Array.from(document.querySelectorAll("[data-option]:not(#board-accept)"));
  const boardClose = document.getElementById("board-close");

  const refreshLoopDom = () => {
    const state = loopState.state;
    publishLoopDebug(state);
    syncObjectiveDom(objectiveRefs, snapshot, state);
    interaction.update(player.position);
  };

  const advance = (event) => {
    const state = loopState.transition(event);
    publishLoopDebug(state);
    syncObjectiveDom(objectiveRefs, snapshot, state);
    interaction.update(player.position);
    return state;
  };

  const boardModalController = createBoardModalController({
    modal: boardModal,
    acceptButton: boardAccept,
    optionButtons: boardOptionButtons,
    closeButton: boardClose,
    setPromptText,
    onAccept: () => {
      advance({ type: "choose_board", optionId: "accept_bounty" });
      markJobBoardAccepted(heroMeshes.jobBoard);
    },
    onChoose: (optionId) => {
      advance({ type: "choose_board", optionId });
      markJobBoardAccepted(heroMeshes.jobBoard);
    },
    onClose: refreshLoopDom,
  });

  const encounter = createEncounterSystem(scene, snapshot, {
    slimeMesh: heroMeshes.roadSlime,
    getPhase: () => loopState.phase,
    onSlimeEngage: () => {
      if (loopState.phase !== "slime_tell") return false;
      advance("slime_appeared");
      return true;
    },
    onSlimeDeath: () => {
      if (loopState.phase === "slime_fight") advance("defeat_slime");
    },
  });

  const handleJobBoard = () => {
    if (loopState.phase === "spawn") {
      advance("board_reached");
      boardModalController.open();
      return;
    }
    if (loopState.phase === "board_choice") {
      boardModalController.open();
      return;
    }
    if (loopState.phase === "return_to_boone") {
      advance("report_to_boone");
      return;
    }
    if (loopState.phase === "survey_teaser") {
      syncObjectiveDom(objectiveRefs, snapshot, {
        ...loopState.state,
        objectiveText: "Old Road Survey is ready. This is tomorrow's next playable job.",
      });
    }
  };
  const handleRoadSign = () => {
    if (loopState.phase !== "road_sign") return;
    advance("read_sign");
  };
  const handleTownBark = () => {
    if (loopState.phase !== "road_walk") return;
    advance("hear_bark");
    npcSpeechMsg = "Pearl: \"Road's quiet when it wants you close. Watch the marsh grass.\"";
    npcSpeechT = 3.5;
    setPromptText(npcSpeechMsg);
  };
  const handleSmokeCache = () => {
    if (loopState.phase !== "cache_clue") return;
    advance("open_cache");
  };
  const handleSlimeTell = () => {
    if (loopState.phase !== "slime_tell") return;
    encounter.engage();
    if (loopState.phase === "slime_tell") advance("spot_slime_tell");
  };
  const handleRoadSlime = () => {
    if (loopState.phase !== "slime_fight") return;
    encounter.strike(player.position);
  };
  const handleBrokenWagon = () => {
    if (loopState.phase !== "wagon_salvage") return;
    advance("inspect_wagon");
  };

  interaction.registerHandler("jobBoard", handleJobBoard);
  interaction.registerHandler("roadSign", handleRoadSign);
  interaction.registerHandler("townBark", handleTownBark);
  interaction.registerHandler("smokeCache", handleSmokeCache);
  interaction.registerHandler("slimeTell", handleSlimeTell);
  interaction.registerHandler("roadSlime", handleRoadSlime);
  interaction.registerHandler("brokenWagon", handleBrokenWagon);

  const updateBeatVisibility = () => {
    if (heroMeshes.slimeTell) {
      heroMeshes.slimeTell.visible = ["slime_tell", "slime_fight", "wagon_salvage", "return_to_boone", "survey_teaser"].includes(loopState.phase);
    }
    if (heroMeshes.roadSlime) {
      heroMeshes.roadSlime.visible = ["slime_fight"].includes(loopState.phase);
    }
  };
  updateBeatVisibility();

  if (import.meta.env.DEV && typeof window !== "undefined") {
    window.__westward3dTest = {
      getLoopState: () => loopState.state,
      getPlayerPosition: () => player.position,
      movePlayerToKind: (kind) => {
        const target = snapshot.worldObjects.find((obj) => obj.kind === kind);
        if (!target || !player.setPosition) return null;
        const x = target.x - 1.35;
        const z = target.y;
        player.setPosition({ x, z });
        refreshLoopDom();
        interaction.update(player.position);
        return player.position;
      },
      interact(kind) {
        const handlers = {
          jobBoard: handleJobBoard,
          roadSign: handleRoadSign,
          townBark: handleTownBark,
          smokeCache: handleSmokeCache,
          slimeTell: handleSlimeTell,
          roadSlime: handleRoadSlime,
          brokenWagon: handleBrokenWagon,
        };
        handlers[kind]?.();
        return loopState.state;
      },
      acceptBoard() {
        boardModalController.accept();
        return loopState.state;
      },
      chooseBoardOption(optionId) {
        boardModalController.choose(optionId);
        return loopState.state;
      },
      closeBoard: boardModalController.close,
      isBoardModalOpen: () => boardModalController.isOpen(),
      getEncounterState: () => encounter.getState(),
      getRouteMetrics: () => ({
        ...getRouteMetrics(snapshot.worldObjects),
        phase: loopState.phase,
        routeBeats: loopState.state.routeBeats,
        boardChoice: loopState.state.boardChoice,
      }),
      getHeroVisibility: () => getHeroVisibility(heroMeshes, camera),
      getPlayerVisibility: () => getHeroVisibility({ player: character.group }, camera).player,
      getCameraPose: () => ({
        x: Number(camera.position.x.toFixed(2)),
        y: Number(camera.position.y.toFixed(2)),
        z: Number(camera.position.z.toFixed(2)),
        fov: Number(camera.fov.toFixed(1)),
      }),
      cycleTimeOfDay,
      setTimeOfDay,
      getTimeOfDay: () => dayTimeToKey(clock.dayTime),
      cycleWeather,
      getWeather: () => weatherKind,
    };
  }

  let frames = 0;
  let prevTs = performance.now();
  function loop(now = performance.now()) {
    // dt in seconds, clamped to keep big tab-resume jumps from teleporting.
    const dt = Math.min((now - prevTs) / 1000, 0.05);
    prevTs = now;
    if (!boardModalController.isOpen()) player.update(dt, proxies);
    if (visualCapture) applyHeroCamera(); // re-assert hero pose (player.update re-syncs the follow-cam)
    updateOcclusionFades(placementNodes, camera, player.position);
    interaction.update(player.position);
    encounter.update(player.position, dt);
    updateBeatVisibility();
    character.update(visualCapture ? 0 : dt, player.moving && !visualCapture, player.running && !visualCapture);
    playerReadability.update(now / 1000);
    objectiveGuidance.update(now / 1000, loopState.state);
    townsfolk.update(visualCapture ? 0 : dt, visualCapture, player.position);
    // NPC greeting prompt/speech overrides the kind prompt when near a townsperson
    if (npcSpeechT > 0) {
      npcSpeechT -= dt;
      setPromptText(npcSpeechMsg);
    } else {
      const who = townsfolk.getInteractable();
      if (who && loopState.phase !== "spawn" && !currentPromptText) setPromptText(`E — Talk to ${who.name}`);
    }
    stepWorld(dt);
    post.render();
    frames++;
    if (frames === 2) window.__spikeReady = true; // captured after a settled frame
    requestAnimationFrame(loop);
  }
  loop();

  return { scene, camera, renderer, snapshot, player, proxies, interaction, loopState, encounter, atmosphere, cycleTimeOfDay };
}

// Auto-start when loaded as the render3d.html entry.
const canvas = document.getElementById("scene");
if (canvas) {
  startSpike(canvas).catch((err) => {
    console.error("[render3d] startSpike failed", err);
  });
}
