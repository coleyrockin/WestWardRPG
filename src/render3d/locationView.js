// locationView — the Three.js binding for loaded interiors. Wraps the pure
// locationState: on enter it hides the street (world-group visibility off),
// shows the interior room, repositions the player, and swaps the active collision
// proxies + interaction targets; on exit it reverses. A screen `fade` hides the
// swap. spike.js calls enter()/exit() from door interaction handlers and reads
// activeProxies() in the loop. "Render one street OR one room, never both" — the
// anti-lag promise — is enforced here by the visibility toggle.

import { createLocationState, STREET } from "./locationState.js";
import { INTERIORS, INTERIOR_IDS } from "./interiors.js";

export function createLocationView({
  scene = null,
  worldGroups = [],          // the street/world content to hide while inside
  player = null,             // setPosition({x,z}) + resetCameraBehind(yaw)
  streetProxies = [],        // collision while on the street
  streetTargets = [],        // interaction targets while on the street
  interaction = null,        // setTargets(arr)
  fade = (cb) => cb(),       // fade(cb): run cb at the darkest point (sync default)
  interiors = INTERIORS,     // injectable for tests (registry of { build() })
  interiorIds = INTERIOR_IDS,
} = {}) {
  const state = createLocationState({ interiors: interiorIds });
  const built = new Map();   // id -> { group, proxies, exitTarget } (lazy, cached)
  let activeProxies = streetProxies;
  let streetReturn = null;   // where to drop the player when they step back out

  const showWorld = (visible) => { for (const g of worldGroups) if (g) g.visible = visible; };

  function ensureInterior(id) {
    if (built.has(id)) return built.get(id);
    const made = interiors[id].build();
    made.group.visible = false;
    if (scene?.add) scene.add(made.group);
    built.set(id, made);
    return made;
  }

  // Enter a building. `returnTo` = the street position/yaw to restore on exit
  // (the door you came in by). Returns false on an invalid transition.
  function enter(id, { returnTo = null } = {}) {
    if (!state.enter(id)) return false;
    const def = interiors[id];
    const room = ensureInterior(id);
    streetReturn = returnTo;
    fade(() => {
      showWorld(false);
      room.group.visible = true;
      player?.setPosition?.({ x: def.spawn.x, z: def.spawn.z });
      player?.resetCameraBehind?.(def.spawn.yaw ?? 0);
      activeProxies = room.proxies;
      interaction?.setTargets?.(room.targets || []);
    });
    return true;
  }

  function exit() {
    const t = state.exit();
    if (!t) return false;
    const room = built.get(t.from);
    fade(() => {
      if (room) room.group.visible = false;
      showWorld(true);
      if (streetReturn) {
        player?.setPosition?.({ x: streetReturn.x, z: streetReturn.z });
        player?.resetCameraBehind?.(streetReturn.yaw ?? 0);
      }
      activeProxies = streetProxies;
      interaction?.setTargets?.(streetTargets);
    });
    return true;
  }

  return {
    enter,
    exit,
    isInterior: () => state.isInterior(),
    current: () => state.current(),
    activeProxies: () => activeProxies,
    STREET,
  };
}
