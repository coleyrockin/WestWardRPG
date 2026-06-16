// Proximity-based interaction prompts for the Three.js spike.
//
// Milestone 3B step 3 (docs/roadmap.md). Picks the nearest interactable
// within its kind-specific radius, surfaces an "E — …" prompt, and dispatches
// the registered handler when the player presses E.
//
// The DOM is poked through a single seam: `setPromptText(text)`. spike.js
// passes a small writer that updates #prompt; tests pass a spy. Keeps this
// module unit-testable in node without jsdom.

const ACTION_KEY = "KeyE";

const PROMPTS = {
  jobBoard:    { radius: 2.5, text: "E — Open Boone's Board" },
  roadSign:    { radius: 2.2, text: "E — Read Road Sign" },
  townBark:    { radius: 2.4, text: "E — Hear Pearl's Warning" },
  smokeCache:  { radius: 2.0, text: "E — Open Smoke Cache" },
  slimeTell:   { radius: 2.2, text: "E — Inspect Slime Trail" },
  brokenWagon: { radius: 2.5, text: "E — Inspect Wagon" },
  roadSlime:   { radius: 2.2, text: "E — Strike Road Slime" },
  gravesite:   { radius: 2.5, text: "E — Attend Abram's Funeral" },
  // radius is coupled to the whistle-recall stop distance in spike.js (the horse halts at
  // dist <= 2.5, just inside this 2.6 so a recalled horse stops in mounting range). Keep
  // this radius > that stop distance or a whistled horse parks out of reach. Bump one,
  // re-check the other.
  mountHorse:  { radius: 2.6, text: "E — Mount Up" },
};

// All interactable kinds, exported for spike.js / debug overlays.
export const INTERACTABLE_KINDS = Object.freeze(Object.keys(PROMPTS));

function distance2(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

// Pure: returns the worldObjects entry whose kind is interactable AND whose
// distance to (playerX, playerZ) is within its prompt radius. Picks the
// closest if multiple qualify. Returns null when nothing is in range.
//
// `worldObjects` use the placement shape (x/y/kind) — y is the world Y axis
// which maps to 3D Z.
export function pickNearest(playerPos, worldObjects, isTargetEnabled = () => true) {
  if (!playerPos || !worldObjects?.length) return null;
  let best = null;
  let bestD2 = Infinity;
  for (const obj of worldObjects) {
    const cfg = PROMPTS[obj?.kind];
    if (!cfg) continue;
    if (!isTargetEnabled(obj)) continue;
    const d2 = distance2(playerPos.x, playerPos.z, obj.x, obj.y);
    if (d2 > cfg.radius * cfg.radius) continue;
    if (d2 < bestD2) { best = obj; bestD2 = d2; }
  }
  return best;
}

// Pure: prompt string for a target (or "" when null/non-interactable).
export function promptFor(target) {
  if (!target) return "";
  return PROMPTS[target.kind]?.text || "";
}

// Real-DOM shell. Wires the E keydown and emits prompt strings via
// `setPromptText`. Handlers are registered per-kind via `registerHandler`.
//
// Options:
//   worldObjects   — placements array (snapshot.worldObjects).
//   setPromptText  — (text: string) => void; called on every update().
//   isTargetEnabled — (target) => boolean; gates targets by current game phase.
//   getPromptText  — (target) => string; lets a phase machine override copy.
//   document       — overridable for tests (defaults to globalThis.document).
export function createInteractionSystem({
  worldObjects,
  setPromptText = () => {},
  isTargetEnabled = () => true,
  getPromptText = promptFor,
  document: doc = globalThis.document,
} = {}) {
  const handlers = new Map();
  let nearest = null;

  const onKeyDown = (e) => {
    if (e.code !== ACTION_KEY) return;
    if (!nearest) return;
    const fn = handlers.get(nearest.kind);
    if (typeof fn === "function") fn(nearest);
  };

  if (doc?.addEventListener) doc.addEventListener("keydown", onKeyDown);

  function update(playerPos) {
    nearest = pickNearest(playerPos, worldObjects, isTargetEnabled);
    setPromptText(nearest ? getPromptText(nearest) : "");
  }

  function registerHandler(kind, fn) {
    if (typeof fn !== "function") return;
    handlers.set(kind, fn);
  }

  function dispose() {
    if (doc?.removeEventListener) doc.removeEventListener("keydown", onKeyDown);
    handlers.clear();
    nearest = null;
  }

  return {
    update,
    registerHandler,
    dispose,
    get nearest() { return nearest; },
  };
}
