// Pure quest-runtime helpers for the "Ranch Ledger Run" courier quest.
//
// No THREE, no DOM — unit-testable in node. Mirrors phaseState.js style:
// stateless functions that read the jobState slice and return view shapes.
//
// The minimap and objective strip consume these on every frame; the interaction
// system gates questPickup / questDropoff targets through questTargetEnabled.

import { JOB_DEFINITIONS, getActiveJobSummary } from "../jobBoard.js";
// Board coords sourced from FIRST_FIVE_ROUTE's jobBoard waypoint.
// If this import ever creates a circular dependency, replace with the hardcoded
// fallback below.
import { FIRST_FIVE_ROUTE } from "./frontierLayout.js";

export const EASTWATER_JOB_ID = "frontier_eastwater_run";

// Boone's board world position — used as the "return" map target when the
// job is in "ready" state. Pulled from the layout's canonical jobBoard waypoint
// so the value stays in sync with the world map automatically.
const BOARD_WAYPOINT = FIRST_FIVE_ROUTE.find((wp) => wp.kind === "jobBoard")
  // Hardcoded fallback if the import ever breaks (see comment above).
  ?? { x: 13.0, y: 5.65, label: "Boone's Board" };

const BOARD_TARGET = {
  x: BOARD_WAYPOINT.x,
  y: BOARD_WAYPOINT.y,
  label: "Boone's Board",
};

const DEF = JOB_DEFINITIONS[EASTWATER_JOB_ID];

// ─── internal helpers ────────────────────────────────────────────────────────

function activeEastwaterSummary(jobState) {
  const summary = getActiveJobSummary(jobState);
  if (!summary || summary.id !== EASTWATER_JOB_ID) return null;
  return summary;
}

function deliveryCount(summary) {
  return summary?.progress?.count ?? 0;
}

function isReady(summary) {
  return summary?.progress?.status === "ready";
}

// ─── public API ──────────────────────────────────────────────────────────────

/**
 * questTargetEnabled(jobState, target) → boolean
 *
 * Gates questPickup / questDropoff interactable targets.
 *
 * true only when:
 *   - frontier_eastwater_run is the active job, AND
 *   - kind "questPickup" AND count is 0  (ledger not yet picked up), OR
 *   - kind "questDropoff" AND count is 1  (ledger in hand, not yet delivered)
 *
 * Any other active job, wrong target kind, or wrong count → false.
 */
export function questTargetEnabled(jobState, target) {
  if (!target) return false;
  const summary = activeEastwaterSummary(jobState);
  if (!summary) return false;
  const count = deliveryCount(summary);
  if (isReady(summary)) return false;
  if (target.kind === "questPickup" && count === 0) return true;
  if (target.kind === "questDropoff" && count === 1) return true;
  return false;
}

/**
 * questPromptFor(jobState, target) → string
 *
 * Returns the "E — …" prompt string for the current beat's interactable.
 * Returns "" when the target is not currently enabled.
 */
export function questPromptFor(jobState, target) {
  if (!questTargetEnabled(jobState, target)) return "";
  if (target.kind === "questPickup") return "E — Take the Ranch Ledger";
  if (target.kind === "questDropoff") return "E — Deliver the Ledger";
  return "";
}

/**
 * questObjectiveView(jobState) → object | null
 *
 * Returns the loopState-shaped object syncObjectiveDom consumes, describing
 * the current beat of the courier run. Returns null when frontier_eastwater_run
 * is not the active job.
 *
 * Shape mirrors phaseState's snapshot:
 *   { objectiveLabel, objectiveText, objectiveMeta, phase }
 *
 * Beat descriptions:
 *   count 0  → "Take the ledger from Boone's office"  (pointing at cache)
 *   count 1  → "Ride east — deliver to the Eastwater Trading Post"
 *   ready    → "Return to Boone's board for the courier pay"
 */
export function questObjectiveView(jobState) {
  const summary = activeEastwaterSummary(jobState);
  if (!summary) return null;

  const count = deliveryCount(summary);
  const ready = isReady(summary);
  const pickup = DEF.delivery.pickup;
  const dropoff = DEF.delivery.dropoff;

  if (ready) {
    return {
      phase: "quest_eastwater_return",
      objectiveLabel: "Ranch Ledger Run",
      objectiveText: "Return to Boone's board for the courier pay.",
      objectiveMeta: [
        "Action: Return to board",
        `Reward: +60g, +30 XP, +1 Potion`,
      ],
    };
  }

  if (count >= 1) {
    return {
      phase: "quest_eastwater_deliver",
      objectiveLabel: "Ranch Ledger Run",
      objectiveText: `Ride east — deliver to the ${dropoff.label}.`,
      objectiveMeta: [
        `Target: ${dropoff.label}`,
        "Ledger: In hand",
      ],
    };
  }

  // count === 0 — pickup beat
  return {
    phase: "quest_eastwater_pickup",
    objectiveLabel: "Ranch Ledger Run",
    objectiveText: `Take the ledger from Boone's office.`,
    objectiveMeta: [
      `Target: ${pickup.label}`,
      "Action: Pick up ledger",
    ],
  };
}

/**
 * questMapTarget(jobState) → { x, y, label } | null
 *
 * Returns the world position the minimap should highlight for the current beat.
 *
 *   count 0 → pickup coords (eastwater_ledger_cache)
 *   count 1 → dropoff coords (eastwater_trading_post)
 *   ready   → Boone's board coords
 *   no job  → null
 */
export function questMapTarget(jobState) {
  const summary = activeEastwaterSummary(jobState);
  if (!summary) return null;

  const count = deliveryCount(summary);
  const ready = isReady(summary);
  const pickup = DEF.delivery.pickup;
  const dropoff = DEF.delivery.dropoff;

  if (ready) {
    return BOARD_TARGET;
  }

  if (count >= 1) {
    return { x: dropoff.x, y: dropoff.y, label: dropoff.label };
  }

  return { x: pickup.x, y: pickup.y, label: pickup.label };
}
