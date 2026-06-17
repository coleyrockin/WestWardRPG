// The game's scene assembly + render loop — Westward and the first-road
// mission in Three.js (WebGPURenderer + TSL, NPR cel/ink look). Grew from the
// original render spike; today it owns world building, the loop, and beat
// wiring. (Future decomposition target — keep new systems in their own modules.)
//
// Sets window.__spikeReady after the
// first frame so the comparison capture script knows when to screenshot.

import * as THREE from "three";
import { createRenderer } from "../game/renderer/createRenderer.js";
import { createNprMaterial, clearMaterialCache } from "../game/renderer/materials/nprMaterial.js";
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
  OPEN_RANGE_ROADS,
  OPEN_RANGE_BOUNDS,
  PLAYER_SPAWN,
  GRAVESIDE_SPAWN,
} from "./frontierLayout.js";
import { createPlayerController, CAMERA_PRESETS } from "./playerController.js";
import { MOUNT_GAITS } from "./mountController.js";
import { resolveDiscovery } from "./discoveryRuntime.js";
import { ensurePoiDefaults, POI_DEFINITIONS } from "../poiSystem.js";
import { buildProxies, SALOON_DIMS, clampResumedPosition } from "./worldProxies.js";
import { createInteractionSystem, promptFor } from "./interactionSystem.js";
import { BOARD_OPTIONS, LOOP_PHASES, createLoopStateMachine, getPhaseProgress } from "./phaseState.js";
import { createObjectiveDomRefs, syncObjectiveDom } from "./objectiveDom.js";
import { buildFieldMapRouteModel, createFieldMapDomRefs, syncFieldMapDom, resolveFieldMapMode } from "./fieldMapDom.js";
import { questMapTarget } from "./questRuntime.js";
import { createBoardModalController } from "./boardModal.js";
import { createBoardDomRefs, syncBoardDom } from "./boardDom.js";
import { buildBoardView } from "./boardCopy.js";
import { createEncounterSystem, PLAYER_MAX_HP } from "./encounterSystem.js";
import { createAtmosphere } from "./atmosphere.js";
import { sunArc, calcWindowGlowFactor } from "./timeOfDay.js";
import { footDustStep } from "./footDust.js";
import { createWorldClock, tickClock, pinClock, cycleClock, dayTimeToKey } from "../game/world/worldClock.js";
import { createWater } from "../game/world/water.js";
import { waterBodies, DAM, waterCollisionBoxes } from "./waterLayout.js";
import { createGroundMaterial, groundHeight, localFogBoost } from "../game/world/ground.js";
import { createScatter } from "../game/world/scatter.js";
import { createRouteSageField, floraVisibleAt, FLORA_CULL_SHOW, FLORA_CULL_HIDE } from "../game/world/flora.js";
import { createPlaceholderCharacter } from "../game/world/character.js";
import { createAnimatedCharacter } from "../game/world/animatedCharacter.js";
import { createTownsfolk } from "../game/world/townsfolk.js";
import { pickExecutorBark, approvalCrossingTrigger } from "./executorBarks.js";
import { hudIsActive, computeHudDimState, HUD_DIM_PANEL_IDS } from "./hudDim.js";
import { resolveWeather, nextWeatherKind } from "../game/world/weather.js";
import { gustAt } from "../game/world/windGusts.js";
import { createWeatherSystem } from "../game/world/weatherView.js";
import { createSaveStateManager } from "../saveStateManager.js";
import { createSaveHealth } from "./saveHealth.js";
import { buildRunPayload, loadRun, writeRun, sealRun, clearRun, overlayLiveEncounterState } from "./runSave.js";
import { stagger } from "./animationHelpers.js";
import { createPlayerCombat, hitboxHitsTarget } from "./combat/playerCombat.js";
import { createSlimeState, stepSlime } from "./combat/slimeBehavior.js";
import { createHitStop, createCameraShake, createBurstPool } from "./combat/hitFx.js";
import { createAudioView } from "./audioView.js";
import {
  createGameState,
  hydrateGameState,
  grantGold,
  grantXp,
  grantInventoryItems,
  reconcileWithLoopPhase,
  buildGameSaveSlice,
  acceptStarterJob,
  recordSlimeKill,
  lootBeat,
  salvageWagon,
  claimBoardReward,
  recordNpcGreeting,
  adjustFactionRep,
  adjustExecutorApproval,
  activeJobLine,
  playerHudView,
  makeRng,
} from "./gameState.js";

// world (x = east, y = south) -> 3D (X = east, Z = south, Y = up)
const toVec = (x, y, h = 0) => new THREE.Vector3(x, h, y);
// Windmill fan sub-groups registered at build, spun by stepWorld (R1.1).
// Cleared on every startSpike so reboots don't accumulate stale rotors.
const WINDMILL_ROTORS = [];
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
  "cactus", "deadTree", "hitchingRail", "horseHitched", "cattle",
]);
// B4 — flora/prop wind-sway: a SMALL set of authored hero placements get a tiny
// seeded rotation sway in stepWorld (gated fdt>0, so frozen under capture). Only
// these stake-mounted props; NOT the InstancedMesh scatter (deferred). Each tagged
// node carries userData.windSway and the loop sways node.rotation.z as a delta off
// its stored base rotation, so it never drifts.
const WIND_SWAY_KINDS = new Set(["sign", "roadSign", "deadTree"]);
// M0 perf — shadow-caster culling (roadmap §M0). Boundary/distant silhouettes and
// flora read fine without casting onto the playable area; dropping their castShadow
// shrinks the WebGPU shadow pass with no visible loss. Foreground/midground hero
// buildings + props near the route keep their shadows. Provable via
// __westward3dStats().shadowCasters (counts castShadow=true meshes). The golden dusk
// capture runs the WebGL2 backend with shadowMap.enabled=false, so this is
// golden-safe — it changes nothing in that frame.
const SHADOW_CULL_KINDS = new Set([
  // boundary / distant skyline
  "mesa", "mesaSilhouette", "mesaSkyline", "heroMesaSkyline", "cliff", "boulder", "rock",
  // flora ground cover
  "sageCluster", "roadGrass", "brush", "sagePatch", "reeds", "cactus", "deadTree",
]);
// Decide a placement is shadow-cull eligible: anything in a background depth lane,
// or any boundary/distant/flora kind regardless of lane.
function shouldCullShadow(p) {
  return p.depthLane === "background" || SHADOW_CULL_KINDS.has(p.kind);
}
// M0 perf — discrete-flora distance cull (roadmap §M0). cactus/deadTree (and the
// model-path sageCluster/roadGrass) land in placementNodes; the procedural brush/
// sagePatch/reeds builders return null and aren't tracked. We cull only the tall
// cactus/deadTree for now — they read at distance, so hiding them well past the player
// stops distant open-range scatter from drawing (sage/grass could join later). The cull
// pass is SKIPPED under visualCapture, so the blessed dusk frame keeps every flora — golden-safe.
const FLORA_CULL_KINDS = new Set(["cactus", "deadTree"]);
// Turn off castShadow on every mesh under a node (it may be a Group of meshes).
function cullShadow(node) {
  if (!node) return;
  node.traverse((o) => {
    if (o.isMesh) o.castShadow = false;
  });
}
// DEV: while building the world, lock to bright NEUTRAL DAYLIGHT so test captures
// reveal every imperfection (owner direction 2026-06-16 — "daylight to see
// imperfections during our tests"). Boots at the `day` palette and does NOT drift
// to dusk/night, and ignores a drifted save clock. Flip to false to restore the
// goldenHour boot + day/night cycle once the world look is dialed in. The golden
// gate is unaffected — it still pins dusk via ?visual.
const DEV_LOCK_DAYLIGHT = true;
// Believable-human hero: Quaternius "Universal Animation Library" rig (CC0) —
// ~8.5k verts, true human proportions, 53-joint humanoid skeleton, 46 clips.
// Replaces the 792-vert blocky drifter. Its clips are named Idle_Loop/Walk_Loop/
// Jog_Fwd_Loop/Pistol_Shoot, so HERO_CLIP_MAP aliases them onto our canonical
// idle/walk/run/draw roles (resolveClipAliases in animatedCharacter.js).
const PLAYER_MODEL_URL = "/models/AnimationLibrary_Godot_Standard.gltf";
const HERO_CLIP_MAP = Object.freeze({ idle: "Idle_Loop", walk: "Walk_Loop", run: "Jog_Fwd_Loop", draw: "Pistol_Shoot" });
const HERO_MODEL_SCALE = 1.0; // tuned to ~1.8u after measuring native height in-browser
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
// M0 perf — every contact shadow used to mint its OWN CircleGeometry + two raw
// MeshBasicMaterials, so the scene carried hundreds of duplicate disc materials
// (the only un-cached materials in the build). The discs only ever come in two
// fixed variants (soft penumbra 0.32 / darker core 0.46, same colour), so share
// one unit-circle geometry + one material per variant across the whole scene.
// Scale/position stay per-disc, so the look is pixel-identical. Lazy-init keeps
// it clear of any module load-order dependency on `col`.
let _contactGeo = null;
let _contactPenumbraMat = null;
let _contactCoreMat = null;
function contactShadowAssets() {
  if (!_contactGeo) {
    _contactGeo = new THREE.CircleGeometry(1, 24);
    _contactPenumbraMat = new THREE.MeshBasicMaterial({ color: col("#1a120c"), transparent: true, opacity: 0.32, depthWrite: false });
    _contactCoreMat = new THREE.MeshBasicMaterial({ color: col("#1a120c"), transparent: true, opacity: 0.46, depthWrite: false });
  }
  return { geo: _contactGeo, penumbra: _contactPenumbraMat, core: _contactCoreMat };
}
function addContactShadow(group, x, z, rx = 1.0, rz = 0.7) {
  const { geo, penumbra, core } = contactShadowAssets();
  const make = (scale, mat) => {
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.scale.set(rx * scale, 1, rz * scale);
    m.position.set(x, 0.018, z);
    m.renderOrder = -1;
    return m;
  };
  group.add(make(1.32, penumbra)); // soft penumbra — lifted from 0.22 so props read grounded, not floating (art doc pillar 3)
  group.add(make(0.92, core)); // darker core — lifted from 0.34; trimmed under the dusk vignette so it doesn't pool
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
  const pw = isHeroRoadSign ? 0.92 : 0.7;
  const ph = isHeroRoadSign ? 0.5 : 0.42;
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(pw, ph, 0.06),
    standard(p.color, { emissive: p.color, emissiveIntensity: 0.5 }),
  );
  panel.position.copy(toVec(p.x, p.y, 1.05));
  panel.castShadow = true;
  group.add(panel);
  // Readable lettering: hero road signs carry directions; ANY sign can override
  // its text via p.signLines (e.g. the Calico Flats town marker — kept kind:"sign"
  // so it doesn't collide with the gameplay-keyed "roadSign" kind). Single-face
  // plane just proud of the panel, so the box's other sides stay clean for the ink.
  const lines = p.signLines || (isHeroRoadSign ? ["CACHE ROAD →", "WESTWARD ½ MI"] : null);
  if (lines) {
    // Keep the hero road sign's face EXACTLY 0.86×0.44 (it's in the golden frame);
    // other signs size their face to the smaller panel.
    const fw = isHeroRoadSign ? 0.86 : pw * 0.93;
    const fh = isHeroRoadSign ? 0.44 : ph * 0.88;
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(fw, fh),
      // near-white tint: the painted texture IS the colour (nprMaterial
      // multiplies map × tint before the cel ramp)
      standard("#f5ecd8", {
        map: makeSignTexture(lines),
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
  // p.bodyTint overrides the shared WESTERN_SPECS body color per placement (Calico
  // Flats uses it for its sun-bleached palette; Westward placements omit it).
  const body = standard(p.bodyTint ?? spec.body ?? "#7a5536", { roughness: 1 });
  const trim = standard(p.trimTint ?? spec.trim ?? "#b08a52", { roughness: 1 });
  const roofMat = standard(p.roofTint ?? spec.roof ?? "#37271a", { roughness: 1 });
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
    const isNeonSaloon = p.kind && (p.kind.includes("Saloon") || p.kind === "saloonFacade");
    const isNeonStore = p.kind && p.kind.includes("Store");
    const isNeonAssay = p.kind && p.kind.includes("Assay");

    let signMat;
    let neonColor = null;

    if (isNeonSaloon) {
      neonColor = "#ff00aa"; // pink/magenta
    } else if (isNeonStore) {
      neonColor = "#00ffc8"; // cyan
    } else if (isNeonAssay) {
      neonColor = "#ffaa00"; // orange
    }

    if (neonColor) {
      signMat = createNprMaterial(neonColor, { emissive: neonColor, emissiveIntensity: 2.2 });
    } else {
      signMat = standard(spec.sign, { emissive: "#3a2a10", emissiveIntensity: 0.45 });
    }

    if (jit2 > 0.5) {
      const su = -hw * 0.4, sv = storyH + 0.2;
      addBox(group, 0.08, 0.08, 0.62, trim, toVec(p.x + su, fz + front * 0.33, sv + 0.52));   // bracket arm
      addBox(group, 0.1, 0.62, 0.8, signMat, toVec(p.x + su, fz + front * 0.62, sv));         // hanging board
      if (neonColor) {
        const light = new THREE.PointLight(col(neonColor), 2.5, 6, 2.0);
        light.position.copy(toVec(p.x + su, fz + front * 0.62, sv + 0.3));
        group.add(light);
      }
    } else {
      addBox(group, w * 0.74, Math.min(0.8, parapetH * 0.7), 0.1, signMat,
        toVec(p.x, fz + front * 0.13, bodyH + parapetH * 0.28));                              // flat board
      if (neonColor) {
        const light = new THREE.PointLight(col(neonColor), 2.5, 6, 2.0);
        light.position.copy(toVec(p.x, fz + front * 0.25, bodyH + parapetH * 0.28));
        group.add(light);
      }
    }
  }
}

// --- Distinctive landmark buildings (procedural; authored as a builder fleet) ----
// Each anchors at (p.x, p.y) via toVec and adds to the shared props group, matching
// the existing builders. Footprints live in worldProxies.

// Town gateway — two timber posts spanning the road with a crossbeam and a
// hanging WESTWARD board (the town's name on its gate; RUSTWATER canon: the free
// town you start in wears WESTWARD, the project's old name). (p.x, p.y) is the
// gate center ON the road; posts sit ±halfSpan along world y so the lane stays
// clear (footprint = posts only).
function buildTownGate(group, p) {
  const s = p.size || 1;
  const halfSpan = 4.0 * s;
  // Tall enough that the spawn camera (height ~2.9, which starts just west of
  // the arch) passes cleanly under the beam + sign instead of eating the board.
  const postH = 5.4 * s;
  const mPost = standard("#5a4026", { roughness: 0.97 });
  const mBeam = standard("#6b4a2c", { roughness: 0.95 });
  const mBrace = standard("#4a3520", { roughness: 0.96 });
  for (const side of [-1, 1]) {
    const py = p.y + side * halfSpan;
    addBox(group, 0.34 * s, postH, 0.34 * s, mPost, toVec(p.x, py, 0));
    // knee braces from post into the beam
    const brace = new THREE.Mesh(new THREE.BoxGeometry(0.12 * s, 1.1 * s, 0.12 * s), mBrace);
    brace.position.copy(toVec(p.x, py - side * 0.55 * s, postH - 0.62 * s));
    brace.rotation.x = side * 0.7;
    brace.castShadow = true;
    group.add(brace);
  }
  // crossbeam — slight sag-free span with end caps proud of the posts
  addBox(group, 0.26 * s, 0.3 * s, halfSpan * 2 + 0.9 * s, mBeam, toVec(p.x, p.y, postH - 0.3 * s));
  // hanging town board, lettered via the shared canvas sign painter; faces east
  // (back toward town) so it reads over the shoulder and in the wide push-in.
  // Each town's gate wears its own name — Westward keeps "WESTWARD" (the public
  // title), Calico Flats overrides via p.signLines.
  const signTex = makeSignTexture(p.signLines || ["WESTWARD"]);
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(0.09 * s, 0.62 * s, 2.1 * s),
    standard("#6e4f2e", { roughness: 0.9, map: signTex }),
  );
  sign.position.copy(toVec(p.x, p.y, postH - 0.78 * s));
  sign.castShadow = true;
  group.add(sign);
  for (const side of [-1, 1]) {
    const chain = new THREE.Mesh(new THREE.BoxGeometry(0.05 * s, 0.32 * s, 0.05 * s), mBrace);
    chain.position.copy(toVec(p.x, p.y + side * 1.1 * s, postH - 0.62 * s));
    group.add(chain);
  }
}

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
  // The 8 blades live in a rotor sub-group centred on the fan axis so the
  // render loop can spin them (R1.1 — world-realism roadmap). The fan circle
  // lies in the world XY(height) plane, so the spin axis is rotor.rotation.z.
  const rotor = new THREE.Group();
  rotor.position.copy(toVec(tx, ty + fanOffset, fanZ));
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2, midR = bladeLen * 0.5 + 0.2 * sz;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.19 * sz, bladeLen, 0.055 * sz), bladeMat);
    m.position.set(Math.cos(angle) * midR, Math.sin(angle) * midR, 0);
    m.rotation.z = -angle; m.rotation.y = i % 2 === 0 ? 0.38 : -0.38;
    m.castShadow = true; rotor.add(m);
  }
  group.add(rotor);
  WINDMILL_ROTORS.push({ rotor, seed: hashYaw(tx * 3.1, ty * 1.7) });
  addBox(group, 0.06 * sz, 1.1 * sz, 0.05 * sz, plankMat, toVec(tx, ty + 0.55 * sz, towerH + 0.04));
  const vane = new THREE.Mesh(new THREE.BoxGeometry(0.04 * sz, 0.8 * sz, 0.62 * sz), bladeMat);
  vane.position.copy(toVec(tx, ty + 0.82 * sz, towerH + 0.6 * sz)); vane.castShadow = true; group.add(vane);
  addBox(group, baseW * 1.1, 0.18 * sz, baseW * 1.1, standard("#5a3e22", { roughness: 0.99 }), toVec(tx, ty, 0));
}

function buildWaterTower(group, p) {
  const ox = p.x, oy = p.y, s = p.size || 1;
  const matLeg = standard("#4f3a26", { roughness: 0.98 });
  const matTank = standard(p.color ?? "#6e5236", { roughness: 0.95 });
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

function buildGravesite(group, p) {
  const size = p.size || 1.0;
  // Dark recessed pit + raised earth lip reads as a dug grave, not a flat slab.
  addBox(group, 2.2 * size, 0.1, 1.2 * size, standard("#160f09"), toVec(p.x, p.y, -0.2));
  addBox(group, 2.6 * size, 0.18, 1.6 * size, standard("#3a281c"), toVec(p.x, p.y, -0.08));

  // The casket — the shot's subject — on a low bier over the grave.
  const casket = new THREE.Group();
  casket.position.copy(toVec(p.x, p.y, 0));
  const woodDark = standard("#2a1d12");
  const woodTrim = standard("#5b4228");
  addBox(casket, 2.1 * size, 0.16 * size, 0.9 * size, woodTrim, new THREE.Vector3(0, 0.12 * size, 0)); // bier
  addBox(casket, 1.9 * size, 0.42 * size, 0.72 * size, woodDark, new THREE.Vector3(0, 0.28 * size, 0)); // body
  addBox(casket, 1.74 * size, 0.12 * size, 0.58 * size, woodTrim, new THREE.Vector3(0, 0.7 * size, 0)); // lid
  // The Executor implant — the cyan node the iron doctor lifts from the casket
  // (the inheritance). A single emissive accent: the one bit of chrome at the grave.
  addBox(
    casket, 0.14 * size, 0.14 * size, 0.14 * size,
    standard("#00ffc8", { emissive: "#00ffc8", emissiveIntensity: 2.2 }),
    new THREE.Vector3(0.66 * size, 0.95 * size, 0),
  );
  group.add(casket);

  // Headstone cross at the head of the grave.
  const crossGroup = new THREE.Group();
  crossGroup.position.copy(toVec(p.x - 1.3 * size, p.y));
  addBox(crossGroup, 0.16 * size, 1.5 * size, 0.16 * size, standard("#735332"), new THREE.Vector3(0, 0, 0));
  addBox(crossGroup, 0.85 * size, 0.16 * size, 0.16 * size, standard("#735332"), new THREE.Vector3(0, 0.85 * size, 0));
  group.add(crossGroup);
}

function buildSteelMustang(group, p) {
  const size = p.size || 1.1;
  const mustang = new THREE.Group();
  mustang.position.copy(toVec(p.x, p.y));
  if (p.yaw) mustang.rotation.y = p.yaw;

  const chromeMat = standard("#8a8f7d", { rimColor: "#00ffc8", rimStrength: 0.6, rimPower: 2.0 }); // sun-bleached chrome, not factory-grey ("nothing is sleek")
  const copperMat = standard("#d35400");
  const glowCyan = standard("#00ffc8", { emissive: "#00ffc8", emissiveIntensity: 2.0 });

  addBox(mustang, 1.3 * size, 0.6 * size, 0.5 * size, chromeMat, new THREE.Vector3(0, 0.8 * size, 0));

  const neck = addBox(mustang, 0.4 * size, 0.6 * size, 0.3 * size, chromeMat, new THREE.Vector3(0.5 * size, 1.2 * size, 0));
  neck.rotation.z = -0.4;

  addBox(mustang, 0.5 * size, 0.3 * size, 0.35 * size, chromeMat, new THREE.Vector3(0.75 * size, 1.4 * size, 0));

  addBox(mustang, 0.15 * size, 0.8 * size, 0.15 * size, copperMat, new THREE.Vector3(0.5 * size, 0, 0.18 * size));
  addBox(mustang, 0.15 * size, 0.8 * size, 0.15 * size, copperMat, new THREE.Vector3(0.5 * size, 0, -0.18 * size));
  addBox(mustang, 0.15 * size, 0.8 * size, 0.15 * size, copperMat, new THREE.Vector3(-0.5 * size, 0, 0.18 * size));
  addBox(mustang, 0.15 * size, 0.8 * size, 0.15 * size, copperMat, new THREE.Vector3(-0.5 * size, 0, -0.18 * size));

  addBox(mustang, 0.1 * size, 0.1 * size, 0.38 * size, glowCyan, new THREE.Vector3(0.82 * size, 1.42 * size, 0));

  group.add(mustang);
}

// The town gallows — Calico Flats' grim civic landmark ("where bodies get found,"
// the free town's whole identity). A raised plank platform with a trapdoor, two
// posts + crossbeam, and a hanging noose. Authored to read as a confident, grim
// silhouette at range (art-bible pillar 1, procedural — no Blender). p.yaw rotates
// it (default noose faces -z, toward the street); the platform is the solid
// footprint in worldProxies. One hero object, M0-safe.
function buildGallows(group, p) {
  const s = p.size || 1;
  const g = new THREE.Group();
  g.position.copy(toVec(p.x, p.y));
  if (p.yaw) g.rotation.y = p.yaw;
  const wood = standard(p.color || "#4a3526", { roughness: 0.98 });
  const woodDark = standard("#2c1d12", { roughness: 0.98 });
  const rope = standard("#8a7038", { roughness: 0.9 });

  const deckW = 2.0 * s, deckD = 1.5 * s, deckH = 0.66 * s;
  // platform on four stout legs
  for (const [lx, lz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    addBox(g, 0.17 * s, deckH, 0.17 * s, woodDark,
      new THREE.Vector3(lx * (deckW / 2 - 0.17 * s), deckH / 2, lz * (deckD / 2 - 0.17 * s)));
  }
  addBox(g, deckW, 0.17 * s, deckD, wood, new THREE.Vector3(0, deckH, 0));                 // deck top
  addBox(g, 0.62 * s, 0.05 * s, 0.62 * s, woodDark, new THREE.Vector3(0, deckH + 0.1 * s, -0.28 * s)); // trapdoor hint
  // steps up the back (south) side
  addBox(g, deckW * 0.5, 0.22 * s, 0.32 * s, woodDark, new THREE.Vector3(0, 0.22 * s, deckD / 2 + 0.2 * s));
  addBox(g, deckW * 0.5, 0.44 * s, 0.32 * s, woodDark, new THREE.Vector3(0, 0.22 * s, deckD / 2 + 0.5 * s));

  // two posts rising from the deck (spanning x), crossbeam across the top
  const postH = 3.2 * s, postTop = deckH + postH, postX = deckW / 2 - 0.22 * s, postZ = -0.12 * s;
  for (const sx of [-1, 1]) {
    addBox(g, 0.22 * s, postH, 0.22 * s, wood, new THREE.Vector3(sx * postX, deckH + postH / 2, postZ));
    const brace = new THREE.Mesh(new THREE.BoxGeometry(0.13 * s, 0.95 * s, 0.13 * s), woodDark);
    brace.position.set(sx * (postX - 0.34 * s), deckH + postH - 0.52 * s, postZ);
    brace.rotation.z = sx * 0.72;
    brace.castShadow = true;
    g.add(brace);
  }
  addBox(g, postX * 2 + 0.44 * s, 0.24 * s, 0.24 * s, wood, new THREE.Vector3(0, postTop, postZ)); // crossbeam

  // the noose — rope from the beam to a loop at neck height, on the -z (street) face
  const ropeTop = postTop - 0.12 * s, ropeLen = 1.45 * s;
  addBox(g, 0.06 * s, ropeLen, 0.06 * s, rope, new THREE.Vector3(0, ropeTop - ropeLen / 2, postZ));
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.17 * s, 0.04 * s, 6, 12), rope);
  loop.position.set(0, ropeTop - ropeLen - 0.15 * s, postZ); // vertical ring, faces the street
  loop.castShadow = true;
  g.add(loop);

  group.add(g);
  addContactShadow(group, p.x, p.y, deckW * 0.58, deckD * 0.58);
  return g;
}

// The iron doctor's wagon — a frontier surgeon's covered rig, "sun-bleached chrome
// repaired with baling wire." Reuses buildWagon's bed+wheels read, then adds a
// canvas tilt, a roof equipment rack (a few thin boxes of salvaged kit), and a warm
// interior glow with one cyan emissive accent (the mustang's #00ffc8 — the one bit
// of working chrome). "Nothing is sleek": desaturated metal tints, a wonky rack.
// One hero object, grounded, M0-safe. p.yaw rotates it.
function buildIronDoctor(group, p) {
  const s = p.size || 1;
  const g = new THREE.Group();
  g.position.copy(toVec(p.x, p.y));
  if (p.yaw) g.rotation.y = p.yaw;

  const metal = standard("#8a8f7d", { rimColor: "#00ffc8", rimStrength: 0.45, rimPower: 2.0 }); // sun-bleached chrome
  const metalDk = standard("#5a5e50", { roughness: 0.9 });
  const canvasMat = standard("#b9a884", { roughness: 0.98 }); // weathered wagon tilt
  const wire = standard("#6e5a34", { roughness: 0.92 });       // baling wire / lashing
  const wheelMat = standard("#261c10");
  const glowCyan = standard("#00ffc8", { emissive: "#00ffc8", emissiveIntensity: 2.0 });
  const glowWarm = standard("#ffcf86", { emissive: "#ffcf86", emissiveIntensity: 1.1 }); // interior lamp panel

  // chassis bed — flat, on the wagon's local origin
  addBox(g, 1.5 * s, 0.42 * s, 0.86 * s, metalDk, new THREE.Vector3(0, 0.36 * s, 0));
  addBox(g, 1.54 * s, 0.12 * s, 0.9 * s, metal, new THREE.Vector3(0, 0.58 * s, 0)); // chrome rail trim

  // canvas tilt — three hoop ribs + a stretched cover, the classic covered-wagon read
  for (const rx of [-0.52, 0, 0.52]) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.44 * s, 0.03 * s, 6, 10, Math.PI), wire);
    rib.position.copy(new THREE.Vector3(rx * s, 1.04 * s, 0));
    rib.castShadow = true;
    g.add(rib);
  }
  addBox(g, 1.42 * s, 0.78 * s, 0.72 * s, canvasMat, new THREE.Vector3(0, 1.18 * s, 0));
  // open rear hoop showing the lit interior (warm panel + the cyan node)
  addBox(g, 0.06 * s, 0.6 * s, 0.62 * s, glowWarm, new THREE.Vector3(-0.74 * s, 1.12 * s, 0));
  addBox(g, 0.12 * s, 0.12 * s, 0.12 * s, glowCyan, new THREE.Vector3(-0.66 * s, 1.34 * s, 0.18 * s)); // the one chrome accent

  // roof equipment rack — a few thin boxes of lashed salvage, deliberately uneven
  addBox(g, 1.2 * s, 0.05 * s, 0.64 * s, metalDk, new THREE.Vector3(0.05 * s, 1.62 * s, 0)); // rack deck
  addBox(g, 0.5 * s, 0.16 * s, 0.18 * s, metal, new THREE.Vector3(-0.18 * s, 1.72 * s, -0.12 * s));
  addBox(g, 0.34 * s, 0.12 * s, 0.5 * s, metalDk, new THREE.Vector3(0.28 * s, 1.7 * s, 0.06 * s));
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.12 * s, 0.34 * s, 8), metal);
  drum.position.copy(new THREE.Vector3(0.42 * s, 1.78 * s, -0.18 * s));
  drum.rotation.z = Math.PI / 2;
  drum.castShadow = true;
  g.add(drum);

  // wheels — one squared to the rig, one splayed (the broken-frontier read)
  const wheelGeo = new THREE.TorusGeometry(0.4 * s, 0.08 * s, 8, 16);
  for (const [dx, rx] of [[-0.5, 0], [0.5, 0.34]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.position.copy(new THREE.Vector3(dx * s, 0.4 * s, 0.5 * s));
    wheel.rotation.x = rx;
    wheel.castShadow = true;
    g.add(wheel);
  }
  for (const dx of [-0.5, 0.5]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.position.copy(new THREE.Vector3(dx * s, 0.4 * s, -0.5 * s));
    wheel.castShadow = true;
    g.add(wheel);
  }

  group.add(g);
  // small interior light — warm with a cyan bias, low range so it reads as a lit
  // surgery, not a scene key (kept below the bloom-bait reserved-light tier).
  const lamp = new THREE.PointLight(col("#ffd0a0"), 4.2, 4.5, 2);
  lamp.position.copy(toVec(p.x, p.y, 1.2 * s));
  group.add(lamp);
  addContactShadow(group, p.x, p.y, 1.25 * s, 0.95 * s);
  return g;
}

// Comms / antenna mast — a tall, thin vertical that breaks the skyline with a
// cyberpunk silhouette ("antennas/cables" over the clapboard). A crisp <0.12u
// pole with a couple of cross-arms and a tiny emissive beacon at the top.
// IMPORTANT: regular box Meshes only — NOT THREE.Line (the WebGL2 fallback bans
// lines; boxes render on both backends, so this is capture-verifiable). p.baseH
// lifts the mast onto a rooftop; p.beacon picks the beacon hue (default red).
function buildAntennaMast(group, p) {
  const s = p.size || 1;
  const bh = p.baseH || 0; // base height — lifts a rooftop mast onto the building
  const poleW = 0.09 * s;  // < 0.12u: stays a crisp silhouette under the ink pass
  const poleH = 3.6 * s;
  const metal = standard("#7d8270", { roughness: 0.85 });        // weathered, not chrome-bright
  const metalDk = standard("#4f5346", { roughness: 0.9 });
  const beaconHex = p.beacon === "cyan" ? "#00ffc8" : "#ff3b30";
  const beacon = standard(beaconHex, { emissive: beaconHex, emissiveIntensity: 2.4 });

  // main pole
  addBox(group, poleW, poleH, poleW, metal, toVec(p.x, p.y, bh));
  // a slight kink near the base sells "field-rigged, not factory" — a short stub
  // offset strut bracing the pole
  const strut = addBox(group, poleW * 0.8, 0.8 * s, poleW * 0.8, metalDk, toVec(p.x + 0.18 * s, p.y, bh));
  strut.rotation.z = 0.32;
  // cross-arms — two short horizontal boxes at different heights (antenna elements)
  for (const [hz, len, off] of [[0.62, 0.7, 0.0], [0.8, 0.5, 0.06], [0.92, 0.34, -0.04]]) {
    addBox(group, len * s, poleW * 0.8, poleW * 0.8, metalDk, toVec(p.x, p.y + off * s, bh + poleH * hz));
  }
  // a couple of vertical whip elements off the top cross-arm
  addBox(group, poleW * 0.7, 0.6 * s, poleW * 0.7, metalDk, toVec(p.x + 0.3 * s, p.y, bh + poleH * 0.92));
  addBox(group, poleW * 0.7, 0.46 * s, poleW * 0.7, metalDk, toVec(p.x - 0.28 * s, p.y, bh + poleH * 0.92));
  // tiny emissive beacon at the very top
  addBox(group, 0.13 * s, 0.13 * s, 0.13 * s, beacon, toVec(p.x, p.y, bh + poleH));

  // ground masts get a contact shadow; rooftop masts (baseH>0) sit on a building
  // that already grounds itself, so skip the floating disc.
  if (bh === 0) addContactShadow(group, p.x, p.y, 0.3 * s, 0.3 * s);
}

// The Cross Dam — rusted-chrome hero megastructure spanning the Meridian's mouth at
// the reservoir's south edge (the Water War flashpoint). "Nothing is sleek": scoured
// concrete + sun-bleached chrome, a cyan spillway glow and an amber control-house
// window for the cyberpunk-western read. ~8 boxes (one hero landmark; M0 allows it).
function buildCrossDam(desc) {
  const g = new THREE.Group();
  const { x, y, width: W, depth: D, height: H } = desc;
  const rust = standard("#5b574e", { rimColor: "#cfe6ff", rimStrength: 0.3 });
  const rustDark = standard("#46423a", { rimStrength: 0.25 });
  const chrome = standard("#8d97a0", { rimColor: "#dff0ff", rimStrength: 0.5 });
  addBox(g, W, H, D, rust, toVec(x, H / 2, y)); // main wall (spans east–west)
  addBox(g, W + 0.4, 0.5, D + 0.9, rustDark, toVec(x, H + 0.2, y + 0.1)); // crest walkway
  addBox(g, 3.2, H * 0.7, D + 0.5, rustDark, toVec(x, H * 0.35, y + 0.15)); // spillway notch (recessed)
  const glow = standard("#0c2a30", { emissive: "#39c6d8", emissiveIntensity: 1.6, rimStrength: 0.1 });
  addBox(g, 2.6, 0.5, 0.4, glow, toVec(x, 0.5, y + D / 2 + 0.35)); // spillway outfall glow (downstream lip)
  addBox(g, 0.9, H * 0.92, 1.6, rustDark, toVec(x - W / 3, H * 0.46, y + D / 2 + 0.7)); // buttress W
  addBox(g, 0.9, H * 0.92, 1.6, rustDark, toVec(x + W / 3, H * 0.46, y + D / 2 + 0.7)); // buttress E
  addBox(g, 2.4, 2.0, 2.0, chrome, toVec(x + W / 2 + 0.4, H + 1.0, y)); // control house (east end)
  const win = standard("#2a1c0c", { emissive: "#ffb347", emissiveIntensity: 1.4 });
  addBox(g, 0.5, 0.7, 0.12, win, toVec(x + W / 2 + 0.4, H + 1.1, y + 1.06)); // amber window
  addContactShadow(g, x, y, W * 0.6, D * 1.3);
  return g;
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
    case "gravesite": return buildGravesite(group, p);
    case "gallows": return buildGallows(group, p);
    case "steelMustang": return buildSteelMustang(group, p);
    case "ironDoctor": return buildIronDoctor(group, p);
    case "antennaMast": return buildAntennaMast(group, p);
    case "roadSlime": return buildSlime(group, p);
    case "walkInSaloon": return buildWalkInSaloon(group, p);
    case "townGate": return buildTownGate(group, p);
    case "church": return buildChurch(group, p);
    case "windmill": return buildWindmill(group, p);
    case "waterTower": return buildWaterTower(group, p);
    case "blacksmith": return buildBlacksmith(group, p);
    case "hotel": return buildHotel(group, p);
    case "saloon":
    case "saloonFacade": return buildBuilding(group, p, 1.15);
    case "storefront": return buildBuilding(group, p, 0.95);
    // production* kinds normally render from authored .glb models; this is the
    // GLB-load-failure fallback — a composed western false-front, not a clay box.
    case "productionSaloon": return buildWesternBuilding(group, p, WESTERN_SPECS.saloonFacade);
    case "productionStore": return buildWesternBuilding(group, p, WESTERN_SPECS.storefront);
    case "productionAssay": return buildWesternBuilding(group, p, WESTERN_SPECS.townFacadeStore);
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
    // 0.28 is the DUSK value (the golden baseline); the window-glow schedule
    // (stepWorld) ramps it down toward day and holds it at dusk/night so windows
    // read as "occupied at night, quiet by day". Tagged so the schedule can find it.
    emissiveIntensity: 0.28,
    transparent: true,
    opacity: 0.82,
    rimStrength: 0,
  });
  paneMat.userData.windowPaneBase = 0.28;
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
  // Scheduled, not flickered: the window-glow ramp owns this light (day→night),
  // so the lamp-flicker collector skips it (userData.windowGlow) to avoid a fight.
  l.userData.windowGlow = true;
  l.userData.baseIntensity = l.intensity;
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

function updateOcclusionFades(placementNodes, camera, playerPos, focusPoint = null) {
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
  // A scene-focus point BEYOND the player (e.g. the funeral casket, which sits
  // behind the hero from the graveside camera). The base cone only fades the
  // camera→player segment, so without this any building between the camera and
  // the grave hard-occludes the shot's actual subject. A low + raised ray pair
  // catches both the grave slab and a mourner/marker standing at it.
  if (focusPoint) {
    targets.push(new THREE.Vector3(focusPoint.x, 0.6, focusPoint.z));
    targets.push(new THREE.Vector3(focusPoint.x, 1.6, focusPoint.z));
  }
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

// Hero accent props (bedroll / scarf / hip lantern) were fixed-height boxes tuned
// to the OLD placeholder; on the realistic rigged hero they float detached at
// mid-torso (a glowing blob by the hip) and read as a bug. Removed for the
// believable-human pass — proper gear belongs ON the model (dressed in Blender)
// or bone-attached, not as world-space boxes. Kept as a no-op stub so the call
// sites stay valid; restore from git history if reintroducing bone-attached gear.
function createHeroSilhouetteAccent() {
  const group = new THREE.Group();
  group.name = "hero-silhouette-accent";
  return { group, update() {} };
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
  // Mission-aware beat count: during mission 1.1 (funeral/implant) the active
  // phase isn't in the default LOOP_PHASES, so derive index/total from the
  // mission's own phase list instead of clamping to 0.
  const phaseProgress = getPhaseProgress(phase, loopState.activeMission);
  const index = phaseProgress.index;
  const total = Math.max(1, phaseProgress.total - 1);
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

  // Mission 1.1: hush the road-loop HUD during the burial so Dust to Dust reads
  // as its own quiet moment (the route map, bounty tracker, and "new bounty"
  // toast are incongruous over a grave). The objective strip + hero panel stay;
  // they un-hide automatically when the implant beat advances to the spawn loop.
  // Inline display (not the `hidden` attribute): these panels carry an id-level
  // `display: grid` rule that out-specifies `[hidden] { display:none }`, so only
  // an inline style reliably hides them. Empty string restores the stylesheet value.
  const funeralBeat = phase === "funeral" || phase === "implant";
  const hide = (el) => { if (el) el.style.display = funeralBeat ? "none" : ""; };
  hide(refs.fieldMap);
  hide(refs.jobTracker);
  hide(refs.jobToast);
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

function buildGround(scene, snapshot) {
  const spawn = snapshot?.player || PLAYER_SPAWN;
  // Big enough to comfortably hold the full ~30×20 explorable rectangle plus a
  // fog margin so the plane edge never shows. One plane — one draw call.
  // Subdivided so the TSL relief (positionNode FBM in createGroundMaterial) has
  // vertices to displace; center passed so the shader's height field lines up
  // with the pure groundHeight() that seats props/scatter.
  const ground = new THREE.Mesh(
    // OPEN RANGE: covers OPEN_RANGE_BOUNDS (x −40..150, y −60..90) plus fog
    // margin. Still one plane — one draw call; segment density ~kept per-unit.
    new THREE.PlaneGeometry(260, 220, 156, 132),
    // Lighter, less-red desert tones than the defaults — the dark #5a3d22 dirt was
    // crushing to a heavy red in shadow under the warm key. Warmer sand + neutral
    // dirt keep the off-road ground readable instead of a red murk.
    createGroundMaterial({ center: { x: 55, z: 15 }, dirt: "#5a5048", sand: "#c49a62", scrub: "#5a6848" }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(55, 0, 15);
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

  // OPEN RANGE roads — lighter ribbons (road + wash + edges, no ruts/center)
  // continuing past the authored slice to the ranch, the passes, and the spurs.
  for (const seg of OPEN_RANGE_ROADS) {
    addRoadPlane(seg.from, seg.to, seg.width, 0.02, roadMat);
    const wash = addRoadPlane(seg.from, seg.to, seg.width * 0.96, 0.034, roadWashMat);
    if (wash) wash.renderOrder = -1;
    const dx = seg.to.x - seg.from.x;
    const dz = seg.to.y - seg.from.y;
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;
    for (const off of [-(seg.width / 2 + 0.18), seg.width / 2 + 0.18]) {
      addRoadPlane(
        { x: seg.from.x + nx * off, y: seg.from.y + nz * off },
        { x: seg.to.x + nx * off, y: seg.to.y + nz * off },
        0.38,
        0.042,
        edgeMat,
      );
    }
  }
}

function createSpikeSnapshot() {
  const worldObjects = buildFrontierPlacements();
  return createRenderSnapshot({
    mode: "playing",
    time: 8,
    player: { x: PLAYER_SPAWN.x, y: PLAYER_SPAWN.y, angle: 0, inHouse: false },
    regions: { activeRegion: "frontier", activeRegionLabel: "Westward Frontier", poisDiscovered: [] },
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
  WINDMILL_ROTORS.length = 0; // module-scope registry — reset per boot
  clearMaterialCache();
  // Determinism: the golden-image capture (?visual) must always render a fresh
  // fixed scene — never read or write a persisted run.
  const visualCapture =
    typeof location !== "undefined" && new URLSearchParams(location.search).has("visual");
  // Ironman load-on-start: a "playing" run resumes in place; a "sealed" run shows
  // its summary over a fresh scene; no/corrupt save → fresh run.
  // CRITICAL save-safety seam: loadRun() REJECTS on a timed-out / failed read (vs a
  // resolved null = genuinely empty slot). A failed read may mean a real save EXISTS
  // but couldn't be read (slow IndexedDB under load). If we treated that as "no save"
  // and let the session autosave, the first write would clobber the unread ironman
  // run forever. So: catch the failure, set saveLoadFailed, and below we SUPPRESS all
  // persistence for the session so an existing-but-unread save is never overwritten.
  // Resume must never block boot — a failed load still boots a (non-persisting) scene.
  let loadedRun = null;
  let saveLoadFailed = false;
  if (!visualCapture) {
    try {
      loadedRun = await loadRun();
    } catch {
      saveLoadFailed = true;
      loadedRun = null;
    }
  }
  const resumeRun = loadedRun && loadedRun.mode === "playing" ? loadedRun : null;
  // Restore persisted region/POI discovery into the live snapshot (symmetric with
  // the world.poisDiscovered we write in currentRunPayload).
  if (resumeRun && Array.isArray(resumeRun.world?.poisDiscovered) && snapshot.regions) {
    snapshot.regions.poisDiscovered = [...resumeRun.world.poisDiscovered];
  }
  // Fresh runs open at mission 1.1 "Dust to Dust" — the funeral is the new
  // opening (treatment §Opening). Resumes restore their saved loopState (which
  // carries activeMission), and a pre-mission save with no activeMission still
  // opens at the default `spawn` phase. Visual capture pins the default loop.
  const loopState = createLoopStateMachine(
    resumeRun ? resumeRun.loopState : visualCapture ? {} : { activeMission: "dust_to_dust" },
  );
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
  // `reducedFidelity` (M0): true on the WebGL2 fallback. Scatter/weather already
  // self-halve on `backend === "webgl"`; the flag is threaded into their opts so
  // future demotion paths key on intent without re-deriving the backend string. It
  // does NOT change current counts — the halving still keys on `backend`.
  const { renderer, backend, reducedFidelity } = await createRenderer(canvas);
  if (import.meta.env.DEV && typeof window !== "undefined") {
    window.__westward3dBackend = backend;
  }
  if (import.meta.env.DEV && typeof window !== "undefined") {
    // Live-tuning aid (roadmap §3.6 T1a): let dev tooling traverse the scene.
    window.__spikeScene = () => scene;
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
  const clock = createWorldClock({ dayTime: DEV_LOCK_DAYLIGHT ? 0 : 0.25 }); // day (dev daylight lock) | goldenHour boot
  if (visualCapture) pinClock(clock, "dusk");
  else if (DEV_LOCK_DAYLIGHT) clock.dayTime = 0; // dev: hold bright daylight, ignore any drifted save clock
  else if (resumeRun && Number.isFinite(resumeRun.world?.dayTime)) clock.dayTime = resumeRun.world.dayTime;

  // --- Ironman run persistence (frontier-ironman slot) ---
  const saveMgr = createSaveStateManager({ interval: 90 });
  // Tracks autosave reliability so persistent write failures surface to the player
  // instead of being swallowed silently in production builds.
  const saveHealth = createSaveHealth();
  // Subtle, persistent, non-blocking HUD note shown only while saves are "failing".
  // Built with createElement/textContent (no parser sinks), default hidden.
  let _saveFailNote = null;
  function ensureSaveFailNote() {
    if (_saveFailNote || typeof document === "undefined" || !document.body) return _saveFailNote;
    const note = document.createElement("div");
    note.id = "save-fail-note";
    note.textContent = "⚠ Save failing — progress may not be recorded";
    note.setAttribute("role", "status");
    note.style.position = "fixed";
    note.style.right = "12px";
    note.style.bottom = "12px";
    note.style.zIndex = "40";
    note.style.padding = "4px 9px";
    note.style.font = "600 11px/1.4 system-ui, sans-serif";
    note.style.letterSpacing = "0.02em";
    note.style.color = "#ffd9b0";
    note.style.background = "rgba(60, 22, 14, 0.78)";
    note.style.border = "1px solid rgba(255, 150, 90, 0.55)";
    note.style.borderRadius = "4px";
    note.style.pointerEvents = "none";
    note.style.opacity = "0.9";
    note.hidden = true;
    document.body.appendChild(note);
    _saveFailNote = note;
    return note;
  }
  function syncSaveHealthHud() {
    const failing = saveHealth.status === "failing";
    const note = failing ? ensureSaveFailNote() : _saveFailNote;
    if (note) note.hidden = !failing;
  }
  let runMode = loadedRun && loadedRun.mode === "sealed" ? "sealed" : "playing";
  const runSeed = resumeRun && Number.isFinite(resumeRun.seed) ? resumeRun.seed : Date.now();
  let runElapsed = resumeRun && Number.isFinite(resumeRun.time) ? resumeRun.time : 0;
  const runStartedAt = resumeRun?.runStats?.startedAt ?? Date.now();

  // --- The RPG state tree (Tier A port: jobBoard / loot / progression / npcMemory).
  // One authoritative tree: resumed from the save's game slice when present,
  // else built fresh and reconciled against the saved loop phase (v1 saves).
  const game = resumeRun?.game ? hydrateGameState(resumeRun.game) : createGameState();
  reconcileWithLoopPhase(game, resumeRun?.loopState || {});
  // Free-roam discovery state lives on snapshot.regions.poisDiscovered (the field
  // we persist/restore in currentRunPayload); ensure its defaults before the loop
  // drives resolveDiscovery off it.
  ensurePoiDefaults(snapshot.regions);
  // Loot rolls ride the run seed so a given run's drops are reproducible.
  const lootRng = makeRng((runSeed >>> 0) || 1);
  let appliedPalette = sunArc(clock.dayTime);
  atmosphere.applyPalette(appliedPalette);

  buildGround(scene, snapshot);
  const openingLightPools = createOpeningLightPools(snapshot);
  const roadDust = createRoadDust(snapshot);
  createRouteSageField(scene, { route: FIRST_FIVE_ROUTE });
  scene.add(openingLightPools.group);
  scene.add(roadDust.group);
  createScatter(scene, { center: { x: 35, z: 13 }, area: 78, count: 850, backend, reducedFidelity });

  // Animated marsh water (replaces the flat plane that used to live in buildGround).
  const water = createWater({ width: 29, height: 6.2, skyTint: appliedPalette.sky.horizon });
  water.mesh.rotation.x = -Math.PI / 2;
  water.mesh.position.set(48, 0.05, 19);
  scene.add(water.mesh);

  // The Meridian water system — reservoir → dam → river → ocean (waterLayout.js),
  // folding the marsh in as a backwater. Each body is a flat cel plane on the shared
  // water factory; small per-id y offsets avoid z-fighting where bodies overlap.
  // Reduced fidelity (WebGL2) flattens the surfaces. Collected for per-frame
  // time/skyTint updates alongside the marsh. All bodies sit far from the dusk frame.
  const WATER_Y = { reservoir: 0.035, river_upper: 0.04, river_ford: 0.052, river_low1: 0.04, river_low2: 0.04, river_low3: 0.04, ocean: 0.03 };
  const meridianWaters = [];
  for (const body of waterBodies()) {
    const w = createWater({ width: body.w, height: body.h, skyTint: appliedPalette.sky.horizon, reduced: reducedFidelity, ...body.look });
    w.mesh.rotation.x = -Math.PI / 2;
    w.mesh.position.set(body.x, WATER_Y[body.id] ?? 0.04, body.y);
    w.mesh.renderOrder = -1; // draw under the marsh/props so transparency layers read right
    scene.add(w.mesh);
    meridianWaters.push(w);
  }
  scene.add(buildCrossDam(DAM));

  const props = new THREE.Group();
  const heroMeshes = {};
  const placementNodes = [];
  const modelJobs = [];
  const modelLoadStatus = {};
  const buildingsList = [];
  // The casket world point (placement y → world z), used by the funeral occlusion
  // pass so foreground town buildings fade and the grave reads.
  const graveProp = snapshot.worldObjects.find((p) => p.kind === "gravesite");
  const graveFocusPoint = graveProp ? { x: graveProp.x, z: graveProp.y } : null;
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
      if (node) {
        placementNodes.push({ kind: p.kind, node });
        const size = p.size || 1;
        const jit = hashYaw(p.x * 1.7 + 2.0, p.y * 1.3 - 1.0) / (Math.PI * 2);
        const stories = WESTERN_SPECS[p.kind].stories ?? 2;
        const bodyH = stories * 1.75 * (0.88 + jit * 0.28);
        buildingsList.push({ x: p.x, y: p.y, h: bodyH });
      }
      recordModelLoad(p.kind, "procedural:western", true);
      if (HERO_KINDS.includes(p.kind) && node) heroMeshes[p.kind] = node;
      // M0: distant/background/flora placements don't need to cast shadows.
      if (shouldCullShadow(p)) cullShadow(node);
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
            // B4 — tag hero stake-props (sign / roadSign / deadTree) for wind-sway.
            // Position-seeded freq/phase keep neighbours out of unison; no Math.random
            // (determinism). The windSwayers collector below reads the tag; the loop is
            // fdt-gated so capture never sways. Authored yaw lives on node.rotation.y,
            // so swaying rotation.z (lean) is orthogonal and won't fight the yaw jitter.
            if (WIND_SWAY_KINDS.has(p.kind)) {
              const s = hashYaw(p.x * 2.3 + 1.7, p.y * 1.9 - 0.7); // 0..2π
              node.userData.windSway = {
                freq: 0.55 + (s / (Math.PI * 2)) * 0.5, // 0.55–1.05 rad/s
                amp: p.kind === "deadTree" ? 0.05 : 0.035, // dead trees lean more
                phase: s,
              };
            }
            // lamps/beacon/board carried their PointLight inside the old builder;
            // re-add it here for the model path (height is in local model units).
            if (entry.light) attachLight(props, p, entry.light, effScale);
            if (entry.windowLight) attachBuildingWarmth(props, p, entry.windowLight);
            if (HERO_KINDS.includes(p.kind)) {
              heroMeshes[p.kind] = node;
            }
            // M0: distant/background/flora placements don't need to cast shadows.
            if (shouldCullShadow(p)) cullShadow(node);
          })
          .catch((err) => {
            console.warn(`[render3d] model load failed for ${p.kind}, using fallback`, err);
            recordModelLoad(p.kind, entry.url, false);
            const mesh = buildPlacement(props, p);
            if (mesh) placementNodes.push({ kind: p.kind, node: mesh });
            if (HERO_KINDS.includes(p.kind) && mesh) {
              heroMeshes[p.kind] = mesh;
            }
            // M0: distant/background/flora placements don't need to cast shadows.
            if (mesh && shouldCullShadow(p)) cullShadow(mesh);
          }),
      );
      continue;
    }
    const mesh = buildPlacement(props, p);
    if (mesh) placementNodes.push({ kind: p.kind, node: mesh });
    if (HERO_KINDS.includes(p.kind) && mesh) {
      heroMeshes[p.kind] = mesh;
    }
    // M0: distant/background/flora placements don't need to cast shadows.
    if (mesh && shouldCullShadow(p)) cullShadow(mesh);
  }

  // Connect buildings with power cables (Westward procedural dressing; WebGPU only — WebGL2 bans lines)
  if (backend === "webgpu") {
    for (let i = 1; i < buildingsList.length; i++) {
      const b1 = buildingsList[i - 1];
      const b2 = buildingsList[i];
      const dist = Math.hypot(b2.x - b1.x, b2.y - b1.y);
      if (dist > 1.0 && dist < 15.0) {
        const p1 = toVec(b1.x, b1.y, b1.h * 0.95);
        const p2 = toVec(b2.x, b2.y, b2.h * 0.95);
        const mid = p1.clone().add(p2).multiplyScalar(0.5);
        mid.y -= 0.38; // sag

        const curve = new THREE.CatmullRomCurve3([p1, mid, p2]);
        const pts = curve.getPoints(10);
        const cableGeo = new THREE.BufferGeometry().setFromPoints(pts);
        const cableMat = new THREE.LineBasicMaterial({ color: col("#1a121f"), linewidth: 2 });
        const cable = new THREE.Line(cableGeo, cableMat);
        props.add(cable);

        // Antennas variety
        const antHash = hashYaw(b1.x + 3.0, b1.y - 1.0);
        if (antHash > 0.45) {
          const antGroup = new THREE.Group();
          antGroup.position.copy(toVec(b1.x, b1.y, b1.h));
          addBox(antGroup, 0.04, 1.3, 0.04, standard("#333"), new THREE.Vector3(0, 0, 0));
          addBox(antGroup, 0.5, 0.04, 0.04, standard("#333"), new THREE.Vector3(0, 0.8, 0));
          props.add(antGroup);
        }
      }
    }
  }

  if (visualCapture) {
    // Golden-image capture: don't block boot on the full GLB stream — procedural
    // dress + hero shapes are enough for a stable baseline; models continue loading.
    // NOTE: the windowGlows collector below therefore runs before the GLB panes are
    // attached, so it collects none of them and the dusk schedule no-ops for those —
    // which is fine and INTENTIONAL: panes are born at the dusk value (0.28), the
    // exact value the schedule would set at dusk (glow=1.0). Don't `await` here: it
    // delays the screenshot enough to race the HUD-hide and leak chrome into the frame.
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
  // B4 — wind-sway swayers, collected once. Each stores the node + its tag + the
  // node's base rotation.z, so the stepWorld loop applies a sin() delta off the
  // base instead of drifting absolutely. Same collector idiom as lampFlickers;
  // fdt-gated in stepWorld so capture (fdt=0) never sways. Under ?visual the model
  // stream is still in flight here, so this collects none — fine: capture is frozen.
  const windSwayers = [];
  // B2 — lamp-personality tiers. Derive a deterministic `kind` per lamp at collect
  // time (NO Math.random). "forge" = the blacksmith coal light, read by proximity to
  // the blacksmith placement (conversion-independent) backed by its hot, fully
  // saturated, mid-lightness orange (HSL is colorspace-independent, unlike the linear
  // r/g/b channels). The brightest/main lamps read "steady"; a seeded share of the
  // rest also hold steady so the street isn't uniformly guttering; the remainder
  // "gutter". The per-tier waveform lives in the stepWorld flicker loop. Intensity
  // (and forge hue) only — lights never move, no geometry changes, so the freeze
  // keeps the golden baseline byte-identical.
  const forgeProp = snapshot.worldObjects.find((p) => p.kind === "blacksmith");
  const _hsl = { h: 0, s: 0, l: 0 };
  const lampTierOf = (light, seed) => {
    light.color.getHSL(_hsl, THREE.SRGBColorSpace);
    const hotOrange = _hsl.s > 0.98 && _hsl.l < 0.66 && _hsl.h < 0.09; // forge coal hue
    const nearForge = forgeProp
      && Math.hypot(light.position.x - forgeProp.x, light.position.z - forgeProp.y) < 2.5;
    if (hotOrange && nearForge) return "forge";
    // Main street lamps burn bright + clean — steady. Plus a seeded share of the
    // rest hold steady so the street isn't uniformly guttering.
    if (light.intensity >= 4 || seed > Math.PI * 1.45) return "steady";
    return "guttering";
  };
  // Window-glow schedule targets (panes + their warmth lights), collected once and
  // ramped by clock.dayTime in stepWorld so buildings read as occupied at night /
  // quiet by day. Runs even under the freeze (dayTime is pinned to dusk), so the
  // capture holds panes at the authored 0.28 and the golden baseline is unchanged.
  // A building's ~9 panes share ONE paneMat instance, so dedupe via a Set — else
  // stepWorld rewrites the same material's emissiveIntensity hundreds of times/frame.
  const windowGlows = { panes: [], lights: [] };
  const paneSet = new Set();
  scene.traverse((obj) => {
    if (obj.isPointLight && obj.userData?.windowGlow) {
      windowGlows.lights.push({ light: obj, base: obj.userData.baseIntensity ?? obj.intensity });
      return; // scheduled, not flickered
    }
    if (obj.isMesh && obj.material && !Array.isArray(obj.material) && obj.material.userData?.windowPaneBase !== undefined) {
      paneSet.add(obj.material);
    }
    if (!visualCapture && obj.isPointLight && obj.intensity <= 12) {
      const seed = (obj.position.x * 7.31 + obj.position.z * 13.73) % (Math.PI * 2);
      lampFlickers.push({ light: obj, base: obj.intensity, seed, kind: lampTierOf(obj, seed) });
    }
    // B4 — collect tagged stake-props. Store the base rotation.z so sway is a delta.
    if (obj.userData?.windSway) {
      windSwayers.push({ node: obj, cfg: obj.userData.windSway, baseZ: obj.rotation.z });
    }
  });
  windowGlows.panes = [...paneSet];

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
      // Two region casts share one street: the Westward home-ground crowd and the
      // Calico Flats free-town cast (named characters from the treatment). A facade
      // fans update/getInteractable/talk across both; a Calico load failure leaves
      // the Westward cast intact.
      const groups = [await createTownsfolk(scene, { count: 5 })];
      try {
        groups.push(await createTownsfolk(scene, { locale: "calico" }));
      } catch (e) {
        console.warn("[render3d] calico townsfolk failed to load", e);
      }
      townsfolk = {
        update(dt2, frozen2, pos) { for (const g of groups) g.update(dt2, frozen2, pos); },
        getInteractable() { for (const g of groups) { const r = g.getInteractable(); if (r) return r; } return null; },
        talk() { for (const g of groups) { const r = g.talk?.(); if (r) return r; } return null; },
      };
    } catch (err) {
      console.warn("[render3d] townsfolk failed to load", err);
    }
  }
  // 6C: greet the nearest townsperson with E. A short "speech" timer holds the
  // line in the prompt; the loop shows the "E — Talk to …" cue when in range.
  let npcSpeechT = 0;
  let npcSpeechMsg = "";
  // The Executor (Abram's ghost) interjects on world events past the funeral:
  // crossing into a town, clearing the marsh-road bounty. Once-per-session via a
  // Set, branched by executorApproval (acting like Abram → proud; mercy → distant).
  const seenExecutorBarks = new Set();
  let currentRegion = "westward"; // spawn region — don't bark on the opening frame
  let lastBarkPhase = null;
  let lastApproval = game?.executorApproval ?? 0; // band-crossing tracker for approval barks
  const fireExecutorBark = (trigger) => {
    if (seenExecutorBarks.has(trigger)) return;
    const line = pickExecutorBark(trigger, { approval: game?.executorApproval ?? 0 });
    if (!line) return;
    seenExecutorBarks.add(trigger);
    npcSpeechMsg = line; // the loop's npcSpeech block renders it (cyan, 5s)
    npcSpeechT = 5;
  };
  // How Abram's ghost reads each faction when Ezra builds ties there: he respects
  // collectors (Tally), shrugs at town-keepers (Civic) and the wire-priests
  // (Circuit), and curdles when you cozy up to the Caldera freeholders — the
  // people his Founding Crime drowned. Standing builds toward the warmth threshold
  // (npcMemory fires faction-aware lines at |rep| >= 40); ~10 greetings to get there.
  const EXECUTOR_FACTION_BIAS = { tally: 2, helios: 1, circuit: 0, civic: 0, freeholder: -2 };
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
        // Relationships build faction standing, and the company you keep feeds (or
        // starves) the Executor — the social system IS the moral instrument.
        if (r.faction) {
          adjustFactionRep(game, r.faction, 4);
          const bias = EXECUTOR_FACTION_BIAS[r.faction] ?? 0;
          if (bias) adjustExecutorApproval(game, bias);
        }
        onRunMutated();
      }
    });
  }

  // Start at the real road spawn and aim at Boone's board cluster. This keeps
  // first-load framing honest for both play and spike_compare screenshots.
  const _vw = (typeof window !== "undefined" && window.innerWidth) || 1280;
  const _vh = (typeof window !== "undefined" && window.innerHeight) || 720;
  // Far plane sized for the open range: dome surface (r 300 about world centre)
  // stays inside it from any reachable corner (~300 + 121 max offset).
  const camera = new THREE.PerspectiveCamera(65, _vw / _vh, 0.1, 480);
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
    // WESTWARD v2 frame: on the road just inside the gate arch, aimed east down
    // the dense main street — board plaza, lantern wires, and the church bend
    // read in one vista. (The old pose at (5.1, 13.4) ended up inside the
    // relocated south-west hero buildings after the town rebuild.)
    camera.position.set(6.6, 3.5, 10.2);
    camera.lookAt(16.5, 1.5, 7.2);
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
    // ?visual capture: grain is time-animated and GTAO diverges across
    // SwiftShader builds (macOS vs CI Linux hit 24% pixel diff) — both off for
    // a deterministic golden frame; the gate still catches pipeline breaks.
    ...(visualCapture ? { grainIntensity: 0, ao: false } : {}),
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
  const weatherSys = createWeatherSystem(scene, { x: 14, z: 9, backend, reducedFidelity });
  const cycleWeather = () => {
    weatherKind = nextWeatherKind(weatherKind);
    // pass only kind + wind so the preset drives rain/dust (the snapshot's stale
    // rain:0 would otherwise override the storm preset via resolveWeather).
    weather = resolveWeather({ kind: weatherKind, wind: snapshot.weather?.wind });
    return weatherKind;
  };

  // One call per frame: advance the world (or hold it all still under ?visual).
  let waterTime = 0;
  // Atmosphere motion (art-direction pillar 5 / R1.2): tumbleweeds drifting the
  // roads and distant circling birds. Pure dressing — null footprints (no
  // collision), hidden + held still whenever the world is frozen (?visual /
  // captureMode) so the golden baseline never sees them.
  // Each weed rides one road segment; its speed bursts on the seeded gust
  // schedule (windGusts.js) that the R1.4 audio layer reads off the same clock.
  const createTumbleweed = (from, to, seed, weaveAmp = 1.5) => {
    const ball = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.34, 1),
      standard("#9a7b4f", { transparent: true, opacity: 0.92, rimStrength: 0.4 }),
    );
    ball.castShadow = true;
    const dx = to.x - from.x, dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len; // travel direction (world xy, y = south)
    // The roll axis must follow the run: yaw an inner pivot so the ball's local
    // Z stays perpendicular to travel (rotation.y maps local +X to (cosθ,−sinθ)
    // in world XZ — θ = atan2(−uy, ux) points local +X down the run).
    const pivot = new THREE.Group();
    pivot.rotation.y = Math.atan2(-uy, ux);
    pivot.add(ball);
    const group = new THREE.Group();
    group.add(pivot);
    scene.add(group);
    let dist = (hashYaw(seed, seed * 1.3) / (Math.PI * 2)) * len; // desynced start along the run
    const step = (fdt, t, windSpeed) => {
      group.visible = fdt > 0;
      if (fdt <= 0) return;
      const gust = 1 + gustAt(t, seed) * 1.4; // ×2.4 at gust peak (R1.2)
      const speed = (1.7 + Math.sin(t * 0.43 + seed) * 0.5) * gust * (0.7 + 0.3 * windSpeed);
      dist += speed * fdt;
      if (dist > len) dist = 0; // loop the run
      const weave = Math.sin(dist * 0.21 + seed) * weaveAmp; // perpendicular wander
      const x = from.x + ux * dist - uy * weave;
      const y = from.y + uy * dist + ux * weave;
      const hop = Math.abs(Math.sin(dist * 1.9)) * 0.16; // light bounce
      group.position.set(x, 0.34 + hop, y);
      ball.rotation.z -= (speed * fdt) / 0.34; // roll with travel
      ball.rotation.x = Math.sin(dist * 0.7) * 0.3;
    };
    return { step };
  };
  // Paths are deterministic (seeded weave), so each run was checked against the
  // layout: keep them clear of buildings, NPCs, and set-piece props.
  const tumbleweeds = [
    // First road — seed 0.84 reproduces the pre-refactor weave sin(x·0.21)
    // exactly, the curve that already threads the main-street dressing.
    createTumbleweed({ x: 4, y: 12.6 }, { x: 74, y: 12.6 }, 0.84),
    // Ranch road — stops short of the Eastwater gate cluster (supply cart at
    // x≈124.4 + gate lamp) so the weed never rolls through the arrival beat.
    createTumbleweed({ x: 74, y: 13.4 }, { x: 122, y: 13.8 }, 13.7),
    // North spur — starts south of the Paddock Wagon (y5) with a tighter weave
    // that clears Back Row Livery's east wall (x≈31.1) and ends before the
    // Folly claim sign (y −25.8).
    createTumbleweed({ x: 32.8, y: 2 }, { x: 33.5, y: -24 }, 23.1, 0.9),
  ];

  // R1.3 — thermals over the mesa line; a flock scatters when the player walks
  // in under it (the first reactive-world beat), reforms after a few seconds.
  // Shortest-arc angle lerp so blended yaw never swings the long way round.
  const lerpAngle = (a, b, t) => {
    let d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  };
  const createBirdFlock = (center, alt) => {
    const group = new THREE.Group();
    const wings = [];
    for (let i = 0; i < 3; i++) {
      const bird = new THREE.Mesh(
        new THREE.PlaneGeometry(0.62, 0.2),
        standard("#1d1812", { rimStrength: 0, flatShading: true }),
      );
      bird.material.side = THREE.DoubleSide;
      group.add(bird);
      wings.push({
        mesh: bird,
        phase: i * 2.1,
        radius: 6.4 + i * 1.3,
        alt: alt + i * 0.8,
        wingPhase: i * 2.1, // accumulated beat phase — continuous across speed changes
        // Diverging escape directions ~120° apart, seeded by flock + slot.
        scatterAngle: hashYaw(center.x + i * 17.7, center.y - i * 9.1),
      });
    }
    scene.add(group);
    let scatterTimer = 0; // remaining scatter seconds; 0 = orbit / reform
    let blend = 0; // continuous 0 (orbit) → 1 (scattered) — every visual blends on this
    const step = (fdt, t, playerX, playerZ) => {
      group.visible = fdt > 0;
      if (fdt <= 0) return;
      const near = Math.hypot(playerX - center.x, playerZ - center.y) < 14;
      // Re-arm only after the flock has fully reformed (blend back at 0).
      if (near && scatterTimer <= 0 && blend <= 0) {
        scatterTimer = 4 + hashYaw(t, center.x) / Math.PI; // 4–6 s flight
      }
      if (scatterTimer > 0) {
        scatterTimer -= fdt;
        blend = Math.min(1, blend + fdt / 1.2); // burst outward over ~1.2 s
      } else if (blend > 0) {
        blend = Math.max(0, blend - fdt / 2.4); // glide back over ~2.4 s
      }
      for (const w of wings) {
        const a = t * 0.14 + w.phase; // slow thermal circle
        const ox = center.x + Math.cos(a) * w.radius;
        const oz = center.y + Math.sin(a) * w.radius * 0.55;
        const oy = w.alt + Math.sin(t * 0.5 + w.phase) * 0.4;
        // Scatter pushes each bird out along its own bearing, climbing.
        const px = ox + Math.cos(w.scatterAngle) * 16 * blend;
        const pz = oz + Math.sin(w.scatterAngle) * 16 * blend;
        const py = oy + 4.5 * blend;
        w.wingPhase += fdt * (7 + 7 * blend); // frantic while fleeing, no phase jump
        w.mesh.position.set(px, py, pz);
        w.mesh.rotation.set(0, lerpAngle(-a, -w.scatterAngle, blend), 0.3 + Math.sin(w.wingPhase) * 0.35);
      }
    };
    return { step };
  };
  const birdFlocks = [
    createBirdFlock({ x: 33, y: 2.5 }, 11.4), // the original mesa-line thermal
    createBirdFlock({ x: 2, y: -18 }, 13.2), // northwest rampart
  ];

  // B1 — chimney smoke. A tiny pool (weather-pool idiom from weatherView): grey-
  // violet PlaneGeometry quads that rise (+Y) and drift downwind (+windX) over ~3 s,
  // then recycle. GOLDEN-SAFE BY CONSTRUCTION: the pool starts EMPTY — every quad is
  // visible=false / opacity 0 and `alive=false`. Quads are only ever born inside the
  // live (fdt>0) update via the seeded emit timer; under capture fdt=0, so emit never
  // fires and nothing is ever drawn. The frozen first frame therefore renders ZERO
  // smoke quads regardless of where the source sits, so the dusk baseline is unchanged.
  const createSmokeEmitter = (source) => {
    const POOL = reducedFidelity ? 4 : 6;
    const group = new THREE.Group();
    const quadGeo = new THREE.PlaneGeometry(0.7, 0.7);
    const puffs = [];
    for (let i = 0; i < POOL; i++) {
      // Each quad owns its material (per-mesh, M0-compliant single-source dressing) so
      // opacity fades independently. Grey-violet, additive-free, no depth write.
      const mat = new THREE.MeshBasicMaterial({
        color: 0x6a5d72, transparent: true, opacity: 0, depthWrite: false,
      });
      const m = new THREE.Mesh(quadGeo, mat);
      m.visible = false; // born invisible — capture (fdt=0) never flips this
      group.add(m);
      puffs.push({ mesh: m, mat, age: 0, life: 0, alive: false, drift: 0, seed: 0 });
    }
    scene.add(group);
    let emitTimer = 0.6; // first puff after a beat — never at the frozen first frame
    const base = toVec(source.x, source.y, source.h); // chimney-mouth world point
    const step = (fdt, windX) => {
      if (fdt <= 0) return; // FROZEN: no emit, no advance — pool stays all-invisible
      emitTimer -= fdt;
      // Advance live puffs; rise + drift + fade, recycle when spent.
      for (const pf of puffs) {
        if (!pf.alive) continue;
        pf.age += fdt;
        const k = pf.age / pf.life; // 0→1 over lifetime
        if (k >= 1) { pf.alive = false; pf.mesh.visible = false; pf.mat.opacity = 0; continue; }
        const rise = pf.age * (0.55 + 0.15 * pf.seed); // +Y climb
        const drift = (windX * 0.6 + 0.2) * pf.age + Math.sin(pf.age * 1.3 + pf.seed * 6.0) * 0.12;
        pf.mesh.position.set(base.x + drift, base.y + rise, base.z + pf.drift);
        const grow = 1 + k * 1.8; // billow outward as it rises
        pf.mesh.scale.setScalar(grow);
        // Fade in over the first 15%, out over the rest. Peak ~0.16 (low, smoky).
        pf.mat.opacity = 0.16 * Math.min(1, k / 0.15) * (1 - k);
        pf.mesh.rotation.z += fdt * (0.2 + pf.seed * 0.3); // lazy curl
      }
      if (emitTimer <= 0) {
        emitTimer = 0.7 + Math.random() * 0.5; // ~0.7–1.2 s cadence (live-only)
        const pf = puffs.find((q) => !q.alive);
        if (pf) {
          pf.alive = true; pf.age = 0; pf.life = 2.8 + Math.random() * 0.6;
          pf.seed = Math.random();
          pf.drift = (Math.random() - 0.5) * 0.18; // small lateral spread (world z)
          pf.mesh.visible = true;
          pf.mesh.position.copy(base);
          pf.mesh.scale.setScalar(1);
          pf.mesh.rotation.set(0, 0, Math.random() * Math.PI);
          pf.mat.opacity = 0;
        }
      }
    };
    return { step };
  };
  // Two hero sources: the blacksmith stovepipe (24.8, 13.8) and the hotel chimney
  // (18.4, 13.6). Heights land at each building's pipe/chimney mouth. Even though the
  // hotel sits inside the eastward capture frustum, smoke is provably absent under
  // capture (pool born empty, emit is fdt>0-only) so the dusk baseline is safe.
  const smokeEmitters = [
    createSmokeEmitter({ x: 24.95, y: 13.92, h: 5.4 }), // blacksmith stone stovepipe top
    createSmokeEmitter({ x: 18.4, y: 12.4, h: 6.0 }),   // hotel roofline / chimney mouth
  ];

  const stepWorld = (dt) => {
    const frozen = visualCapture || _devCaptureFrozen;
    const fdt = frozen ? 0 : dt;
    for (const tw of tumbleweeds) tw.step(fdt, waterTime, weather.windSpeed);
    for (const bf of birdFlocks) bf.step(fdt, waterTime, player.position.x, player.position.z);
    // R1.1 — windmills turn; per-rotor seed desynchronizes the cadence, weather
    // windSpeed scales the rate. fdt=0 under ?visual keeps the golden baseline
    // at the build pose.
    for (const w of WINDMILL_ROTORS) w.rotor.rotation.z -= fdt * weather.windSpeed * (1.1 + 0.45 * Math.sin(waterTime * 0.31 + w.seed));
    // Slice mood: hold golden hour — advance the day clock very slowly so a
    // free-roam session stays in warm light instead of rolling to night.
    // (DEV_LOCK_DAYLIGHT freezes the clock at `day` so test captures stay bright.)
    if (!DEV_LOCK_DAYLIGHT) tickClock(clock, fdt * 0.15);
    applyDayTime();
    atmosphere.driftClouds(fdt, 1 + weather.wind * 2);
    waterTime += fdt;
    water.uniforms.time.value = waterTime;
    for (const mw of meridianWaters) mw.uniforms.time.value = waterTime;
    // Lamp flicker — per-lamp intensity pulse with personality tiers (B2). Seeds keep
    // adjacent lamps out of phase. Skipped when frozen (captureMode / visualCapture
    // sets fdt=0), so the golden baseline holds every lamp at its authored intensity.
    // Intensity-only (forge also warms hue) — lights never move, no geometry touched.
    if (fdt > 0 && lampFlickers.length) {
      for (const lf of lampFlickers) {
        const t = waterTime + lf.seed;
        let mul;
        if (lf.kind === "steady") {
          mul = 0.92 + 0.08 * Math.sin(t * 3.2);
        } else if (lf.kind === "forge") {
          // Warmer two-frequency flicker, slightly larger amplitude (live coals).
          mul = 0.86 + 0.14 * (0.6 * Math.sin(t * 3.1) + 0.4 * Math.sin(t * 7.3));
        } else {
          // guttering: a steady-ish base with a seeded slow gutter — a brief dip
          // toward ~0.6 roughly every several seconds. Phase is per-lamp via seed.
          const base = 0.9 + 0.06 * Math.sin(t * 2.6);
          const cyc = ((t * 0.13) % 1 + 1) % 1; // 0..1 over ~7.7 s, seed-shifted
          const dip = cyc < 0.06 ? (1 - Math.sin((cyc / 0.06) * Math.PI)) : 1; // brief gutter
          mul = base * (0.6 + 0.4 * dip);
        }
        lf.light.intensity = lf.base * mul;
      }
    }
    // B4 — wind-sway: tiny lean on tagged stake-props, applied as a delta off each
    // node's stored base rotation.z so it never drifts. fdt-gated → frozen under
    // capture (and the model stream often isn't even collected yet at capture time).
    if (fdt > 0 && windSwayers.length) {
      for (const sw of windSwayers) {
        sw.node.rotation.z = sw.baseZ + Math.sin(waterTime * sw.cfg.freq + sw.cfg.phase) * sw.cfg.amp;
      }
    }
    // B1 — chimney smoke: rises + drifts downwind. Pool is empty until the first
    // live emit, so fdt=0 (capture) renders zero quads — the golden frame is clean.
    for (const sm of smokeEmitters) sm.step(fdt, weather.windSpeed);
    // Window-glow schedule — panes + their warmth lights light up from dusk through
    // night and quiet down by day. Driven by clock.dayTime (NOT fdt-gated) so it's
    // correct under the freeze too: dusk pins to p=0.5 → glow 1.0 → the authored
    // 0.28 emissive, leaving the golden dusk baseline byte-identical.
    if (windowGlows.panes.length || windowGlows.lights.length) {
      const glow = calcWindowGlowFactor(clock.dayTime); // pure, unit-tested in timeOfDay
      for (const mat of windowGlows.panes) {
        mat.emissiveIntensity = mat.userData.windowPaneBase * (0.16 + 0.84 * glow);
      }
      for (const wg of windowGlows.lights) {
        wg.light.intensity = wg.base * (0.12 + 0.88 * glow);
      }
    }
    water.uniforms.skyTint.value.set(appliedPalette.sky.horizon);
    for (const mw of meridianWaters) mw.uniforms.skyTint.value.set(appliedPalette.sky.horizon);
    const { flash } = weatherSys.update(weather, fdt, {
      frozen,
      cx: camera.position.x,
      cz: camera.position.z,
    });
    // R2.2 — biome fog: marsh thickens (ground mist), bluffs thin (dry air),
    // ranch +10%. Spawn sits in the default zone so the dusk capture frame is
    // unchanged; the multiplier blends over ~15u as the player crosses zones.
    if (scene.fog) scene.fog.density = (appliedPalette.fog.density + weather.fogBoost) * localFogBoost(player.position.x, player.position.z);
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
      if (e.code === "Digit3") toggleFieldMapMode();
    });
  }

  // The six HUD panels boot with .hud-hidden (declared in index.html). On Ride we
  // arm the transition (.hud-reveal) and lift the hidden class in a stagger so the
  // HUD blooms in as the establishing push-in plays — the first look is the world,
  // not a wall of UI. Ordered: objective+map first (where am I / what to do), then
  // identity, then controls, then the jobs list as the push-in settles.
  const HUD_PANEL_IDS = ["hero-panel", "field-map", "job-tracker", "objective", "hotbar", "command-dock"];
  function revealHudPanels() {
    HUD_PANEL_IDS.forEach((id) => document.getElementById(id)?.classList.add("hud-reveal"));
    const show = (id, delay) => {
      const el = document.getElementById(id);
      if (el) setTimeout(() => el.classList.remove("hud-hidden"), delay);
    };
    show("objective", 700);
    show("field-map", 700);
    show("hero-panel", 1100);
    show("hotbar", 1500);
    show("command-dock", 1500);
    show("job-tracker", 1900);
  }

  // Title screen: Ride dismisses it, which unlocks audio (the click is the
  // gesture — the harmonica sting lands right on the reveal), grabs pointer
  // lock, and releases the establishing push-in (held while titleOpen).
  const titleScreen = document.getElementById("title-screen");
  let titleOpen = false;
  if (titleScreen) {
    if (visualCapture) {
      titleScreen.remove(); // golden baseline must never see the overlay
      // No staggered reveal under capture — show the HUD immediately so a manual
      // ?visual load isn't stuck behind .hud-hidden (the capture script also
      // display:none's the panels, so the golden frame is unaffected either way).
      HUD_PANEL_IDS.forEach((id) => document.getElementById(id)?.classList.remove("hud-hidden"));
    } else {
      titleOpen = true;
      const startButton = titleScreen.querySelector("#title-start");
      startButton?.addEventListener("click", () => {
        titleOpen = false;
        titleScreen.classList.add("dismissed");
        setTimeout(() => titleScreen.remove(), 1000); // matches the CSS fade
        revealHudPanels();
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
      character = await createAnimatedCharacter(PLAYER_MODEL_URL, { clipMap: HERO_CLIP_MAP });
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
  character.group.scale.setScalar(playerModelLoaded ? HERO_MODEL_SCALE : 1.04);
  character.modelUrl = playerModelLoaded ? PLAYER_MODEL_URL : "/models/character.glb";
  const playerReadability = createPlayerReadabilityRig();
  character.group.add(playerReadability.group);
  setPlayerMarkerVisibility(playerReadability, debugPlayerMarker && !visualCapture);
  scene.add(character.group);
  const heroSilhouetteAccent = createHeroSilhouetteAccent();
  scene.add(heroSilhouetteAccent.group);
  // F → play the one-shot "draw" clip (no-op on the placeholder fallback).
  // Suppressed while mounted: F is also the dismount key, and drawing a weapon
  // while climbing off the horse reads as a bug.
  if (typeof window !== "undefined") {
    window.addEventListener("keydown", (e) => {
      if (e.code === "KeyF" && !player.isMounted) character.playOnce?.("draw");
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

  if (import.meta.env.DEV && typeof window !== "undefined") {
    // Dev-only debug API (__westward3dStats perf probe + __spike live-tuning/teleport).
    // DEV-gated like __westward3dTest below so Vite tree-shakes it — and its console
    // logging — out of the production bundle.
    // Perf probe for the visual-upgrade stages: draw calls / triangles straight
    // from renderer.info, plus a scene walk for shadow-caster count.
    window.__westward3dStats = () => {
      let casters = 0;
      let meshes = 0;
      const mats = new Set();
      scene.traverse((o) => {
        if (o.isMesh) {
          meshes += 1;
          if (o.castShadow) casters += 1;
          if (o.material) {
            if (Array.isArray(o.material)) o.material.forEach((m) => mats.add(m));
            else mats.add(o.material);
          }
        }
      });
      return {
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        meshes,
        materials: mats.size, // distinct material objects in the scene
        programs: renderer.info.programs?.length ?? null, // compiled shader programs (the compile-storm metric)
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
      // --- Mounted free-roam (the Open Range slice) — inspect without driving ---
      mount: () => { player.setMounted(true); setRiderVisual(true); return player.isMounted; },
      dismount: () => { player.setMounted(false); setRiderVisual(false); return player.isMounted; },
      // Teleport to a frontier POI to test the discovery loop (e.g. __spike.rideTo("frontier_old_well")).
      rideTo: (poiId) => {
        const poi = (POI_DEFINITIONS.frontier || []).find((p) => p.id === poiId);
        if (poi) player.setPosition({ x: poi.x, z: poi.y });
        return poi || null;
      },
      // Snap the follow-cam to sit behind a given heading (radians; 0 = facing
      // forward (0,-1) = north, +PI/2 = east). For establishing captures.
      setHeading: (yaw = 0) => { player.resetCameraBehind(yaw); return yaw; },

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

      // Dial the funeral graveside camera live (only visible during the funeral cold-
      // open). Offsets are from the grave; settled = grave+(dx,dy,dz), wide adds
      // (wdx,wdy,wdz), gaze aims at lookY. Example, pull the camera further east + up:
      //   __spike.setFuneralCam({ dx: 8, dy: 3.4 })   then  __spike.dumpFuneralCam()
      setFuneralCam(params = {}) {
        Object.assign(funeralCam, params);
        console.log("[__spike] funeralCam", JSON.stringify(funeralCam));
        return { ...funeralCam };
      },
      // Print the current funeral-camera offsets — paste into the funeralCam default.
      dumpFuneralCam() {
        const out = JSON.stringify(funeralCam, null, 2);
        console.log("[__spike] dumpFuneralCam:\n" + out);
        return out;
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
  // Deep water blocks; the ford is the one walkable crossing. The collision boxes
  // come from the SAME waterLayout records that built the meshes, so the water you
  // see is the water that stops you. (Built here, before the spawn block, so the
  // resume sanity-clamp below can test the saved position against world collision.)
  const proxies = buildProxies(snapshot.worldObjects).concat(waterCollisionBoxes());
  // The rideable horse sits at the steelMustang mark by spawn (16.2, 12.0). Keep the
  // placement object as a named, MUTABLE binding: the horse-follow loop rewrites its
  // x/y each frame from the live mesh so the "E — Mount Up" prompt tracks the horse
  // (including after a whistle-recall), not the empty original mark.
  const MOUNT_SPOT = { x: 16.2, y: 12.0 };
  const mountPlacement = { kind: "mountHorse", label: "Steel Mustang", x: MOUNT_SPOT.x, y: MOUNT_SPOT.y };
  const mountObjects = snapshot.worldObjects.concat([mountPlacement]);
  // Rideable horse — reuse the hitched-horse model as the mount.
  let horseNode = null;
  try {
    const horseEntry = modelFor("horseHitched"); // { url: "/models/horse_hitched.glb", scale: 1.0, vary: true }
    horseNode = await instanceModel(horseEntry.url, {
      x: MOUNT_SPOT.x,
      z: MOUNT_SPOT.y,
      y: groundHeight(MOUNT_SPOT.x, MOUNT_SPOT.y),
      yaw: -1.2,
      scale: horseEntry.scale,
    });
    scene.add(horseNode);
  } catch (err) {
    console.warn("[render3d] rideable horse model failed to load", err);
  }
  // Spawn placement. The funeral/implant cold-open ALWAYS opens at the canonical
  // graveside — it wins over resume on purpose: there is no value in restoring a
  // drifted position during the funeral beat, and doing so is exactly what re-pinned
  // returning players to the old "clogged closet" (the saved position survived the
  // graveside relocation). Every other phase restores the saved position, snapped
  // out of any collider / out-of-bounds drift by clampResumedPosition.
  if (loopState.phase === "funeral" || loopState.phase === "implant") {
    // Abram's grave sits out on the open range north of town — a lone frontier
    // baron's plot. Stand a few paces NORTH of the casket, facing SOUTH (yaw π) so the
    // establishing shot reads across open range → the casket → Westward as a distant
    // skyline → sky: the empire he built, framed behind the man who built it. Walk
    // south and press E to pay respects; the implant beat then carries you into town.
    player.setPosition({ x: GRAVESIDE_SPAWN.x, z: GRAVESIDE_SPAWN.z });
    player.resetCameraBehind(GRAVESIDE_SPAWN.yaw);
    player.setCameraPreset("shoulder", { distance: 10, height: 6, lookHeight: 1.2, shoulder: 0.3 });
  } else if (resumeRun && Number.isFinite(resumeRun.player?.x) && Number.isFinite(resumeRun.player?.z)) {
    // Ironman resume: restore saved position + heading (best-effort), but eject any
    // position that drifted inside a collider or outside the playable bounds so a
    // corrupt/legacy save can never strand the player inside geometry.
    const safe = clampResumedPosition(
      { x: resumeRun.player.x, z: resumeRun.player.z },
      proxies,
      OPEN_RANGE_BOUNDS,
    );
    player.setPosition(safe);
    if (Number.isFinite(resumeRun.player?.yaw)) player.resetCameraBehind(resumeRun.player.yaw);
  }
  const promptEl = document.getElementById("prompt");
  const beatToast = createBeatToast(document);
  let currentPromptText = "";
  const setPromptText = (t) => {
    currentPromptText = t || "";
    if (!promptEl) return;
    if (promptEl.textContent !== t) promptEl.textContent = t;
    promptEl.hidden = !t;
    // The Executor (your father's ghost in your skull) speaks in cyan chrome —
    // distinct from townsfolk speech and interaction prompts.
    promptEl.classList.toggle("executor", typeof t === "string" && t.startsWith("Executor:"));
  };
  let encounter = null;
  const interaction = createInteractionSystem({
    worldObjects: mountObjects,
    setPromptText,
    // The rideable horse is a free-roam affordance, not a scripted phase beat: it waits
    // and you can walk up and mount from the first second. So mountHorse is interactable
    // off the phase gate — but ONLY while on foot. Mid-ride the horse mesh rides under
    // the player and the per-frame anchor sync (below) mirrors that onto mountPlacement,
    // so the mount object would sit on the rider (distance ~0, inside the 2.6 radius) and
    // flash "E — Mount Up" the entire ride. Gating on !player.isMounted (the same latch
    // the whistle uses) suppresses that and stops a redundant re-fire of the mount
    // handler. Every other target stays gated to the active loop phase.
    isTargetEnabled: (target) =>
      (target?.kind === "mountHorse" && !player.isMounted) || loopState.isTargetEnabled(target),
    getPromptText: (target) => {
      // mountHorse is a free-roam affordance with no active loop phase, so
      // loopState.getPromptForTarget returns "" — surface its static prompt so the
      // "E — Mount Up" affordance is actually visible (the gate alone was invisible).
      if (target?.kind === "mountHorse") return promptFor(target);
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
  // Field map: route view during the first-road loop, world view in free roam;
  // Digit3 (the hotbar's "3 = Map") flips the view manually. The active courier
  // beat (questRuntime) renders as the world view's target marker.
  let mapModeOverride = null;
  const syncLiveFieldMap = () => syncFieldMapDom(fieldMapRefs, loopState.state, {
    playerPosition: player.position,
    playerYaw: player.yaw,
    mode: resolveFieldMapMode(loopState.state, mapModeOverride),
    jobTarget: questMapTarget(game.world.jobs),
  });
  const toggleFieldMapMode = () => {
    const auto = resolveFieldMapMode(loopState.state, null);
    mapModeOverride = mapModeOverride ? null : auto === "route" ? "world" : "route";
    syncLiveFieldMap();
  };
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
    // Current HP comes from the resume payload; the bar's max stays the fixed
    // PLAYER_MAX_HP so a wounded resume reads e.g. 26/40 (not 26/26). Slime resumes at
    // the persisted hit count so a mid-fight quit doesn't re-fight a credited slime.
    initialPlayerHp: resumeRun?.loopState?.encounterState?.playerHp ?? PLAYER_MAX_HP,
    maxPlayerHp: PLAYER_MAX_HP,
    initialSlimeHits: resumeRun?.loopState?.encounterState?.slimeHits ?? 0,
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
  // Footfall dust — small tan puffs kicked up at the player's feet while walking.
  // Its own pool (combat's burst pool throws debris-like chunks, wrong for dust):
  // flat ground discs that rise a little, expand, and fade. Emits on distance
  // travelled so cadence matches stride, not framerate. Only runs in live play
  // (gated !visualCapture by the caller), so the frozen golden frame is untouched.
  const footDust = (() => {
    const N = 10;
    const geo = new THREE.CircleGeometry(0.14, 12);
    const grp = new THREE.Group();
    const slots = [];
    for (let i = 0; i < N; i++) {
      const m = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({ color: col("#c2a878"), transparent: true, opacity: 0, depthWrite: false }),
      );
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      m.renderOrder = -1;
      grp.add(m);
      slots.push({ m, life: 0, max: 0, vy: 0 });
    }
    scene.add(grp);
    let cur = 0, sinceEmit = 0, lastX = null, lastZ = null;
    return {
      update(pos, moving, running, dt) {
        if (moving) {
          if (lastX === null) { lastX = pos.x; lastZ = pos.z; }
          const d = Math.hypot(pos.x - lastX, pos.z - lastZ);
          lastX = pos.x; lastZ = pos.z;
          const step = footDustStep(d, sinceEmit, running ? 0.8 : 1.1);
          sinceEmit = step.sinceEmit;
          if (step.emit) {
            const sl = slots[cur]; cur = (cur + 1) % N;
            sl.m.position.set(pos.x + (Math.random() - 0.5) * 0.22, 0.05, pos.z + (Math.random() - 0.5) * 0.22);
            sl.m.scale.setScalar(0.6);
            sl.max = 0.55; sl.life = sl.max; sl.vy = 0.5;
            sl.m.visible = true;
          }
        } else { lastX = pos.x; lastZ = pos.z; }
        for (const sl of slots) {
          if (sl.life <= 0) continue;
          sl.life -= dt;
          if (sl.life <= 0) { sl.m.visible = false; continue; }
          const k = sl.life / sl.max; // 1 → 0
          sl.m.material.opacity = 0.32 * k;
          sl.m.scale.setScalar(0.6 + (1 - k) * 1.2); // expand as it settles
          sl.m.position.y += sl.vy * dt; sl.vy *= 0.9;
        }
      },
    };
  })();
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
    const max = st.playerMaxHp || PLAYER_MAX_HP;
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
  const restingPreset = () =>
    loopState.phase === "funeral" || loopState.phase === "implant"
      ? "graveside"
      : loopState.phase === "slime_fight" ? "combat" : "shoulder";

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
  // Real-time combat owns the slime fight: trySwing() → playerCombat hitbox →
  // encounter.registerHit() in the update loop is the SOLE live damage path.
  // This interaction handler used to also call encounter.strike() on the same E
  // press, landing a second hit ~0.12s later (the 3-HP slime died in ~2 taps).
  // It now defers entirely to the swing. (encounter.strike() is retained for the
  // driveToPhase debug helper and the unit tests.)
  const handleRoadSlime = () => {};
  const handleBrokenWagon = () => {
    if (loopState.phase !== "wagon_salvage") return;
    focusBeat("inspection", 0.95);
    advance("inspect_wagon");
    // Grant the story Map Scrap the objective asks Boone to be returned, alongside
    // the camp loot beat — the toast below now reflects what the player actually holds.
    const salvage = salvageWagon(game, { rng: lootRng });
    syncPlayerHud();
    onRunMutated(); // loot landed after advance()'s save — persist it
    beatToast.show("Map Scrap Found", `+ Map Scrap. ${salvage.drop.summary}`);
  };
  // Mission 1.1 "Dust to Dust" — the funeral + the implant. funeral → implant →
  // (spawn) hands off to the normal first-road loop with the Executor riding along.
  const handleGravesite = () => {
    if (loopState.phase === "funeral") {
      focusBeat("inspection", 0.9);
      advance("attend_funeral");
      audioView?.play("chime");
      npcSpeechMsg = "Executor: \"So you came. He'd have marked who didn't.\"";
      npcSpeechT = 6;
      setPromptText(npcSpeechMsg);
      beatToast.show("Dust to Dust", "Abram Cross is in the ground. The iron doctor lifts the casket's implant — your inheritance.");
    } else if (loopState.phase === "implant") {
      advance("install_implant");
      npcSpeechMsg = "Executor: \"Better. Now stop sniveling — we've a territory to hold and roads to ride.\"";
      npcSpeechT = 6;
      setPromptText(npcSpeechMsg);
      beatToast.show("Neural Sync", "The Executor is live. Your father is in your skull now.");
      // Implant done — ride into town; release the casket gaze and drop to the
      // normal first-road spawn + cam.
      player.setLookTarget(null);
      player.setPosition({ x: PLAYER_SPAWN.x, z: PLAYER_SPAWN.y });
      player.resetCameraBehind(-0.9);
      player.setCameraPreset("shoulder");
      // Re-arm the establishing push-in so the camera EASES into the road framing
      // instead of hard-snapping across the ~28u teleport from the graveside. Now
      // that the phase has left funeral/implant, the spawn push-in branch owns the
      // camera and glides it in (and reveals the job board on a fresh run).
      camIntroSettled = false;
      camIntroStart = null;
    }
  };

  interaction.registerHandler("gravesite", handleGravesite);
  interaction.registerHandler("jobBoard", handleJobBoard);
  interaction.registerHandler("roadSign", handleRoadSign);
  interaction.registerHandler("townBark", handleTownBark);
  interaction.registerHandler("smokeCache", handleSmokeCache);
  interaction.registerHandler("slimeTell", handleSlimeTell);
  interaction.registerHandler("roadSlime", handleRoadSlime);
  interaction.registerHandler("brokenWagon", handleBrokenWagon);

  function setRiderVisual(mountedNow) {
    if (horseNode) horseNode.visible = !mountedNow; // rail horse hides while you ride it
    // The hero stays visible as the rider; the saddle camera lifts to frame both.
  }
  interaction.registerHandler("mountHorse", () => {
    player.setMounted(true);
    setRiderVisual(true);
    audioView?.play("uiTick");
  });

  let horseCalled = false; // whistle-to-call latch (on-foot only)
  const onHorseKeys = (e) => {
    if (e.code === "KeyF" && player.isMounted) {
      player.setMounted(false);
      setRiderVisual(false); // horse stays visible at the spot you dismounted
      audioView?.play("uiTick");
    } else if (e.code === "KeyH" && !player.isMounted) {
      horseCalled = true; // the horse will ease toward you in the loop
      audioView?.play("uiTick");
    }
  };
  document.addEventListener("keydown", onHorseKeys);

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
          gravesite: handleGravesite,
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
    // The phase FSM never records live mid-fight slime hits (slimeHits is 0 until the
    // killing blow flips it to 3) or live playerHp, so overlay BOTH from the live
    // encounter — otherwise a wounded, mid-fight quit resumes the slime at full HP
    // while the kill ledger already credited the strikes.
    const encounterState = overlayLiveEncounterState(snap.encounterState, encounter?.getState?.());
    const pos = player?.position || { x: 0, z: 0 };
    return buildRunPayload({
      mode: runMode,
      seed: runSeed,
      time: runElapsed,
      player: { x: pos.x, z: pos.z, yaw: Number.isFinite(player?.yaw) ? player.yaw : 0 },
      loopState: { ...snap, encounterState },
      world: {
        dayTime: clock.dayTime,
        weatherKind: snapshot.weather?.kind || "clear",
        poisDiscovered: snapshot.regions?.poisDiscovered || [],
      },
      runStats: { startedAt: runStartedAt, phaseReached: snap.phase },
      game: buildGameSaveSlice(game),
      ...overrides,
    });
  }
  // Save-safety: when the boot load FAILED (saveLoadFailed), a real ironman save may
  // exist but couldn't be read. Every write path below no-ops for the rest of the
  // session so a fresh session can't clobber that existing-but-unread save. A clean
  // null (no save) leaves saveLoadFailed false and autosaves normally.
  function persistRun() {
    if (visualCapture || saveLoadFailed || runMode !== "playing") return;
    writeRun(currentRunPayload())
      .then(() => {
        saveMgr.onSaveSuccess();
        saveHealth.recordSuccess();
        syncSaveHealthHud();
      })
      .catch((err) => {
        // Record the miss regardless of DEV — a streak must surface to the player.
        saveHealth.recordFailure();
        syncSaveHealthHud();
        if (import.meta.env?.DEV) console.warn("[render3d] run save failed", err);
      });
  }
  function onRunMutated() {
    if (visualCapture || saveLoadFailed || runMode !== "playing") return;
    saveMgr.markDirty();
    persistRun();
  }
  function sealCurrentRun(cause) {
    if (visualCapture || runMode !== "playing") return;
    runMode = "sealed";
    // Don't seal-over an existing-but-unread save either: a failed load means the slot
    // may hold a live run we never saw. Still surface the summary; just skip the write.
    if (!saveLoadFailed) {
      sealRun(currentRunPayload({ mode: "sealed" }), cause)
        .catch((err) => { if (import.meta.env?.DEV) console.warn("[render3d] seal failed", err); });
    }
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
      // The fresh run opens at the funeral cold-open, so seed the saved position at the
      // graveside (not the road spawn) — keeps the persisted run self-consistent even
      // though the funeral/implant spawn block overrides it on boot.
      player: { x: GRAVESIDE_SPAWN.x, z: GRAVESIDE_SPAWN.z, yaw: GRAVESIDE_SPAWN.yaw },
      // Match the fresh-boot path (line ~2432): a new run must carry the dust_to_dust
      // mission so the respawn replays the funeral cold-open instead of booting at "spawn".
      loopState: createLoopStateMachine({ activeMission: "dust_to_dust" }).state,
      world: { dayTime: 0.25, weatherKind: snapshot.weather?.kind || "clear" }, // golden-hour opening, same as a fresh boot
      runStats: { startedAt: Date.now() },
    });
    // Wipe the slot (primary + rotated backups) BEFORE writing the fresh run so a stale
    // funeral position can't be resurrected from a backup, then reload into the new run.
    clearRun()
      .then(() => writeRun(fresh))
      .finally(() => { if (typeof location !== "undefined") location.reload(); });
  }
  // On-quit best-effort flush, fire-and-forget. pagehide + visibilitychange
  // cover tab close/switch.
  if (!visualCapture && typeof window !== "undefined") {
    const flush = () => { if (runMode === "playing") persistRun(); };
    window.addEventListener("pagehide", flush);
    window.addEventListener("visibilitychange", () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") flush();
    });
    // Tear down the mount/whistle keydown listener on page teardown so a
    // re-run of startSpike (dev hot path) doesn't stack duplicate listeners.
    window.addEventListener("pagehide", () => document.removeEventListener("keydown", onHorseKeys));
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
  let discoveryHoldT = 0; // holds a fresh discovery line on screen before the prompt restores
  let hudDimState = null; // free-roam HUD melt timer ({dimmed,idleT}); null = visible at boot
  // Establishing push-in: for the first CAM_INTRO_DUR seconds at spawn the camera
  // eases from a wide/high vantage into the gameplay framing. Gated to spawn (no
  // active beat focus, no modal, not visual capture) so it never fights focusBeat or
  // the golden-image gate. Driven by WALL-CLOCK elapsed (not accumulated dt) so it
  // settles correctly even if rAF is throttled (e.g. a backgrounded tab renders only
  // sparse frames — each still computes true elapsed time and lands settled).
  let camIntroStart = null;
  const CAM_INTRO_DUR = 3.2; // a touch longer so the board reveal breathes (wall-clock driven, throttle-safe)
  let camIntroSettled = false;
  // The opening reveal SWEEPS the gaze from the open-range / north-mesa skyline
  // down to Boone's lit job board (the first objective): the first look is the big
  // country, then the eye is led to the first job — not a worm's-eye stare into the
  // frontage wall. Only on a genuine fresh spawn; a resumed run that repositions the
  // player skips the reveal. The vista is up-and-out (the north mesas sit at world
  // y≈-6.8, so z is negative and y is lifted above the rooftops to catch the ridge +
  // sky); x≈board so the sweep reads as a depth/height lift, not a horizontal whip.
  const introRevealEligible = !(resumeRun && Number.isFinite(resumeRun.player?.x) && Number.isFinite(resumeRun.player?.z));
  const introLookTarget = { x: openingTarget.x + 0.3, y: 1.5, z: openingTarget.y + 0.1 };
  const introVistaTarget = { x: 13.0, y: 6.0, z: -6.0 };
  // Funeral cold-open: a bespoke, fixed graveside camera (NOT the follow-cam, whose
  // behind-the-player vantage sits inside the town and jams against a storefront
  // wall). It looks DOWN at the casket from above the rooftops, so ground + grave +
  // mourner + long golden-hour shadows fill the frame — no wall — and eases in once
  // the player Rides past the title. graveLookTarget is the casket aim point.
  const FUNERAL_INTRO_DUR = 4.0;
  const graveLookTarget = graveFocusPoint ? { x: graveFocusPoint.x, y: 0.85, z: graveFocusPoint.z } : null;
  let funeralCamStart = null; // wall-clock start of the graveside ease (set on first post-Ride frame)
  // Tunable graveside-camera offsets from the grave (live-dial via __spike.setFuneralCam,
  // then dumpFuneralCam to persist). Settled = grave + (dx,dy,dz); wide establishing
  // adds (wdx,wdy,wdz); the gaze aims at (grave.x, lookY, grave.z). Default: an east-
  // side profile that clears the Back Row buildings between the player and the grave.
  const funeralCam = { dx: 6.5, dy: 2.8, dz: 1.5, wdx: 2.0, wdy: 1.4, wdz: 1.0, lookY: 0.85 };
  function loop(now = performance.now()) {
    // dt in seconds, clamped to keep big tab-resume jumps from teleporting.
    // Hit-stop scales the loop dt on a connecting strike (freeze-frame punch); the
    // freeze itself is advanced by real dt. Bypassed under visualCapture.
    const rawDt = Math.min((now - prevTs) / 1000, 0.05);
    prevTs = now;
    const dt = visualCapture ? rawDt : rawDt * hitStop.scale(rawDt);
    if (!camIntroSettled && (loopState.phase === "funeral" || loopState.phase === "implant")) {
      // The funeral framing is owned by the bespoke graveside camera applied after
      // player.update (below) — the follow-cam's behind-the-player vantage sits in
      // the town and jams against a storefront wall. Just mark the establishing
      // intro handled so the road push-in doesn't fire when the funeral ends.
      camIntroSettled = true;
    } else if (!camIntroSettled && !visualCapture && !titleOpen && beatFocusTimer === 0 && !boardModalController.isOpen()) {
      if (camIntroStart === null) camIntroStart = now; // first eligible frame
      const elapsed = (now - camIntroStart) / 1000;
      const k = Math.pow(1 - Math.min(1, elapsed / CAM_INTRO_DUR), 2); // ease-out
      const base = CAMERA_PRESETS.shoulder;
      if (k > 0.004) {
        // Sweep the gaze from the north-mesa vista down to the board as the push-in
        // eases in. The squared `k` drives the camera PULL-IN (snappy); the gaze
        // wants a steadier sweep, so blend on a LINEAR `gz` (1 = vista → 0 = board)
        // over the full duration. The controller's own lookAt lerp eases the landing
        // so it settles onto the board rather than snapping.
        if (introRevealEligible) {
          const gz = 1 - Math.min(1, elapsed / CAM_INTRO_DUR);
          player.setLookTarget({
            x: introLookTarget.x + (introVistaTarget.x - introLookTarget.x) * gz,
            y: introLookTarget.y + (introVistaTarget.y - introLookTarget.y) * gz,
            z: introLookTarget.z + (introVistaTarget.z - introLookTarget.z) * gz,
          });
        }
        player.setCameraPreset("shoulder", {
          distance: base.distance + k * 6.0,
          height: base.height + k * 3.2,
        });
      } else {
        player.setCameraPreset("shoulder"); // settle to the gameplay preset once
        if (introRevealEligible) player.setLookTarget(null); // release gaze to normal follow
        camIntroSettled = true;
      }
    }
    if (!boardModalController.isOpen()) player.update(dt, proxies);
    if (horseNode) {
      if (player.isMounted) {
        // Mounted: the horse rides under you, facing your heading.
        horseNode.position.set(player.position.x, groundHeight(player.position.x, player.position.z), player.position.z);
        horseNode.rotation.y = player.yaw;
      } else if (horseCalled) {
        // Whistle-to-call: ease the horse toward you; stop when it arrives.
        const dx = player.position.x - horseNode.position.x;
        const dz = player.position.z - horseNode.position.z;
        const dist = Math.hypot(dx, dz);
        // Stop the whistle-recall just INSIDE the mount radius so a recalled horse halts
        // within mounting range. This 2.5 is coupled to PROMPTS.mountHorse.radius (2.6,
        // interactionSystem.js) — keep stop < radius or a recalled horse stops out of
        // reach and becomes unmountable. Bump one, re-check the other.
        if (dist <= 2.5) {
          horseCalled = false;
        } else {
          const stepLen = Math.min(dist, MOUNT_GAITS.trotSpeed * dt);
          const nx = horseNode.position.x + (dx / dist) * stepLen;
          const nz = horseNode.position.z + (dz / dist) * stepLen;
          horseNode.position.set(nx, groundHeight(nx, nz), nz);
          horseNode.rotation.y = Math.atan2(-dx, -dz); // face its travel direction
        }
      }
      // Keep the "E — Mount Up" prompt anchored to the live horse: mirror the mount
      // interactable's placement (x → world X, y → world Z) to the mesh every frame so
      // the prompt follows the horse after it wanders, is recalled by whistle, or is
      // left where you dismounted — never stranded at the original mark.
      mountPlacement.x = horseNode.position.x;
      mountPlacement.y = horseNode.position.z;
    }
    // Bespoke graveside camera for the funeral cold-open — overrides the follow-cam
    // (whose behind-the-player vantage jams against a town wall). The grave (15,-4)
    // is boxed in: the Back Row buildings sit between the player and the grave to the
    // SOUTH, mesas to the north — so the only clean sightline is from the EAST, at
    // the grave's own latitude (open ground; the line clears the back row). A low
    // profile look down the casket toward the headstone cross, mourner in frame,
    // long golden-hour shadows. Held wide behind the title, eases in once the player
    // Rides. visualCapture boots at the road (not funeral), so the baseline is safe.
    // The funeral now plays in the player's hands: the normal third-person follow-cam
    // (set to "shoulder" at funeral init) frames the walk west to the casket down the
    // open east approach — no locked cinematic cam. graveLookTarget/funeralCam remain
    // for the dev dial (__spike.setFuneralCam) but no longer drive the cold-open.
    void graveLookTarget;
    void funeralCamStart;
    // The tight ±18u shadow frustum rides with the player — without this the
    // marsh/wagon half of the 95u route renders with NO sun shadows at all.
    atmosphere.setShadowFocus(player.position.x, player.position.z);
    if (beatFocusTimer > 0) {
      beatFocusTimer = Math.max(0, beatFocusTimer - dt);
      if (beatFocusTimer === 0) player.setCameraPreset(restingPreset());
    }
    if (visualCapture) applyHeroCamera(); // re-assert hero pose (player.update re-syncs the follow-cam)
    // During the burial the camera sits in the town and the casket is behind the
    // hero — fade anything between the camera and the grave so the shot's subject
    // (the casket) reads instead of the general store's back wall.
    const funeralFocus =
      (loopState.phase === "funeral" || loopState.phase === "implant") && graveFocusPoint
        ? graveFocusPoint
        : null;
    updateOcclusionFades(placementNodes, camera, player.position, funeralFocus);
    // M0 — distance-cull far cactus/deadTree so the open range stops drawing distant
    // flora. Skipped under capture so the dusk golden frame keeps every flora visible.
    if (!visualCapture) {
      const showSq = FLORA_CULL_SHOW * FLORA_CULL_SHOW;
      const hideSq = FLORA_CULL_HIDE * FLORA_CULL_HIDE;
      const px = player.position.x;
      const pz = player.position.z;
      for (const record of placementNodes) {
        if (!FLORA_CULL_KINDS.has(record.kind)) continue;
        const node = record.node;
        const dx = node.position.x - px;
        const dz = node.position.z - pz;
        const distSq = dx * dx + dz * dz;
        const cur = node.userData.floraVisible !== false;
        const next = floraVisibleAt(cur, distSq, showSq, hideSq);
        if (next !== cur) {
          node.userData.floraVisible = next;
          node.visible = next;
        }
      }
    }
    // While a discovery line is held, skip the per-frame prompt refresh so the
    // 'Discovered — ...' text survives the hold window (interactionSystem.update
    // always overwrites the prompt with the nearest one or ""). When the hold
    // expires the restore below re-establishes the normal prompt for that frame.
    if (discoveryHoldT <= 0) interaction.update(player.position);
    // Free-roam discovery: ride within a POI radius -> surface its lore + reward.
    if (!boardModalController.isOpen()) {
      const found = resolveDiscovery(
        snapshot.regions,
        "frontier",
        player.position.x,
        player.position.z,
      );
      if (found) {
        if (found.loot?.gold) grantGold(game, found.loot.gold);
        // Bank the authored item rewards (Potion/Wood/Stone/etc) into the
        // inventory via the canonical grant path, and surface them in the toast
        // so the "arrival pays off" beat is felt, not silently dropped.
        const grantedItems = grantInventoryItems(game, found.loot?.items);
        const itemSuffix = grantedItems.length
          ? `  (+${grantedItems.map((it) => `${it.count} ${it.name}`).join(", +")})`
          : "";
        // found.buff (stamina/HP) has no clean destination on game.player —
        // combat HP/stamina live on the encounter system, not the RPG state tree.
        // Defer buff application to the progression/stat wiring rather than invent
        // a half-baked buff here; items are the shipped win. (See concerns.)
        setPromptText(`Discovered — ${found.label}: ${found.line}${itemSuffix}`);
        discoveryHoldT = 4.0; // hold the line on screen for 4s (drained below)
        audioView?.play("chime");
        if (found.renown) {
          if (found.renown.gold) grantGold(game, found.renown.gold);
          if (found.renown.xp) grantXp(game, found.renown.xp);
          audioView?.play("resolveChime");
        }
        onRunMutated();
      }
    }
    if (discoveryHoldT > 0) {
      discoveryHoldT -= dt;
      if (discoveryHoldT <= 0) interaction.update(player.position); // restore normal prompt
    }
    fieldMapLiveSyncT -= dt;
    if (fieldMapLiveSyncT <= 0) {
      syncLiveFieldMap();
      syncProductionHud(productionHudRefs, loopState.state, encounter.getState(player.position));
      fieldMapLiveSyncT = 0.18;
    }
    // HUD melt: in quiet free-roam the bounty toast / field map / job tracker fade
    // out so the world fills the frame, snapping back near an interactable, with
    // the board open, or mid-combat. Skipped during the funeral/implant beat (those
    // panels are hidden by syncProductionHud and must not pre-accumulate idle) and
    // under visualCapture (the golden frame stays deterministic). Toggles the
    // opacity-only `hud-dimmed` class — it rides on top of the inline display state.
    if (!visualCapture && loopState.phase !== "funeral" && loopState.phase !== "implant") {
      const hudActive = hudIsActive({
        nearestPresent: interaction.nearest != null,
        boardOpen: boardModalController.isOpen(),
        inCombat: loopState.phase === "slime_fight",
      });
      const nextDim = computeHudDimState(hudDimState, { active: hudActive, dt });
      if (!hudDimState || nextDim.dimmed !== hudDimState.dimmed) {
        for (const id of HUD_DIM_PANEL_IDS) {
          document.getElementById(id)?.classList.toggle("hud-dimmed", nextDim.dimmed);
        }
      }
      hudDimState = nextDim;
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
        // Only fire hurt feedback when a lunge actually lands. applyLungeContact()
        // is now cooldown-gated, so during sustained contact most frames deal no
        // damage — shaking/playing the hurt SFX every frame would machine-gun the
        // feedback. Gate shake + SFX on a real HP drop.
        const hpBefore = encounter.getState().playerHp;
        encounter.applyLungeContact();
        if (encounter.getState().playerHp < hpBefore) {
          camShake.add(0.6);
          audioView?.play("playerHurt");
        }
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
    if (!visualCapture) footDust.update(player.position, player.moving, player.running, dt);
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
    // Executor place/event barks — Abram's ghost reacts to crossing the territory
    // and clearing the road. Skipped during capture and the opening funeral/implant
    // beats (the funeral lines own the channel there). Once each, via seenExecutorBarks.
    if (!visualCapture && loopState.phase !== "funeral" && loopState.phase !== "implant") {
      const region = player.position.x < -20 ? "calico" : "westward";
      if (region !== currentRegion) {
        currentRegion = region;
        fireExecutorBark(region === "calico" ? "enter_calico" : "enter_westward");
      }
      if (loopState.phase !== lastBarkPhase) {
        lastBarkPhase = loopState.phase;
        if (loopState.phase === "return_to_boone") fireExecutorBark("bounty_cleared");
      }
      // The moral instrument speaks once when approval first crosses into an extreme.
      const nowApproval = game?.executorApproval ?? 0;
      if (nowApproval !== lastApproval) {
        const crossing = approvalCrossingTrigger(lastApproval, nowApproval);
        lastApproval = nowApproval;
        if (crossing) fireExecutorBark(crossing);
      }
    }
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
        windSpeed: weather.windSpeed,
        worldTime: waterTime,
        playerX: player.position.x,
        playerY: player.position.z,
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
  if (backend === "webgl") {
    scene.traverse((obj) => {
      if (obj.isMesh) {
        let isPlayer = false;
        obj.traverseAncestors((anc) => {
          if (anc === character.group) isPlayer = true;
        });
        if (obj === character.group) isPlayer = true;
        if (!isPlayer) {
          obj.castShadow = false;
        }
      }
    });
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
