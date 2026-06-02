// WASD + click-focus player controller for the Three.js spike.
//
// Milestone 3B step 1 (docs/roadmap.md). Wraps a THREE.PerspectiveCamera with
// third-person input: WASD walks, shift sprints, click-focus/pointer-lock rotates
// yaw/pitch, and R re-centers the follow camera behind the route.
//
// Conventions
//   World y axis is up. World (x, z) is the ground plane.
//   yaw   = 0 → camera looks toward -Z (THREE.js default).
//   pitch > 0 looks up; pitch < 0 looks down. Clamped to ±MAX_PITCH.
//   Forward (XZ) unit vector = (-sin yaw, -cos yaw)
//   Right   (XZ) unit vector = ( cos yaw, -sin yaw)
//   Mouse drag with dx>0 (cursor right) → yaw decreases (turn right).
//   Mouse drag with dy>0 (cursor down)  → pitch decreases (look down).
//
// Shape
//   stepPlayer({...})           — pure, deterministic; tested in node.
//   createPlayerController(...) — thin DOM/Three shell wiring real listeners.

import { resolveCollision } from "./worldProxies.js";

const DEFAULT_SPEEDS = { walk: 4, run: 8 };
const DEFAULT_SENSITIVITY = 0.0035; // radians per pixel of mouse drag
const DEFAULT_EYE_HEIGHT = 1.8;
const MAX_PITCH = Math.PI / 3; // ±60° — generous; avoids gimbal flip near ±π/2
const CAMERA_COLLISION_RADIUS = 0.58;

const CAMERA_BLOCKING_KINDS = new Set([
  "town",
  "ranch",
  "gate",
  "watchtower",
  "landmark",
  "saloon",
  "saloonFacade",
  "townFacadeWarm",
  "townFacadeStore",
  "townFacadeDark",
  "heroTownSaloon",
  "heroTownStore",
  "heroTownAssay",
  "productionSaloon",
  "productionStore",
  "productionAssay",
  "storefront",
  "mesa",
  "mesaSilhouette",
  "mesaSkyline",
  "heroMesaSkyline",
  "cliff",
  "brokenFence",
  "brokenWagon",
  "wagonSalvage",
]);

export const CAMERA_PRESETS = Object.freeze({
  exploration: Object.freeze({
    distance: 9.0,
    height: 4.8,
    lookHeight: 1.02,
    lookAhead: 8.0,
    shoulder: 0.55,
    smoothing: 10.5,
  }),
  town: Object.freeze({
    distance: 7.6,
    height: 5.0,
    lookHeight: 1.55,
    lookAhead: 4.4,
    shoulder: 1.2,
    smoothing: 9.5,
  }),
  inspection: Object.freeze({
    distance: 4.8,
    height: 3.5,
    lookHeight: 1.65,
    lookAhead: 2.2,
    shoulder: 0.95,
    smoothing: 12,
  }),
  objective: Object.freeze({
    distance: 8.4,
    height: 5.8,
    lookHeight: 1.55,
    lookAhead: 6.8,
    shoulder: 1.25,
    smoothing: 7.5,
  }),
});

// Forward / right basis from yaw. Exported so tests and worldProxies can
// reuse the same convention if needed.
export function forwardVector(yaw) {
  return { x: -Math.sin(yaw), z: -Math.cos(yaw) };
}
export function rightVector(yaw) {
  return { x: Math.cos(yaw), z: -Math.sin(yaw) };
}

// --- Dodge-roll (Space) -----------------------------------------------------
export const DODGE = { duration: 0.35, iframes: 0.22, speed: 11 };

// Pure dodge step. state = { position:{x,z}, dir:{x,z}, elapsed }. Speed eases out
// over the duration so the roll has a snappy start and a soft stop. Returns a new
// state plus `done`. Never mutates input.
export function stepDodge(state, dt, cfg = DODGE) {
  const d = Number.isFinite(dt) && dt > 0 ? dt : 0;
  const elapsed = (state.elapsed || 0) + d;
  const p = Math.min(1, elapsed / cfg.duration);
  const speed = cfg.speed * (1 - p) * (1 - p); // ease-out
  return {
    position: {
      x: state.position.x + state.dir.x * speed * d,
      z: state.position.z + state.dir.z * speed * d,
    },
    dir: { x: state.dir.x, z: state.dir.z },
    elapsed,
    done: elapsed >= cfg.duration,
  };
}

export function dodgeIsInvulnerable(elapsed, cfg = DODGE) {
  return (elapsed || 0) <= cfg.iframes;
}

export function resolveCameraPreset(name = "exploration", overrides = {}) {
  const base = CAMERA_PRESETS[name] || CAMERA_PRESETS.exploration;
  return { ...base, ...overrides };
}

export function cameraSmoothingAlpha(dt, smoothing = CAMERA_PRESETS.exploration.smoothing) {
  const safeDt = Number.isFinite(dt) && dt > 0 ? dt : 0;
  const safeSmoothing = Number.isFinite(smoothing) && smoothing > 0 ? smoothing : 1;
  return 1 - Math.exp(-safeSmoothing * safeDt);
}

export function computeFollowCameraPose({
  position,
  yaw = 0,
  pitch = 0,
  preset = CAMERA_PRESETS.exploration,
} = {}) {
  const pos = position || { x: 0, z: 0 };
  const cfg = resolveCameraPreset(null, preset);
  const fwd = forwardVector(yaw);
  const side = rightVector(yaw);
  const lift = Math.sin(pitch) * cfg.distance * 0.38;
  return {
    camera: {
      x: pos.x - fwd.x * cfg.distance + side.x * cfg.shoulder,
      y: cfg.height - lift,
      z: pos.z - fwd.z * cfg.distance + side.z * cfg.shoulder,
    },
    lookAt: {
      x: pos.x + fwd.x * cfg.lookAhead + side.x * cfg.shoulder * 0.35,
      y: cfg.lookHeight + lift * 0.45,
      z: pos.z + fwd.z * cfg.lookAhead + side.z * cfg.shoulder * 0.35,
    },
  };
}

export function isCameraBlockingProxy(proxy) {
  const kind = proxy?.source?.kind;
  return !kind || CAMERA_BLOCKING_KINDS.has(kind);
}

function segmentEnterAabb2D(from, to, box) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  let tMin = 0;
  let tMax = 1;
  const slabs = [
    [from.x, dx, box.minX, box.maxX],
    [from.z, dz, box.minZ, box.maxZ],
  ];

  for (const [origin, delta, min, max] of slabs) {
    if (Math.abs(delta) < 1e-8) {
      if (origin < min || origin > max) return null;
      continue;
    }
    let t1 = (min - origin) / delta;
    let t2 = (max - origin) / delta;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return null;
  }
  if (tMax < 0 || tMin > 1) return null;
  return Math.max(0, tMin);
}

export function avoidCameraObstacles({
  from,
  desired,
  proxies = [],
  radius = CAMERA_COLLISION_RADIUS,
  padding = 0.09,
} = {}) {
  if (!from || !desired || !Array.isArray(proxies) || proxies.length === 0) return desired;

  let bestT = 1;
  for (const proxy of proxies) {
    if (!isCameraBlockingProxy(proxy)) continue;
    const box = {
      minX: proxy.minX - radius,
      maxX: proxy.maxX + radius,
      minZ: proxy.minZ - radius,
      maxZ: proxy.maxZ + radius,
    };
    const t = segmentEnterAabb2D(from, desired, box);
    if (t == null) continue;
    bestT = Math.min(bestT, Math.max(0.18, t - padding));
  }

  if (bestT >= 0.999) return desired;
  return {
    x: from.x + (desired.x - from.x) * bestT,
    y: from.y + ((desired.y ?? from.y) - from.y) * bestT,
    z: from.z + (desired.z - from.z) * bestT,
  };
}

// Pure single-step update. Returns a *new* { position, yaw } — never mutates
// inputs. Look is applied first, then WASD moves in the resulting direction
// (standard FPS feel).
//
//   input = {
//     forward, back, left, right, shift,   // booleans, currently-held
//     lookDx, lookDy,                      // accumulated drag pixels since last step
//   }
export function stepPlayer({
  position,
  yaw,
  pitch = 0,
  input,
  dt,
  speeds = DEFAULT_SPEEDS,
  sensitivity = DEFAULT_SENSITIVITY,
} = {}) {
  const safeDt = Number.isFinite(dt) && dt > 0 ? dt : 0;
  const inp = input || {};

  // Apply look first so movement uses the post-look heading. Pitch is clamped;
  // yaw wraps freely. Movement still happens in the XZ plane only — pitch
  // affects camera framing, not WASD direction (standard FPS feel).
  const nextYaw = yaw - (inp.lookDx || 0) * sensitivity;
  const nextPitch = Math.max(
    -MAX_PITCH,
    Math.min(MAX_PITCH, pitch - (inp.lookDy || 0) * sensitivity),
  );

  const speed = inp.shift ? speeds.run : speeds.walk;
  const fwd = forwardVector(nextYaw);
  const rt = rightVector(nextYaw);

  // Sum signed axis inputs into a single move vector, then normalize so
  // diagonal movement isn't faster than orthogonal.
  const f = (inp.forward ? 1 : 0) - (inp.back ? 1 : 0);
  const r = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
  let mx = fwd.x * f + rt.x * r;
  let mz = fwd.z * f + rt.z * r;
  const mag = Math.hypot(mx, mz);
  if (mag > 1e-6) {
    mx /= mag;
    mz /= mag;
  } else {
    mx = 0;
    mz = 0;
  }

  return {
    position: {
      x: position.x + mx * speed * safeDt,
      z: position.z + mz * speed * safeDt,
    },
    yaw: nextYaw,
    pitch: nextPitch,
  };
}

// Mutable input buffer the DOM shell writes to and update() reads/clears.
function makeInputState() {
  return {
    forward: false, back: false, left: false, right: false, shift: false,
    dodge: false,
    lookDx: 0, lookDy: 0,
  };
}

const KEY_MAP = {
  KeyW: "forward", ArrowUp: "forward",
  KeyS: "back",    ArrowDown: "back",
  KeyA: "left",    ArrowLeft: "left",
  KeyD: "right",   ArrowRight: "right",
};

// Real-DOM shell. `camera` must be a THREE.PerspectiveCamera (or anything with
// a `.position` Vector3 and a `.rotation` Euler / `.getWorldDirection`).
//
// Options:
//   canvas               — element to attach mouse listeners (drag-to-look).
//   document             — overridable for tests (defaults to globalThis.document).
//   eyeHeight            — fixed Y for the camera (default 1.8).
//   speeds, sensitivity  — passed to stepPlayer.
export function createPlayerController(camera, opts = {}) {
  const {
    canvas,
    document: doc = globalThis.document,
    window: win = globalThis.window,
    eyeHeight = DEFAULT_EYE_HEIGHT,
    speeds = DEFAULT_SPEEDS,
    sensitivity = DEFAULT_SENSITIVITY,
    // Third-person: follow-cam orbits behind a character mesh that faces the
    // movement heading. Falls back to first-person when thirdPerson is false.
    thirdPerson = false,
    character = null, // THREE.Object3D positioned at the player's feet
    cameraPreset = "exploration",
    camDistance = null,
    camHeight = null,
    camLookHeight = null,
    camLookAhead = null,
    camShoulder = null, // lateral over-the-shoulder offset so the hero isn't dead-centre blocking the view
    camSmoothing = null,
    pointerLock = true,
    dragLookFallback = true,
    resetKey = "KeyR",
    resetYaw = null,
  } = opts;
  const presetOverrides = {
    ...(Number.isFinite(camDistance) ? { distance: camDistance } : {}),
    ...(Number.isFinite(camHeight) ? { height: camHeight } : {}),
    ...(Number.isFinite(camLookHeight) ? { lookHeight: camLookHeight } : {}),
    ...(Number.isFinite(camLookAhead) ? { lookAhead: camLookAhead } : {}),
    ...(Number.isFinite(camShoulder) ? { shoulder: camShoulder } : {}),
    ...(Number.isFinite(camSmoothing) ? { smoothing: camSmoothing } : {}),
  };
  let activeCameraPreset = resolveCameraPreset(cameraPreset, presetOverrides);
  let moving = false;
  let running = false; // moving AND sprint held — drives the Run animation blend
  // Dodge-roll state: elapsed === null means not rolling; otherwise seconds into the roll.
  let dodge = { dir: { x: 0, z: 1 }, elapsed: null };
  let thirdPersonCameraSeeded = false;
  // The look-at target is lerped (not just the camera body) so fast turns and
  // preset changes don't snap the gaze — removes the swimmy-rotation jitter.
  let smoothLookAt = null;

  // Seed yaw + pitch from the camera's current heading so the spike's hero
  // pose is preserved on the first frame. We project the forward vector onto
  // XZ for yaw, then use its Y component for pitch.
  const initialForward = (() => {
    if (camera && typeof camera.getWorldDirection === "function") {
      const out = {
        x: 0,
        y: 0,
        z: -1,
        set(x, y, z) {
          this.x = x;
          this.y = y;
          this.z = z;
          return this;
        },
        normalize() {
          const len = Math.hypot(this.x, this.y, this.z) || 1;
          this.x /= len;
          this.y /= len;
          this.z /= len;
          return this;
        },
        negate() {
          this.x = -this.x;
          this.y = -this.y;
          this.z = -this.z;
          return this;
        },
      };
      try {
        const v = camera.getWorldDirection(out);
        return { x: v?.x ?? out.x, y: v?.y ?? out.y, z: v?.z ?? out.z };
      } catch {
        return { x: 0, y: 0, z: -1 };
      }
    }
    return { x: 0, y: 0, z: -1 };
  })();
  let yaw = Math.atan2(-initialForward.x, -initialForward.z);
  let pitch = Math.max(
    -MAX_PITCH,
    Math.min(MAX_PITCH, Math.asin(Math.max(-1, Math.min(1, initialForward.y)))),
  );
  let position = {
    x: camera?.position?.x ?? 0,
    z: camera?.position?.z ?? 0,
  };

  const input = makeInputState();

  // Click-focus state. Pointer lock is the primary look model; the older
  // drag-look path remains as a fallback for browsers/tests without pointer lock.
  let pointerFocused = false;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  const hasPointerLock = () => Boolean(canvas && doc?.pointerLockElement === canvas);
  const releasePointerFocus = () => {
    pointerFocused = false;
    dragging = false;
    input.lookDx = 0;
    input.lookDy = 0;
    if (hasPointerLock() && doc?.exitPointerLock) {
      try { doc.exitPointerLock(); } catch {}
    }
  };
  const requestPointerFocus = () => {
    if (pointerLock && canvas?.requestPointerLock) {
      try {
        const request = canvas.requestPointerLock();
        if (request && typeof request.catch === "function") request.catch(() => {});
        pointerFocused = true;
        return;
      } catch {}
    }
    pointerFocused = true;
  };
  const resetCameraBehind = (nextYaw = resetYaw) => {
    if (Number.isFinite(nextYaw)) yaw = nextYaw;
    pitch = 0;
    // Blend back behind the player rather than snapping (the camera body + look-at
    // lerp toward the new pose); only genuine teleports (setPosition) snap.
  };
  const onKeyDown = (e) => {
    if (e.code === "Escape") {
      releasePointerFocus();
      return;
    }
    if (resetKey && e.code === resetKey) {
      resetCameraBehind();
      return;
    }
    const key = KEY_MAP[e.code];
    if (key) { input[key] = true; }
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") input.shift = true;
    if (e.code === "Space") {
      input.dodge = true;
      if (typeof e.preventDefault === "function") e.preventDefault();
    }
  };
  const onKeyUp = (e) => {
    const key = KEY_MAP[e.code];
    if (key) { input[key] = false; }
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") input.shift = false;
  };
  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    requestPointerFocus();
    dragging = dragLookFallback && !hasPointerLock();
    lastX = e.clientX;
    lastY = e.clientY;
    if (e.preventDefault) e.preventDefault();
  };
  const onMouseMove = (e) => {
    if (hasPointerLock() || (pointerFocused && Number.isFinite(e.movementX))) {
      input.lookDx += e.movementX || 0;
      input.lookDy += e.movementY || 0;
      return;
    }
    if (!dragging) return;
    input.lookDx += e.clientX - lastX;
    input.lookDy += e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
  };
  const onMouseUp = () => { if (!hasPointerLock()) dragging = false; };
  const onPointerLockChange = () => {
    pointerFocused = hasPointerLock();
    if (!pointerFocused) dragging = false;
  };
  const onBlur = () => {
    // Avoid stuck keys when the window loses focus mid-press.
    input.forward = input.back = input.left = input.right = false;
    input.shift = false;
    releasePointerFocus();
  };

  if (doc?.addEventListener) {
    doc.addEventListener("keydown", onKeyDown);
    doc.addEventListener("keyup", onKeyUp);
  }
  if (canvas?.addEventListener) {
    canvas.addEventListener("mousedown", onMouseDown);
  }
  if (doc?.addEventListener) {
    // Listen on document for move/up so drags continue if the cursor leaves
    // the canvas before release.
    doc.addEventListener("mousemove", onMouseMove);
    doc.addEventListener("mouseup", onMouseUp);
    doc.addEventListener("pointerlockchange", onPointerLockChange);
  }
  if (win?.addEventListener) {
    win.addEventListener("blur", onBlur);
  }

  function update(dt, proxies = null) {
    const stepped = stepPlayer({ position, yaw, pitch, input, dt, speeds, sensitivity });
    yaw = stepped.yaw;
    pitch = stepped.pitch;
    let nextPos = stepped.position;

    // Dodge-roll: edge-triggered by Space. Locks direction from the current WASD
    // heading (or facing if idle) and OVERRIDES normal movement for DODGE.duration.
    // Look (yaw/pitch from stepPlayer) is preserved so you can steer while rolling.
    if (input.dodge && dodge.elapsed === null) {
      const f = (input.forward ? 1 : 0) - (input.back ? 1 : 0);
      const r = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const fwd = forwardVector(yaw);
      const rt = rightVector(yaw);
      let dx = fwd.x * f + rt.x * r;
      let dz = fwd.z * f + rt.z * r;
      const m = Math.hypot(dx, dz);
      if (m < 1e-6) { dx = fwd.x; dz = fwd.z; } else { dx /= m; dz /= m; }
      dodge = { dir: { x: dx, z: dz }, elapsed: 0 };
    }
    input.dodge = false; // consume the edge
    if (dodge.elapsed !== null) {
      const rolled = stepDodge({ position, dir: dodge.dir, elapsed: dodge.elapsed }, dt, DODGE);
      nextPos = rolled.position;
      dodge.elapsed = rolled.done ? null : rolled.elapsed;
    }

    moving = !!(input.forward || input.back || input.left || input.right);
    running = moving && !!input.shift; // sprint speed already applied in stepPlayer

    // Drain mouse deltas — they're per-frame, not held state.
    input.lookDx = 0;
    input.lookDy = 0;

    // Slide-resolve against world AABBs when proxies are supplied. Bare
    // movement (no proxies) is still useful for unit tests and early dev.
    if (proxies && proxies.length) {
      nextPos = resolveCollision({ from: position, to: nextPos }, proxies);
    }
    position = nextPos;

    // The character mesh stands at the player's feet, facing the heading
    // (group local -Z = forward, so rotation.y = yaw aligns it). Y is left to
    // the walk-bob in character.animate().
    if (character) {
      character.position.x = position.x;
      character.position.z = position.z;
      character.rotation.y = yaw;
    }

    if (camera && thirdPerson) {
      // Follow-cam orbits behind the heading and looks slightly ahead of the
      // character. Drag yaw turns the whole rig; pitch tilts the cam vertically.
      const pose = computeFollowCameraPose({ position, yaw, pitch, preset: activeCameraPreset });
      const cameraPoint = proxies && proxies.length
        ? avoidCameraObstacles({
            from: { x: position.x, y: activeCameraPreset.lookHeight, z: position.z },
            desired: pose.camera,
            proxies,
          })
        : pose.camera;
      const alpha = thirdPersonCameraSeeded
        ? cameraSmoothingAlpha(dt, activeCameraPreset.smoothing)
        : 1;
      thirdPersonCameraSeeded = true;
      camera.position.set(
        camera.position.x + (cameraPoint.x - camera.position.x) * alpha,
        camera.position.y + (cameraPoint.y - camera.position.y) * alpha,
        camera.position.z + (cameraPoint.z - camera.position.z) * alpha,
      );
      // Lerp the gaze target at the same rate as the body. On the first frame (or
      // after a teleport) snap it; otherwise it trails smoothly so sharp turns and
      // preset changes don't whip the camera around.
      if (!smoothLookAt) {
        smoothLookAt = { x: pose.lookAt.x, y: pose.lookAt.y, z: pose.lookAt.z };
      } else {
        smoothLookAt.x += (pose.lookAt.x - smoothLookAt.x) * alpha;
        smoothLookAt.y += (pose.lookAt.y - smoothLookAt.y) * alpha;
        smoothLookAt.z += (pose.lookAt.z - smoothLookAt.z) * alpha;
      }
      if (camera.lookAt) {
        camera.lookAt(smoothLookAt.x, smoothLookAt.y, smoothLookAt.z);
      }
    } else if (camera) {
      camera.position.x = position.x;
      camera.position.y = eyeHeight;
      camera.position.z = position.z;
      if (camera.rotation) {
        // YXZ is the standard FPS Euler order (yaw first, then pitch, then roll).
        if ("order" in camera.rotation) camera.rotation.order = "YXZ";
        camera.rotation.x = pitch;
        camera.rotation.y = yaw;
        camera.rotation.z = 0;
      }
    }
  }

  function setPosition(nextPosition = {}) {
    const incoming = {
      x: Number.isFinite(nextPosition.x) ? nextPosition.x : position.x,
      z: Number.isFinite(nextPosition.z) ? nextPosition.z : position.z,
    };
    position = { x: incoming.x, z: incoming.z };
    if (camera) {
      camera.position.x = incoming.x;
      camera.position.z = incoming.z;
    }
    // Genuine teleport: re-seed so the camera body + gaze snap to the new spot
    // instead of lerping across the map.
    thirdPersonCameraSeeded = false;
    smoothLookAt = null;
  }

  function setCameraPreset(name, overrides = {}) {
    activeCameraPreset = resolveCameraPreset(name, { ...presetOverrides, ...overrides });
    // Do NOT unseed here — beat/preset changes should blend the camera to the new
    // framing, not teleport it. The position + smoothLookAt lerps handle the move.
  }

  function dispose() {
    if (doc?.removeEventListener) {
      doc.removeEventListener("keydown", onKeyDown);
      doc.removeEventListener("keyup", onKeyUp);
      doc.removeEventListener("mousemove", onMouseMove);
      doc.removeEventListener("mouseup", onMouseUp);
      doc.removeEventListener("pointerlockchange", onPointerLockChange);
    }
    if (canvas?.removeEventListener) {
      canvas.removeEventListener("mousedown", onMouseDown);
    }
    if (win?.removeEventListener) {
      win.removeEventListener("blur", onBlur);
    }
  }

  return {
    update,
    setPosition,
    setCameraPreset,
    resetCameraBehind,
    releasePointerFocus,
    dispose,
    get position() { return { x: position.x, z: position.z }; },
    get yaw() { return yaw; },
    get isDodging() { return dodge.elapsed !== null; },
    get isInvulnerable() { return dodge.elapsed !== null && dodgeIsInvulnerable(dodge.elapsed, DODGE); },
    get dodgeProgress() { return dodge.elapsed === null ? 0 : Math.min(1, dodge.elapsed / DODGE.duration); },
    get pitch() { return pitch; },
    get moving() { return moving; },
    get running() { return running; },
  };
}
