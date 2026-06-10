// Story copy for Boone's job board — the modal's narrative surface.
//
// Pure node logic (no DOM, no Three): resolves what the board should SAY from
// the RPG state tree, so the modal can't drift from the rules again:
//   - Boone's spoken line (npcMemory-aware: first meeting → job reaction → quiet)
//   - the primary job copy (real jobBoard data, not hardcoded paragraphs)
//   - the other pinned listings (the board reads like a town's economy)
//   - the post-claim "Bounty Paid" view with the Old Road Survey hook
// Tested in tests/render3d-board-copy.test.ts.

import { resolveNpcReactiveLine } from "../npcMemory.js";
import { CANONICAL_STARTER_JOB_ID, resolveLatestCompletedJobBoardLine } from "../jobBoard.js";
import { boardChoices, REGION_ID } from "./gameState.js";

const PINNED_LIMIT = 3;

function pinView(listing) {
  return {
    title: listing.title || "",
    detail: listing.availabilityLine || "",
    rewardLine: listing.rewardLine || "",
  };
}

export function buildBoardView(state) {
  const jobs = state?.world?.jobs || {};
  const completedJobIds = Array.isArray(jobs.completedJobIds) ? jobs.completedJobIds : [];
  const starterDone = completedJobIds.includes(CANONICAL_STARTER_JOB_ID);
  const listings = boardChoices(state);
  const starter = listings.find((l) => l.id === CANONICAL_STARTER_JOB_ID) || null;
  const others = listings.filter((l) => l.id !== CANONICAL_STARTER_JOB_ID).slice(0, PINNED_LIMIT);

  // Boone speaks when he has something to say; otherwise the board carries it.
  const booneLine =
    resolveNpcReactiveLine("warden", state.npcMemory, { completedJobIds }) || "";

  if (starterDone) {
    return {
      mode: "completed",
      title: "Boone's Board — Bounty Paid",
      booneLine,
      bodyLines: [
        resolveLatestCompletedJobBoardLine(completedJobIds, REGION_ID)
          || "The marsh road job is settled.",
        "Old Road Survey is pinned as the next lead — past the wagon wreck, where your map scrap points.",
      ],
      rewardLine: "",
      progressLine: "",
      listings: others.map(pinView),
    };
  }

  const active = jobs.activeJobId === CANONICAL_STARTER_JOB_ID && Boolean(starter);
  return {
    mode: active ? "active" : "offer",
    title: starter?.title || "Boone's First Road Job",
    booneLine,
    bodyLines: [starter?.boardNote || "Boone wants the marsh road checked before more cargo goes missing.", starter?.hint || ""].filter(Boolean),
    rewardLine: starter?.rewardLine ? `Reward: ${starter.rewardLine}` : "",
    progressLine: active ? starter?.progressLine || "" : "",
    listings: others.map(pinView),
  };
}
