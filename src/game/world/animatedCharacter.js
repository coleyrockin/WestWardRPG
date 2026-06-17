// Animated character loader — loads the rigged glTF (character.glb), re-skins it
// to the NPR cel material, and drives a per-instance AnimationMixer that
// crossfades Idle ↔ Walk by movement. Skinned meshes + AnimationMixer are
// confirmed to render on the WebGPURenderer WebGL2 backend (see memory).
//
// SkeletonUtils.clone (not Object3D.clone) is required to instance a skinned mesh
// with a working skeleton — matters once NPCs reuse this rig (slice 3).

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import { createNprMaterial, createHeroDressMaterial } from "../renderer/materials/nprMaterial.js";

const templates = new Map(); // url -> Promise<gltf> (per-url cache, shared across instances)
function loadTemplate(url) {
  if (!templates.has(url)) templates.set(url, new GLTFLoader().loadAsync(url));
  return templates.get(url);
}

function reskin(mesh, tint, dressMat) {
  mesh.castShadow = true;
  // Dressed hero: one shared height-zoned material replaces the mannequin's flat
  // body/joint materials so it reads boots→trousers→shirt→skin (see nprMaterial).
  if (dressMat) {
    mesh.material = dressMat;
    return;
  }
  const swap = (src) => {
    const c = src && src.color ? src.color.clone() : new THREE.Color("#9a8f80");
    if (tint) c.multiply(new THREE.Color(tint));
    return createNprMaterial(`#${c.getHexString()}`, { rimStrength: 0.3, map: src && src.map ? src.map : null });
  };
  mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
}

// Map canonical clip roles (idle/walk/run/draw/turn) onto an asset's actual clip
// names, so a sourced rig whose clips are named Idle_Loop/Walk_Loop/Jog_Fwd_Loop/
// Pistol_Shoot still drives our locomotion + one-shot code unchanged. The original
// lower-cased clip names are preserved; canonical aliases are added on top. A
// mapping whose target clip is missing is skipped (no bad alias).
export function resolveClipAliases(actionsByLowerName, clipMap = {}) {
  const out = { ...actionsByLowerName };
  for (const [role, assetName] of Object.entries(clipMap || {})) {
    const action = actionsByLowerName[String(assetName).toLowerCase()];
    if (action) out[role] = action;
  }
  return out;
}

// opts.tint multiplies every base colour (per-NPC variety reusing one rig).
// opts.clipMap aliases canonical roles → this asset's clip names (see above).
export async function createAnimatedCharacter(url = "/models/character.glb", opts = {}) {
  const gltf = await loadTemplate(url);
  const group = cloneSkinned(gltf.scene);
  const modelStats = {
    meshCount: 0,
    skinnedMeshCount: 0,
    animationNames: gltf.animations.map((clip) => clip.name),
  };
  // opts.dress (true | zones object) → swap the mannequin's flat materials for one
  // shared height-zoned drifter material so it reads as a clothed figure.
  const dressMat = opts.dress ? createHeroDressMaterial(opts.dress === true ? {} : opts.dress) : null;
  group.traverse((o) => {
    if (o.isMesh || o.isSkinnedMesh) {
      modelStats.meshCount++;
      if (o.isSkinnedMesh) modelStats.skinnedMeshCount++;
      reskin(o, opts.tint, dressMat);
    }
  });

  const mixer = new THREE.AnimationMixer(group);
  const rawActions = {};
  for (const clip of gltf.animations) rawActions[clip.name.toLowerCase()] = mixer.clipAction(clip);
  const actions = resolveClipAliases(rawActions, opts.clipMap);
  const idle = actions.idle || null;
  const walk = actions.walk || null;
  const run = actions.run || null;
  // Warn when a locomotion clip is missing — the weight code below is null-guarded
  // so it otherwise fails silently (character just won't animate), hard to diagnose.
  if (typeof console !== "undefined" && (!idle || !walk)) {
    const have = Object.keys(actions).join(", ") || "(none)";
    console.warn(`[animatedCharacter] ${url} missing idle/walk clip — have: ${have}`);
  }
  if (idle) idle.play();
  if (walk) {
    walk.play();
    walk.setEffectiveWeight(0);
    walk.timeScale = 1.35;
  }
  if (run) {
    run.play();
    run.setEffectiveWeight(0);
  }

  let wWalk = 0;
  let wRun = 0;
  let oneShot = null; // { action, remaining } — draw/turn play over the locomotion

  // update(dt, moving, running): blends Idle→Walk→Run; one-shots take over briefly.
  function update(dt, moving, running) {
    const d = dt || 0;
    const k = Math.min(1, d * 8);
    wWalk += ((moving && !running ? 1 : 0) - wWalk) * k;
    wRun += ((moving && running ? 1 : 0) - wRun) * k;

    let osW = 0;
    if (oneShot) {
      oneShot.remaining -= d;
      if (oneShot.remaining <= 0) {
        oneShot.action.stop();
        oneShot = null;
      } else {
        osW = 1;
      }
    }
    const loco = 1 - osW; // fade locomotion out while a one-shot plays
    if (run) run.setEffectiveWeight(wRun * loco);
    if (walk) walk.setEffectiveWeight(wWalk * loco);
    if (idle) idle.setEffectiveWeight(Math.max(0, 1 - wWalk - wRun) * loco);
    mixer.update(d);
  }

  // Play a one-shot clip (e.g. "draw", "turn") once over the current locomotion.
  function playOnce(name) {
    const a = actions[String(name).toLowerCase()];
    if (!a) return;
    a.setLoop(THREE.LoopOnce, 1);
    a.clampWhenFinished = false;
    a.reset();
    a.setEffectiveWeight(1);
    a.play();
    oneShot = { action: a, remaining: a.getClip().duration };
  }

  return { group, update, playOnce, mixer, modelStats };
}
