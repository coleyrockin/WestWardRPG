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
import { createNprMaterial } from "../renderer/materials/nprMaterial.js";

let templatePromise = null;
function loadTemplate(url) {
  if (!templatePromise) templatePromise = new GLTFLoader().loadAsync(url);
  return templatePromise;
}

function reskin(mesh, tint) {
  const swap = (src) => {
    const c = src && src.color ? src.color.clone() : new THREE.Color("#9a8f80");
    if (tint) c.multiply(new THREE.Color(tint));
    return createNprMaterial(`#${c.getHexString()}`, { rimStrength: 0.3, map: src && src.map ? src.map : null });
  };
  mesh.castShadow = true;
  mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
}

// opts.tint multiplies every base colour (per-NPC variety reusing one rig).
export async function createAnimatedCharacter(url = "/models/character.glb", opts = {}) {
  const gltf = await loadTemplate(url);
  const group = cloneSkinned(gltf.scene);
  group.traverse((o) => {
    if (o.isMesh || o.isSkinnedMesh) reskin(o, opts.tint);
  });

  const mixer = new THREE.AnimationMixer(group);
  const actions = {};
  for (const clip of gltf.animations) actions[clip.name.toLowerCase()] = mixer.clipAction(clip);
  const idle = actions.idle || null;
  const walk = actions.walk || null;
  if (idle) idle.play();
  if (walk) {
    walk.play();
    walk.setEffectiveWeight(0);
    walk.timeScale = 1.35;
  }

  let w = 0; // walk weight, smoothly crossfaded
  function update(dt, moving) {
    const target = moving ? 1 : 0;
    w += (target - w) * Math.min(1, (dt || 0) * 8);
    if (walk) walk.setEffectiveWeight(w);
    if (idle) idle.setEffectiveWeight(1 - w);
    mixer.update(dt || 0);
  }

  return { group, update, mixer };
}
