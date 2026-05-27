function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function ensureUserData(mesh) {
  if (!mesh) return {};
  if (!mesh.userData) mesh.userData = {};
  return mesh.userData;
}

function rememberBase(mesh, key, value) {
  const userData = ensureUserData(mesh);
  if (!Number.isFinite(userData[key])) userData[key] = Number.isFinite(value) ? value : 0;
  return userData[key];
}

export function idleBob(mesh, t, amplitude = 0.04) {
  if (!mesh?.position) return mesh;
  const baseY = rememberBase(mesh, "idleBobBaseY", mesh.position.y);
  mesh.position.y = baseY + Math.sin(t * 3.2) * amplitude;
  return mesh;
}

export function walkBob(mesh, t, speed = 1) {
  if (!mesh?.position) return mesh;
  const baseY = rememberBase(mesh, "walkBobBaseY", mesh.position.y);
  const pace = Math.max(0, speed);
  mesh.position.y = baseY + Math.abs(Math.sin(t * 8 * pace)) * 0.06;
  return mesh;
}

export function interactGlow(mesh, t) {
  const mat = mesh?.material;
  if (!mat) return mesh;
  const base = rememberBase(mesh, "interactGlowBase", mat.emissiveIntensity ?? 0);
  mat.emissiveIntensity = base + (Math.sin(t * 5) + 1) * 0.35;
  return mesh;
}

export function hitFlash(mesh, intensity = 3.0) {
  const mat = mesh?.material;
  if (!mat) return mesh;
  mat.emissiveIntensity = intensity;
  return mesh;
}

export function stagger(mesh, direction = {}, t = 0) {
  if (!mesh?.position) return mesh;
  const amount = clamp01(t) * 0.18;
  mesh.position.x += (Number.isFinite(direction.x) ? direction.x : 0) * amount;
  mesh.position.z += (Number.isFinite(direction.z) ? direction.z : 0) * amount;
  return mesh;
}

export function deathCollapse(mesh, progress = 1) {
  if (!mesh?.scale) return mesh;
  const baseY = rememberBase(mesh, "deathCollapseBaseScaleY", mesh.scale.y);
  mesh.scale.y = Math.max(0.02, baseY * (1 - clamp01(progress)));
  return mesh;
}

export function rewardPop(scene, position = {}, text = "") {
  const pop = {
    kind: "rewardPop",
    text: String(text),
    position: {
      x: Number.isFinite(position.x) ? position.x : 0,
      y: Number.isFinite(position.y) ? position.y : 0,
      z: Number.isFinite(position.z) ? position.z : 0,
    },
  };
  if (scene?.userData) {
    if (!Array.isArray(scene.userData.rewardPops)) scene.userData.rewardPops = [];
    scene.userData.rewardPops.push(pop);
  }
  return pop;
}
