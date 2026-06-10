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
import {
  buildFrontierPlacements,
  FIRST_FIVE_ROUTE,
  FIRST_ROAD_ART_STYLE,
  getArtDirectionLayoutMetrics,
  getProductionFrameLayoutMetrics,
  getRouteMetrics,
  PLAYER_SPAWN,
} from "./frontierLayout.js";
import { createPlayerController, CAMERA_PRESETS } from "./playerController.js";
import { buildProxies, SALOON_DIMS } from "./worldProxies.js";
import { createInteractionSystem } from "./interactionSystem.js";
import { BOARD_OPTIONS, LOOP_PHASES, createLoopStateMachine } from "./phaseState.js";
import { createObjectiveDomRefs, syncObjectiveDom } from "./objectiveDom.js";
import { buildFieldMapRouteModel, createFieldMapDomRefs, syncFieldMapDom } from "./fieldMapDom.js";
import { createBoardModalController } from "./boardModal.js";
import { createBoardDomRefs, syncBoardDom } from "./boardDom.js";
import { buildBoardView } from "./boardCopy.js";
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
import { createSaveStateManager } from "../saveStateManager.js";
import { buildRunPayload, loadRun, writeRun, sealRun } from "./runSave.js";
import { stagger } from "./animationHelpers.js";
import { createPlayerCombat, hitboxHitsTarget } from "./combat/playerCombat.js";
import { createSlimeState, stepSlime } from "./combat/slimeBehavior.js";
import { createHitStop, createCameraShake, createBurstPool } from "./combat/hitFx.js";
import { createAudioView } from "./audioView.js";
import {
  createGameState,
  hydrateGameState,
  reconcileWithLoopPhase,
  buildGameSaveSlice,
  acceptStarterJob,
  recordSlimeKill,
  lootBeat,
  claimBoardReward,
  recordNpcGreeting,
  activeJobLine,
  playerHudView,
  makeRng,
} from "./gameState.js";

// world (x = east, y = south) -> 3D (X = east, Z = south, Y = up)
const toVec = (x, y, h = 0) => new THREE.Vector3(x, h, y);
const col = (hex) => new THREE.Color(hex);
const HERO_KINDS = Object.freeze(["jobBoard", "roadSign", "townBark", "smokeCache", "slimeTell", "roadSlime", "brokenWagon"]);
// Building kinds get per-instance height + yaw jitter so the street isn't stamped clones.
const BUILDING_KINDS = new Set([
  "productionSaloon", "productionStore", "productionAssay",
  "heroTownSaloon", "heroTownStore", "heroTownAssay",
  "saloon", "saloonFacade", "storefront", "town", "ranch",
  "townFacadeWarm", "townFacadeStore", "townFacadeDark",
]);
// Solid objects (besides buildings) that should drop a grounding contact shadow.
// Excludes flat ground cover (grass/reeds/decals) and the distant boundary mesas.
const GROUNDABLE_KINDS = new Set([
  "gate", "watchtower", "landmark", "jobBoard", "smokeCache", "brokenWagon",
  "wagonSalvage", "cart", "crate", "barrelCrateCluster", "rock", "boulder",
  "cactus", "deadTree", "hitchingRail",
]);
const PLAYER_MODEL_URL = "/models/character_hero.glb";
const IMPORTANT_MODEL_KINDS = Object.freeze([
  "jobBoard",
  "heroTownSaloon",
  "heroTownStore",
  "heroTownAssay",
  "productionBoardwalk",
  "productionSaloon",
  "productionStore",
  "productionAssay",
  "windowGlowPanel",
  "hangingSign",
  "hitchingRail",
  "barrelCrateCluster",
  "npcSilhouette",
  "lanternString",
  "mudRutDecal",
  "dustSmokePlume",
  "bountyEmblem",
  "sageCluster",
  "roadGrass",
  "heroMesaSkyline",
  "slimeTrailHero",
  "brokenWagon",
]);
const PRODUCTION_DENSITY_KINDS = new Set([
  "productionBoardwalk",
  "productionSaloon",
  "productionStore",
  "productionAssay",
  "windowGlowPanel",
  "hangingSign",
  "hitchingRail",
  "barrelCrateCluster",
  "npcSilhouette",
  "lanternString",
  "mudRutDecal",
  "dustSmokePlume",
  "bountyEmblem",
]);

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

// Blob shadow projected under a world-space point. Two stacked discs — a darker
// core inside a wider, fainter penumbra — give a soft-edged grounding shadow that
// kills the "floating" look without a gradient texture.
function addContactShadow(group, x, z, rx = 1.0, rz = 0.7) {
  const make = (scale, opacity) => {
    const m = new THREE.Mesh(
      new THREE.CircleGeometry(1, 24),
      new THREE.MeshBasicMaterial({ color: col("#1a120c"), transparent: true, opacity, depthWrite: false }),
    );
    m.rotation.x = -Math.PI / 2;
    m.scale.set(rx * scale, 1, rz * scale);
    m.position.set(x, 0.018, z);
    m.renderOrder = -1;
    return m;
  };
  group.add(make(1.32, 0.22)); // soft penumbra
  group.add(make(0.92, 0.34)); // darker core
}

// Augment an authored building box with western false-front architecture so it
// stops reading as a plain box: a cornice trim cap, a painted signboard on the
// road-facing front, and a porch awning on two posts. Positioned from the model's
// real world bbox + the side that faces the road (z ~ 8.9), so it adapts to any
// building model/scale/orientation.
function addWesternFacadeDetail(group, node, p) {
  node.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(node);
  if (!Number.isFinite(box.min.x) || !Number.isFinite(box.max.y)) return;
  const w = box.max.x - box.min.x;
  const d = box.max.z - box.min.z;
  const h = box.max.y - box.min.y;
  if (w < 0.3 || h < 0.6) return;
  const cx = (box.min.x + box.max.x) / 2;
  const cz = (box.min.z + box.max.z) / 2;
  const baseY = box.min.y;
  const frontSign = (8.9 - p.y) >= 0 ? 1 : -1; // road runs in x; front faces road centre
  const frontZ = frontSign > 0 ? box.max.z : box.min.z;

  // Signboard — a painted plank on the upper road-facing false front. Flat against
  // the wall, so it gives each shop signage without chunky caps/awnings jutting out.
  const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, Math.min(0.85, h * 0.13), 0.1), standard(p.color || "#c8a25a"));
  sign.position.set(cx, box.max.y - h * 0.24, frontZ + frontSign * 0.07);
  sign.castShadow = true;
  group.add(sign);
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
    standard("#f2b56d", { emissive: "#d9863f", emissiveIntensity: 1.05 }),
  );
  glow.position.copy(toVec(p.x, p.y, 1.7));
  group.add(glow);
  const light = new THREE.PointLight(col("#ffc08a"), 6.4, 7, 2);
  light.position.copy(toVec(p.x, p.y, 1.7));
  group.add(light);
}

function buildRoadPlank(group, p) {
  if (p.kind === "roadRut") {
    const rut = addBox(group, 1.65 * p.size, 0.026, 0.11 * p.size, standard(p.color || "#6f4f31", { roughness: 1, rimStrength: 0 }), toVec(p.x, p.y));
    rut.rotation.y = p.yaw || 0;
    rut.castShadow = false;
    rut.receiveShadow = true;
    return rut;
  }
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

// Inked sign-board texture: weathered plank + hand-set serif lines. Painted at
// 2x and dropped onto an unlit-ish emissive plane so the words stay readable in
// the dusk grade (roadmap "first 10 minutes": road sign text).
function makeSignTexture(lines) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#332312";
  g.fillRect(0, 0, c.width, c.height);
  // plank seams + weathering streaks
  g.strokeStyle = "rgba(20, 12, 5, 0.55)";
  g.lineWidth = 3;
  for (const yy of [86, 172]) {
    g.beginPath();
    g.moveTo(0, yy);
    g.lineTo(c.width, yy);
    g.stroke();
  }
  g.fillStyle = "rgba(255, 220, 160, 0.05)";
  for (let i = 0; i < 14; i++) g.fillRect((i * 73) % c.width, 0, 6, c.height);
  // border
  g.strokeStyle = "#c9a36a";
  g.lineWidth = 6;
  g.strokeRect(10, 10, c.width - 20, c.height - 20);
  // lettering
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "#f3dfae";
  const step = c.height / (lines.length + 1);
  lines.forEach((line, i) => {
    g.font = `${i === 0 ? "bold 58px" : "44px"} Georgia, 'Times New Roman', serif`;
    g.fillText(line, c.width / 2, step * (i + 1) + 6);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function buildSign(group, p) {
  addBox(group, 0.1, 1.0, 0.1, standard("#3a2a1c"), toVec(p.x, p.y));
  const isHeroRoadSign = p.kind === "roadSign";
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(isHeroRoadSign ? 0.92 : 0.7, isHeroRoadSign ? 0.5 : 0.42, 0.06),
    standard(p.color, { emissive: p.color, emissiveIntensity: 0.5 }),
  );
  panel.position.copy(toVec(p.x, p.y, 1.05));
  panel.castShadow = true;
  group.add(panel);
  if (isHeroRoadSign) {
    // Readable directions on a plane just proud of the panel (single face, so
    // the box's other sides stay clean for the ink pass).
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(0.86, 0.44),
      // near-white tint: the painted texture IS the colour (nprMaterial
      // multiplies map × tint before the cel ramp)
      standard("#f5ecd8", {
        map: makeSignTexture(["CACHE ROAD →", "DUSTWARD ½ MI"]),
        emissive: "#9a7a4a",
        emissiveIntensity: 0.22,
        rimStrength: 0,
      }),
    );
    face.position.copy(toVec(p.x, p.y - 0.034, 1.05));
    face.rotation.y = Math.PI; // face the approach from town (west side)
    group.add(face);
  }
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
  const light = new THREE.PointLight(col("#ffc887"), 6.8, 7, 1.8);
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
  const sz = p.size || 1;
  const gooMat = standard(p.color || "#7fd06a", { emissive: "#2a6820", emissiveIntensity: 1.1, roughness: 0.35 });
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.72 * sz, 18, 14, 0, Math.PI * 2, 0, Math.PI / 1.75),
    gooMat,
  );
  body.scale.set(1.35 * sz, 0.78 * sz, 1.28 * sz);
  body.position.copy(toVec(p.x, p.y, 0.04));
  body.castShadow = true;
  group.add(body);
  // Wobble lobes — gooey silhouette with weight
  for (const [dx, dz, sy] of [[-0.42, -0.18, 0.55], [0.38, 0.22, 0.48], [0.12, -0.38, 0.42]]) {
    const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.28 * sz, 12, 10), gooMat);
    lobe.scale.set(1.1, sy, 0.9);
    lobe.position.copy(toVec(p.x + dx * sz, p.y + dz * sz, 0.12));
    group.add(lobe);
  }
  addContactShadow(group, p.x, p.y, 1.0 * sz, 0.8 * sz);
  const slimeLight = new THREE.PointLight(col("#58d040"), 5, 5, 2);
  slimeLight.position.copy(toVec(p.x, p.y, 0.6));
  group.add(slimeLight);
  for (const dx of [-0.18, 0.18]) {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.085 * sz, 8, 6),
      standard("#fff2c0", { emissive: "#ffd24d", emissiveIntensity: 4 }),
    );
    eye.position.copy(toVec(p.x + dx * sz, p.y - 0.52 * sz, 0.6));
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
  const heightMul = p.heightMul ?? 1;
  const w = (isCliff ? 2.2 : 2.9) * p.size;
  const d = (isCliff ? 1.3 : 2.9) * p.size;
  const h = (isCliff ? 2.6 : 3.5) * p.size * heightMul;
  // Aerial perspective: distant boundary mesas cool-shift toward fog blue-violet.
  const dist = Math.hypot(p.x - 35, p.y - 13);
  const fade = Math.min(1, dist / 55);
  const baseCol = col(p.color);
  const fogCol = col("#4a5568");
  baseCol.lerp(fogCol, fade * 0.38);
  const mat = standard(`#${baseCol.getHexString()}`, { roughness: 1, rimStrength: 0.35 + fade * 0.25 });
  const base = addBox(group, w, h, d, mat, toVec(p.x, p.y));
  // inset flat-top cap for the classic mesa read; hero peaks get a taller cap stack
  const capH = h * (p.heroPeak ? 0.55 : 0.4);
  const cap = addBox(group, w * (p.heroPeak ? 0.62 : 0.72), capH, d * (p.heroPeak ? 0.62 : 0.72), mat, toVec(p.x, p.y, h));
  if (p.heroPeak) {
    addBox(group, w * 0.38, capH * 0.55, d * 0.38, mat, toVec(p.x, p.y, h + capH * 0.72));
  }
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

function buildSagePatch(group, p) {
  const mat = standard(p.color || "#687a42", { roughness: 1, rimStrength: 0.02 });
  const dryMat = standard("#a88d55", { roughness: 1, rimStrength: 0 });
  const bladeGeo = new THREE.ConeGeometry(0.08, 0.58, 5);
  const clumpGeo = new THREE.ConeGeometry(0.22, 0.38, 6);
  const count = Math.max(5, Math.round(8 * p.size));
  for (let i = 0; i < count; i++) {
    const a = (i * 2.399963 + p.x * 0.13) % (Math.PI * 2);
    const r = (0.16 + ((i * 37) % 100) / 100 * 0.56) * p.size;
    const h = 0.38 + ((i * 19) % 100) / 100 * 0.34;
    const mesh = new THREE.Mesh(i % 4 === 0 ? clumpGeo : bladeGeo, i % 5 === 0 ? dryMat : mat);
    mesh.scale.set(0.72 + (i % 3) * 0.18, h, 0.72 + ((i + 1) % 3) * 0.14);
    mesh.position.copy(toVec(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, h * 0.28));
    mesh.rotation.y = a;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    group.add(mesh);
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

// Walk-in saloon — a hollow building you physically enter. The collision walls live
// in worldProxies (FOOTPRINTS.walkInSaloon, same SALOON_DIMS); here we draw those
// walls + a doorway gap, a roof + false-front (no collision, so they never block the
// door), and an interior bar so the inside rewards the walk-in. Door faces +Z (south).
function buildWalkInSaloon(group, p) {
  const { hw, df, db, wallH, wallT, doorHW } = SALOON_DIMS;
  const doorH = 2.7;
  const depth = df + db;
  const cz = p.y + (df - db) / 2;
  const segW = hw - doorHW;
  addContactShadow(group, p.x, cz, hw * 1.08, depth / 2 * 1.08); // ground the building
  const wood = standard("#6b4a2c", { roughness: 1 });
  const woodDark = standard("#4f381f", { roughness: 1 });
  const trim = standard("#835d38", { roughness: 1 });

  addBox(group, hw * 2, 0.08, depth, standard("#46331e", { roughness: 1 }), toVec(p.x, cz, 0));       // floor
  addBox(group, hw * 2, wallH, wallT, wood, toVec(p.x, p.y - db, 0));                                  // back wall
  addBox(group, wallT, wallH, depth, wood, toVec(p.x - hw, cz, 0));                                    // left wall
  addBox(group, wallT, wallH, depth, wood, toVec(p.x + hw, cz, 0));                                    // right wall
  addBox(group, segW, wallH, wallT, wood, toVec(p.x - (doorHW + hw) / 2, p.y + df, 0));                // front-left
  addBox(group, segW, wallH, wallT, wood, toVec(p.x + (doorHW + hw) / 2, p.y + df, 0));                // front-right
  addBox(group, doorHW * 2, wallH - doorH, wallT, wood, toVec(p.x, p.y + df, doorH));                  // door lintel
  addBox(group, hw * 2 + 0.4, 0.22, depth + 0.4, woodDark, toVec(p.x, cz, wallH));                     // roof
  addBox(group, hw * 2 + 0.4, 1.5, 0.3, trim, toVec(p.x, p.y + df, wallH));                            // false-front parapet
  addBox(group, 3.0, 0.82, 0.12, standard("#caa24f", { emissive: "#3a2c12", emissiveIntensity: 0.35 }),
    toVec(p.x, p.y + df + 0.16, wallH + 0.42));                                                        // SALOON signboard
  // porch posts + awning at the doorway
  addBox(group, 0.16, 2.5, 0.16, trim, toVec(p.x - doorHW - 0.12, p.y + df + 1.1, 0));
  addBox(group, 0.16, 2.5, 0.16, trim, toVec(p.x + doorHW + 0.12, p.y + df + 1.1, 0));
  addBox(group, doorHW * 2 + 0.7, 0.12, 1.3, woodDark, toVec(p.x, p.y + df + 0.75, 2.5));
  // --- interior ---
  addBox(group, hw * 1.5, 1.05, 0.6, woodDark, toVec(p.x + 0.3, p.y - db + 0.95, 0));                  // bar counter
  addBox(group, hw * 1.5 + 0.2, 0.12, 0.72, trim, toVec(p.x + 0.3, p.y - db + 0.95, 1.05));            // bar top
  for (let i = 0; i < 5; i++) {                                                                        // back-bar bottles
    const c = ["#7fae6a", "#b06a4a", "#caa24f"][i % 3];
    addBox(group, 0.15, 0.38 + (i % 2) * 0.14, 0.15, standard(c, { emissive: "#1c1410", emissiveIntensity: 0.25 }),
      toVec(p.x - 1.3 + i * 0.7, p.y - db + 0.5, 1.55));
  }
  addBox(group, 0.5, 1.4, 0.3, standard("#161009"), toVec(p.x + 1.3, p.y - db + 0.95, 0.4));           // bartender silhouette
  for (const sx of [-1.1, 0.0, 1.1]) addBox(group, 0.34, 0.66, 0.34, woodDark, toVec(p.x + sx, p.y - db + 1.55, 0)); // stools
  addBox(group, 0.85, 0.62, 0.85, woodDark, toVec(p.x - 1.4, p.y + 0.7, 0));                           // table
  const lamp = new THREE.PointLight(col("#ffba6e"), 7, 10, 2);
  lamp.position.copy(toVec(p.x, cz, 2.7));
  group.add(lamp);
}

// ── Procedural western building kit ─────────────────────────────────────────
// Replaces the box .glb main-street buildings with composed false-front facades:
// body + the iconic tall parapet + cornice, a storefront (door + display windows),
// a porch with posts + awning, framed upper windows, corner pilasters, and a sign.
// `great` = confident western silhouette in the cel look, not high-poly. Per-kind
// spec + per-instance jitter so no two repeat. Front faces the road (z = 8.9 line).
// 3-zone albedo: warm key (sunlit siding), cool-leaning shadow (roof/trim/dark
// facades read blue under the split-tone grade), accent reserved for signs only.
const WESTERN_SPECS = {
  saloon:           { stories: 2, body: "#a87848", trim: "#6a5848", roof: "#3a4858", sign: "#d8a64f", porch: true, label: "saloon" },
  saloonFacade:     { stories: 2, body: "#a87848", trim: "#6a5848", roof: "#3a4858", sign: "#d8a64f", porch: true, label: "saloon" },
  storefront:       { stories: 2, body: "#9a7840", trim: "#645848", roof: "#384858", sign: "#caa45c", porch: true, label: "store" },
  town:             { stories: 2, body: "#907040", trim: "#5e5040", roof: "#364656", sign: null,      porch: false, label: "house" },
  ranch:            { stories: 1, body: "#886840", trim: "#5a4c3c", roof: "#344454", sign: null,      porch: true,  label: "house" },
  townFacadeWarm:   { stories: 2, body: "#987848", trim: "#625040", roof: "#384656", sign: null,      porch: false, label: "house" },
  townFacadeStore:  { stories: 2, body: "#9a7842", trim: "#645848", roof: "#3a4656", sign: "#c3a05a", porch: true,  label: "store" },
  townFacadeDark:   { stories: 2, body: "#5a4838", trim: "#4a4038", roof: "#2a3448", sign: null,      porch: false, label: "house" },
};

function buildWesternBuilding(group, p, spec = {}) {
  const size = p.size || 1;
  const jit = hashYaw(p.x * 1.7 + 2.0, p.y * 1.3 - 1.0) / (Math.PI * 2); // 0..1 deterministic
  const w = (spec.w ?? 2.5) * size;
  const depth = (spec.depth ?? 1.7) * size;
  const stories = spec.stories ?? 2;
  const storyH = 1.75;
  const bodyH = stories * storyH * (0.88 + jit * 0.28);
  const hw = w / 2;
  const front = (8.9 - p.y) >= 0 ? 1 : -1;   // +1 → front faces +z (road on the south)
  const fz = p.y + front * depth / 2;        // front-face world z
  const cz = p.y;
  const body = standard(spec.body ?? "#7a5536", { roughness: 1 });
  const trim = standard(spec.trim ?? "#b08a52", { roughness: 1 });
  const roofMat = standard(spec.roof ?? "#37271a", { roughness: 1 });
  const dark = standard("#241910", { roughness: 1 });
  const pane = standard("#ffd190", { emissive: "#b9762e", emissiveIntensity: 0.32 });
  const shutterMat = standard(spec.shutter ?? spec.roof ?? "#3a2a1a", { roughness: 1 });
  const jit2 = hashYaw(p.x * 2.3 - 1.0, p.y * 1.9 + 4.0) / (Math.PI * 2); // independent variety hash

  // place a thin panel flat on the front face: u=horizontal from centre, vBase=bottom Y
  const onFront = (u, vBase, pw, h, mat, out = 0.04, thick = 0.08) =>
    addBox(group, pw, h, thick, mat, toVec(p.x + u, fz + front * out, vBase));
  const windowAt = (u, vBase, ww, wh, shutters = false) => {
    onFront(u, vBase - 0.07, ww + 0.18, wh + 0.16, trim, 0.02, 0.06); // frame
    onFront(u, vBase, ww, wh, pane, 0.05, 0.05);                       // lit pane
    if (shutters) {
      onFront(u - ww / 2 - 0.11, vBase, 0.12, wh, shutterMat, 0.05, 0.05);
      onFront(u + ww / 2 + 0.11, vBase, 0.12, wh, shutterMat, 0.05, 0.05);
    }
  };

  addContactShadow(group, p.x, cz, hw * 1.16, depth / 2 * 1.22);

  // body + board-and-batten siding (proud battens the ink pass draws as plank seams)
  addBox(group, w, bodyH, depth, body, toVec(p.x, cz, 0));
  const nb = Math.max(4, Math.round(w / 0.46));
  for (let i = 0; i <= nb; i++) onFront((i / nb - 0.5) * (w - 0.04), 0, 0.05, bodyH, roofMat, 0.015, 0.035);
  // roof cap
  addBox(group, w + 0.22, 0.2, depth + 0.22, roofMat, toVec(p.x, cz, bodyH));
  // false-front parapet — shape varies (flat / stepped / pediment) for a broken skyline
  const parapetH = 0.9 + jit * 0.6;
  addBox(group, w + 0.1, parapetH, 0.2, body, toVec(p.x, fz, bodyH));
  const pshape = Math.floor(jit2 * 3);
  if (pshape === 1) {            // stepped
    addBox(group, w * 0.5, parapetH * 0.55, 0.22, body, toVec(p.x, fz, bodyH + parapetH));
    addBox(group, w * 0.5 + 0.18, 0.16, 0.3, trim, toVec(p.x, fz, bodyH + parapetH * 1.55 - 0.16));
  } else if (pshape === 2) {     // centred pediment
    addBox(group, w * 0.34, parapetH * 0.7, 0.24, body, toVec(p.x, fz, bodyH + parapetH * 0.55));
  }
  addBox(group, w + 0.26, 0.2, 0.3, trim, toVec(p.x, fz, bodyH + parapetH - 0.2));    // cornice
  addBox(group, w + 0.26, 0.16, 0.28, trim, toVec(p.x, fz, bodyH - 0.05));            // mid band
  // corner pilasters
  addBox(group, 0.18, bodyH, 0.18, trim, toVec(p.x - hw + 0.05, fz, 0));
  addBox(group, 0.18, bodyH, 0.18, trim, toVec(p.x + hw - 0.05, fz, 0));

  // storefront: recessed door + flanking display windows
  const doorU = (jit - 0.5) * 0.3;
  addBox(group, 0.95, 2.0, 0.12, dark, toVec(p.x + doorU, fz + front * 0.04, 0));
  addBox(group, 1.12, 0.16, 0.18, trim, toVec(p.x + doorU, fz + front * 0.05, 2.0));   // lintel
  windowAt(-hw * 0.55, 0.85, w * 0.3, 1.0);
  windowAt(hw * 0.55, 0.85, w * 0.3, 1.0);

  // upper-storey windows (shutters on roughly half the buildings)
  const shut = jit2 > 0.45;
  for (let s = 1; s < stories; s++) {
    const vy = s * storyH + 0.45;
    const cols = w > 2.4 ? 3 : 2;
    for (let i = 0; i < cols; i++) windowAt((i / (cols - 1) - 0.5) * (w - 0.7), vy, 0.5, 0.8, shut);
  }

  // porch: boardwalk + awning + posts + hitching rail + a barrel
  if (spec.porch) {
    const pd = 1.1 * size;
    const pz = fz + front * (pd + 0.05);
    addBox(group, w + 0.3, 0.1, pd, roofMat, toVec(p.x, fz + front * (pd / 2 + 0.1), 0));               // boardwalk
    addBox(group, w + 0.3, 0.12, pd + 0.2, roofMat, toVec(p.x, fz + front * (pd / 2), storyH - 0.05));  // awning
    addBox(group, 0.15, storyH - 0.05, 0.15, trim, toVec(p.x - hw + 0.08, pz, 0));
    addBox(group, 0.15, storyH - 0.05, 0.15, trim, toVec(p.x + hw - 0.08, pz, 0));
    addBox(group, w - 0.1, 0.07, 0.07, trim, toVec(p.x, pz, 0.92));                                     // hitching rail
    addBox(group, 0.42, 0.55, 0.42, roofMat, toVec(p.x + hw * 0.62, fz + front * (pd * 0.66), 0));      // barrel/crate
  }

  // sign: a flat false-front board, or (variety) a hanging board on a bracket
  if (spec.sign) {
    const signMat = standard(spec.sign, { emissive: "#3a2a10", emissiveIntensity: 0.45 });
    if (jit2 > 0.5) {
      const su = -hw * 0.4, sv = storyH + 0.2;
      addBox(group, 0.08, 0.08, 0.62, trim, toVec(p.x + su, fz + front * 0.33, sv + 0.52));   // bracket arm
      addBox(group, 0.1, 0.62, 0.8, signMat, toVec(p.x + su, fz + front * 0.62, sv));         // hanging board
    } else {
      addBox(group, w * 0.74, Math.min(0.8, parapetH * 0.7), 0.1, signMat,
        toVec(p.x, fz + front * 0.13, bodyH + parapetH * 0.28));                              // flat board
    }
  }
}

// --- Distinctive landmark buildings (procedural; authored as a builder fleet) ----
// Each anchors at (p.x, p.y) via toVec and adds to the shared props group, matching
// the existing builders. Footprints live in worldProxies.

function buildChurch(group, p) {
  const s = p.size || 1;
  const mWall = standard("#cdb89a", { roughness: 0.92 });
  const mTrim = standard("#5a4631", { roughness: 0.85 });
  const mRoof = standard("#3d2c1a", { roughness: 0.88 });
  const mDoor = standard("#2e1e0f", { roughness: 0.90 });
  const mWindow = standard("#ffcf86", { emissive: "#ffcf86", emissiveIntensity: 0.85 });
  const mCross = standard("#7a6248", { roughness: 0.80 });
  const mBelfry = standard("#b9a07e", { roughness: 0.90 });
  const mStone = standard("#a08a6e", { roughness: 0.95 });
  const naveW = 2.8 * s, naveD = 4.2 * s, naveH = 3.6 * s;
  const towerW = 1.2 * s, towerD = 1.2 * s, towerH = 6.2 * s, belfryH = 1.1 * s;
  const towerX = p.x, towerY = p.y - naveD * 0.5 + towerD * 0.5;
  addBox(group, naveW, naveH, naveD, mWall, toVec(p.x, p.y, 0));
  const roofH = 1.2 * s;
  const roofMesh = new THREE.Mesh(new THREE.ConeGeometry((naveW * 0.5 + 0.18 * s) * 1.41, roofH, 4), mRoof);
  roofMesh.rotation.y = Math.PI / 4; roofMesh.position.copy(toVec(p.x, p.y, naveH + roofH * 0.5));
  roofMesh.castShadow = true; group.add(roofMesh);
  addBox(group, towerW, towerH, towerD, mWall, toVec(towerX, towerY, 0));
  addBox(group, towerW + 0.08 * s, 0.12 * s, towerD + 0.08 * s, mTrim, toVec(towerX, towerY, towerH * 0.45));
  addBox(group, towerW + 0.08 * s, 0.12 * s, towerD + 0.08 * s, mTrim, toVec(towerX, towerY, towerH * 0.72));
  const belfryY = towerH;
  addBox(group, towerW + 0.15 * s, belfryH, towerD + 0.15 * s, mBelfry, toVec(towerX, towerY, belfryY));
  const slotZ = belfryY + belfryH * 0.55, push = towerW * 0.5 + 0.06 * s;
  addBox(group, 0.32 * s, 0.55 * s, 0.06 * s, mDoor, toVec(towerX, towerY - push, slotZ));
  addBox(group, 0.32 * s, 0.55 * s, 0.06 * s, mDoor, toVec(towerX, towerY + push, slotZ));
  addBox(group, 0.06 * s, 0.55 * s, 0.32 * s, mDoor, toVec(towerX + push, towerY, slotZ));
  addBox(group, 0.06 * s, 0.55 * s, 0.32 * s, mDoor, toVec(towerX - push, towerY, slotZ));
  const bRoofH = 0.55 * s;
  const bRoof = new THREE.Mesh(new THREE.ConeGeometry((towerW * 0.5 + 0.12 * s) * 1.41, bRoofH, 4), mRoof);
  bRoof.rotation.y = Math.PI / 4; bRoof.position.copy(toVec(towerX, towerY, belfryY + belfryH + bRoofH * 0.5));
  bRoof.castShadow = true; group.add(bRoof);
  const crossZ = belfryY + belfryH + bRoofH + 0.08 * s;
  addBox(group, 0.07 * s, 0.72 * s, 0.07 * s, mCross, toVec(towerX, towerY, crossZ));
  addBox(group, 0.46 * s, 0.07 * s, 0.07 * s, mCross, toVec(towerX, towerY, crossZ + 0.36 * s));
  const doorPush = towerD * 0.5 + 0.04 * s;
  addBox(group, 0.55 * s, 2.2 * s, 0.08 * s, mDoor, toVec(towerX, towerY - doorPush, 0));
  addBox(group, 0.69 * s, 2.3 * s, 0.06 * s, mTrim, toVec(towerX, towerY - doorPush - 0.01 * s, 0));
  const rosePush = naveD * 0.5 + 0.05 * s;
  const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.38 * s, 0.38 * s, 0.09 * s, 12), mWindow);
  rose.rotation.x = Math.PI / 2; rose.position.copy(toVec(p.x, p.y - rosePush, naveH * 0.68)); group.add(rose);
  const sPush = naveW * 0.5 + 0.04 * s;
  for (const oy of [-0.8 * s, 0.8 * s]) {
    addBox(group, 0.08 * s, 0.55 * s, 0.22 * s, mWindow, toVec(p.x + sPush, p.y + oy, naveH * 0.58));
    addBox(group, 0.08 * s, 0.55 * s, 0.22 * s, mWindow, toVec(p.x - sPush, p.y + oy, naveH * 0.58));
  }
  const il = new THREE.PointLight(col("#ffba6e"), 3.5, 8, 2);
  il.position.copy(toVec(p.x, p.y - rosePush + 0.6 * s, naveH * 0.66)); group.add(il);
  addBox(group, towerW + 0.5 * s, 0.22 * s, 0.55 * s, mStone, toVec(towerX, towerY - towerD * 0.5 - 0.3 * s, 0));
}

function buildWindmill(group, p) {
  const tx = p.x, ty = p.y, sz = p.size || 1;
  const postMat = standard("#7a5c3a", { roughness: 0.97 });
  const plankMat = standard("#6b4f2e", { roughness: 0.98 });
  const bladeMat = standard("#8a6a44", { roughness: 0.92 });
  const hubMat = standard("#5a3e22", { roughness: 0.85 });
  const towerH = 5.6 * sz, baseW = 1.4 * sz, topW = 0.38 * sz, segments = 6;
  for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    for (let i = 0; i < segments; i++) {
      const frac = i / segments, frac1 = (i + 1) / segments;
      const bw = THREE.MathUtils.lerp(baseW, topW, frac) * 0.5;
      const bw1 = THREE.MathUtils.lerp(baseW, topW, frac1) * 0.5;
      const midW = (bw + bw1) * 0.5;
      addBox(group, 0.11 * sz, towerH / segments + 0.02, 0.11 * sz, postMat, toVec(tx + sx * midW, ty + sy * midW, frac * towerH));
    }
  }
  for (let i = 0; i < 3; i++) {
    const frac = (i + 0.5) / 3.5, bw = THREE.MathUtils.lerp(baseW, topW, frac) * 0.5, zH = frac * towerH;
    for (let face = 0; face < 4; face++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(bw * Math.SQRT2 * 1.95, 0.07 * sz, 0.06 * sz), plankMat);
      m.position.copy(toVec(tx, ty, zH)); m.rotation.y = (face / 4) * Math.PI * 2 + Math.PI / 4;
      m.castShadow = true; group.add(m);
    }
  }
  addBox(group, topW * 2.8, 0.18 * sz, topW * 2.8, plankMat, toVec(tx, ty, towerH));
  const hubMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * sz, 0.22 * sz, 0.28 * sz, 8), hubMat);
  hubMesh.position.copy(toVec(tx, ty - 0.1 * sz, towerH + 0.25 * sz)); hubMesh.rotation.x = Math.PI / 2;
  hubMesh.castShadow = true; group.add(hubMesh);
  const bladeLen = 1.55 * sz, fanZ = towerH + 0.25 * sz, fanOffset = -0.12 * sz;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2, midR = bladeLen * 0.5 + 0.2 * sz;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.19 * sz, bladeLen, 0.055 * sz), bladeMat);
    m.position.copy(toVec(tx + Math.cos(angle) * midR, ty + fanOffset, fanZ + Math.sin(angle) * midR));
    m.rotation.z = -angle; m.rotation.y = i % 2 === 0 ? 0.38 : -0.38;
    m.castShadow = true; group.add(m);
  }
  addBox(group, 0.06 * sz, 1.1 * sz, 0.05 * sz, plankMat, toVec(tx, ty + 0.55 * sz, towerH + 0.04));
  const vane = new THREE.Mesh(new THREE.BoxGeometry(0.04 * sz, 0.8 * sz, 0.62 * sz), bladeMat);
  vane.position.copy(toVec(tx, ty + 0.82 * sz, towerH + 0.6 * sz)); vane.castShadow = true; group.add(vane);
  addBox(group, baseW * 1.1, 0.18 * sz, baseW * 1.1, standard("#5a3e22", { roughness: 0.99 }), toVec(tx, ty, 0));
}

function buildWaterTower(group, p) {
  const ox = p.x, oy = p.y, s = p.size || 1;
  const matLeg = standard("#4f3a26", { roughness: 0.98 });
  const matTank = standard("#6e5236", { roughness: 0.95 });
  const matBand = standard("#3a2c1c", { roughness: 0.85 });
  const matLid = standard("#5a4128", { roughness: 0.97 });
  const legH = 4.6 * s, spread = 1.5 * s, topSpread = 0.85 * s, tankR = 1.3 * s, tankH = 2.4 * s, tankY = legH;
  for (const [tx, ty, bx, by] of [[-topSpread, -topSpread, -spread, -spread], [topSpread, -topSpread, spread, -spread], [topSpread, topSpread, spread, spread], [-topSpread, topSpread, -spread, spread]]) {
    const leg = addBox(group, 0.14 * s, legH, 0.14 * s, matLeg, toVec(ox + (tx + bx) / 2, oy + (ty + by) / 2, 0));
    leg.rotation.x = -Math.atan2(by - ty, legH); leg.rotation.z = Math.atan2(bx - tx, legH);
  }
  for (const [bh, frac] of [[1.4 * s, 1.4 / 4.6], [3.0 * s, 3.0 / 4.6]]) {
    const bo = spread - frac * (spread - topSpread);
    addBox(group, bo * 2, 0.1 * s, 0.1 * s, matBand, toVec(ox, oy - bo, bh));
    addBox(group, bo * 2, 0.1 * s, 0.1 * s, matBand, toVec(ox, oy + bo, bh));
    addBox(group, 0.1 * s, 0.1 * s, bo * 2, matBand, toVec(ox - bo, oy, bh));
    addBox(group, 0.1 * s, 0.1 * s, bo * 2, matBand, toVec(ox + bo, oy, bh));
  }
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(tankR, tankR * 1.04, tankH, 12), matTank);
  tank.position.copy(toVec(ox, oy, tankY + tankH / 2)); tank.castShadow = true; tank.receiveShadow = true; group.add(tank);
  for (const ringOffset of [0.45 * s, 1.2 * s, 1.95 * s]) {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(tankR + 0.07, tankR + 0.07, 0.1, 14), matBand);
    ring.position.copy(toVec(ox, oy, tankY + ringOffset)); ring.castShadow = true; group.add(ring);
  }
  const lid = new THREE.Mesh(new THREE.ConeGeometry(tankR + 0.12, 0.9 * s, 12), matLid);
  lid.position.copy(toVec(ox, oy, tankY + tankH + 0.45 * s)); lid.castShadow = true; group.add(lid);
  addBox(group, 0.12 * s, 0.12 * s, 0.55 * s, matBand, toVec(ox, oy + tankR + 0.2 * s, tankY + 0.38 * s));
}

function buildBlacksmith(group, p) {
  const ox = p.x, oy = p.y;
  const matTimber = standard("#463528", { roughness: 0.97 });
  const matSoot = standard("#2e2118", { roughness: 0.99 });
  const matStone = standard("#6a5f55", { roughness: 0.93 });
  const matStoneDk = standard("#514a42", { roughness: 0.95 });
  const matRoof = standard("#3a2e22", { roughness: 0.96 });
  const matCoal = standard("#ff7a2a", { emissive: "#ff5a18", emissiveIntensity: 1.4 });
  const matAnvil = standard("#1e1a17", { roughness: 0.85 });
  const matMetal = standard("#35302c", { roughness: 0.6 });
  const matDirt = standard("#6e5340", { roughness: 1.0 });
  addBox(group, 4.4, 0.12, 3.2, matDirt, toVec(ox, oy + 1.5));
  addBox(group, 4.0, 3.0, 0.22, matTimber, toVec(ox, oy, 0));
  addBox(group, 0.22, 3.0, 3.0, matTimber, toVec(ox - 2.0, oy + 1.5, 0));
  addBox(group, 0.22, 3.0, 3.0, matTimber, toVec(ox + 2.0, oy + 1.5, 0));
  for (const [px, py] of [[ox - 1.85, oy + 0.12], [ox + 1.85, oy + 0.12]]) addBox(group, 0.2, 3.2, 0.2, matSoot, toVec(px, py, 0));
  const roof = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.2, 3.4), matRoof);
  roof.rotation.x = -0.18; roof.position.set(ox, 3.15, oy + 1.5); roof.castShadow = true; roof.receiveShadow = true; group.add(roof);
  addBox(group, 0.9, 5.4, 0.9, matStone, toVec(ox + 1.55, oy + 0.6, 0));
  addBox(group, 0.72, 3.2, 0.72, matStoneDk, toVec(ox + 1.55, oy + 0.62, 2.2));
  addBox(group, 0.88, 0.22, 0.88, matSoot, toVec(ox + 1.55, oy + 0.62, 5.18));
  addBox(group, 1.1, 0.9, 0.9, matStone, toVec(ox + 1.1, oy + 0.35, 0));
  addBox(group, 0.7, 0.14, 0.55, matCoal, toVec(ox + 1.1, oy + 0.35, 0.9));
  const forgeLight = new THREE.PointLight(col("#ff8a3a"), 8, 8, 2);
  forgeLight.position.copy(toVec(ox + 1.1, oy + 0.35, 1.2)); group.add(forgeLight);
  const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.5, 7), standard("#5a3e28", { roughness: 0.98 }));
  stump.position.copy(toVec(ox - 0.4, oy + 1.1, 0.25)); stump.castShadow = true; group.add(stump);
  addBox(group, 0.55, 0.28, 0.32, matAnvil, toVec(ox - 0.4, oy + 1.1, 0.5));
  addBox(group, 0.52, 0.05, 0.28, matMetal, toVec(ox - 0.4, oy + 1.1, 0.78));
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.72, 8), standard("#7a5c38", { roughness: 0.94 }));
  barrel.position.copy(toVec(ox - 1.5, oy + 0.5, 0.36)); barrel.castShadow = true; group.add(barrel);
}

function buildHotel(group, p) {
  const bx = p.x, by = p.y, sz = p.size || 1;
  const matBody = standard("#8a5a3a", { roughness: 0.92 });
  const matTrim = standard("#d8c8a8", { roughness: 0.85 });
  const matDark = standard("#3d2510", { roughness: 0.97 });
  const matSign = standard("#caa24f", { emissive: "#3a2c12", emissiveIntensity: 0.3 });
  const matGlass = standard("#ffcf86", { emissive: "#ffcf86", emissiveIntensity: 0.85 });
  const matGlassDim = standard("#ffb850", { emissive: "#ffb850", emissiveIntensity: 0.45 });
  const matRoof = standard("#4a2e18", { roughness: 0.98 });
  const W = 4.5 * sz, D = 3.5 * sz, H1 = 2.7 * sz, H2 = 2.8 * sz, HT = H1 + H2;
  const BDK = 0.2 * sz, BPJ = 1.0 * sz, FPH = 1.0 * sz, PH = 0.12 * sz, frontZ = by + D / 2;
  addBox(group, W, HT, D, matBody, toVec(bx, by, 0));
  addBox(group, W + 0.06, 0.18 * sz, D + 0.06, matTrim, toVec(bx, by, H1 - 0.09 * sz));
  for (const wx of [-1.3 * sz, 1.3 * sz]) {
    addBox(group, 0.84 * sz, 1.0 * sz, 0.06 * sz, matTrim, toVec(bx + wx, frontZ - 0.03, 0.97 * sz));
    addBox(group, 0.72 * sz, 0.9 * sz, 0.08 * sz, matGlassDim, toVec(bx + wx, frontZ - 0.05, 1.0 * sz));
  }
  addBox(group, 0.96 * sz, 2.3 * sz, 0.07 * sz, matTrim, toVec(bx, frontZ - 0.035, 0));
  addBox(group, 0.8 * sz, 2.2 * sz, 0.1 * sz, matDark, toVec(bx, frontZ - 0.06, 0));
  const wBase2 = H1 + 0.55 * sz;
  [-1.55 * sz, -0.52 * sz, 0.52 * sz, 1.55 * sz].forEach((wx, i) => {
    addBox(group, 0.8 * sz, 1.0 * sz, 0.05 * sz, matTrim, toVec(bx + wx, frontZ - 0.025, wBase2 - 0.04 * sz));
    addBox(group, 0.68 * sz, 0.88 * sz, 0.08 * sz, [1, 2].includes(i) ? matGlass : matGlassDim, toVec(bx + wx, frontZ - 0.045, wBase2));
  });
  addBox(group, W + 0.1 * sz, BDK, BPJ, matDark, toVec(bx, frontZ + BPJ / 2, H1 - BDK));
  addBox(group, W + 0.12 * sz, PH, PH, matTrim, toVec(bx, frontZ + BPJ, H1 + 0.8 * sz - PH));
  for (const px of [-W / 2, -W / 4, 0, W / 4, W / 2]) addBox(group, PH, 0.8 * sz, PH, matTrim, toVec(bx + px, frontZ + BPJ, H1));
  for (const px of [-W / 2 + 0.15 * sz, 0, W / 2 - 0.15 * sz]) addBox(group, 0.15 * sz, H1, 0.15 * sz, matTrim, toVec(bx + px, frontZ + BPJ, 0));
  addBox(group, W + 0.12 * sz, 0.1 * sz, BPJ + 0.12 * sz, matRoof, toVec(bx, frontZ + BPJ / 2, H1 - BDK - 0.12 * sz));
  addBox(group, W, 0.1 * sz, D, matRoof, toVec(bx, by, HT - 0.05 * sz));
  addBox(group, W, FPH, 0.28 * sz, matBody, toVec(bx, by - D / 2 + 0.14 * sz, HT));
  addBox(group, W + 0.1 * sz, 0.14 * sz, 0.34 * sz, matTrim, toVec(bx, by - D / 2 + 0.17 * sz, HT + FPH - 0.07 * sz));
  addBox(group, W * 0.72, FPH * 0.55, 0.1 * sz, matSign, toVec(bx, by - D / 2 + 0.02, HT + FPH * 0.25));
  for (const [cx, cz] of [[bx - W / 2, by - D / 2], [bx + W / 2, by - D / 2], [bx - W / 2, by + D / 2], [bx + W / 2, by + D / 2]]) addBox(group, 0.18 * sz, HT + 0.05, 0.18 * sz, matTrim, toVec(cx, cz, 0));
}

function buildPlacement(group, p) {
  // Guard size once here: every per-kind builder multiplies p.size, so an entry
  // missing it (undefined * k = NaN) would silently produce zero-scaled geometry.
  if (typeof p.size !== "number" || !Number.isFinite(p.size)) p = { ...p, size: 1 };
  // Composed western facade (replaces the box .glb) — built into its own sub-group
  // so it's one occlusion/fade node and grounds itself.
  if (WESTERN_SPECS[p.kind]) {
    const g = new THREE.Group();
    buildWesternBuilding(g, p, WESTERN_SPECS[p.kind]);
    group.add(g);
    return g;
  }
  switch (p.kind) {
    case "town":
    case "ranch": return buildBuilding(group, p, p.depthLane === "background" ? 1.3 : 1.0);
    case "townFacadeWarm": return buildBuilding(group, p, 0.95);
    case "townFacadeStore": return buildBuilding(group, p, 0.86);
    case "townFacadeDark": return buildBuilding(group, p, 0.8);
    case "heroTownSaloon": return buildBuilding(group, p, 1.05);
    case "heroTownStore": return buildBuilding(group, p, 0.95);
    case "heroTownAssay": return buildBuilding(group, p, 0.86);
    case "gate": return buildBuilding(group, p, 0.8);
    case "watchtower":
    case "landmark": return buildWatchtower(group, p);
    case "lamp":
    case "lampTall":
    case "lampLow": return buildLamp(group, p);
    case "fence":
    case "brokenFence": return buildFence(group, p);
    case "sign":
    case "roadSign":
    case "road": return buildSign(group, p);
    case "townBark": return buildTownBarkMarker(group, p);
    case "jobBoard": return buildJobBoard(group, p);
    case "smokeCache": return buildSmokeCache(group, p);
    case "slimeTell":
    case "marshCluster": return buildSlimeTell(group, p);
    case "slimeTrailHero": return buildSlimeTell(group, p);
    case "brokenWagon":
    case "wagonSalvage": return buildWagon(group, p);
    case "roadSlime": return buildSlime(group, p);
    case "walkInSaloon": return buildWalkInSaloon(group, p);
    case "church": return buildChurch(group, p);
    case "windmill": return buildWindmill(group, p);
    case "waterTower": return buildWaterTower(group, p);
    case "blacksmith": return buildBlacksmith(group, p);
    case "hotel": return buildHotel(group, p);
    case "saloon":
    case "saloonFacade": return buildBuilding(group, p, 1.15);
    case "storefront": return buildBuilding(group, p, 0.95);
    case "porch": return buildPorch(group, p);
    case "mesa":
    case "mesaSilhouette":
    case "mesaSkyline":
    case "heroMesaSkyline":
    case "cliff": return buildMesa(group, p);
    case "rock":
    case "boulder": return buildRock(group, p);
    case "cactus": return buildCactus(group, p);
    case "deadTree": return buildDeadTree(group, p);
    case "roadPlank":
    case "roadRut": return buildRoadPlank(group, { ...p, size: p.kind === "roadRut" ? 1.35 * p.size : p.size });
    case "brush": return buildBrush(group, p);
    case "sagePatch": return buildSagePatch(group, p);
    case "sageCluster":
    case "roadGrass": return buildSagePatch(group, p);
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
  const roadSide = p.y > PLAYER_SPAWN.y ? -1 : 1;
  const faceZ = p.y + roadSide * 1.03; // toward the road, not through the back wall
  const paneMat = standard(wl.color, {
    emissive: wl.color,
    // Dim ambient tier — below bloom threshold so only reserved objective lights pop.
    emissiveIntensity: 0.28,
    transparent: true,
    opacity: 0.82,
    rimStrength: 0,
  });
  const frameMat = standard("#17100b", { rimStrength: 0.05 });
  const glassDepth = 0.025;

  const addLitWindow = (cx, cy, ww, wh, split = true) => {
    const back = new THREE.Mesh(new THREE.BoxGeometry(ww + 0.16, wh + 0.16, glassDepth), frameMat);
    back.position.set(cx, cy, faceZ - roadSide * 0.006);
    group.add(back);

    const paneW = split ? (ww - 0.08) / 2 : ww;
    const paneH = split ? (wh - 0.08) / 2 : wh;
    const xs = split ? [-paneW / 2 - 0.02, paneW / 2 + 0.02] : [0];
    const ys = split ? [-paneH / 2 - 0.02, paneH / 2 + 0.02] : [0];
    for (const ox of xs) {
      for (const oy of ys) {
        const pane = new THREE.Mesh(new THREE.BoxGeometry(paneW, paneH, glassDepth * 1.35), paneMat);
        pane.position.set(cx + ox, cy + oy, faceZ + roadSide * 0.01);
        pane.renderOrder = 1;
        group.add(pane);
      }
    }

    const framePieces = [
      [ww + 0.18, 0.045, 0, wh / 2 + 0.07],
      [ww + 0.18, 0.045, 0, -wh / 2 - 0.07],
      [0.045, wh + 0.18, -ww / 2 - 0.07, 0],
      [0.045, wh + 0.18, ww / 2 + 0.07, 0],
      [0.04, wh + 0.08, 0, 0],
    ];
    for (const [fw, fh, ox, oy] of framePieces) {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, glassDepth * 1.8), frameMat);
      frame.position.set(cx + ox, cy + oy, faceZ + roadSide * 0.022);
      group.add(frame);
    }
  };

  addLitWindow(p.x - 0.42, 1.55, 0.38, 0.42);
  addLitWindow(p.x + 0.42, 1.55, 0.38, 0.42);
  addLitWindow(p.x, 0.62, 0.42, 0.82, false);

  const l = new THREE.PointLight(col(wl.color), (wl.intensity ?? 1) * 1.3, wl.distance ?? 8, 2);
  l.position.set(p.x, wl.height ?? 1.5, p.y + roadSide * 0.42);
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

function setPlayerMarkerVisibility(rig, enabled) {
  if (!rig?.group) return;
  rig.group.visible = Boolean(enabled);
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

function placementByKind(snapshot, kind) {
  return snapshot.worldObjects.find((p) => p.kind === kind);
}

function createPearlRoadCue(snapshot) {
  const target = placementByKind(snapshot, "townBark");
  const group = new THREE.Group();
  group.name = "pearl-road-cue";
  if (!target) return { group, update() {} };

  const shaftMat = standard("#ffd77b", { emissive: "#ffb84a", emissiveIntensity: 0.82, transparent: true, opacity: 0.86, rimStrength: 0 });
  const shadowMat = standard("#3a2818", { transparent: true, opacity: 0.62 });
  const base = addBox(group, 0.18, 0.18, 1.1, shadowMat, toVec(target.x + 0.45, target.y - 0.15, 0.03));
  base.rotation.y = -0.74;
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.52, 4), shaftMat);
  arrow.rotation.z = Math.PI / 2;
  arrow.rotation.y = -0.74;
  arrow.position.copy(toVec(target.x + 1.02, target.y - 0.52, 1.22));
  group.add(arrow);
  group.visible = false;

  return {
    group,
    update(t, visible) {
      group.visible = visible;
      if (!visible) return;
      arrow.position.y = 1.22 + Math.sin(t * 4.0) * 0.08;
      arrow.rotation.y = -0.74 + Math.sin(t * 2.2) * 0.06;
    },
  };
}

function createMapScrapReward(snapshot) {
  const wagon = placementByKind(snapshot, "brokenWagon");
  const group = new THREE.Group();
  group.name = "map-scrap-reward";
  if (!wagon) return { group, update() {} };

  const paper = standard("#f1dfb8", { emissive: "#d6a34f", emissiveIntensity: 0.44, roughness: 1, rimStrength: 0.05 });
  const ink = standard("#5b3a1d", { emissive: "#5b3a1d", emissiveIntensity: 0.12 });
  const scrap = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.035, 0.42), paper);
  scrap.position.copy(toVec(wagon.x - 0.22, wagon.y + 0.28, 1.25));
  scrap.rotation.set(0.2, -0.42, 0.08);
  scrap.castShadow = true;
  group.add(scrap);
  const line = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.035), ink);
  line.position.copy(toVec(wagon.x - 0.22, wagon.y + 0.29, 1.29));
  line.rotation.copy(scrap.rotation);
  group.add(line);
  const light = new THREE.PointLight(col("#ffcc80"), 1.1, 2.8, 2.2);
  light.position.copy(toVec(wagon.x - 0.22, wagon.y + 0.28, 1.55));
  group.add(light);
  group.visible = false;

  return {
    group,
    update(t, visible) {
      group.visible = visible;
      if (!visible) return;
      scrap.position.y = 1.25 + Math.sin(t * 3.3) * 0.045;
      line.position.y = scrap.position.y + 0.04;
      light.intensity = 0.9 + Math.sin(t * 4.2) * 0.18;
    },
  };
}

function createBoardReturnNotice(snapshot) {
  const board = placementByKind(snapshot, "jobBoard");
  const group = new THREE.Group();
  group.name = "board-return-notice";
  if (!board) return { group, update() {} };

  const paper = standard("#f0dfbb", { emissive: "#d9a857", emissiveIntensity: 0.36, rimStrength: 0 });
  const pin = standard("#b84932", { emissive: "#b84932", emissiveIntensity: 0.28, rimStrength: 0 });
  const notice = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.045, 0.32), paper);
  notice.position.copy(toVec(board.x + 0.34, board.y - 0.05, 1.52));
  notice.rotation.y = Math.PI / 2;
  group.add(notice);
  const tack = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), pin);
  tack.position.copy(toVec(board.x + 0.34, board.y - 0.08, 1.68));
  group.add(tack);
  group.visible = false;

  return {
    group,
    update(t, visible) {
      group.visible = visible;
      if (!visible) return;
      const pulse = 1 + Math.sin(t * 3.1) * 0.035;
      notice.scale.set(pulse, pulse, pulse);
      tack.scale.setScalar(1 + Math.sin(t * 4.7) * 0.08);
    },
  };
}

function createHeroSilhouetteAccent() {
  const group = new THREE.Group();
  group.name = "hero-silhouette-accent";

  const bedroll = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.18, 0.22),
    standard("#5c3c27", { rimColor: "#d8ad76", rimStrength: 0.22 }),
  );
  bedroll.position.set(0, 1.08, 0.2);
  bedroll.rotation.x = 0.06;
  group.add(bedroll);

  const scarf = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.08, 0.08),
    standard("#9d3b2e", { emissive: "#5a1712", emissiveIntensity: 0.08, rimStrength: 0.16 }),
  );
  scarf.position.set(0.02, 1.42, 0.18);
  group.add(scarf);

  const lantern = new THREE.Mesh(
    new THREE.SphereGeometry(0.095, 9, 7),
    standard("#f0b45f", { emissive: "#e07a30", emissiveIntensity: 0.7, rimStrength: 0 }),
  );
  lantern.position.set(0.27, 1.18, 0.27);
  group.add(lantern);

  const lamp = new THREE.PointLight(col("#e07a30"), 0.52, 2.15, 2.1);
  lamp.position.copy(lantern.position);
  group.add(lamp);

  return {
    group,
    update(player, t = 0) {
      const pos = player?.position || PLAYER_SPAWN;
      group.position.set(pos.x, 0, pos.z);
      group.rotation.y = Number.isFinite(player?.yaw) ? player.yaw : 0;
      lantern.scale.setScalar(0.92 + Math.sin(t * 3.4) * 0.05);
      lamp.intensity = 0.42 + Math.max(0, Math.sin(t * 2.6)) * 0.12;
    },
  };
}

function createSlimeCombatCue(snapshot) {
  const slime = placementByKind(snapshot, "roadSlime");
  const group = new THREE.Group();
  group.name = "slime-combat-cue";
  if (!slime) return { group, update() {} };

  const warningMat = new THREE.MeshBasicMaterial({
    color: col("#ff8f45"),
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
  });
  const dangerMat = new THREE.MeshBasicMaterial({
    color: col("#ffd77b"),
    transparent: true,
    opacity: 0.74,
    depthWrite: false,
  });
  const splashMat = new THREE.MeshBasicMaterial({
    color: col("#70d86a"),
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });

  const warningRing = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.035, 8, 52), warningMat);
  warningRing.rotation.x = Math.PI / 2;
  warningRing.position.set(slime.x, 0.12, slime.y);
  group.add(warningRing);

  const strikePointer = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.46, 4), dangerMat);
  strikePointer.rotation.x = Math.PI;
  strikePointer.rotation.y = Math.PI / 4;
  strikePointer.position.set(slime.x, 1.65, slime.y);
  group.add(strikePointer);

  const defeatSplash = new THREE.Mesh(new THREE.CircleGeometry(1, 28), splashMat);
  defeatSplash.rotation.x = -Math.PI / 2;
  defeatSplash.position.set(slime.x, 0.095, slime.y);
  group.add(defeatSplash);
  group.visible = false;

  return {
    group,
    update(t, mode = "hidden") {
      const combatVisible = mode === "combat";
      const defeatedVisible = mode === "defeated";
      group.visible = combatVisible || defeatedVisible;
      warningRing.visible = combatVisible;
      strikePointer.visible = combatVisible;
      defeatSplash.visible = defeatedVisible;
      if (combatVisible) {
        const pulse = 1 + Math.sin(t * 6.0) * 0.12;
        warningRing.scale.set(pulse, pulse, pulse);
        warningMat.opacity = 0.42 + Math.max(0, Math.sin(t * 5.2)) * 0.22;
        strikePointer.position.y = 1.65 + Math.sin(t * 4.4) * 0.1;
        strikePointer.rotation.y += 0.025;
      }
      if (defeatedVisible) {
        const pulse = 1 + Math.sin(t * 2.4) * 0.04;
        defeatSplash.scale.set(1.12 * pulse, 0.72 * pulse, 1);
        splashMat.opacity = 0.32 + Math.max(0, Math.sin(t * 3.4)) * 0.08;
      }
    },
  };
}

function createBeatToast(rootDocument = globalThis.document) {
  const el = rootDocument?.getElementById?.("beat-toast") || null;
  const titleEl = el?.querySelector?.(".toast-title") || null;
  const lineEl = el?.querySelector?.(".toast-line") || null;
  let ttl = 0;
  let current = null;

  function show(title, line, seconds = 2.8) {
    current = { title, line };
    ttl = Math.max(ttl, seconds);
    if (!el) return current;
    if (titleEl) titleEl.textContent = title;
    if (lineEl) lineEl.textContent = line;
    el.hidden = false;
    return current;
  }

  function update(dt) {
    if (!el || ttl <= 0) return;
    ttl = Math.max(0, ttl - Math.max(0, dt || 0));
    if (ttl <= 0) el.hidden = true;
  }

  return {
    show,
    update,
    getState() {
      return {
        visible: Boolean(el && !el.hidden && ttl > 0),
        ttl: Number(ttl.toFixed(2)),
        current,
      };
    },
  };
}

function createProductionHudRefs(rootDocument = globalThis.document) {
  const doc = rootDocument && typeof rootDocument.getElementById === "function" ? rootDocument : null;
  return {
    heroPanel: doc?.getElementById("hero-panel") || null,
    jobToast: doc?.getElementById("job-toast") || null,
    fieldMap: doc?.getElementById("field-map") || null,
    jobTracker: doc?.getElementById("job-tracker") || null,
    hotbar: doc?.getElementById("hotbar") || null,
    commandDock: doc?.getElementById("command-dock") || null,
    objective: doc?.getElementById("objective") || null,
    activeJobLine: doc?.querySelector("#job-tracker .job-row.active .job-line") || null,
    activeJobCount: doc?.querySelector("#job-tracker .job-row.active .job-count") || null,
    surveyJobLine: doc?.querySelector("#job-tracker .job-row:not(.active) .job-line") || null,
    surveyJobCount: doc?.querySelector("#job-tracker .job-row:not(.active) .job-count") || null,
    toastTitle: doc?.querySelector("#job-toast .job-title") || null,
  };
}

// Live job ledger view (set by the main loop's syncPlayerHud once the RPG state
// tree exists). When present, the tracker shows the REAL bounty progress
// (kills 0/3 → 3/3) instead of the phase-derived approximation.
let liveJobView = null;

function syncProductionHud(refs, loopState = {}, encounterState = null) {
  if (!refs) return;
  const phase = loopState.phase || "spawn";
  const index = Math.max(0, LOOP_PHASES.indexOf(phase));
  const total = Math.max(1, LOOP_PHASES.length - 1);
  const beats = loopState.routeBeats || {};
  if (refs.activeJobLine) {
    refs.activeJobLine.textContent = phase === "slime_fight" && encounterState
      ? `Strike the Road Slime. ${encounterState.hitCount}/${encounterState.maxHp} clean hits.`
      : loopState.objectiveText || "Find Boone's lit job board by the road.";
  }
  if (refs.activeJobCount) {
    refs.activeJobCount.textContent = liveJobView?.progressLabel
      ? liveJobView.progressLabel
      : phase === "survey_teaser" ? "1/1" : `${Math.min(index, total)}/${total}`;
  }
  if (refs.surveyJobLine) {
    refs.surveyJobLine.textContent = beats.returnToBoone
      ? "Old Road Survey is ready on Boone's board."
      : beats.wagonSalvage
        ? "Return the Map Scrap to Boone."
        : "Recover the wagon map scrap.";
  }
  if (refs.surveyJobCount) {
    refs.surveyJobCount.textContent = beats.returnToBoone ? "1/1" : "0/1";
  }
  if (refs.toastTitle) {
    refs.toastTitle.textContent = beats.boardChoice
      ? "Road bounty accepted"
      : "New road bounty available";
  }
  if (refs.jobToast?.dataset) refs.jobToast.dataset.phase = phase;
  if (refs.jobTracker?.dataset) refs.jobTracker.dataset.phase = phase;
  if (refs.hotbar?.dataset) refs.hotbar.dataset.phase = phase;
}

function getHudFantasyMetrics(rootDocument = globalThis.document) {
  const doc = rootDocument && typeof rootDocument.getElementById === "function" ? rootDocument : null;
  const ids = ["hero-panel", "job-toast", "field-map", "job-tracker", "hotbar", "command-dock", "objective"];
  const vw = Math.max(1, rootDocument?.defaultView?.innerWidth || globalThis.innerWidth || 1);
  const vh = Math.max(1, rootDocument?.defaultView?.innerHeight || globalThis.innerHeight || 1);
  let area = 0;
  const visible = {};
  for (const id of ids) {
    const el = doc?.getElementById(id) || null;
    const isVisible = Boolean(el && !el.hidden);
    visible[id] = isVisible;
    if (!isVisible || typeof el.getBoundingClientRect !== "function") continue;
    const r = el.getBoundingClientRect();
    area += Math.max(0, r.width) * Math.max(0, r.height);
  }
  return {
    heroPanelVisible: visible["hero-panel"],
    jobToastVisible: visible["job-toast"],
    fieldMapVisible: visible["field-map"],
    jobTrackerVisible: visible["job-tracker"],
    hotbarVisible: visible.hotbar,
    commandDockVisible: visible["command-dock"],
    objectiveVisible: visible.objective,
    hudFootprint: Number((area / Math.max(1, vw * vh)).toFixed(4)),
  };
}

function nodeScreenStats(node, camera) {
  if (!node || node.visible === false) return null;
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  const box = new THREE.Box3().setFromObject(node);
  if (box.isEmpty()) return null;
  const min = box.min;
  const max = box.max;
  const corners = [
    [min.x, min.y, min.z], [min.x, min.y, max.z], [min.x, max.y, min.z], [min.x, max.y, max.z],
    [max.x, min.y, min.z], [max.x, min.y, max.z], [max.x, max.y, min.z], [max.x, max.y, max.z],
  ];
  let minX = 1;
  let maxX = -1;
  let minY = 1;
  let maxY = -1;
  let inDepth = false;
  for (const corner of corners) {
    const p = new THREE.Vector3(corner[0], corner[1], corner[2]).project(camera);
    if (p.z >= -1 && p.z <= 1) inDepth = true;
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const clipMinX = Math.max(-1, minX);
  const clipMaxX = Math.min(1, maxX);
  const clipMinY = Math.max(-1, minY);
  const clipMaxY = Math.min(1, maxY);
  const area = Math.max(0, clipMaxX - clipMinX) * Math.max(0, clipMaxY - clipMinY) / 4;
  const center = box.getCenter(new THREE.Vector3());
  return {
    inFrame: inDepth && area > 0,
    area: Number(area.toFixed(4)),
    center,
    height: Number((box.max.y - box.min.y).toFixed(2)),
    ndc: {
      minX: Number(clipMinX.toFixed(3)),
      maxX: Number(clipMaxX.toFixed(3)),
      minY: Number(clipMinY.toFixed(3)),
      maxY: Number(clipMaxY.toFixed(3)),
    },
  };
}

function createCompositionMetrics({ heroMeshes, placementNodes, character, camera, player, extras = {} }) {
  const heroVisibility = getHeroVisibility(heroMeshes, camera);
  const playerVisibility = getHeroVisibility({ player: character.group }, camera).player;
  let visibleBeatCount = 0;
  for (const kind of ["jobBoard", "roadSign", "townBark", "smokeCache", "slimeTell", "roadSlime", "brokenWagon"]) {
    if (heroVisibility[kind]?.inFrame) visibleBeatCount++;
  }
  for (const node of Object.values(extras)) {
    if (nodeScreenStats(node, camera)?.inFrame) visibleBeatCount++;
  }

  let maxForegroundBlocker = { kind: null, screenArea: 0, distanceToPlayer: 0 };
  for (const record of placementNodes) {
    if (!record?.node || HERO_KINDS.includes(record.kind)) continue;
    const stats = nodeScreenStats(record.node, camera);
    if (!stats?.inFrame || stats.height < 1.05) continue;
    const distanceToPlayer = Math.hypot(stats.center.x - player.position.x, stats.center.z - player.position.z);
    if (distanceToPlayer > 14) continue;
    if (stats.area > maxForegroundBlocker.screenArea) {
      maxForegroundBlocker = {
        kind: record.kind,
        screenArea: stats.area,
        distanceToPlayer: Number(distanceToPlayer.toFixed(2)),
      };
    }
  }

  return {
    playerVisible: Boolean(playerVisibility?.inFrame),
    boardVisible: Boolean(heroVisibility.jobBoard?.inFrame),
    visibleBeatCount,
    maxForegroundBlocker,
  };
}

function createArtDirectionMetrics({ heroMeshes, placementNodes, character, camera, player, snapshot }) {
  const composition = createCompositionMetrics({ heroMeshes, placementNodes, character, camera, player });
  const playerStats = nodeScreenStats(character.group, camera);
  const boardStats = nodeScreenStats(heroMeshes.jobBoard, camera);
  const layout = getArtDirectionLayoutMetrics(snapshot.worldObjects);
  return {
    ...composition,
    playerScreenArea: Number((playerStats?.area || 0).toFixed(4)),
    boardScreenArea: Number((boardStats?.area || 0).toFixed(4)),
    playerNdc: playerStats?.ndc || null,
    boardNdc: boardStats?.ndc || null,
    openingRoadWidth: FIRST_ROAD_ART_STYLE.openingRoadWidth,
    roadWidth: FIRST_ROAD_ART_STYLE.roadWidth,
    naturalClusterCount: layout.naturalClusterCount,
    firstFrameNaturalCount: layout.firstFrameNaturalCount,
    firstFrameSlabBlockers: layout.firstFrameSlabBlockers,
    heroPolishKinds: layout.heroPolishKinds,
  };
}

function createTownDensityMetrics({ placementNodes, camera, snapshot }) {
  const layout = getProductionFrameLayoutMetrics(snapshot.worldObjects);
  const visibleProductionKinds = new Set();
  let visibleProductionPropCount = 0;
  for (const record of placementNodes) {
    if (!record?.node || !PRODUCTION_DENSITY_KINDS.has(record.kind)) continue;
    const stats = nodeScreenStats(record.node, camera);
    if (!stats?.inFrame) continue;
    visibleProductionPropCount++;
    visibleProductionKinds.add(record.kind);
  }
  return {
    ...layout,
    visibleProductionPropCount,
    visibleProductionKinds: Array.from(visibleProductionKinds),
  };
}

function createProductionFrameMetrics({ heroMeshes, placementNodes, character, camera, player, snapshot }) {
  const art = createArtDirectionMetrics({ heroMeshes, placementNodes, character, camera, player, snapshot });
  const town = createTownDensityMetrics({ placementNodes, camera, snapshot });
  return {
    playerVisible: art.playerVisible,
    boardVisible: art.boardVisible,
    playerScreenArea: art.playerScreenArea,
    boardScreenArea: art.boardScreenArea,
    roadFootprint: art.openingRoadWidth,
    maxForegroundBlocker: art.maxForegroundBlocker,
    streetDensity: town.productionStreetPropCount,
    visibleProductionPropCount: town.visibleProductionPropCount,
    storefrontCount: town.storefrontCount,
    windowSignLightCount: town.windowLightCount,
    npcSilhouetteCount: town.npcSilhouetteCount,
    productionKinds: town.productionKinds,
  };
}

function createModelReadability({ modelLoadStatus, character }) {
  const important = {};
  for (const kind of IMPORTANT_MODEL_KINDS) {
    const status = modelLoadStatus[kind] || { kind, loadedCount: 0, fallbackCount: 0, total: 0 };
    important[kind] = {
      url: status.url || modelFor(kind)?.url || null,
      loaded: (status.loadedCount || 0) > 0,
      loadedCount: status.loadedCount || 0,
      fallbackCount: status.fallbackCount || 0,
      total: status.total || 0,
    };
  }
  const animationNames = Array.isArray(character.modelStats?.animationNames)
    ? character.modelStats.animationNames
    : [];
  return {
    playerModelUrl: character.modelUrl || null,
    usesHeroCharacter: character.modelUrl === PLAYER_MODEL_URL,
    playerModelSkinned: (character.modelStats?.skinnedMeshCount || 0) > 0,
    playerSkinnedMeshCount: character.modelStats?.skinnedMeshCount || 0,
    playerMeshCount: character.modelStats?.meshCount || 0,
    playerAnimationNames: animationNames,
    playerHasLocomotionClips: animationNames.includes("Idle") && animationNames.includes("Walk"),
    important,
  };
}

function createOpeningLightPools(snapshot) {
  const group = new THREE.Group();
  group.name = "opening-light-pools";
  const pools = [];
  const specs = [
    { kind: "jobBoard", rx: 2.7, rz: 1.65, color: "#d78949", opacity: 0.085 },
    { kind: "roadSign", rx: 1.85, rz: 1.08, color: "#d89455", opacity: 0.045 },
    { kind: "smokeCache", rx: 1.75, rz: 1.02, color: "#b77945", opacity: 0.04 },
    { kind: "brokenWagon", rx: 2.15, rz: 1.24, color: "#c27b48", opacity: 0.045 },
  ];

  for (const spec of specs) {
    const p = placementByKind(snapshot, spec.kind);
    if (!p) continue;
    const mat = new THREE.MeshBasicMaterial({
      color: col(spec.color),
      transparent: true,
      opacity: spec.opacity,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1, 44), mat);
    pool.rotation.x = -Math.PI / 2;
    pool.scale.set(spec.rx, spec.rz, 1);
    pool.position.set(p.x, 0.035, p.y);
    pool.renderOrder = -1;
    group.add(pool);
    pools.push({ mesh: pool, baseOpacity: spec.opacity, phase: spec.kind.length * 0.37 });
  }

  return {
    group,
    update(t) {
      for (const pool of pools) {
        pool.mesh.material.opacity = pool.baseOpacity * (0.88 + Math.sin(t * 1.8 + pool.phase) * 0.08);
      }
    },
  };
}

function createRoadDust(snapshot) {
  const group = new THREE.Group();
  group.name = "road-dust-ribbons";
  const route = FIRST_FIVE_ROUTE.filter((point) => point.kind !== "returnJobBoard");
  const ribbons = [];
  for (let seg = 1; seg < route.length; seg++) {
    const from = route[seg - 1];
    const to = route[seg];
    const dx = to.x - from.x;
    const dz = to.y - from.y;
    const len = Math.hypot(dx, dz);
    if (len < 0.1) continue;
    const nx = -dz / len;
    const nz = dx / len;
    const count = Math.max(1, Math.floor(len / 7));
    for (let i = 1; i <= count; i++) {
      const t = i / (count + 1);
      const side = ((i + seg) % 2 === 0 ? -1 : 1) * (1.2 + (i % 2) * 0.8);
      const mat = new THREE.MeshBasicMaterial({
        color: col(i % 2 ? "#b77d46" : "#8f633c"),
        transparent: true,
        opacity: 0.058,
        depthWrite: false,
        blending: THREE.NormalBlending,
      });
      const dust = new THREE.Mesh(new THREE.CircleGeometry(1, 20), mat);
      dust.rotation.x = -Math.PI / 2;
      dust.scale.set(1.45 + (i % 3) * 0.32, 0.45 + (seg % 2) * 0.14, 1);
      dust.position.set(from.x + dx * t + nx * side, 0.065, from.y + dz * t + nz * side);
      dust.rotation.z = Math.atan2(dz, dx) + (i % 2 ? 0.12 : -0.08);
      dust.renderOrder = -1;
      group.add(dust);
      ribbons.push({ mesh: dust, baseOpacity: mat.opacity, phase: seg * 0.7 + i * 0.31 });
    }
  }

  return {
    group,
    update(t) {
      for (const ribbon of ribbons) {
        ribbon.mesh.material.opacity = ribbon.baseOpacity * (0.74 + Math.sin(t * 1.35 + ribbon.phase) * 0.18);
        ribbon.mesh.position.y = 0.065 + Math.sin(t * 1.1 + ribbon.phase) * 0.006;
      }
    },
  };
}

function createRouteSageField(snapshot) {
  const group = new THREE.Group();
  group.name = "route-sage-field";
  const route = FIRST_FIVE_ROUTE.filter((point) => point.kind !== "returnJobBoard");
  const colors = ["#768a50", "#83925a", "#687d45", "#b19a62"];
  const bladeGeo = new THREE.ConeGeometry(0.065, 0.62, 5);
  const seedValue = (x) => {
    const s = Math.sin(x * 91.7 + 17.13) * 43758.5453;
    return s - Math.floor(s);
  };
  let n = 0;

  for (let seg = 1; seg < route.length; seg++) {
    const from = route[seg - 1];
    const to = route[seg];
    const dx = to.x - from.x;
    const dz = to.y - from.y;
    const len = Math.hypot(dx, dz);
    if (len < 0.1) continue;
    const nx = -dz / len;
    const nz = dx / len;
    const count = Math.max(16, Math.floor(len * 3.8));
    for (let i = 0; i < count; i++) {
      const t = (i + 0.35 + seedValue(seg * 19 + i) * 0.4) / count;
      const side = seedValue(seg * 41 + i * 3) > 0.5 ? 1 : -1;
      const shoulder = side * (3.8 + seedValue(seg * 13 + i * 5) * 3.4);
      const alongJitter = (seedValue(seg * 29 + i * 7) - 0.5) * 0.8;
      const x = from.x + dx * t + nx * shoulder + (dx / len) * alongJitter;
      const z = from.y + dz * t + nz * shoulder + (dz / len) * alongJitter;
      const blades = 2 + Math.floor(seedValue(seg * 53 + i * 11) * 3);
      for (let b = 0; b < blades; b++) {
        const a = seedValue(n * 7 + b) * Math.PI * 2;
        const r = seedValue(n * 13 + b) * 0.32;
        const h = 0.54 + seedValue(n * 17 + b) * 0.58;
        const mat = standard(colors[(n + b) % colors.length], { roughness: 1, rimStrength: 0 });
        const blade = new THREE.Mesh(bladeGeo, mat);
        const sc = 0.82 + seedValue(n * 23 + b) * 0.72;
        blade.scale.set(sc, h, sc);
        blade.position.set(x + Math.cos(a) * r, groundHeight(x, z) + h * 0.24, z + Math.sin(a) * r);
        blade.rotation.set(0.08 * Math.sin(a), a, 0.08 * Math.cos(a));
        blade.castShadow = false;
        blade.receiveShadow = true;
        group.add(blade);
      }
      n++;
    }
  }

  return group;
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
    // Lighter, less-red desert tones than the defaults — the dark #5a3d22 dirt was
    // crushing to a heavy red in shadow under the warm key. Warmer sand + neutral
    // dirt keep the off-road ground readable instead of a red murk.
    createGroundMaterial({ center: { x: 35, z: 13 }, dirt: "#5a5048", sand: "#c49a62", scrub: "#5a6848" }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(35, 0, 13);
  ground.receiveShadow = true;
  scene.add(ground);

  // Greenish marsh apron over the southern lowland (thin tinted plane).
  const marsh = new THREE.Mesh(
    new THREE.PlaneGeometry(31, 10),
    standard("#3c4a2e", { roughness: 1, rimStrength: 0.08 }),
  );
  marsh.rotation.x = -Math.PI / 2;
  marsh.position.set(47, 0.005, 18);
  marsh.receiveShadow = true;
  scene.add(marsh);

  // (Marsh water is now an animated TSL surface created in startSpike — see createWater.)

  // Dusty S-road ribbon running through the entire first-five-minute route.
  // Segmenting it by route points makes the path visibly turn toward the marsh
  // instead of reading as a short flat alley.
  const ROAD_W = FIRST_ROAD_ART_STYLE.roadWidth;
  const roadMat = standard("#c08a55", { roughness: 1, emissive: "#5a3a20", emissiveIntensity: 0.08, rimStrength: 0.02 });
  const edgeMat = standard("#e0aa68", { roughness: 1, emissive: "#5f3a20", emissiveIntensity: 0.06, rimStrength: 0.02 });
  const rutMat = standard("#49301c", { roughness: 1, emissive: "#1a0f08", emissiveIntensity: 0.015, rimStrength: 0.01 }); // darker = worn wheel tracks with weight
  const centerMat = standard("#a87446", { roughness: 1, emissive: "#3a2415", emissiveIntensity: 0.035, rimStrength: 0.01 });
  // The opacity-0.5 dust wash was muddying the whole road to a flat band; dropped
  // to a faint haze so the warm surface + ruts read instead of a cardboard strip.
  const roadWashMat = new THREE.MeshBasicMaterial({
    color: col("#e3c08a"),
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
  const sageShoulderMat = new THREE.MeshBasicMaterial({
    color: col("#6f7f46"),
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });
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

    // The near spawn segment fills the foreground fast in third-person view; a
    // slightly tapered width keeps it from reading like a red carpet while later
    // segments stay broad enough to guide the eye down-road.
    const segmentWidth = i === 1 ? FIRST_ROAD_ART_STYLE.openingRoadWidth : ROAD_W;
    for (const off of [-(segmentWidth / 2 + 1.75), segmentWidth / 2 + 1.75]) {
      const shoulder = addRoadPlane(
        { x: from.x + nx * off, y: from.y + nz * off },
        { x: to.x + nx * off, y: to.y + nz * off },
        FIRST_ROAD_ART_STYLE.shoulderWidth,
        0.018,
        sageShoulderMat,
      );
      if (shoulder) shoulder.renderOrder = -2;
    }
    addRoadPlane(from, to, segmentWidth, 0.02, roadMat);
    const roadWash = addRoadPlane(from, to, segmentWidth * 0.96, 0.034, roadWashMat);
    if (roadWash) roadWash.renderOrder = -1;
    for (const off of [-(segmentWidth / 2 + 0.18), segmentWidth / 2 + 0.18]) {
      addRoadPlane(
        { x: from.x + nx * off, y: from.y + nz * off },
        { x: to.x + nx * off, y: to.y + nz * off },
        0.42,
        0.042,
        edgeMat,
      );
    }
    for (const off of [-1.65, 1.65]) {
      addRoadPlane(
        { x: from.x + nx * off, y: from.y + nz * off },
        { x: to.x + nx * off, y: to.y + nz * off },
        0.28,
        0.044,
        rutMat,
      );
    }
    addRoadPlane(from, to, 0.16, 0.045, centerMat);
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
  // Determinism: the golden-image capture (?visual) must always render a fresh
  // fixed scene — never read or write a persisted run.
  const visualCapture =
    typeof location !== "undefined" && new URLSearchParams(location.search).has("visual");
  // Ironman load-on-start: a "playing" run resumes in place; a "sealed" run shows
  // its summary over a fresh scene; no/corrupt save → fresh run.
  const loadedRun = visualCapture ? null : await loadRun();
  const resumeRun = loadedRun && loadedRun.mode === "playing" ? loadedRun : null;
  const loopState = createLoopStateMachine(resumeRun ? resumeRun.loopState : {});
  const objectiveRefs = createObjectiveDomRefs(document);
  const fieldMapRefs = createFieldMapDomRefs(document);
  const productionHudRefs = createProductionHudRefs(document);
  syncObjectiveDom(objectiveRefs, snapshot, loopState.state);
  syncFieldMapDom(fieldMapRefs, loopState.state);
  syncProductionHud(productionHudRefs, loopState.state);
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
  // Cool blue ambient floor — lifts the deepest shadows (left facades, near-field
  // ground) toward cool blue instead of crushed maroon, so the warm/cool read holds
  // even in the darkest corners of the frame.
  scene.add(new THREE.AmbientLight(col("#acbde6"), 0.52));
  // Continuous day/night: a slow world clock advances dayTime; sunArc(dayTime)
  // is the live palette so the sun arcs and colours drift. Opens at golden hour
  // and drifts into dusk as you play (readable first frame, moody payoff). The
  // golden-image gate loads ?visual to freeze everything time-animated (sun,
  // clouds, water, weather, film grain) for a stable pixelmatch baseline.
  const debugPlayerMarker =
    typeof location !== "undefined" && new URLSearchParams(location.search).has("debugPlayerMarker");
  const clock = createWorldClock({ dayTime: 0 }); // open at full daylight (de-orange anchor)
  if (visualCapture) pinClock(clock, "dusk");
  else if (resumeRun && Number.isFinite(resumeRun.world?.dayTime)) clock.dayTime = resumeRun.world.dayTime;

  // --- Ironman run persistence (frontier-ironman slot) ---
  const saveMgr = createSaveStateManager({ interval: 90 });
  let runMode = loadedRun && loadedRun.mode === "sealed" ? "sealed" : "playing";
  const runSeed = resumeRun && Number.isFinite(resumeRun.seed) ? resumeRun.seed : Date.now();
  let runElapsed = resumeRun && Number.isFinite(resumeRun.time) ? resumeRun.time : 0;
  const runStartedAt = resumeRun?.runStats?.startedAt ?? Date.now();

  // --- The RPG state tree (Tier A port: jobBoard / loot / progression / npcMemory).
  // One authoritative tree: resumed from the save's game slice when present,
  // else built fresh and reconciled against the saved loop phase (v1 saves).
  const game = resumeRun?.game ? hydrateGameState(resumeRun.game) : createGameState();
  reconcileWithLoopPhase(game, resumeRun?.loopState || {});
  // Loot rolls ride the run seed so a given run's drops are reproducible.
  const lootRng = makeRng((runSeed >>> 0) || 1);
  let appliedPalette = sunArc(clock.dayTime);
  atmosphere.applyPalette(appliedPalette);

  buildGround(scene, snapshot);
  const openingLightPools = createOpeningLightPools(snapshot);
  const roadDust = createRoadDust(snapshot);
  const routeSageField = createRouteSageField(snapshot);
  scene.add(openingLightPools.group);
  scene.add(roadDust.group);
  scene.add(routeSageField);
  createScatter(scene, { center: { x: 35, z: 13 }, area: 78, count: 850 });

  // Animated marsh water (replaces the flat plane that used to live in buildGround).
  const water = createWater({ width: 29, height: 6.2, skyTint: appliedPalette.sky.horizon });
  water.mesh.rotation.x = -Math.PI / 2;
  water.mesh.position.set(48, 0.05, 19);
  scene.add(water.mesh);

  const props = new THREE.Group();
  const heroMeshes = {};
  const placementNodes = [];
  const modelJobs = [];
  const modelLoadStatus = {};
  const recordModelLoad = (kind, url, loaded) => {
    const current = modelLoadStatus[kind] || { kind, url, loadedCount: 0, fallbackCount: 0, total: 0 };
    current.url = url || current.url;
    current.total += 1;
    if (loaded) current.loadedCount += 1;
    else current.fallbackCount += 1;
    modelLoadStatus[kind] = current;
  };
  for (const p of snapshot.worldObjects) {
    // Composed western buildings bypass the box .glb entirely — straight to the kit.
    if (WESTERN_SPECS[p.kind]) {
      const node = buildPlacement(props, p);
      if (node) placementNodes.push({ kind: p.kind, node });
      recordModelLoad(p.kind, "procedural:western", true);
      if (HERO_KINDS.includes(p.kind) && node) heroMeshes[p.kind] = node;
      continue;
    }
    const entry = modelFor(p.kind);
    if (entry) {
      // Authored .glb model for this kind; fall back to the procedural builder if
      // it fails to load so the scene is never missing a placement.
      const effScale = (entry.scale ?? 1) * (p.size ?? 1);
      // heightMul (manifest, optional) grows a model taller than wide — false-front
      // buildings read as tall without their footprint colliding with the road/camera.
      // Per-instance height + yaw jitter (deterministic from position) breaks the
      // stamped-clone roofline/grid so the street reads as a real built-up town. Only
      // height varies (not footprint) so nothing starts overlapping.
      const isBuilding = BUILDING_KINDS.has(p.kind);
      const hHash = isBuilding ? hashYaw(p.x * 1.7 + 3.1, p.y * 1.3 - 1.9) / (Math.PI * 2) : 0;
      let effScaleY = entry.heightMul ? effScale * entry.heightMul : null;
      if (isBuilding && effScaleY) effScaleY *= 0.86 + hHash * 0.3; // ±~15% roofline variance
      const yaw = (entry.yaw ?? 0) + (p.yaw ?? 0) + (entry.vary ? hashYaw(p.x, p.y) : 0)
        + (isBuilding ? (hashYaw(p.y + 5.0, p.x - 2.0) / (Math.PI * 2) - 0.5) * 0.1 : 0);
      modelJobs.push(
        instanceModel(entry.url, { x: p.x, z: p.y, y: groundHeight(p.x, p.y), yaw, scale: effScale, scaleY: effScaleY })
          .then((node) => {
            props.add(node);
            if (isBuilding) addWesternFacadeDetail(props, node, p);
            // Ground solid models with a contact shadow sized to their footprint —
            // kills the "floating" look. Skip flat cover + the distant boundary ring.
            if (isBuilding || GROUNDABLE_KINDS.has(p.kind)) {
              const bb = new THREE.Box3().setFromObject(node);
              const rx = Math.max(0.4, (bb.max.x - bb.min.x) * 0.46);
              const rz = Math.max(0.4, (bb.max.z - bb.min.z) * 0.46);
              addContactShadow(props, p.x, p.y, rx, rz);
            }
            placementNodes.push({ kind: p.kind, node });
            recordModelLoad(p.kind, entry.url, true);
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
            recordModelLoad(p.kind, entry.url, false);
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
  if (visualCapture) {
    // Golden-image capture: don't block boot on the full GLB stream — procedural
    // dress + hero shapes are enough for a stable baseline; models continue loading.
    scene.add(props);
    Promise.all(modelJobs).catch((err) => console.warn("[render3d] visual capture model stream", err));
  } else {
    await Promise.all(modelJobs);
    scene.add(props);
  }

  // Collect scene PointLights for per-lamp flicker. Each entry stores the light,
  // its nominal (base) intensity, and a position-derived phase seed so adjacent
  // lamps never pulse in unison. Very-bright arc lights (sun-disc, slime glow) are
  // excluded by the intensity ceiling; the golden-image capture skips this entirely
  // so the ?visual baseline stays deterministic.
  const lampFlickers = [];
  if (!visualCapture) {
    scene.traverse((obj) => {
      if (!obj.isPointLight || obj.intensity > 12) return;
      const seed = (obj.position.x * 7.31 + obj.position.z * 13.73) % (Math.PI * 2);
      lampFlickers.push({ light: obj, base: obj.intensity, seed });
    });
  }

  const objectiveGuidance = createObjectiveGuidance(snapshot);
  scene.add(objectiveGuidance.group);
  const pearlRoadCue = createPearlRoadCue(snapshot);
  const mapScrapReward = createMapScrapReward(snapshot);
  const boardReturnNotice = createBoardReturnNotice(snapshot);
  const slimeCombatCue = createSlimeCombatCue(snapshot);
  scene.add(pearlRoadCue.group);
  scene.add(mapScrapReward.group);
  scene.add(boardReturnNotice.group);
  scene.add(slimeCombatCue.group);

  // Ambient townsfolk — NPCs reusing the rig, wandering the town to bring the
  // street to life. Non-blocking fallback so a load failure never breaks the scene.
  let townsfolk = { update() {}, getInteractable: () => null, talk: () => null };
  if (!visualCapture) {
    try {
      townsfolk = await createTownsfolk(scene, { count: 5 });
    } catch (err) {
      console.warn("[render3d] townsfolk failed to load", err);
    }
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
        // Greeting memory rides the RPG tree so townsfolk remember the player
        // across saves (visit counts feed first-meeting vs returning lines).
        recordNpcGreeting(game, r.name.toLowerCase(), { at: runElapsed });
        onRunMutated();
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
    camera.fov = 53;
    // Third-person production frame: low enough to feel playable, close enough
    // for a strong back silhouette, and aimed past Boone's board so the street
    // reads as a destination instead of a tabletop.
    camera.position.set(5.08, 3.36, 13.42);
    camera.lookAt(15.55, 1.34, 5.08);
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
  // Atmosphere motion (art-direction pillar 5): one slow tumbleweed crossing
  // the road and distant circling birds. Pure dressing — null footprints (no
  // collision), hidden + held still whenever the world is frozen (?visual /
  // captureMode) so the golden baseline never sees them.
  const tumbleweed = (() => {
    const ball = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.34, 1),
      standard("#9a7b4f", { transparent: true, opacity: 0.92, rimStrength: 0.4 }),
    );
    ball.castShadow = true;
    const group = new THREE.Group();
    group.add(ball);
    scene.add(group);
    let x = 4;
    const step = (fdt, t) => {
      group.visible = fdt > 0;
      if (fdt <= 0) return;
      const speed = 1.7 + Math.sin(t * 0.43) * 0.5; // gusty drift
      x += speed * fdt;
      if (x > 74) x = 4; // loop the whole first road
      const z = 12.6 + Math.sin(x * 0.21) * 1.5; // weave across the lane
      const hop = Math.abs(Math.sin(x * 1.9)) * 0.16; // light bounce
      group.position.set(x, 0.34 + hop, z);
      ball.rotation.z -= (speed * fdt) / 0.34; // roll with travel
      ball.rotation.x = Math.sin(x * 0.7) * 0.3;
    };
    return { step };
  })();

  const circlingBirds = (() => {
    const group = new THREE.Group();
    const wings = [];
    for (let i = 0; i < 3; i++) {
      const bird = new THREE.Mesh(
        new THREE.PlaneGeometry(0.62, 0.2),
        standard("#1d1812", { rimStrength: 0, flatShading: true }),
      );
      bird.material.side = THREE.DoubleSide;
      group.add(bird);
      wings.push({ mesh: bird, phase: i * 2.1, radius: 6.4 + i * 1.3, alt: 11.4 + i * 0.8 });
    }
    scene.add(group);
    const step = (fdt, t) => {
      group.visible = fdt > 0;
      if (fdt <= 0) return;
      for (const w of wings) {
        const a = t * 0.14 + w.phase; // slow thermal circle over the mesa line
        w.mesh.position.set(33 + Math.cos(a) * w.radius, w.alt + Math.sin(t * 0.5 + w.phase) * 0.4, 2.5 + Math.sin(a) * w.radius * 0.55);
        w.mesh.rotation.set(0, -a, 0.3 + Math.sin(t * 7 + w.phase) * 0.35); // bank + wing-beat
      }
    };
    return { step };
  })();

  const stepWorld = (dt) => {
    const frozen = visualCapture || _devCaptureFrozen;
    const fdt = frozen ? 0 : dt;
    tumbleweed.step(fdt, waterTime);
    circlingBirds.step(fdt, waterTime);
    tickClock(clock, fdt);
    applyDayTime();
    atmosphere.driftClouds(fdt, 1 + weather.wind * 2);
    waterTime += fdt;
    water.uniforms.time.value = waterTime;
    // Lamp flicker — gentle per-lamp intensity pulse; seeds keep adjacent lamps
    // out of phase. Skipped when frozen (captureMode / visualCapture sets fdt=0).
    if (fdt > 0 && lampFlickers.length) {
      for (const lf of lampFlickers) {
        lf.light.intensity = lf.base * (0.92 + 0.08 * Math.sin(waterTime * 3.2 + lf.seed));
      }
    }
    water.uniforms.skyTint.value.set(appliedPalette.sky.horizon);
    const { flash } = weatherSys.update(weather, fdt, {
      frozen,
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

  // Procedural audio layer (roadmap T2b). Never constructed under ?visual —
  // the golden-image capture must stay byte-deterministic and gesture-free.
  // unlock() must run inside a user gesture (autoplay policy); the first
  // pointer/key interaction arms it, and unlocking plays the spawn sting.
  const audioView = visualCapture ? null : createAudioView();
  if (audioView) {
    const unlockAudio = () => {
      audioView.unlock();
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
    window.addEventListener("pointerdown", unlockAudio);
    window.addEventListener("keydown", unlockAudio);
    window.addEventListener("keydown", (e) => {
      if (e.code === "KeyM") audioView.setMuted(!audioView.muted);
    });
  }

  // Title screen: Ride dismisses it, which unlocks audio (the click is the
  // gesture — the harmonica sting lands right on the reveal), grabs pointer
  // lock, and releases the establishing push-in (held while titleOpen).
  const titleScreen = document.getElementById("title-screen");
  let titleOpen = false;
  if (titleScreen) {
    if (visualCapture) {
      titleScreen.remove(); // golden baseline must never see the overlay
    } else {
      titleOpen = true;
      const startButton = titleScreen.querySelector("#title-start");
      startButton?.addEventListener("click", () => {
        titleOpen = false;
        titleScreen.classList.add("dismissed");
        setTimeout(() => titleScreen.remove(), 1000); // matches the CSS fade
        const canvasEl = document.getElementById("scene");
        if (canvasEl?.requestPointerLock) {
          try {
            const req = canvasEl.requestPointerLock();
            if (req && typeof req.catch === "function") req.catch(() => {});
          } catch { /* pointer lock denied — drag-look fallback still works */ }
        }
      });
    }
  }

  // Third-person: a visible rigged character the follow-cam tracks. The
  // controller stands it at the player's feet facing the heading; the loop
  // crossfades its Idle/Walk clips by movement. Falls back to the procedural
  // placeholder if the glTF fails to load. Golden-image capture skips the
  // hero glTF await so boot + __spikeReady aren't blocked on network loads.
  let character;
  let playerModelLoaded = false;
  if (visualCapture) {
    character = createPlaceholderCharacter();
  } else {
    try {
      character = await createAnimatedCharacter(PLAYER_MODEL_URL);
      playerModelLoaded = true;
    } catch (err) {
      console.warn("[render3d] hero character failed, trying base character", err);
      try {
        character = await createAnimatedCharacter("/models/character.glb");
      } catch (fallbackErr) {
        console.warn("[render3d] animated character failed, using placeholder", fallbackErr);
        character = createPlaceholderCharacter();
      }
    }
  }
  character.group.scale.setScalar(playerModelLoaded ? 1.18 : 1.04);
  character.modelUrl = playerModelLoaded ? PLAYER_MODEL_URL : "/models/character.glb";
  const playerReadability = createPlayerReadabilityRig();
  character.group.add(playerReadability.group);
  setPlayerMarkerVisibility(playerReadability, debugPlayerMarker && !visualCapture);
  scene.add(character.group);
  const heroSilhouetteAccent = createHeroSilhouetteAccent();
  scene.add(heroSilhouetteAccent.group);
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
    camera.fov = CAMERA_PRESETS.shoulder.fov; // match the gameplay preset — no first-frame pop
    camera.updateProjectionMatrix();
  }
  const player = createPlayerController(camera, {
    canvas,
    thirdPerson: true,
    character: character.group,
    cameraPreset: "shoulder",
    resetYaw: -0.9,
  });
  player.resetCameraBehind(-0.9);
  // Dev inspection hook (spike route only): teleport the player/camera to any world
  // point or named route waypoint so the whole loop can be reviewed without driving.
  // Harmless in prod (the spike is a dev route); no effect unless called.

  // Live-tuning harness state. _devCaptureFrozen freezes the world clock + weather
  // without touching visualCapture (which also pins the palette to dusk + hero cam).
  let _devCaptureFrozen = false;

  // Shallow-recursing object merge for palette overrides — used by __spike.setPalette.
  const _deepMerge = (target, source) => {
    const out = { ...target };
    for (const k of Object.keys(source ?? {})) {
      out[k] =
        source[k] !== null && typeof source[k] === "object" && !Array.isArray(source[k])
          ? _deepMerge(target[k] ?? {}, source[k])
          : source[k];
    }
    return out;
  };

  if (typeof window !== "undefined") {
    // Perf probe for the visual-upgrade stages: draw calls / triangles straight
    // from renderer.info, plus a scene walk for shadow-caster count.
    window.__westward3dStats = () => {
      let casters = 0;
      let meshes = 0;
      scene.traverse((o) => {
        if (o.isMesh) {
          meshes += 1;
          if (o.castShadow) casters += 1;
        }
      });
      return {
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        meshes,
        shadowCasters: casters,
        backend,
      };
    };
    window.__spike = {
      // --- Navigation (existing) ---
      setPos: (x, y) => { player.setPosition({ x, z: y }); return player.position; },
      pos: () => player.position,
      goto: (kind) => {
        const wp = FIRST_FIVE_ROUTE.find((p) => p.kind === kind);
        if (wp) player.setPosition({ x: wp.x, z: wp.y });
        return wp || null;
      },
      waypoints: () => FIRST_FIVE_ROUTE.map((p) => p.kind),

      // --- Live visual tuning — apply instantly, no reload ---

      // Deep-merge palette overrides into the active palette and reapply.
      // Example: __spike.setPalette({ grade: { shadowTint: '#0d1f3c', splitStrength: 0.48 } })
      // Example: __spike.setPalette({ bloom: 0.5 })
      setPalette(overrides) {
        const merged = _deepMerge(appliedPalette, overrides);
        appliedPalette = merged;
        atmosphere.applyPalette(merged);
        applyPostPalette(merged);
        console.log("[__spike] palette applied", JSON.stringify(merged, null, 2));
      },

      // Tune individual lights directly.
      // __spike.setLight('sun',  { intensity: 2.5, color: '#ffb060' })
      // __spike.setLight('hemi', { sky: '#9fb4d8', ground: '#41475c', intensity: 1.1 })
      // __spike.setLight('fill', { intensity: 0.4, color: '#d0e8ff' })
      // __spike.setLight('rim',  { intensity: 0.6, color: '#b0c8ff' })
      setLight(which, params) {
        const map = {
          sun:  atmosphere.sun,
          hemi: atmosphere.hemi,
          fill: atmosphere.fill,
          rim:  atmosphere.rim,
        };
        const light = map[which];
        if (!light) {
          console.warn("[__spike] unknown light:", which, "— valid:", Object.keys(map).join(", "));
          return;
        }
        if (params.intensity !== undefined) light.intensity = params.intensity;
        if (params.color)    light.color.set(params.color);
        if (which === "hemi") {
          if (params.sky)    light.color.set(params.sky);
          if (params.ground) light.groundColor.set(params.ground);
        }
        console.log("[__spike] light updated", which, params);
      },

      // Adjust the follow camera (settles smoothly via the existing lerp).
      // __spike.setCamera({ distance: 6.5, height: 3.2, lookHeight: 1.7, fov: 58 })
      setCamera(params) {
        player.setCameraPreset("shoulder", params);
        console.log("[__spike] camera preset updated", params);
      },

      // Print all current visual params as JSON — copy-paste into timeOfDay.js to persist.
      dumpLook() {
        const p = appliedPalette;
        const out = JSON.stringify(
          {
            grade:    p?.grade,
            bloom:    p?.bloom,
            exposure: p?.exposure,
            hemi:     p?.hemi,
            sun: { color: p?.sun?.color, intensity: p?.sun?.intensity, dir: p?.sun?.dir },
            fog:      p?.fog,
          },
          null,
          2,
        );
        console.log("[__spike] dumpLook:\n" + out);
        return out;
      },

      // Freeze the spawn push-in + world clock + weather for deterministic screenshots.
      // Undo: hard-reload via  location.href = location.href + '?n=' + Date.now()
      captureMode() {
        _devCaptureFrozen = true;
        camIntroSettled = true;          // skip the establishing push-in immediately
        console.log(
          "[__spike] captureMode ON — push-in frozen, clock paused, weather frozen. Hard-reload to restore.",
        );
      },

      // Resolves after `ms` ms — wait for the renderer to settle before screenshotting.
      // Usage (async context): await __spike.settle(200)
      settle(ms = 200) {
        return new Promise((resolve) => setTimeout(resolve, ms));
      },
    };
  }
  // Ironman resume: restore saved player position + heading (best-effort).
  if (resumeRun && Number.isFinite(resumeRun.player?.x) && Number.isFinite(resumeRun.player?.z)) {
    player.setPosition({ x: resumeRun.player.x, z: resumeRun.player.z });
    if (Number.isFinite(resumeRun.player?.yaw)) player.resetCameraBehind(resumeRun.player.yaw);
  }
  const proxies = buildProxies(snapshot.worldObjects);
  const promptEl = document.getElementById("prompt");
  const beatToast = createBeatToast(document);
  let currentPromptText = "";
  const setPromptText = (t) => {
    currentPromptText = t || "";
    if (!promptEl) return;
    if (promptEl.textContent !== t) promptEl.textContent = t;
    promptEl.hidden = !t;
  };
  let encounter = null;
  const interaction = createInteractionSystem({
    worldObjects: snapshot.worldObjects,
    setPromptText,
    isTargetEnabled: (target) => loopState.isTargetEnabled(target),
    getPromptText: (target) => {
      const prompt = loopState.getPromptForTarget(target);
      if (target?.kind !== "roadSlime" || loopState.phase !== "slime_fight" || !encounter) return prompt;
      const state = encounter.getState(player.position);
      return `${prompt} · ${state.hitCount}/${state.maxHp} hits`;
    },
  });
  const boardModal = document.getElementById("board-modal");
  const boardAccept = document.getElementById("board-accept");
  const boardOptionButtons = Array.from(document.querySelectorAll("[data-option]:not(#board-accept)"));
  const boardClose = document.getElementById("board-close");
  const boardDomRefs = createBoardDomRefs(document);
  // Repaint the modal from the live RPG tree every time it opens: real job copy
  // + pinned listings + Boone's memory-aware line (first-meeting → completed-job
  // reaction → quiet). Recording the greeting AFTER the paint is deliberate —
  // the first open still gets the introduction; later opens go quiet.
  const refreshBoardModal = () => {
    syncBoardDom(boardDomRefs, buildBoardView(game));
    recordNpcGreeting(game, "warden", { at: runElapsed });
  };
  const labelForBoardOption = (optionId) =>
    BOARD_OPTIONS.find((option) => option.id === optionId)?.label || "Accept bounty";
  const syncLiveFieldMap = () => syncFieldMapDom(fieldMapRefs, loopState.state, { playerPosition: player.position });
  syncLiveFieldMap();

  const refreshLoopDom = () => {
    const state = loopState.state;
    publishLoopDebug(state);
    syncObjectiveDom(objectiveRefs, snapshot, state);
    syncLiveFieldMap();
    syncProductionHud(productionHudRefs, state, encounter?.getState?.(player.position) || null);
    interaction.update(player.position);
  };

  const advance = (event) => {
    audioView?.onLoopEvent(event); // beat sfx ride the same transition funnel
    const state = loopState.transition(event);
    publishLoopDebug(state);
    syncObjectiveDom(objectiveRefs, snapshot, state);
    syncLiveFieldMap();
    syncProductionHud(productionHudRefs, state, encounter?.getState?.(player.position) || null);
    interaction.update(player.position);
    onRunMutated(); // on-event ironman save (milestone transitions are rare)
    return state;
  };

  const boardModalController = createBoardModalController({
    modal: boardModal,
    acceptButton: boardAccept,
    optionButtons: boardOptionButtons,
    closeButton: boardClose,
    setPromptText,
    onOpen: refreshBoardModal,
    onAccept: () => {
      const taken = acceptStarterJob(game, { time: runElapsed });
      advance({ type: "choose_board", optionId: "accept_bounty" });
      markJobBoardAccepted(heroMeshes.jobBoard);
      syncPlayerHud();
      beatToast.show(
        taken.ok ? `Bounty Taken: ${taken.job?.title || "Marsh Slime Bounty"}` : "Road Job Marked",
        "Boone chalks the cache road and points you east.",
      );
    },
    onChoose: (optionId) => {
      acceptStarterJob(game, { time: runElapsed }); // every board choice takes the starter bounty
      advance({ type: "choose_board", optionId });
      markJobBoardAccepted(heroMeshes.jobBoard);
      syncPlayerHud();
      beatToast.show("Road Job Marked", `${labelForBoardOption(optionId)} changes Boone's cache note.`);
    },
    onClose: refreshLoopDom,
  });

  encounter = createEncounterSystem(scene, snapshot, {
    slimeMesh: heroMeshes.roadSlime,
    maxHits: 3,
    initialPlayerHp: resumeRun?.loopState?.encounterState?.playerHp ?? 40,
    canDamagePlayer: () => loopState.phase === "slime_fight",
    playerInvulnerable: () => player.isInvulnerable,
    onPlayerDeath: () => sealCurrentRun("slain by the roadside slime"),
    getPhase: () => loopState.phase,
    onSlimeEngage: () => {
      if (loopState.phase !== "slime_tell") return false;
      advance("slime_appeared");
      return true;
    },
    onSlimeHit: ({ hp, maxHits, defeated }) => {
      if (loopState.phase !== "slime_fight") return;
      // One clean strike = one slime of the cluster felled — feeds the real
      // bounty ledger (3 kills completes Marsh Slime Bounty).
      recordSlimeKill(game);
      syncPlayerHud();
      onRunMutated(); // kills must persist per-strike (quit mid-fight keeps them)
      if (defeated) return;
      setPromptText(`E — Strike Road Slime · ${maxHits - hp}/${maxHits} hits`);
      syncProductionHud(productionHudRefs, loopState.state, { hp, maxHp: maxHits, hitCount: maxHits - hp, defeated });
    },
    onSlimeDeath: () => {
      if (loopState.phase !== "slime_fight") return;
      const gib = lootBeat(game, { source: "slime", rng: lootRng });
      syncPlayerHud();
      advance("defeat_slime");
      beatToast.show("Road Slime Down", gib.drop.summary);
    },
  });
  syncProductionHud(productionHudRefs, loopState.state, encounter.getState(player.position));

  // --- Real-time combat systems (all gated behind !visualCapture in loop()) ---
  const playerCombat = createPlayerCombat();
  const hitStop = createHitStop();
  const camShake = createCameraShake();
  const burst = createBurstPool(scene, { count: 28 });
  let slimeAI = heroMeshes.roadSlime
    ? createSlimeState({ x: heroMeshes.roadSlime.position.x, z: heroMeshes.roadSlime.position.z })
    : null;
  let comboCount = 0;
  let comboTimer = 0;
  let hitmarkerT = 0;

  // Swing: left-click or E during the slime fight. Plays an attack/draw clip if the
  // rig has one (no-op otherwise — the swing is procedural via the state machine).
  function trySwing() {
    if (visualCapture || loopState.phase !== "slime_fight") return;
    if (playerCombat.tryAttack()) {
      character.playOnce?.("attack");
      character.playOnce?.("draw");
    }
  }
  if (typeof window !== "undefined") {
    window.addEventListener("keydown", (e) => { if (e.code === "KeyE") trySwing(); });
    canvas?.addEventListener?.("mousedown", (e) => { if (e.button === 0) trySwing(); });
  }

  // Telegraph tell: bulge the slime's footprint as it winds up the lunge.
  function applySlimeTelegraph(mesh, mode, telegraphT, t = 0) {
    if (!mesh?.scale) return;
    if (mesh.userData.slimeBaseXZ == null) mesh.userData.slimeBaseXZ = mesh.scale.x;
    if (mesh.userData.slimeBaseY == null) mesh.userData.slimeBaseY = mesh.scale.y;
    const base = mesh.userData.slimeBaseXZ || 1;
    // Gooey breathing while it isn't winding up: spread on XZ with a counter-
    // squash on Y so the volume reads constant (roadmap first-10-minutes polish).
    const breath = mode === "telegraph" ? 0 : Math.sin(t * 2.6) * 0.05;
    const k = (mode === "telegraph" ? 1 + telegraphT * 0.35 : 1) + breath;
    mesh.scale.x = base * k;
    mesh.scale.z = base * k;
    mesh.scale.y = (mesh.userData.slimeBaseY || 1) * (1 - breath * 0.8);
  }

  function applyCameraShakeOffset(off) {
    if (!off || off.trauma <= 0) return;
    camera.position.x += off.x;
    camera.position.y += off.y;
    camera.position.z += off.z;
    if (camera.rotation) camera.rotation.y += off.yaw;
  }

  // --- Combat HUD ---
  const hpFillEl = document.querySelector("#hero-panel .hp-fill");
  const hpLabelEl = document.querySelector("#hero-panel .hp-label");
  // Real player HUD: level / gold / xp from the RPG state tree (no more
  // hardcoded "Level 3"). Also refreshes the live job ledger view that
  // syncProductionHud prefers over its phase-derived fallback.
  const heroSubEl = document.querySelector("#hero-panel .hero-sub");
  const goldValueEl = document.querySelector("#hero-panel .gold-value");
  const xpValueEl = document.querySelector("#hero-panel .xp-value");
  const xpFillEl = document.querySelector("#hero-panel .xp-fill");
  function syncPlayerHud() {
    const view = playerHudView(game);
    if (heroSubEl) heroSubEl.textContent = view.subtitle;
    if (goldValueEl) goldValueEl.textContent = `${view.gold}g`;
    if (xpValueEl) xpValueEl.textContent = `XP ${view.xp}/${view.nextXp}`;
    if (xpFillEl) xpFillEl.style.width = `${(view.xpRatio * 100).toFixed(1)}%`;
    liveJobView = activeJobLine(game);
  }
  syncPlayerHud();
  function updateHpHud(st) {
    if (!st || !Number.isFinite(st.playerHp)) return;
    const max = st.playerMaxHp || 40;
    const pct = Math.max(0, Math.min(1, st.playerHp / max));
    if (hpFillEl) hpFillEl.style.width = `${(pct * 100).toFixed(1)}%`;
    if (hpLabelEl) {
      const v = hpLabelEl.querySelector("span:last-child");
      if (v) v.textContent = `${Math.ceil(st.playerHp)} / ${max}`;
    }
  }
  function updateComboHud(n) {
    const el = document.getElementById("combo-count");
    if (!el) return;
    el.textContent = n > 1 ? `${n} HIT` : "";
    el.hidden = n < 2;
  }
  function pulseHitmarker() {
    const el = document.getElementById("hitmarker");
    if (el) { el.hidden = false; hitmarkerT = 0.12; }
  }
  const dmgPool = [];
  function spawnDamageNumber(worldPos, text) {
    const layer = document.getElementById("damage-numbers");
    if (!layer) return;
    let el = dmgPool.find((d) => d.life <= 0);
    if (!el) {
      const span = document.createElement("span");
      span.className = "dmg-num";
      layer.appendChild(span);
      el = { span, life: 0, wx: 0, wy: 0, wz: 0 };
      dmgPool.push(el);
    }
    el.span.textContent = text;
    el.life = 0.9;
    el.wx = worldPos.x;
    el.wy = 1.4;
    el.wz = worldPos.z;
    el.span.hidden = false;
  }
  const _dmgTmp = new THREE.Vector3();
  function updateDamageNumbers(dt) {
    for (const d of dmgPool) {
      if (d.life <= 0) continue;
      d.life -= dt;
      if (d.life <= 0) { d.span.hidden = true; continue; }
      _dmgTmp.set(d.wx, d.wy + (0.9 - d.life) * 0.8, d.wz).project(camera);
      d.span.style.left = `${(_dmgTmp.x * 0.5 + 0.5) * 100}%`;
      d.span.style.top = `${(-_dmgTmp.y * 0.5 + 0.5) * 100}%`;
      d.span.style.opacity = `${Math.max(0, d.life / 0.9)}`;
    }
    if (hitmarkerT > 0) {
      hitmarkerT -= dt;
      if (hitmarkerT <= 0) { const el = document.getElementById("hitmarker"); if (el) el.hidden = true; }
    }
  }
  function postHitPulse() {
    const u = postUniforms?.exposure;
    if (!u || !Number.isFinite(u.value)) return;
    const base = u.value;
    u.value = base * 1.35;
    setTimeout(() => { u.value = base; }, 90);
  }

  let beatFocusTimer = 0;
  const focusBeat = (preset = "inspection", seconds = 0.9) => {
    beatFocusTimer = Math.max(beatFocusTimer, seconds);
    player.setCameraPreset(preset);
  };
  // The preset the camera rests at when no beat focus is running: tight combat
  // framing while the slime encounter is live, over-the-shoulder otherwise.
  const restingPreset = () => (loopState.phase === "slime_fight" ? "combat" : "shoulder");

  const handleJobBoard = () => {
    focusBeat(loopState.phase === "return_to_boone" ? "objective" : "inspection", 1.0);
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
      markJobBoardAccepted(heroMeshes.jobBoard);
      const paid = claimBoardReward(game, { at: runElapsed });
      syncPlayerHud();
      onRunMutated(); // payout landed after advance()'s save — persist it
      if (paid.ok && paid.reward) {
        const r = paid.reward;
        // Boone speaks his memory-aware turn-in line (npcMemory completed-job
        // reaction) + the Old Road Survey hook — the same copy the board modal
        // builds, so the spoken turn-in can't drift from the board state.
        const view = buildBoardView(game);
        const booneSays = view.booneLine ? view.booneLine.replace(/^Marshal Boone:\s*/, "") : "";
        const survey = view.bodyLines.find((line) => line.includes("Old Road Survey"))
          || "Boone pins your Map Scrap beside the next job.";
        const body = paid.levelsGained > 0
          ? `LEVEL UP — you reached level ${game.player.level}. ${booneSays || survey}`
          : booneSays
            ? `${booneSays} ${survey}`
            : survey;
        beatToast.show(`Bounty Paid: +${r.gold || 0}g, +${r.xp || 0} XP`, body);
        if (paid.levelsGained > 0) audioView?.play("chime");
      } else {
        beatToast.show("Old Road Survey", "Boone pins your Map Scrap beside the next job.");
      }
      return;
    }
    if (loopState.phase === "survey_teaser") {
      syncObjectiveDom(objectiveRefs, snapshot, {
        ...loopState.state,
        objectiveText: "Old Road Survey is ready. This is tomorrow's next playable job.",
      });
      syncLiveFieldMap();
      beatToast.show("Next Job Teased", "The old road is marked and waiting past the wagon wreck.");
    }
  };
  const handleRoadSign = () => {
    if (loopState.phase !== "road_sign") return;
    focusBeat("inspection", 0.75);
    advance("read_sign");
    beatToast.show("Marshal Road", "The sign bends the route toward Smoke Cache.");
  };
  const handleTownBark = () => {
    if (loopState.phase !== "road_walk") return;
    focusBeat("objective", 0.9);
    advance("hear_bark");
    npcSpeechMsg = "Pearl: \"Road's quiet when it wants you close. Watch the marsh grass.\"";
    npcSpeechT = 3.5;
    setPromptText(npcSpeechMsg);
    beatToast.show("Pearl's Warning", "Pearl points you down-road toward the cache smoke.");
  };
  const handleSmokeCache = () => {
    if (loopState.phase !== "cache_clue") return;
    focusBeat("inspection", 0.9);
    advance("open_cache");
    const found = lootBeat(game, { source: "cache", rng: lootRng });
    syncPlayerHud();
    onRunMutated(); // loot landed after advance()'s save — persist it
    audioView?.play("chime");
    beatToast.show("Cache Opened", found.drop.summary);
  };
  const handleSlimeTell = () => {
    if (loopState.phase !== "slime_tell") return;
    focusBeat("objective", 0.8);
    encounter.engage();
    if (loopState.phase === "slime_tell") advance("spot_slime_tell");
    beatToast.show("Ambush", "The marsh trail shivers. Strike the Road Slime.");
  };
  const handleRoadSlime = () => {
    if (loopState.phase !== "slime_fight") return;
    if (encounter.strike(player.position)) {
      const state = encounter.getState(player.position);
      focusBeat(state.defeated ? "objective" : "inspection", state.defeated ? 0.8 : 0.45);
      if (!state.defeated) {
        // Death toast (with the gib loot summary) comes from onSlimeDeath.
        beatToast.show("Road Slime Hit", `${state.hitCount}/${state.maxHp} strikes landed. Keep it pinned.`);
      }
      syncLiveFieldMap();
      interaction.update(player.position);
    }
  };
  const handleBrokenWagon = () => {
    if (loopState.phase !== "wagon_salvage") return;
    focusBeat("inspection", 0.95);
    advance("inspect_wagon");
    const salvage = lootBeat(game, { source: "wagon", rng: lootRng });
    syncPlayerHud();
    onRunMutated(); // loot landed after advance()'s save — persist it
    beatToast.show("Map Scrap Found", `+ Map Scrap. ${salvage.drop.summary}`);
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
  const animateBeatPayoffs = (t) => {
    const state = loopState.state;
    const showMapScrap = ["return_to_boone", "survey_teaser"].includes(state.phase) || state.routeBeats.wagonSalvage;
    const showBoardNotice = state.phase === "survey_teaser" || state.routeBeats.returnToBoone;
    const showPearlCue = state.phase === "road_walk" || state.phase === "cache_clue";
    const slimeCueMode = state.phase === "slime_fight"
      ? "combat"
      : state.routeBeats.slimeDefeated
        ? "defeated"
        : "hidden";
    pearlRoadCue.update(t, showPearlCue);
    mapScrapReward.update(t, showMapScrap);
    boardReturnNotice.update(t, showBoardNotice);
    slimeCombatCue.update(t, slimeCueMode);
    if (heroMeshes.slimeTell?.visible) {
      const pulse = 1 + Math.sin(t * 4.6) * 0.045;
      heroMeshes.slimeTell.scale.setScalar(pulse);
      heroMeshes.slimeTell.traverse?.((obj) => {
        if (obj.material && "emissiveIntensity" in obj.material) {
          obj.material.emissiveIntensity = 0.55 + Math.max(0, Math.sin(t * 5.2)) * 0.5;
        }
      });
    }
  };
  updateBeatVisibility();

  if (import.meta.env.DEV && typeof window !== "undefined") {
    const phaseAdvanceEvents = {
      spawn: "board_reached",
      board_choice: { type: "choose_board", optionId: "accept_bounty" },
      road_sign: "read_sign",
      road_walk: "hear_bark",
      cache_clue: "open_cache",
      slime_tell: "spot_slime_tell",
      slime_fight: "defeat_slime",
      wagon_salvage: "inspect_wagon",
      return_to_boone: "report_to_boone",
    };
    const movePlayerToKind = (kind) => {
      const target = snapshot.worldObjects.find((obj) => obj.kind === kind);
      if (!target || !player.setPosition) return null;
      const x = target.x - 1.35;
      const z = target.y;
      player.setPosition({ x, z });
      refreshLoopDom();
      interaction.update(player.position);
      return player.position;
    };
    const driveToPhase = (phase) => {
      const targetIndex = LOOP_PHASES.indexOf(phase);
      if (targetIndex < 0) return loopState.state;
      let guard = LOOP_PHASES.length;
      while (LOOP_PHASES.indexOf(loopState.phase) < targetIndex && guard > 0) {
        if (loopState.phase === "slime_fight") {
          movePlayerToKind("roadSlime");
          let strikeGuard = 5;
          while (!encounter.getState(player.position).defeated && strikeGuard > 0) {
            encounter.strike(player.position);
            strikeGuard--;
          }
          guard--;
          continue;
        }
        const event = phaseAdvanceEvents[loopState.phase];
        if (!event) break;
        advance(event);
        guard--;
      }
      return loopState.state;
    };
    const getCompositionMetrics = () => createCompositionMetrics({
      heroMeshes,
      placementNodes,
      character,
      camera,
      player,
      extras: {
        mapScrap: mapScrapReward.group,
        pearlCue: pearlRoadCue.group,
        boardNotice: boardReturnNotice.group,
      },
    });
    const getArtDirectionMetrics = () => createArtDirectionMetrics({
      heroMeshes,
      placementNodes,
      character,
      camera,
      player,
      snapshot,
    });
    const getTownDensityMetrics = () => createTownDensityMetrics({
      placementNodes,
      camera,
      snapshot,
    });
    const getProductionFrameMetrics = () => createProductionFrameMetrics({
      heroMeshes,
      placementNodes,
      character,
      camera,
      player,
      snapshot,
    });
    const getModelReadability = () => createModelReadability({ modelLoadStatus, character });
    const getLightingMetrics = () => {
      const metrics = {
        pointLights: 0,
        directionalLights: 0,
        hemisphereLights: 0,
        maxPointIntensity: 0,
        maxLightIntensity: 0,
        exposure: Number((postUniforms.exposure.value ?? 1).toFixed(3)),
        palette: appliedPalette?.key || "unknown",
        bloom: Number((appliedPalette?.bloom ?? 0).toFixed(3)),
      };
      scene.traverse((obj) => {
        if (!obj?.isLight) return;
        metrics.maxLightIntensity = Math.max(metrics.maxLightIntensity, obj.intensity || 0);
        if (obj.isPointLight) {
          metrics.pointLights++;
          metrics.maxPointIntensity = Math.max(metrics.maxPointIntensity, obj.intensity || 0);
        }
        if (obj.isDirectionalLight) metrics.directionalLights++;
        if (obj.isHemisphereLight) metrics.hemisphereLights++;
      });
      metrics.maxPointIntensity = Number(metrics.maxPointIntensity.toFixed(2));
      metrics.maxLightIntensity = Number(metrics.maxLightIntensity.toFixed(2));
      return metrics;
    };
    const getBeatVisibility = () => {
      updateBeatVisibility();
      animateBeatPayoffs(performance.now() / 1000);
      return {
        slimeTellVisible: Boolean(heroMeshes.slimeTell?.visible),
        roadSlimeVisible: Boolean(heroMeshes.roadSlime?.visible),
        mapScrapVisible: Boolean(mapScrapReward.group.visible),
        pearlCueVisible: Boolean(pearlRoadCue.group.visible),
        boardNoticeVisible: Boolean(boardReturnNotice.group.visible),
        slimeCombatCueVisible: Boolean(slimeCombatCue.group.visible),
        heroVisibility: getHeroVisibility(heroMeshes, camera),
      };
    };
    const captureRouteFrame = (phase) => {
      const state = driveToPhase(phase);
      updateBeatVisibility();
      animateBeatPayoffs(performance.now() / 1000);
      movePlayerToKind(state.activeTargetKind);
      player.resetCameraBehind?.(-Math.PI / 2);
      player.setCameraPreset(phase === "slime_fight" ? "objective" : "inspection");
      for (let i = 0; i < 18; i++) player.update(0.016, proxies);
      const target = placementByKind(snapshot, state.activeTargetKind);
      if (target) {
        camera.position.set(player.position.x - 4.8, 4.15, player.position.z + 5.35);
        camera.lookAt(target.x, 1.35, target.y);
      }
      camera.updateMatrixWorld();
      return {
        phase: loopState.phase,
        targetKind: loopState.state.activeTargetKind,
        fieldMap: buildFieldMapRouteModel(loopState.state, { playerPosition: player.position }),
        encounter: encounter.getState(player.position),
        composition: getCompositionMetrics(),
        artDirection: getArtDirectionMetrics(),
        productionFrame: getProductionFrameMetrics(),
        townDensity: getTownDensityMetrics(),
        hudFantasy: getHudFantasyMetrics(document),
        modelReadability: getModelReadability(),
        beatVisibility: getBeatVisibility(),
        cameraPose: {
          x: Number(camera.position.x.toFixed(2)),
          y: Number(camera.position.y.toFixed(2)),
          z: Number(camera.position.z.toFixed(2)),
          fov: Number(camera.fov.toFixed(1)),
        },
      };
    };
    window.__westward3dTest = {
      getLoopState: () => loopState.state,
      getGameState: () => JSON.parse(JSON.stringify(buildGameSaveSlice(game))),
      getPlayerPosition: () => player.position,
      movePlayerToKind,
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
      getEncounterState: () => encounter.getState(player.position),
      getRouteMetrics: () => ({
        ...getRouteMetrics(snapshot.worldObjects),
        phase: loopState.phase,
        routeBeats: loopState.state.routeBeats,
        boardChoice: loopState.state.boardChoice,
      }),
      getHeroVisibility: () => getHeroVisibility(heroMeshes, camera),
      getPlayerVisibility: () => getHeroVisibility({ player: character.group }, camera).player,
      getCompositionMetrics,
      getArtDirectionMetrics,
      getProductionFrameMetrics,
      getHudFantasyMetrics: () => getHudFantasyMetrics(document),
      getTownDensityMetrics,
      getModelReadability,
      getLightingMetrics,
      getBeatVisibility,
      getBeatFeedback: () => beatToast.getState(),
      getFieldMapState: () => buildFieldMapRouteModel(loopState.state, { playerPosition: player.position }),
      captureRouteFrame,
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

  // --- Ironman run helpers (hoisted; read player/encounter/clock at runtime) ---
  function currentRunPayload(overrides = {}) {
    const snap = loopState.state;
    const livePlayerHp = encounter?.getState?.()?.playerHp;
    const encounterState = Number.isFinite(livePlayerHp)
      ? { ...snap.encounterState, playerHp: livePlayerHp }
      : { ...snap.encounterState };
    const pos = player?.position || { x: 0, z: 0 };
    return buildRunPayload({
      mode: runMode,
      seed: runSeed,
      time: runElapsed,
      player: { x: pos.x, z: pos.z, yaw: Number.isFinite(player?.yaw) ? player.yaw : 0 },
      loopState: { ...snap, encounterState },
      world: { dayTime: clock.dayTime, weatherKind: snapshot.weather?.kind || "clear" },
      runStats: { startedAt: runStartedAt, phaseReached: snap.phase },
      game: buildGameSaveSlice(game),
      ...overrides,
    });
  }
  function persistRun() {
    if (visualCapture || runMode !== "playing") return;
    writeRun(currentRunPayload())
      .then(() => saveMgr.onSaveSuccess())
      .catch((err) => { if (import.meta.env?.DEV) console.warn("[render3d] run save failed", err); });
  }
  function onRunMutated() {
    if (visualCapture || runMode !== "playing") return;
    saveMgr.markDirty();
    persistRun();
  }
  function sealCurrentRun(cause) {
    if (visualCapture || runMode !== "playing") return;
    runMode = "sealed";
    sealRun(currentRunPayload({ mode: "sealed" }), cause)
      .catch((err) => { if (import.meta.env?.DEV) console.warn("[render3d] seal failed", err); });
    showRunSummary({ cause, phaseReached: loopState.phase, time: runElapsed });
  }
  function prettyPhase(phase) {
    return String(phase || "spawn").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  function formatRunDuration(seconds) {
    const s = Math.max(0, Math.floor(seconds || 0));
    return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
  }
  function showRunSummary(info) {
    const el = document.getElementById("run-summary");
    if (!el) return;
    const causeEl = el.querySelector(".run-summary-cause");
    if (causeEl) {
      const c = info.cause || "Your run has ended.";
      causeEl.textContent = c.charAt(0).toUpperCase() + c.slice(1);
    }
    const statsEl = el.querySelector(".run-summary-stats");
    if (statsEl) {
      while (statsEl.firstChild) statsEl.removeChild(statsEl.firstChild);
      const lines = [
        `Reached: ${prettyPhase(info.phaseReached)}`,
        `Survived: ${formatRunDuration(info.time)}`,
        "Ironman — this run is sealed.",
      ];
      for (const line of lines) {
        const li = document.createElement("li");
        li.textContent = line;
        statsEl.appendChild(li);
      }
    }
    const btn = el.querySelector(".run-summary-newrun");
    if (btn && !btn.dataset.wired) {
      btn.dataset.wired = "1";
      btn.addEventListener("click", () => startNewRun());
    }
    el.hidden = false;
  }
  function startNewRun() {
    const el = document.getElementById("run-summary");
    if (el) el.hidden = true;
    const fresh = buildRunPayload({
      mode: "playing",
      seed: Date.now(),
      time: 0,
      player: { x: snapshot.player.x, z: snapshot.player.y, yaw: 0 },
      loopState: createLoopStateMachine().state,
      world: { dayTime: 1 / 3, weatherKind: snapshot.weather?.kind || "clear" },
      runStats: { startedAt: Date.now() },
    });
    writeRun(fresh).finally(() => { if (typeof location !== "undefined") location.reload(); });
  }
  // On-quit best-effort flush (no beforeunload precedent; mirror main.js
  // fire-and-forget). pagehide + visibilitychange cover tab close/switch.
  if (!visualCapture && typeof window !== "undefined") {
    const flush = () => { if (runMode === "playing") persistRun(); };
    window.addEventListener("pagehide", flush);
    window.addEventListener("visibilitychange", () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") flush();
    });
  }
  // A loaded sealed run shows its summary over the fresh scene.
  if (!visualCapture && loadedRun && loadedRun.mode === "sealed") {
    showRunSummary({
      cause: loadedRun.runStats?.cause || "Your run has ended.",
      phaseReached: loadedRun.runStats?.phaseReached || loadedRun.loopState?.phase || "spawn",
      time: loadedRun.time || 0,
    });
  }

  let frames = 0;
  let prevTs = performance.now();
  let wasDodging = false; // rising-edge detector for the dodge whoosh
  let fieldMapLiveSyncT = 0;
  // Establishing push-in: for the first CAM_INTRO_DUR seconds at spawn the camera
  // eases from a wide/high vantage into the gameplay framing. Gated to spawn (no
  // active beat focus, no modal, not visual capture) so it never fights focusBeat or
  // the golden-image gate. Driven by WALL-CLOCK elapsed (not accumulated dt) so it
  // settles correctly even if rAF is throttled (e.g. a backgrounded tab renders only
  // sparse frames — each still computes true elapsed time and lands settled).
  let camIntroStart = null;
  const CAM_INTRO_DUR = 2.4;
  let camIntroSettled = false;
  function loop(now = performance.now()) {
    // dt in seconds, clamped to keep big tab-resume jumps from teleporting.
    // Hit-stop scales the loop dt on a connecting strike (freeze-frame punch); the
    // freeze itself is advanced by real dt. Bypassed under visualCapture.
    const rawDt = Math.min((now - prevTs) / 1000, 0.05);
    prevTs = now;
    const dt = visualCapture ? rawDt : rawDt * hitStop.scale(rawDt);
    if (!camIntroSettled && !visualCapture && !titleOpen && beatFocusTimer === 0 && !boardModalController.isOpen()) {
      if (camIntroStart === null) camIntroStart = now; // first eligible frame
      const elapsed = (now - camIntroStart) / 1000;
      const k = Math.pow(1 - Math.min(1, elapsed / CAM_INTRO_DUR), 2); // ease-out
      const base = CAMERA_PRESETS.shoulder;
      if (k > 0.004) {
        player.setCameraPreset("shoulder", {
          distance: base.distance + k * 7.5,
          height: base.height + k * 4.6,
          lookAhead: base.lookAhead + k * 2.6,
        });
      } else {
        player.setCameraPreset("shoulder"); // settle to the gameplay preset once
        camIntroSettled = true;
      }
    }
    if (!boardModalController.isOpen()) player.update(dt, proxies);
    // The tight ±18u shadow frustum rides with the player — without this the
    // marsh/wagon half of the 95u route renders with NO sun shadows at all.
    atmosphere.setShadowFocus(player.position.x, player.position.z);
    if (beatFocusTimer > 0) {
      beatFocusTimer = Math.max(0, beatFocusTimer - dt);
      if (beatFocusTimer === 0) player.setCameraPreset(restingPreset());
    }
    if (visualCapture) applyHeroCamera(); // re-assert hero pose (player.update re-syncs the follow-cam)
    updateOcclusionFades(placementNodes, camera, player.position);
    interaction.update(player.position);
    fieldMapLiveSyncT -= dt;
    if (fieldMapLiveSyncT <= 0) {
      syncLiveFieldMap();
      syncProductionHud(productionHudRefs, loopState.state, encounter.getState(player.position));
      fieldMapLiveSyncT = 0.18;
    }
    encounter.update(player.position, visualCapture ? 0 : dt);
    if (
      !visualCapture && slimeAI && heroMeshes.roadSlime &&
      loopState.phase === "slime_fight" && !encounter.getState().defeated
    ) {
      slimeAI = stepSlime(slimeAI, { x: player.position.x, z: player.position.z }, dt);
      heroMeshes.roadSlime.position.x = slimeAI.pos.x;
      heroMeshes.roadSlime.position.z = slimeAI.pos.z;
      applySlimeTelegraph(heroMeshes.roadSlime, slimeAI.mode, slimeAI.telegraphT, now / 1000);
      if (slimeAI.contact) {
        encounter.applyLungeContact();
        camShake.add(0.6);
        audioView?.play("playerHurt");
      }
    }
    if (!visualCapture) {
      playerCombat.update(dt);
      if (
        playerCombat.isHitboxLive && heroMeshes.roadSlime &&
        loopState.phase === "slime_fight" && !encounter.getState().defeated
      ) {
        const sp = heroMeshes.roadSlime.position;
        if (hitboxHitsTarget(player.position, player.yaw, { x: sp.x, z: sp.z }) && playerCombat.tryRegisterHit()) {
          const res = encounter.registerHit();
          if (!res.defeated) audioView?.play("splat"); // defeat's bigSplat rides advance("defeat_slime")
          hitStop.punch(res.defeated ? 0.12 : 0.06, res.defeated ? 0.02 : 0.05);
          camShake.add(res.defeated ? 0.9 : 0.5);
          burst.burst({ x: sp.x, y: 0.7, z: sp.z }, res.defeated ? 22 : 12, "#6be873", res.defeated ? 5 : 3);
          stagger(heroMeshes.roadSlime, { x: Math.sin(player.yaw), z: Math.cos(player.yaw) }, 1);
          comboCount += 1;
          comboTimer = 1.6;
          updateComboHud(comboCount);
          spawnDamageNumber(sp, res.defeated ? "SLAIN" : "HIT");
          pulseHitmarker();
          if (res.defeated) postHitPulse();
        }
      }
    }
    updateBeatVisibility();
    character.update(visualCapture ? 0 : dt, player.moving && !visualCapture, player.running && !visualCapture);
    playerReadability.update(now / 1000);
    heroSilhouetteAccent.update(player, now / 1000);
    openingLightPools.update(now / 1000);
    roadDust.update(now / 1000);
    objectiveGuidance.update(now / 1000, loopState.state);
    animateBeatPayoffs(now / 1000);
    beatToast.update(dt);
    if (!visualCapture) {
      runElapsed += dt;
      if (player.moving) saveMgr.markDirty(); // periodic autosave captures position drift
      saveMgr.tick(dt, runMode, { onAutoSave: persistRun });
    }
    townsfolk.update(visualCapture ? 0 : dt, visualCapture, player.position);
    // NPC greeting prompt/speech overrides the kind prompt when near a townsperson
    if (npcSpeechT > 0) {
      npcSpeechT -= dt;
      setPromptText(npcSpeechMsg);
    } else {
      const who = townsfolk.getInteractable();
      if (who && loopState.phase !== "spawn" && !currentPromptText) setPromptText(`E — Talk to ${who.name}`);
    }
    if (audioView) {
      if (player.isDodging && !wasDodging) audioView.play("whoosh");
      wasDodging = player.isDodging;
      audioView.update(dt, {
        moving: player.moving && !boardModalController.isOpen(),
        running: player.running,
        paletteKey: dayTimeToKey(clock.dayTime),
      });
    }
    if (!visualCapture) {
      burst.update(dt);
      applyCameraShakeOffset(camShake.sample(dt, now / 1000));
      updateHpHud(encounter.getState());
      if (comboTimer > 0) {
        comboTimer -= dt;
        if (comboTimer <= 0) { comboCount = 0; updateComboHud(0); }
      }
      updateDamageNumbers(dt);
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
