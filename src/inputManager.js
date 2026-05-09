// InputManager — centralizes gameplay key dispatch (non-modal keys).
// Modal navigation (dialogue, shop, codex, etc.) stays inline in main.js
// because each modal needs tight coupling to its own selection state.
//
// Usage:
//   const im = createInputManager();
//   im.register("KeyE",  () => interact());
//   im.register("Space", () => attack(), { preventDefault: true });
//   document.addEventListener("keydown", (e) => im.dispatch(e));

export function createInputManager() {
  const bindings = new Map(); // code → { handler, preventDefault, modes }

  return {
    // Register a handler for an event.code.
    // options.modes: array of game modes this binding is active in (null = all)
    // options.preventDefault: call e.preventDefault() when this fires
    register(code, handler, options = {}) {
      bindings.set(code, { handler, ...options });
      return this;
    },

    // Unregister a binding.
    unregister(code) {
      bindings.delete(code);
    },

    // Dispatch a keydown event. Returns true if a binding handled it.
    dispatch(event, currentMode = "playing") {
      const binding = bindings.get(event.code);
      if (!binding) return false;
      if (binding.modes && !binding.modes.includes(currentMode)) return false;
      if (binding.preventDefault) event.preventDefault();
      binding.handler(event);
      return true;
    },

    // Bulk-register multiple bindings from a record.
    // { "KeyE": handler } or { "KeyE": { handler, preventDefault, modes } }
    registerAll(map) {
      for (const [code, value] of Object.entries(map)) {
        if (typeof value === "function") {
          this.register(code, value);
        } else {
          this.register(code, value.handler, value);
        }
      }
      return this;
    },

    get size() { return bindings.size; },
  };
}
