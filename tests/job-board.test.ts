import { describe, it, expect } from "vitest";
import {
  JOB_DEFINITIONS,
  CANONICAL_STARTER_JOB_ID,
  getJobListings,
  passesCompletionGate,
  createInitialJobBoardState,
} from "../src/jobBoard.js";
import { createInitialInventoryState } from "../src/inventoryState.js";

const EASTWATER_ID = "frontier_eastwater_run";

// ─── def structure validation ─────────────────────────────────────────────────

describe("jobBoard — frontier_eastwater_run def validates", () => {
  const def = JOB_DEFINITIONS[EASTWATER_ID];

  it("exists in JOB_DEFINITIONS", () => {
    expect(def).toBeDefined();
  });

  it("has required identity fields matching the spec", () => {
    expect(def.id).toBe(EASTWATER_ID);
    expect(def.title).toBe("Ranch Ledger Run");
    expect(def.kind).toBe("courier");
    expect(def.regionId).toBe("frontier");
    expect(def.npcId).toBe("warden");
    expect(def.npcName).toBe("Marshal Boone");
  });

  it("has flavor copy (hint + boardNote) mentioning the key narrative beats", () => {
    expect(def.hint).toContain("ledger");
    expect(def.hint).toContain("east");
    expect(def.boardNote).toContain("ledger");
  });

  it("objective is supply_run type with count 2 and correct label", () => {
    expect(def.objective.type).toBe("supply_run");
    expect(def.objective.count).toBe(2);
    expect(def.objective.label).toBe("ranch ledger delivered");
  });

  it("objective pickup points to eastwater_ledger_cache with world coords", () => {
    expect(def.objective.pickup.id).toBe("eastwater_ledger_cache");
    expect(def.objective.pickup.label).toBe("Ranch Ledger");
    expect(typeof def.objective.pickup.x).toBe("number");
    expect(typeof def.objective.pickup.y).toBe("number");
  });

  it("objective dropoff points to eastwater_trading_post with world coords", () => {
    expect(def.objective.dropoff.id).toBe("eastwater_trading_post");
    expect(def.objective.dropoff.label).toBe("Eastwater Trading Post");
    expect(typeof def.objective.dropoff.x).toBe("number");
    expect(typeof def.objective.dropoff.y).toBe("number");
  });

  it("top-level delivery field mirrors objective pickup/dropoff for questRuntime", () => {
    expect(def.delivery).toBeDefined();
    expect(def.delivery.pickup.id).toBe(def.objective.pickup.id);
    expect(def.delivery.dropoff.id).toBe(def.objective.dropoff.id);
  });

  it("reward matches spec: 60 gold, 30 xp, 1 Potion", () => {
    expect(def.reward.gold).toBe(60);
    expect(def.reward.xp).toBe(30);
    expect(def.reward.items).toEqual({ Potion: 1 });
  });

  it("requiresCompletedJobIds gates on frontier_slime_bounty", () => {
    expect(Array.isArray(def.requiresCompletedJobIds)).toBe(true);
    expect(def.requiresCompletedJobIds).toContain(CANONICAL_STARTER_JOB_ID);
  });
});

// ─── passesCompletionGate ─────────────────────────────────────────────────────

describe("jobBoard — passesCompletionGate", () => {
  const def = JOB_DEFINITIONS[EASTWATER_ID];

  it("blocks the job when completedJobIds is empty", () => {
    expect(passesCompletionGate(def, [])).toBe(false);
  });

  it("blocks the job when only unrelated jobs are completed", () => {
    expect(passesCompletionGate(def, ["frontier_road_salvage"])).toBe(false);
  });

  it("allows the job when frontier_slime_bounty is completed", () => {
    expect(passesCompletionGate(def, [CANONICAL_STARTER_JOB_ID])).toBe(true);
  });

  it("allows jobs with no requiresCompletedJobIds regardless of state", () => {
    const slimeDef = JOB_DEFINITIONS[CANONICAL_STARTER_JOB_ID];
    expect(passesCompletionGate(slimeDef, [])).toBe(true);
  });

  it("allows when gate field is missing", () => {
    expect(passesCompletionGate({} as any, [])).toBe(true);
    expect(passesCompletionGate(null as any, [])).toBe(true);
  });
});

// ─── getJobListings gate integration ─────────────────────────────────────────

describe("jobBoard — getJobListings hides/shows eastwater based on slime completion", () => {
  it("hides frontier_eastwater_run before frontier_slime_bounty is completed", () => {
    const jobState = createInitialJobBoardState();
    const listings = getJobListings({ regionId: "frontier", playerLevel: 1, jobState });
    const ids = listings.map((j) => j.id);
    expect(ids).not.toContain(EASTWATER_ID);
  });

  it("hides frontier_eastwater_run when completedJobIds is empty", () => {
    const jobState = { ...createInitialJobBoardState(), completedJobIds: [] };
    const listings = getJobListings({ regionId: "frontier", playerLevel: 1, jobState });
    expect(listings.map((j) => j.id)).not.toContain(EASTWATER_ID);
  });

  it("shows frontier_eastwater_run after frontier_slime_bounty is completed", () => {
    const jobState = {
      ...createInitialJobBoardState(),
      completedJobIds: [CANONICAL_STARTER_JOB_ID],
    };
    const listings = getJobListings({ regionId: "frontier", playerLevel: 1, jobState });
    const ids = listings.map((j) => j.id);
    expect(ids).toContain(EASTWATER_ID);
  });

  it("listing for the def is fully decorated when shown", () => {
    const jobState = {
      ...createInitialJobBoardState(),
      completedJobIds: [CANONICAL_STARTER_JOB_ID],
    };
    const listing = getJobListings({ regionId: "frontier", playerLevel: 1, jobState })
      .find((j) => j.id === EASTWATER_ID)!;
    expect(listing).toBeDefined();
    expect(listing.rewardLine).toContain("60g");
    expect(listing.progressLine).toBeTruthy();
  });
});

// ─── phantom-item regression guard ────────────────────────────────────────────
// Every reward.items key on every job def must be a canonical inventory item
// (the keys seeded by createInitialInventoryState). This catches placeholder
// rewards like "Tonic" that have no inventory/shop backing and would render as
// incoherent "+1 <phantom>" text on the board.

describe("jobBoard — reward items are all canonical", () => {
  const CANONICAL_ITEMS = new Set(Object.keys(createInitialInventoryState()));

  it("no job def grants a non-canonical reward item", () => {
    const offenders: string[] = [];
    for (const [jobId, def] of Object.entries(JOB_DEFINITIONS)) {
      const items = def?.reward?.items ?? {};
      for (const itemName of Object.keys(items)) {
        if (!CANONICAL_ITEMS.has(itemName)) {
          offenders.push(`${jobId}: ${itemName}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
