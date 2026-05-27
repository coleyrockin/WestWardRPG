// Pointer / mouse / blur / fullscreen input handlers.
//
// Extracted from src/main.js so the orchestration file is closer to a
// composition root than an implementation. The big `keydown` handler stays
// in main.js for now because it reads and writes ~30 module-scope UI/state
// variables that aren't worth threading through a context object yet.

/**
 * Install pointer, mouse, blur, fullscreen, and keyup handlers on the page.
 *
 * @param {object} deps
 * @param {HTMLCanvasElement} deps.canvas — the game canvas (target of click /
 *   contextmenu / requestPointerLock).
 * @param {object} deps.state — the live game state object (mutated by the
 *   handlers to feed mouse buttons, look delta, etc. back into the loop).
 * @param {() => void} deps.attack — invoked on left-mouse-down while playing.
 * @param {() => void} deps.resize — invoked on `fullscreenchange`.
 */
export function installPointerInputHandlers({ canvas, state, attack, resize }) {
  document.addEventListener("keyup", (event) => {
    state.keys[event.code] = false;
  });

  document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement !== canvas) {
      state.mouseLook = 0;
      state.mouseButtons.right = false;
    }
  });

  canvas.addEventListener("click", () => {
    if (state.mode === "playing") {
      try {
        const maybePromise = canvas.requestPointerLock?.();
        if (maybePromise && typeof maybePromise.catch === "function") {
          maybePromise.catch(() => { });
        }
      } catch {
        // Pointer lock is optional in automation/headless contexts.
      }
    }
  });

  canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });

  document.addEventListener("mousedown", (event) => {
    if (state.mode !== "playing") return;
    if (event.button === 0) {
      state.mouseButtons.left = true;
      attack();
      event.preventDefault();
    } else if (event.button === 2) {
      state.mouseButtons.right = true;
      event.preventDefault();
    }
  });

  document.addEventListener("mouseup", (event) => {
    if (event.button === 0) {
      state.mouseButtons.left = false;
    }
    if (event.button === 2) {
      state.mouseButtons.right = false;
    }
  });

  window.addEventListener("blur", () => {
    state.mouseButtons.left = false;
    state.mouseButtons.right = false;
    state.player.blocking = false;
  });

  document.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement === canvas && state.mode === "playing") {
      state.mouseLook += event.movementX * 0.00195;
    }
  });

  document.addEventListener("fullscreenchange", resize);
}
