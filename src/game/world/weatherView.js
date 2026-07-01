// Weather view — the THREE shell that renders the resolved weather state
// (see weather.js for the pure resolution): rain streaks + drifting dust motes,
// an occasional lightning flash. Fog/exposure are modulated by the caller.

import * as THREE from "three";

const RAIN_N = 110;
const DUST_N = 70;

export function createWeatherSystem(scene, opts = {}) {
  const center = { x: opts.x ?? 14, z: opts.z ?? 9 };
  const size = opts.size ?? 44;
  const rnd = () => Math.random();
  const group = new THREE.Group();
  const backend = opts.backend ?? "webgpu";

  const isWebGL = backend === "webgl";
  const rainNTarget = isWebGL ? Math.floor(RAIN_N / 2) : RAIN_N;
  const dustNTarget = isWebGL ? Math.floor(DUST_N / 2) : DUST_N;

  const rainGeo = new THREE.BoxGeometry(0.12, 0.8, 0.12);
  const rainMat = new THREE.MeshBasicMaterial({ color: 0x758598, transparent: true, opacity: 0.9, depthWrite: false });
  const dustGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
  const dustMat = new THREE.MeshBasicMaterial({ color: 0xcbb489, transparent: true, opacity: 0.55, depthWrite: false });

  const spawn = (y) => ({ x: center.x + (rnd() - 0.5) * size, y, z: center.z + (rnd() - 0.5) * size });

  let rainPool = [];
  let dustPool = [];
  let rainInst = null;
  let dustInst = null;

  if (isWebGL) {
    // WebGL fallback: regular mesh pool, but one shared material per weather type.
    // Opacity is global per type, so clones only inflate material count.
    function createLegacyPool(n, geo, mat, yInit) {
      return Array.from({ length: n }, () => {
        const m = new THREE.Mesh(geo, mat);
        const p = spawn(yInit());
        m.position.set(p.x, p.y, p.z);
        m.visible = false;
        group.add(m);
        return m;
      });
    }
    rainPool = createLegacyPool(rainNTarget, rainGeo, rainMat, () => rnd() * 14);
    dustPool = createLegacyPool(dustNTarget, dustGeo, dustMat, () => 0.4 + rnd() * 5.6);
  } else {
    // WebGPU: Use InstancedMesh with a single shared material
    rainInst = new THREE.InstancedMesh(rainGeo, rainMat, RAIN_N);
    dustInst = new THREE.InstancedMesh(dustGeo, dustMat, DUST_N);
    group.add(rainInst);
    group.add(dustInst);

    // Track state of each instance
    for (let i = 0; i < RAIN_N; i++) {
      const p = spawn(rnd() * 14);
      rainPool.push({
        position: new THREE.Vector3(p.x, p.y, p.z),
        speedY: 18 + (i % 5),
        scale: 1
      });
    }
    for (let i = 0; i < DUST_N; i++) {
      const p = spawn(0.4 + rnd() * 5.6);
      dustPool.push({
        position: new THREE.Vector3(p.x, p.y, p.z),
        speedXFactor: 0.6 + (i % 3) * 0.2
      });
    }
  }

  scene.add(group);
  let flash = 0;

  function update(resolved, dt, ctx = {}) {
    const frozen = !!ctx.frozen;
    const wind = (resolved.wind ?? 0.15) * 4;
    const tilt = Math.atan2(wind, 18);

    const cx = ctx.cx ?? center.x;
    const cz = ctx.cz ?? center.z;
    const R = 13;

    if (isWebGL) {
      const rainN = frozen ? 0 : Math.floor(rainNTarget * resolved.rain);
      for (let i = 0; i < rainNTarget; i++) {
        const m = rainPool[i];
        if (i >= rainN) { m.visible = false; continue; }
        m.visible = true;
        m.material.opacity = 0.9 * resolved.rain;
        m.rotation.z = tilt;
        m.position.y -= (18 + (i % 5)) * dt;
        m.position.x += wind * dt;
        if (m.position.y < 0 || Math.abs(m.position.x - cx) > R || Math.abs(m.position.z - cz) > R) {
          m.position.set(cx + (rnd() - 0.5) * 2 * R, 14, cz + (rnd() - 0.5) * 2 * R);
        }
      }

      const dustN = frozen ? 0 : Math.floor(dustNTarget * resolved.dust);
      for (let i = 0; i < dustNTarget; i++) {
        const m = dustPool[i];
        if (i >= dustN) { m.visible = false; continue; }
        m.visible = true;
        m.material.opacity = 0.55 * resolved.dust;
        m.position.x += wind * dt * (0.6 + (i % 3) * 0.2);
        m.position.y += Math.sin((m.position.x + i) * 0.5) * 0.1 * dt;
        if (m.position.x > center.x + size / 2) m.position.x -= size;
      }
    } else {
      // WebGPU Path: Update InstancedMesh matrices
      const rainN = frozen ? 0 : Math.floor(RAIN_N * resolved.rain);
      rainInst.material.opacity = 0.9 * resolved.rain;

      const dummyMatrix = new THREE.Matrix4();
      const position = new THREE.Vector3();
      const rotation = new THREE.Euler();
      const scale = new THREE.Vector3();
      const quaternion = new THREE.Quaternion();

      for (let i = 0; i < RAIN_N; i++) {
        const p = rainPool[i];
        if (i >= rainN) {
          // Hide instance by scaling to 0
          scale.set(0, 0, 0);
          dummyMatrix.compose(p.position, quaternion, scale);
          rainInst.setMatrixAt(i, dummyMatrix);
          continue;
        }

        p.position.y -= p.speedY * dt;
        p.position.x += wind * dt;
        if (p.position.y < 0 || Math.abs(p.position.x - cx) > R || Math.abs(p.position.z - cz) > R) {
          p.position.set(cx + (rnd() - 0.5) * 2 * R, 14, cz + (rnd() - 0.5) * 2 * R);
        }

        rotation.set(0, 0, tilt);
        scale.set(1, 1, 1);
        quaternion.setFromEuler(rotation);
        dummyMatrix.compose(p.position, quaternion, scale);
        rainInst.setMatrixAt(i, dummyMatrix);
      }
      rainInst.instanceMatrix.needsUpdate = true;

      const dustN = frozen ? 0 : Math.floor(DUST_N * resolved.dust);
      dustInst.material.opacity = 0.55 * resolved.dust;

      for (let i = 0; i < DUST_N; i++) {
        const p = dustPool[i];
        if (i >= dustN) {
          scale.set(0, 0, 0);
          dummyMatrix.compose(p.position, quaternion, scale);
          dustInst.setMatrixAt(i, dummyMatrix);
          continue;
        }

        p.position.x += wind * dt * p.speedXFactor;
        p.position.y += Math.sin((p.position.x + i) * 0.5) * 0.1 * dt;
        if (p.position.x > center.x + size / 2) p.position.x -= size;

        rotation.set(0, 0, 0);
        scale.set(1, 1, 1);
        quaternion.setFromEuler(rotation);
        dummyMatrix.compose(p.position, quaternion, scale);
        dustInst.setMatrixAt(i, dummyMatrix);
      }
      dustInst.instanceMatrix.needsUpdate = true;
    }

    if (!frozen && resolved.lightning > 0 && flash <= 0 && rnd() < resolved.lightning * dt * 0.6) flash = 1;
    flash = Math.max(0, flash - dt * 3);
    return { flash };
  }

  return { group, update, get flash() { return flash; } };
}
