// Location state — Rustwater's loaded-interior model. The player is either on the
// street or inside ONE building interior; never both. This pure module tracks the
// current location id and validates enter/exit transitions, so the scene-swap in
// locationView (the Three.js binding) can't desync — and so the rule "render one
// street OR one room, never both" (the anti-lag promise) is enforced at the source.
//
// No Three.js here. locationView reacts to the { from, to } transitions returned
// below (tear down / build the matching scene group, reposition the player, swap
// collision + interactables). Saves restore via { start }.

export const STREET = "street";

export function createLocationState({ start = STREET, interiors = [] } = {}) {
  const valid = new Set(interiors);
  // A stale save pointing at a removed building clamps to the street rather than
  // trapping the player in a location that no longer exists.
  let current = start === STREET || valid.has(start) ? start : STREET;

  return {
    current: () => current,
    isInterior: () => current !== STREET,

    // Enter a building interior from the street. Returns { from, to } on a real
    // transition; null if invalid — an unknown id, or already inside something
    // (you must exit before entering another).
    enter(id) {
      if (current !== STREET) return null;
      if (!valid.has(id)) return null;
      current = id;
      return { from: STREET, to: id };
    },

    // Leave the current interior back to the street. null if already outside.
    exit() {
      if (current === STREET) return null;
      const from = current;
      current = STREET;
      return { from, to: STREET };
    },
  };
}
