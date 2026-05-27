// Dev/QA overlay JSON payload assembly.
// Extracted from src/main.js — keeps the public `window.render_game_to_text()`
// API identical. main.js wires this up via a tiny `JSON.stringify` caller.
//
// The module imports static helpers directly from sibling modules, and accepts
// the live, mutable runtime state + main.js-local helpers via a single `ctx`
// parameter so the body can stay nearly identical to its original form.

import { dist, vecLength, numberOr } from "./math.js";
import { resolveNarrativeEnding } from "./decisionEngine.js";
import { buildRunSummary } from "./runSummary.js";
import {
  buildCharacterIdentitySummary,
  normalizeCharacterIdentity,
  resolveIdentityShopPriceMultiplier,
} from "./characterIdentity.js";
import {
  buildGearInventorySummary,
  buildGearSummary,
} from "./gearCrafting.js";
import { describeWorkstationState } from "./craftingStation.js";
import { getJobListings, normalizeJobBoardState } from "./jobBoard.js";
import { resolveFirstMinuteCache } from "./gameFeel.js";
import {
  buildRegionIdentityLine,
  buildRegionWorldPresentation,
  getRegionVisualIdentity,
  resolveRegionReadabilityCues,
} from "./regionVisualIdentity.js";
import { resolveHouseProgressDisplay } from "./houseProgress.js";
import {
  describeSaveSlotRecovery,
  describeSaveBackupChoices,
} from "./savePersistence.js";
import {
  findNearbyPOIs,
  findNearbyRoadsideDiscoveries,
  resolveExplorationRenownStatus,
} from "./poiSystem.js";
import { totalCodexProgress } from "./codex.js";
import {
  GRAPHICS_PRESETS,
  applyGraphicsAccessibility,
} from "./graphicsSettings.js";
import { getRegionArtKit, resolveOpeningViewComposition } from "./regionArtKits.js";
import { buildVisualMood } from "./visualProfile.js";
import { MAX_SUPPORTED_SAVE_VERSION } from "./saveMigration.js";
import {
  resolveCombatEncounterReadability,
  resolveEnemyReadabilityCue,
} from "./combatReadability.js";
import { formatInteractionPrompt } from "./interactionPrompt.js";
import { getNotableInventorySummary } from "./inventoryState.js";

/**
 * Build the developer/QA overlay payload.
 *
 * @param {object} ctx — runtime context wiring main.js scope to this module.
 * @param {object} ctx.state — top-level game state.
 * @param {Array<Array<number>>} ctx.worldMap — current world map matrix.
 * @returns {object} payload (JSON-safe).
 */
export function buildDevOverlayPayload(ctx) {
  const {
    // live runtime state
    state,
    worldMap,
    // mutable UI flags / save-cache state from main.js scope
    characterSheetOpen,
    workbenchOpen,
    workbenchSelection,
    jobBoardOpen,
    jobBoardSelection,
    hasSaveData,
    lastSaveAt,
    currentSaveSlot,
    savesLoaded,
    cachedSlotMetas,
    cachedBackupMetasBySlot,
    smokeSaveRecoveryProof,
    discoveryBanner,
    hudNotice,
    combatReadabilityNotice,
    // local helpers defined in main.js (passed in by reference)
    buildSlotSummaryText,
    worldPresentationContext,
    getInteractionPrompt,
    getBooneJobChoices,
    economySnapshot,
    getWorkbenchActions,
    getWorkbenchActionCatalog,
    getFirstRoadMemoryStatus,
    getOpeningHudChromeMode,
    buildOpeningObjectiveSnapshot,
    resolveWorldNightStrength,
    collectSceneDynamicLights,
  } = ctx;

  const activeEnemies = state.enemies.filter((e) => e.alive);
  const activeResources = state.resources.filter((r) => !r.harvested);
  const activeNpcs = state.npcs;
  const activePigs = state.pigs;
  const identity = normalizeCharacterIdentity(state.progression.identity);
  const characterSummary = buildCharacterIdentitySummary(identity);
  const gearSummary = buildGearSummary(state.progression.equipment, identity);
  const gearInventorySummary = buildGearInventorySummary(state.progression.equipment);
  const workstationSummary = describeWorkstationState(state.house.workstation);
  const houseProgressSummary = resolveHouseProgressDisplay({
    inventory: state.inventory,
    jobState: state.world.jobs,
    house: state.house,
  });
  const firstRoadMemory = getFirstRoadMemoryStatus();
  const runSummary = buildRunSummary(state.world, state.narrative, state.player, state.companion, state.time, houseProgressSummary, firstRoadMemory);
  const explorationRenown = resolveExplorationRenownStatus(state.regions.poisDiscovered?.length || 0);
  const objectiveSnapshot = buildOpeningObjectiveSnapshot({ activeEnemies });
  const openingObjective = objectiveSnapshot.openingObjective;
  const firstMinutePressure = objectiveSnapshot.firstMinutePressure;
  const firstMinuteCache = resolveFirstMinuteCache({
    mode: state.mode,
    time: state.time,
    inHouse: state.player.inHouse,
    regionId: state.regions.activeRegion,
    inventory: state.inventory,
    quests: state.quests,
    opened: state.chest.opened,
    claimed: state.chest.firstRewardClaimed,
  });
  const explorationLead = objectiveSnapshot.explorationLead;
  const roadDiscoveryLead = objectiveSnapshot.roadDiscoveryLead;
  const nearbyRoadsideDiscoveries = !state.player.inHouse && state.regions?.activeRegion
    ? findNearbyRoadsideDiscoveries(state.regions, state.regions.activeRegion, state.player.x, state.player.y, 14).slice(0, 3)
    : [];
  const regionProfile = getRegionVisualIdentity(state.regions.activeRegion);
  const worldPresentation = buildRegionWorldPresentation(state.regions.activeRegion, worldPresentationContext());
  const regionReadability = resolveRegionReadabilityCues(state.regions.activeRegion);
  const regionArtKit = getRegionArtKit(state.regions.activeRegion);
  const openingComposition = resolveOpeningViewComposition({ regionId: state.regions.activeRegion });
  const textVisualMoodBase = buildVisualMood({
    weather: state.weather,
    chapterIndex: state.narrative.chapterIndex,
    day: 0.5 + Math.sin(state.time * 0.014) * 0.45,
    qualitySetting: state.weather.quality,
    biome: state.regions.activeRegion,
  });
  textVisualMoodBase.regionProfile = regionProfile;
  textVisualMoodBase.artKit = getRegionArtKit(state.regions.activeRegion);
  const textVisualMood = applyGraphicsAccessibility(textVisualMoodBase, state.graphics.accessibility);
  const textWorldNightStrength = resolveWorldNightStrength();
  textVisualMood.nightStrength = Math.max(numberOr(textVisualMood.nightStrength, 0), textWorldNightStrength);
  textVisualMood.dynamicLightStrength = numberOr(textVisualMood.dynamicLightStrength, 0.35) + textWorldNightStrength * 0.24;
  const dynamicLightSnapshot = collectSceneDynamicLights(worldPresentation, textVisualMood)
    .map((light) => ({
      id: light.id,
      kind: light.kind,
      x: Number(light.x.toFixed(2)),
      y: Number(light.y.toFixed(2)),
      radius: Number(light.radius.toFixed(2)),
      intensity: Number(light.intensity.toFixed(2)),
      color: light.color,
    }));
  const roadSignPrompt = objectiveSnapshot.roadSignPrompt;
  const roadRouteObjective = objectiveSnapshot.roadRouteObjective;
  const activeJob = objectiveSnapshot.activeJob;
  const jobListings = getJobListings({
    regionId: state.regions.activeRegion,
    playerLevel: state.player.level,
    jobState: state.world.jobs,
    inventory: state.inventory,
    narrative: state.narrative,
  });
  const jobRouteMarker = objectiveSnapshot.jobMarker;
  const boardProp = objectiveSnapshot.boardProp;
  const goldenPath = objectiveSnapshot.goldenPath;
  const openingFightCue = objectiveSnapshot.openingFightCue;
  const combatReadability = resolveCombatEncounterReadability({
    enemies: state.player.inHouse ? [] : activeEnemies,
    player: state.player,
    maxDistance: 10,
    recentEvent: combatReadabilityNotice,
    subtitlesEnabled: state.graphics.accessibility?.combatSubtitles !== false,
  });
  const openingRouteGuide = objectiveSnapshot.openingRouteGuide;
  const liveObjective = objectiveSnapshot.liveObjective;
  const firstSessionNextStep = objectiveSnapshot.firstSessionNextStep;
  const firstSessionObjectiveDisplay = objectiveSnapshot.objectiveDisplay;
  const firstFiveMinuteLoop = objectiveSnapshot.firstFiveMinuteLoop;
  const hudChromeMode = getOpeningHudChromeMode();
  const interactionPrompt = getInteractionPrompt();
  const promptLine = formatInteractionPrompt(interactionPrompt);
  const firstLoopPromptKinds = {
    find_board: ["job-board"],
    accept_bounty: ["job-board"],
    follow_road: ["job-route", "poi", "job-board", "road-sign"],
    open_cache: ["poi", "job-route"],
    fight_slime: ["job-route", "poi"],
    inspect_wagon: ["poi", "job-route"],
    return_to_boone: ["job-board", "job-route", "npc"],
    claim_reward: ["job-board", "job-route", "npc"],
    survey_followup: ["job-board", "job-route", "npc"],
  };
  const promptMatchesFirstLoop = !firstFiveMinuteLoop || !interactionPrompt
    || (firstLoopPromptKinds[firstFiveMinuteLoop.phase] || []).includes(interactionPrompt.kind);
  const presentationLabels = [
    ...(worldPresentation.props || []),
    ...(worldPresentation.vegetation || []),
    ...(worldPresentation.roads || []),
    ...(worldPresentation.roadSigns || []),
    worldPresentation.landmark,
  ]
    .filter(Boolean)
    .map((entry) => String(entry.label || entry.kind || "").toLowerCase());
  const openingSceneProof = {
    style: regionArtKit.id === "frontier" ? "playable-haunted-western-dusk" : regionArtKit.sky.style,
    has_dusk_sky: regionArtKit.sky.style.includes("dusk") || regionArtKit.sky.style.includes("western"),
    has_road_cue: Boolean(regionReadability.roadPull || regionArtKit.road?.style),
    has_landmark: Boolean(worldPresentation.landmark?.label || openingComposition.landmark),
    has_job_board: Boolean(boardProp),
    has_smoke_cache: state.regions.activeRegion === "frontier" && !state.chest.opened,
    has_broken_wagon_cue: presentationLabels.some((label) => label.includes("broken wagon")),
    has_first_enemy_cue: Boolean(openingFightCue || combatReadability?.nearest),
    has_single_primary_objective: Boolean(firstSessionObjectiveDisplay?.displayPrimary && firstSessionObjectiveDisplay?.displayMeta?.length),
    objective_display_mode: firstSessionObjectiveDisplay ? "single-strip" : "none",
    has_low_chrome_hud: hudChromeMode === "first-minute-low-chrome",
    has_uncluttered_opening_hud: hudChromeMode === "first-minute-low-chrome" && Boolean(firstSessionObjectiveDisplay),
    hud_panel_count: hudChromeMode === "first-minute-low-chrome" && firstSessionObjectiveDisplay ? 3 : 4,
    hud_display_mode: hudChromeMode,
    hud_focus_line: firstSessionNextStep?.actionLine || liveObjective?.objectiveLine || liveObjective?.line || null,
    prompt_line: promptLine,
    prompt_matches_objective: promptMatchesFirstLoop,
  };
  openingSceneProof.proof_score = [
    openingSceneProof.has_dusk_sky,
    openingSceneProof.has_road_cue,
    openingSceneProof.has_landmark,
    openingSceneProof.has_job_board,
    openingSceneProof.has_smoke_cache,
    openingSceneProof.has_broken_wagon_cue,
    openingSceneProof.has_first_enemy_cue,
    openingSceneProof.has_single_primary_objective,
    openingSceneProof.has_low_chrome_hud,
    openingSceneProof.has_uncluttered_opening_hud,
  ].filter(Boolean).length;
  const quests = {
    crystal: {
      title: state.quests.crystal.title,
      status: state.quests.crystal.status,
      progress: state.quests.crystal.progress,
      need: state.quests.crystal.need,
    },
    slime: {
      title: state.quests.slime.title,
      status: state.quests.slime.status,
      progress: state.quests.slime.progress,
      need: state.quests.slime.need,
    },
    wood: {
      title: state.quests.wood.title,
      status: state.quests.wood.status,
      progress: state.quests.wood.progress,
      need: state.quests.wood.need,
      wood_required: state.quests.wood.needWood,
      stone_required: state.quests.wood.needStone,
    },
    archive: state.quests.archive
      ? {
        title: state.quests.archive.title,
        status: state.quests.archive.status,
        progress: state.quests.archive.progress,
        need: state.quests.archive.need,
      }
      : null,
  };

  const payload = {
    coordinate_system: {
      origin: state.player.inHouse ? "top-left of house interior map" : "top-left of world map",
      x_direction: "positive x moves east/right",
      y_direction: "positive y moves south/down",
    },
    map: {
      width_tiles: worldMap[0]?.length || 0,
      height_tiles: worldMap.length,
      active_region: state.regions.activeRegion,
      player_location: state.player.inHouse ? "house interior" : getRegionVisualIdentity(state.regions.activeRegion).label,
      note: "Use the minimap for nearby roads, markers, NPCs, enemies, and POIs; the full overworld is 56 by 56 tiles.",
    },
    mode: state.mode,
    character_sheet_open: characterSheetOpen,
    workbench_open: workbenchOpen,
    workbench_selection: workbenchSelection,
    workbench_actions: getWorkbenchActions(),
    workbench_action_catalog: getWorkbenchActionCatalog(),
    job_board_open: jobBoardOpen,
    job_board_selection: jobBoardSelection,
    job_board_choices: getBooneJobChoices(),
    save: {
      has_save: hasSaveData,
      last_saved_at: lastSaveAt,
      current_slot: currentSaveSlot,
      slots_loaded: savesLoaded,
      slots: cachedSlotMetas.map((meta) => ({
        slot: meta.slot,
        empty: Boolean(meta.empty),
        valid: Boolean(meta.valid),
        saved_at: meta.savedAt || null,
        reason: meta.reason || null,
        summary: buildSlotSummaryText(meta),
        recovery: describeSaveSlotRecovery(meta, { maxSupportedVersion: MAX_SUPPORTED_SAVE_VERSION }),
        backups: describeSaveBackupChoices(cachedBackupMetasBySlot[meta.slot] || []),
      })),
      smoke_recovery: smokeSaveRecoveryProof,
    },
    gameplay_feel: {
      next_step: firstSessionNextStep,
      live_objective: liveObjective,
      first_five_minute_loop: firstFiveMinuteLoop,
      interaction_prompt: interactionPrompt,
      opening_objective: openingObjective,
      opening_fight_cue: openingFightCue,
      combat_readability: combatReadability,
      opening_route_guide: openingRouteGuide,
      road_discovery_lead: roadDiscoveryLead,
      first_road_memory: firstRoadMemory,
      roadside_discoveries_nearby: nearbyRoadsideDiscoveries,
      discovery_banner: discoveryBanner
        ? {
          title: discoveryBanner.title,
          subtitle: discoveryBanner.subtitle,
          reward_line: discoveryBanner.rewardLine,
          hook_line: discoveryBanner.hookLine,
          codex_line: discoveryBanner.codexLine,
          lines: discoveryBanner.lines,
          ttl: Number((discoveryBanner.ttl || 0).toFixed(2)),
        }
        : null,
      hud_notice: hudNotice
        ? {
          kind: hudNotice.kind,
          title: hudNotice.title,
          line: hudNotice.line,
          color: hudNotice.color,
          ttl: Number((hudNotice.ttl || 0).toFixed(2)),
        }
        : null,
      road_sign_prompt: roadSignPrompt,
      road_route_objective: roadRouteObjective,
      golden_path: goldenPath,
      first_minute_pressure: firstMinutePressure,
      first_reward_cache: firstMinuteCache
        ? {
          ...firstMinuteCache,
          chest_opened: state.chest.opened,
          claimed: Boolean(state.chest.firstRewardClaimed),
          distance: state.player.inHouse ? null : Number(dist(state.player, state.chest).toFixed(2)),
          last_reward: state.chest.lastReward,
        }
        : {
          available: false,
          chest_opened: state.chest.opened,
          claimed: Boolean(state.chest.firstRewardClaimed),
          distance: state.player.inHouse ? null : Number(dist(state.player, state.chest).toFixed(2)),
          last_reward: state.chest.lastReward,
        },
      exploration_lead: explorationLead,
      time_scale: Number((state.player.timeScale || 1).toFixed(2)),
      hit_pulse: Number((state.player.hitPulse || 0).toFixed(2)),
      screen_shake: Number((state.player.screenShake || 0).toFixed(2)),
    },
    combat_readability: combatReadability,
    location: state.player.inHouse ? "house" : "valley",
    weather: {
      kind: state.player.inHouse ? "sheltered" : state.weather.kind,
      rain: Number(state.weather.rain.toFixed(2)),
      fog: Number(state.weather.fog.toFixed(2)),
      wind: Number(state.weather.wind.toFixed(2)),
    },
    player: {
      x: Number(state.player.x.toFixed(2)),
      y: Number(state.player.y.toFixed(2)),
      angle: Number(state.player.angle.toFixed(3)),
      hp: Math.round(state.player.hp),
      maxHp: state.player.maxHp,
      level: state.player.level,
      xp: state.player.xp,
      nextXp: state.player.nextXp,
      stamina: Math.round(state.player.stamina),
      gold: state.player.gold,
      blocking: state.player.blocking,
      guard_broken: Boolean(state.player.guardBroken),
      guard_broken_timer: Number((state.player.guardBrokenTimer || 0).toFixed(2)),
      parry_chain_timer: Number((state.player.parryChainTimer || 0).toFixed(2)),
      charge_windup: Number((state.player.chargeAttackWindup || 0).toFixed(2)),
      combo_step: state.player.comboStep,
      swinging: state.player.swingTimer > 0,
      loadout: state.player.loadout,
      perks: state.player.perks,
      identity,
      identity_summary: characterSummary,
      gear_summary: gearSummary,
      gear_inventory: gearInventorySummary,
      progression_modifiers: state.player.progressionMods,
      identity_shop_price_multiplier: resolveIdentityShopPriceMultiplier(identity),
    },
    inventory: state.inventory,
    notable_inventory: getNotableInventorySummary(state.inventory),
    loot: state.world.loot,
    job_board: {
      state: normalizeJobBoardState(state.world.jobs),
      golden_path: goldenPath,
      active_job: activeJob,
      listings: jobListings,
      route_marker: jobRouteMarker,
      prop: boardProp
        ? {
          ...boardProp,
          distance: state.player.inHouse ? null : Number(dist(state.player, boardProp).toFixed(2)),
        }
        : null,
    },
    economy: economySnapshot(),
    exploration_renown: explorationRenown,
    run_summary: runSummary,
    region_visual_identity: {
      ...regionProfile,
      identity_line: buildRegionIdentityLine(state.regions.activeRegion),
      readability: regionReadability,
      world_presentation: worldPresentation,
    },
    visual_qa: {
      active_region_art_kit: regionArtKit.label,
      art_kit_quality: regionArtKit.quality,
      sky_style: regionArtKit.sky.style,
      horizon_style: regionArtKit.horizon.style,
      road_style: regionArtKit.road.style,
      landmark_visible: Boolean(worldPresentation.landmark?.label),
      landmark: worldPresentation.landmark?.label || openingComposition.landmark,
      road_readability_cue: regionReadability.roadPull,
      current_visual_preset: state.graphics.preset,
      visual_quality_setting: state.weather.quality,
      world_dressing_counts: worldPresentation.worldDressing,
      opening_composition: openingComposition,
      opening_scene_proof: openingSceneProof,
    },
    dynamic_lighting: {
      active_count: dynamicLightSnapshot.length,
      max_active: GRAPHICS_PRESETS[state.graphics?.preset]?.dynamicLights || 14,
      strength: Number((textVisualMood.dynamicLightStrength || 0).toFixed(2)),
      night_strength: Number((textVisualMood.nightStrength || 0).toFixed(2)),
      dusk_strength: Number((textVisualMood.duskStrength || 0).toFixed(2)),
      lights: dynamicLightSnapshot,
    },
    house: {
      unlocked: state.house.unlocked,
      visited: state.house.visits,
      workstation: state.house.workstation,
      workstation_summary: workstationSummary,
      progress_display: houseProgressSummary,
      outside_door: {
        x: Number(state.house.outsideDoor.x.toFixed(2)),
        y: Number(state.house.outsideDoor.y.toFixed(2)),
        distance: state.player.inHouse ? null : Number(dist(state.player, state.house.outsideDoor).toFixed(2)),
      },
    },
    quests,
    narrative: {
      chapter: state.narrative.chapter,
      chapterTitle: state.narrative.chapterTitle,
      factionRep: state.narrative.factionRep,
      thematicAxes: state.narrative.thematicAxes,
      decisions: state.narrative.decisions,
      questOutcomes: state.narrative.questOutcomes,
      npcMemory: state.narrative.npcMemory,
      ending: resolveNarrativeEnding(state.narrative, state.companion),
    },
    codex: {
      progress: totalCodexProgress(state),
      unlocked: state.codex?.unlocked || {},
    },
    companion: state.companion.active
      ? {
        id: state.companion.id,
        name: state.companion.name,
        hp: Math.round(state.companion.hp),
        x: Number(state.companion.x.toFixed(2)),
        y: Number(state.companion.y.toFixed(2)),
        distance: Number(dist(state.player, state.companion).toFixed(2)),
      }
      : state.companion.downed
        ? {
          id: state.companion.id,
          name: state.companion.name,
          downed: true,
          recoveryTimer: Number((state.companion.recoveryTimer || 0).toFixed(2)),
        }
        : null,
    nearby_npcs: state.player.inHouse
      ? []
      : activeNpcs
        .map((n) => ({
          id: n.id,
          name: n.name,
          x: Number(n.x.toFixed(2)),
          y: Number(n.y.toFixed(2)),
          distance: Number(dist(state.player, n).toFixed(2)),
        }))
        .filter((n) => n.distance < 8)
        .sort((a, b) => a.distance - b.distance),
    nearby_pigs: state.player.inHouse
      ? []
      : activePigs
        .map((p) => ({
          id: p.id,
          name: p.name,
          role: p.role,
          x: Number(p.x.toFixed(2)),
          y: Number(p.y.toFixed(2)),
          speed: Number(vecLength(p.vx || 0, p.vy || 0).toFixed(2)),
          stampeding: state.pigStampedeTimer > 0,
          distance: Number(dist(state.player, p).toFixed(2)),
        }))
        .filter((p) => p.distance < 10)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 10),
    nearby_enemies: state.player.inHouse
      ? []
      : activeEnemies
        .map((e) => ({
          id: e.id,
          type: e.type,
          label: e.label,
          behavior: e.behavior,
          mini_boss_id: e.miniBossId || null,
          phase: e.phase || 1,
          invuln_timer: Number((e.invulnTimer || 0).toFixed(2)),
          readability_cue: resolveEnemyReadabilityCue(e),
          x: Number(e.x.toFixed(2)),
          y: Number(e.y.toFixed(2)),
          hp: e.hp,
          distance: Number(dist(state.player, e).toFixed(2)),
        }))
        .filter((e) => e.distance < 10)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 8),
    nearby_resources: state.player.inHouse
      ? [
        { id: "bed", type: "bed", x: state.house.bed.x, y: state.house.bed.y, distance: Number(dist(state.player, state.house.bed).toFixed(2)) },
        { id: "stash", type: "stash", x: state.house.stash.x, y: state.house.stash.y, distance: Number(dist(state.player, state.house.stash).toFixed(2)) },
        { id: "exit", type: "exit-door", x: state.house.interiorDoor.x, y: state.house.interiorDoor.y, distance: Number(dist(state.player, state.house.interiorDoor).toFixed(2)) },
        ...houseProgressSummary.trophies.map((trophy) => ({
          id: trophy.id,
          type: "house-trophy",
          label: trophy.label,
          status: trophy.status,
          line: trophy.line,
          x: trophy.x,
          y: trophy.y,
          distance: Number(dist(state.player, trophy).toFixed(2)),
        })),
      ]
      : activeResources
        .map((r) => ({
          id: r.id,
          type: r.type,
          x: Number(r.x.toFixed(2)),
          y: Number(r.y.toFixed(2)),
          distance: Number(dist(state.player, r).toFixed(2)),
        }))
        .filter((r) => r.distance < 9)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 12),
    nearby_pois: state.player.inHouse
      ? []
      : findNearbyPOIs(state.regions, state.regions.activeRegion, state.player.x, state.player.y, 9)
        .map((poi) => ({
          id: poi.id,
          kind: poi.kind,
          label: poi.label,
          x: Number(poi.x.toFixed(2)),
          y: Number(poi.y.toFixed(2)),
          distance: Number(dist(state.player, poi).toFixed(2)),
        }))
        .sort((a, b) => a.distance - b.distance),
    discovered_pois: Array.isArray(state.regions.poisDiscovered) ? state.regions.poisDiscovered.slice() : [],
    messages: state.msg.slice(0, 4).map((m) => m.text),
  };

  return payload;
}
