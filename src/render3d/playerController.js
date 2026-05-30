// WASD + mouse-drag player controller for the Three.js spike.
//
// Milestone 3B step 1 (docs/roadmap.md). Wraps a THREE.PerspectiveCamera with
// first-person input: WASD walks, shift sprints, left-mouse drag on the canvas
// rotates yaw. Pitch is locked (camera stays level) — this is intentional for
// the spike's hero pose; pitch can land later.
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

// Forward / right basis from yaw. Exported so tests and worldProxies can
// reuse the same convention if needed.
export function forwardVector(yaw) {
  return { x: -Math.sin(yaw), z: -Math.cos(yaw) };
}
export function rightVector(yaw) {
  return { x: Math.cos(yaw), z: -Math.sin(yaw) };
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
    camDistance = 6.6,
    camHeight = 3.6,
    camLookHeight = 1.7,
    camLookAhead = 3.0,
    camShoulder = 1.15, // lateral over-the-shoulder offset so the hero isn't dead-centre blocking the view
  } = opts;
  let moving = false;
  let running = false; // moving AND sprint held — drives the Run animation blend

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

  // Drag state — only consume mouse motion while a button is held on the canvas.
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  const onKeyDown = (e) => {
    const key = KEY_MAP[e.code];
    if (key) { input[key] = true; }
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") input.shift = true;
  };
  const onKeyUp = (e) => {
    const key = KEY_MAP[e.code];
    if (key) { input[key] = false; }
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") input.shift = false;
  };
  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  };
  const onMouseMove = (e) => {
    if (!dragging) return;
    input.lookDx += e.clientX - lastX;
    input.lookDy += e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
  };
  const onMouseUp = () => { dragging = false; };
  const onBlur = () => {
    // Avoid stuck keys when the window loses focus mid-press.
    input.forward = input.back = input.left = input.right = false;
    input.shift = false;
    dragging = false;
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
  }
  if (win?.addEventListener) {
    win.addEventListener("blur", onBlur);
  }

  function update(dt, proxies = null) {
    const stepped = stepPlayer({ position, yaw, pitch, input, dt, speeds, sensitivity });
    yaw = stepped.yaw;
    pitch = stepped.pitch;
    let nextPos = stepped.position;

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
      const fwd = forwardVector(yaw);
      const side = rightVector(yaw);
      const lift = Math.sin(pitch) * camDistance * 0.5;
      // Behind + above the hero, pushed to one shoulder so the character sits
      // off-centre and never fills/occludes the frame. Look slightly ahead and
      // up the same shoulder so the road and horizon stay framed.
      camera.position.set(
        position.x - fwd.x * camDistance + side.x * camShoulder,
        camHeight - lift,
        position.z - fwd.z * camDistance + side.z * camShoulder,
      );
      if (camera.lookAt) {
        camera.lookAt(
          position.x + fwd.x * camLookAhead + side.x * camShoulder * 0.5,
          camLookHeight + lift * 0.5,
          position.z + fwd.z * camLookAhead + side.z * camShoulder * 0.5,
        );
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
  }

  function dispose() {
    if (doc?.removeEventListener) {
      doc.removeEventListener("keydown", onKeyDown);
      doc.removeEventListener("keyup", onKeyUp);
      doc.removeEventListener("mousemove", onMouseMove);
      doc.removeEventListener("mouseup", onMouseUp);
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
    dispose,
    get position() { return { x: position.x, z: position.z }; },
    get yaw() { return yaw; },
    get pitch() { return pitch; },
    get moving() { return moving; },
    get running() { return running; },
  };
}
