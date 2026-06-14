import { normalizeInventoryState } from "./inventoryState.js";

export const FIRST_ROAD_DISCOVERY_ID = "frontier_broken_wagon";
export const FIRST_ROAD_STARTER_JOB_ID = "frontier_slime_bounty";
export const FIRST_ROAD_SURVEY_JOB_ID = "frontier_map_survey";

function completedJobs(jobState = {}) {
  return new Set(Array.isArray(jobState?.completedJobIds)
    ? jobState.completedJobIds.filter((jobId) => typeof jobId === "string")
    : []);
}

function discoveredPois(regions = {}) {
  return new Set(Array.isArray(regions?.poisDiscovered)
    ? regions.poisDiscovered.filter((poiId) => typeof poiId === "string")
    : []);
}

function inventoryCount(inventory, itemName) {
  const normalized = normalizeInventoryState(inventory);
  return Math.max(0, Math.floor(normalized[itemName] || 0));
}

export function resolveFirstRoadMemoryStatus({
  regions = {},
  inventory = {},
  jobState = {},
  house = {},
  narrative = {},
  regionId = "frontier",
} = {}) {
  const jobs = completedJobs(jobState);
  const pois = discoveredPois(regions);
  const hasMapScrap = inventoryCount(inventory, "Map Scrap") > 0;
  const wagonDiscovered = pois.has(FIRST_ROAD_DISCOVERY_ID);
  const bountyCompleted = jobs.has(FIRST_ROAD_STARTER_JOB_ID);
  const surveyCompleted = jobs.has(FIRST_ROAD_SURVEY_JOB_ID);
  const surveyProgress = jobState?.progressByJobId?.[FIRST_ROAD_SURVEY_JOB_ID] || null;
  const surveyActive = jobState?.activeJobId === FIRST_ROAD_SURVEY_JOB_ID && !surveyCompleted;
  const surveyReady = surveyActive && surveyProgress?.status === "ready";
  const surveyCount = Math.max(0, Math.min(3, Math.floor(Number.isFinite(surveyProgress?.count) ? surveyProgress.count : 0)));
  const nextSurveyStep = Math.min(3, surveyCount + 1);
  const booneMemory = narrative?.npcMemory?.byNpc?.warden || {};
  const booneSawWagon = booneMemory.recentPoiId === FIRST_ROAD_DISCOVERY_ID;

  let phase = "unseen";
  if (surveyCompleted) phase = "survey_completed";
  else if (surveyReady) phase = "survey_ready";
  else if (surveyActive) phase = "survey_active";
  else if (bountyCompleted && (wagonDiscovered || hasMapScrap || booneSawWagon)) phase = "survey_available";
  else if (bountyCompleted) phase = "bounty_completed";
  else if (wagonDiscovered || hasMapScrap || booneSawWagon) phase = "discovered";
  else if (regionId === "frontier") phase = "visible";

  const copy = {
    unseen: {
      objectiveLine: "Return to Westward to start Boone's first road loop.",
      booneLine: "",
      boardLine: "Westward work starts with Boone's marsh road.",
      houseLine: house?.unlocked ? "No first-road proof has reached the house yet." : "Unlock the house to display first-road proof.",
      runSummaryLine: "First road memory not started.",
      nextStep: "Travel back to Westward and look for Boone's board.",
    },
    visible: {
      objectiveLine: "Inspect the Broken Wagon on Boone's marshal road before the slime trail goes cold.",
      booneLine: "Marshal Boone: Broken Wagon sits just off my first road. Slimes made the noise, but something cut those cargo straps.",
      boardLine: "Boone's board now points first-timers past the Broken Wagon before the marsh fight.",
      houseLine: house?.unlocked ? "The house has room for a first-road map proof." : "Unlock the house to pin first-road proof above the bench.",
      runSummaryLine: "The first road still has an unchecked Broken Wagon clue.",
      nextStep: "Follow the marshal road and inspect Broken Wagon.",
    },
    discovered: {
      objectiveLine: "Carry the Broken Wagon map scrap back into Boone's road work.",
      booneLine: "Marshal Boone: That map scrap gives my road jobs sharper teeth. It marks where trouble waits, not where reports pretend it waits.",
      boardLine: "Old Road Survey is the natural follow-up: use the Map Scrap to verify Boone's road marks.",
      houseLine: house?.unlocked ? "Broken Wagon Map Scrap can be pinned above the bench as the first road plan." : "Unlock the house to display the Broken Wagon Map Scrap.",
      runSummaryLine: "Found Broken Wagon and carried a Map Scrap back toward Boone's work.",
      nextStep: bountyCompleted ? "Take Old Road Survey from Boone's board." : "Finish Marsh Slime Bounty, then turn the Map Scrap into survey work.",
    },
    bounty_completed: {
      objectiveLine: "The marsh road is clear; inspect Broken Wagon to turn the route into follow-up work.",
      booneLine: "Marshal Boone: First road loop held. Now check Broken Wagon before folks pretend the road is safe just because the slimes moved.",
      boardLine: "The bounty is paid, but the board still flags Broken Wagon as an unchecked road clue.",
      houseLine: house?.unlocked ? "Marsh Bounty Notice is proof; the road map proof is still missing." : "Unlock the house to display the Marsh Bounty Notice.",
      runSummaryLine: "Cleared Marsh Slime Bounty; Broken Wagon remains the next road clue.",
      nextStep: "Inspect Broken Wagon for the Map Scrap follow-up.",
    },
    survey_available: {
      objectiveLine: "Take Old Road Survey from Boone's board and mark the route the map scrap exposed.",
      booneLine: "Marshal Boone: Bounty paid, map scrap found. Now we turn a strange wagon into a road people can trust.",
      boardLine: "Old Road Survey is available because the Broken Wagon Map Scrap named the old road marks.",
      houseLine: house?.unlocked ? "Broken Wagon Map Scrap is pinned as a workbench planning proof." : "Unlock the house to pin the Broken Wagon Map Scrap.",
      runSummaryLine: "Cleared the first road, found the Broken Wagon Map Scrap, and opened Old Road Survey.",
      nextStep: "Accept Old Road Survey from Boone's board.",
    },
    survey_active: {
      objectiveLine: `Mark Old Road Survey checkpoint ${nextSurveyStep}/3 before returning to Boone.`,
      booneLine: "Marshal Boone: Keep your eyes on the old road marks. A map is only useful when boots prove it.",
      boardLine: `Old Road Survey active: ${surveyCount}/3 road marks checked.`,
      houseLine: house?.unlocked ? "The workbench map waits for the last road marks before Boone signs it." : "Unlock the house to pin the finished survey map.",
      runSummaryLine: `Old Road Survey started with ${surveyCount}/3 road marks checked.`,
      nextStep: `Reach Old Road Survey checkpoint ${nextSurveyStep}/3.`,
    },
    survey_ready: {
      objectiveLine: "Return to Boone with 3/3 Old Road Survey marks checked.",
      booneLine: "Marshal Boone: Bring those marks back. If they line up, the board can stop guessing where the road is safe.",
      boardLine: "Old Road Survey is ready to claim; return to Boone for pay and route proof.",
      houseLine: house?.unlocked ? "The finished Old Road Survey is ready to pin above the workbench." : "Unlock the house to display the finished Old Road Survey.",
      runSummaryLine: "Old Road Survey route marks are complete and waiting for Boone's pay.",
      nextStep: "Return to Boone and claim Old Road Survey.",
    },
    survey_completed: {
      objectiveLine: "Old Road Survey complete; Boone's first road now has marked proof.",
      booneLine: "Marshal Boone: That road survey helps. A marked road keeps families from learning geography by panic.",
      boardLine: "Boone's board treats the first marshal road as surveyed and safer to post.",
      houseLine: house?.unlocked ? "Old Road Survey is pinned above the bench with fresh route marks." : "Unlock the house to display Old Road Survey proof.",
      runSummaryLine: "Turned the Broken Wagon clue into a completed Old Road Survey.",
      nextStep: "Spend the route payout on workbench prep, repairs, or the next posted road job.",
    },
  }[phase];

  return {
    phase,
    discoveryId: FIRST_ROAD_DISCOVERY_ID,
    title: "First Road Memory",
    wagonDiscovered,
    hasMapScrap,
    bountyCompleted,
    surveyCompleted,
    surveyActive,
    surveyReady,
    surveyCount,
    surveyTotal: 3,
    houseUnlocked: Boolean(house?.unlocked),
    ...copy,
  };
}
