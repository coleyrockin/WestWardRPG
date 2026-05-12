import {
  TAU,
  FOV,
  MAX_RAY_DIST,
  TEXTURE_SIZE,
  PLAYER_COLLISION_RADIUS,
  WALL_RENDER_NEAR_CLIP,
  WALL_TEXTURE_NEAR_CLIP,
  PLAYER_SPEED,
  PLAYER_ROT_SPEED,
  PLAYER_MAX_HP,
  SAVE_KEY,
  LEGACY_SAVE_KEYS,
  LOCALE_KEY,
  LEGACY_LOCALE_KEYS,
  AUTOSAVE_INTERVAL,
  QUEST_STATUSES,
  WESTERN_PIG_ROLES,
} from "./constants.js";
import {
  clamp,
  lerp,
  easeOutCubic,
  normalizeAngle,
  dist,
  vecLength,
  normalizeVec,
  clampVec,
  choice,
  numberOr,
  noise2D,
  shadeHex,
} from "./math.js";
import {
  STORY_CHAPTERS,
  MAJOR_NPCS,
  createInitialNarrativeState,
  syncChapterFromProgress,
  applyMajorDecision,
  applyQuestOutcome,
  createDecisionRecap,
  resolveNarrativeEnding,
  migrateNarrativeState,
} from "./decisionEngine.js";
import {
  chooseEnemyType,
  createEnemyStats,
  createEnemyCombatProfile,
  resolveBehaviorMove,
} from "./enemyArchetypes.js";
import {
  resolveCombatProgression,
  applySwingLoadout,
  resolveIncomingDamage,
  resolveGuardBreakState,
  getSprintModifier,
  applyMovesetGeometry,
  applyBlockStaminaChip,
} from "./combatLoadout.js";
import {
  applyMiniBossPhaseTransition,
  cancelChargedAttack,
  clearChargedAttack,
  getMiniBossPhaseTwo,
  resolveParryChain,
  resetParryChain,
  startChargedAttack,
  tickChargedAttack,
  tickMiniBossInvulnerability,
  tickParryChain,
} from "./combatMilestones.js";
import {
  buildRunSummary,
  completeVictoryRun,
  createInitialRunStats,
  ensureRunStats,
  recordResourceHarvest,
  recordRunKill,
  syncQuestOutcomeCount,
} from "./runSummary.js";
import { appendRunRecord, getRunHistory, formatRunRecord } from "./runHistory.js";
import { tickNpc } from "./npcBehaviors.js";
import { resolveInfluenceSpawnMult } from "./influenceMap.js";
import { createFogGrid, normalizeFogGrid, revealAroundPlayer, isCellDiscovered, FOG_GRID_SIZE } from "./fogOfWar.js";
import { createPostProcessor } from "./postProcess.js";
import { LANGUAGE_PACKS as LANG_PACKS, LANGUAGE_OPTIONS as LANG_OPTIONS } from "./languagePacks.js";
import { updateWeather as tickWeather } from "./weatherSystem.js";
import { createDevMetrics, tickDevMetrics, drawDevOverlay } from "./devOverlay.js";
import { resolveNgPlusHpMult } from "./newGamePlus.js";
import { todaysSeedString, computeDailyScore, submitDailyScore, getTodaysPersonalBest, resolveScoreMultiplier } from "./dailySeedMode.js";
import { getLetterByPoiId } from "./journalLetters.js";
import { resolvePatrolDensityMult } from "./patrolSystem.js";
import { advanceCalendarDay, resolveCurrentSeason, resolveSeasonModifiers, resolveSeasonLabel } from "./seasonalEvents.js";
import { getTodaysOverlays } from "./regionOverlays.js";
import { createMinimapCache, bakeMinimapLayer, getMinimapLayerCanvas, invalidateMinimapCache } from "./minimapCache.js";
import { createReplaySession, recordInputEvent, finalizeReplay, saveReplayLocally } from "./replayRecorder.js";
import { resolvePlayerArchetype, ARCHETYPE_NPC_REACTIONS } from "./characterIdentity.js";
import { resolveActiveCurseEffects, resolveCurseNpcReaction } from "./cursedItems.js";
import { getUnlockedCapstonePerkIds } from "./progressionSystem.js";
import { generateSideJobs } from "./sideJobGenerator.js";
import { createCombatSubtitleState, recordCombatEvent, tickCombatSubtitles, drawCombatSubtitles, playCombatAudioCue } from "./combatAccessibility.js";
import { createInputManager } from "./inputManager.js";
import { createSaveStateManager } from "./saveStateManager.js";
import { canAttack, canDodge, resolveNextComboStep, resolveStaminaRegenRate, isInSwingArc, resolveEnemyStagger, BASE_COMBOS, DODGE_STAMINA_COST, DODGE_COOLDOWN } from "./combatProcessor.js";
import { resolveDiscoveryRewardFeedback } from "./discoveryRewardFeedback.js";
import {
  ORIGINS,
  applyOrigin,
  buildCharacterIdentitySummary,
  normalizeCharacterIdentity,
  resolveIdentityShopPriceMultiplier,
} from "./characterIdentity.js";
import {
  buildGearInventorySummary,
  buildGearSummary,
  normalizeGearState,
  resolveCraftingCostMultiplier,
} from "./gearCrafting.js";
import {
  createInitialWorkstationState,
  describeWorkstationState,
  getAvailableCraftingActions,
  getCraftingActionCatalog,
  normalizeWorkstationState,
  resolveCraftingAction,
} from "./craftingStation.js";
import {
  applyLootDropToState,
  createInitialLootState,
  normalizeLootState,
  rollLootDrop,
} from "./lootSystem.js";
import {
  acceptJob,
  claimJobReward,
  createInitialJobBoardState,
  getActiveJobSummary,
  getJobBoardPresentation,
  getJobBoardProp,
  getJobBoardChoices,
  getJobListings,
  normalizeJobBoardState,
  recordJobEvent,
  resolveGoldenPathStatus,
  resolveJobRouteMarker,
} from "./jobBoard.js";
import {
  createJobLoopNotice,
  resolveJobRewardFeedback,
} from "./jobRewardFeedback.js";
import {
  buildEconomySnapshot,
  getVendorServiceProfile,
} from "./economyServices.js";
import {
  resolveCombatEncounterReadability,
  resolveBossPhaseVfx,
  resolveEnemyDeathVfx,
  resolveEnemyDefeatCallout,
  resolveEnemyReadabilityCue,
} from "./combatReadability.js";
import {
  createInitialNpcMemoryState,
  normalizeNpcMemoryState,
  recordNpcMemoryEvent,
  resolveNpcReactiveLine,
} from "./npcMemory.js";
import {
  resolveFirstMinuteCache,
  resolveFirstMinuteCacheReward,
  resolveFirstMinutePressure,
  resolveFirstSessionNextStep,
  resolveHitFeedback,
  resolveOpeningFightCue,
  resolveOpeningObjective,
  resolveOpeningRouteGuide,
} from "./gameFeel.js";
import {
  buildRegionIdentityLine,
  buildRegionRoutePolyline,
  buildRegionWorldPresentation,
  getRegionVisualIdentity,
  resolveRegionReadabilityCues,
  resolveRoadSignPrompt,
} from "./regionVisualIdentity.js";
import {
  createRoadRouteFromSignPrompt,
  normalizeRoadRouteState,
  resolveRoadRouteCompletionReward,
  resolveRoadRouteObjective,
} from "./roadRoutes.js";
import {
  createInitialInventoryState,
  getNotableInventorySummary,
  normalizeInventoryState,
} from "./inventoryState.js";
import {
  resolveHouseProgressDisplay,
  resolveHouseTrophyInspection,
} from "./houseProgress.js";
import { buildVisualMood } from "./visualProfile.js";
import {
  resolveDynamicLightAtPoint,
  selectDynamicLights,
} from "./dynamicLights.js";
import {
  createCodexUnlockNotice,
  createFactionRepNotice,
  createHudNotice,
} from "./hudNotice.js";
import {
  resolveInteractionPrompt,
} from "./interactionPrompt.js";
import {
  buildJobObjective,
  buildQuestHudLines,
  resolveLiveObjectiveLine,
  selectLiveObjective,
} from "./hudObjectives.js";
import {
  resolveHorizontalStepKey,
  resolveVerticalMenuKey,
} from "./modalInput.js";
import {
  resolveMinimapDotStyle,
  resolveMinimapMarkerStyle,
  resolveMinimapPolylineStyle,
} from "./minimapVisuals.js";
import {
  createSpriteLightHelpers,
  resolveSpriteLightOverlayAlpha,
} from "./spriteVisuals.js";
import {
  QUEST_DEFINITIONS,
  createInitialQuestState,
  updateQuestProgressFromInventoryDataDriven,
} from "./questDefinitions.js";
import { NPC_DIALOGUE, DEATH_MESSAGES } from "./storyContent.js";
import {
  getAvailableDialogueChoices,
  applyDialogueChoice,
  ensureDialogueChoiceState,
} from "./dialogueChoices.js";
import {
  DIFFICULTY_LEVELS,
  resolveDifficultyProfile,
  ensureDifficultyDefaults,
  cycleDifficulty,
  setDifficulty,
  getEnemyHpMultiplier,
  getEnemyDamageMultiplier,
  getRewardMultiplier,
} from "./difficultyTuning.js";
import {
  trySpeakBark,
  tryQuestOutcomeBark,
  resetBarkState,
} from "./companionBarks.js";
import {
  resolveWalkCycle,
  resolveAttackCycle,
} from "./spriteAnimation.js";
import {
  REGION_INTERIORS,
  buildRegionInteriorMap,
  getRegionInteriorByRegion,
  hasVisitedInterior,
  markInteriorVisited,
  ensureInteriorVisitState,
} from "./regionInteriors.js";
import { migrateSaveToV3, MAX_SUPPORTED_SAVE_VERSION } from "./saveMigration.js";
import { createInitialUiModalState, normalizeUiModalState } from "./uiModals.js";
import { resolveQuestOutcomeEcho } from "./questOutcomeEchoes.js";
import {
  readSave as idbReadSave,
  writeSave as idbWriteSave,
  migrateFromLocalStorage as idbMigrateFromLocalStorage,
  findMostRecentValidBackup as idbFindMostRecentValidBackup,
  restoreFromBackup as idbRestoreFromBackup,
  listBackups as idbListBackups,
  exportSaveBlob as idbExportSaveBlob,
  importSaveFromText as idbImportSaveFromText,
  deleteSave as idbDeleteSave,
  listSlots as idbListSlots,
  summarizeSavePayload,
  describeSaveSlotRecovery,
  describeSaveBackupChoices,
  KNOWN_SLOTS as IDB_KNOWN_SLOTS,
  DEFAULT_SLOT as IDB_DEFAULT_SLOT,
} from "./savePersistence.js";
import {
  createInitialProgressionState,
  unlockSkill,
  canUnlockSkill,
  upgradeWeaponTier,
  addArmorModifier,
  equipArmorPiece,
  equipWeaponFamily,
  resolveIdeologyTraits,
  buildProgressionModifiers,
  ARMOR_MODIFIERS,
  WEAPON_TIERS,
} from "./progressionSystem.js";
import {
  attachAffix,
  buildAffixModifiers,
  rollAffix,
} from "./weaponAffixes.js";
import { REGIONS, createInitialRegionState, unlockRegion, rollRegionEvent, resolveRegionEventModifiers } from "./regionSystem.js";
import {
  createParticlePool,
  spawnParticleInto,
  updateParticlePool,
  forEachActive as forEachActiveParticle,
  clearPool as clearParticlePool,
  DEFAULT_PARTICLE_CAP,
} from "./particlePool.js";
import {
  createSpatialHash,
  rebuildSpatialHash,
  queryRadius as queryEnemyRadius,
} from "./spatialHash.js";
import {
  createAudioBuses,
  setAmbientRegion,
  stopAmbient,
  setMusicRegion,
  setCombatTension,
  stopMusic,
  MUSIC_REGION_PROFILE,
} from "./audio.js";
import { applyOutcomeModulation } from "./musicReactivity.js";
import {
  hexToRgba as hexToRgbaUtil,
  gradientBucket as gradientBucketUtil,
  createGradientCache,
  createRenderHelpers,
  resolveNearWallVisualTreatment,
  resolveObjectiveStripLayout,
  resolveRoadSurfaceVisualStyle,
  resolveScrollableRowWindow,
  resolveWallProjection,
} from "./render.js";
import {
  createHudRenderer,
  resolveDiscoveryBannerLayout,
  resolveInteractionPromptLayout,
} from "./hudRenderer.js";
import { createModalController } from "./modalController.js";
import {
  applyStatus,
  updateStatuses,
  clearStatuses,
  getStatusSpeedMult,
  hasStatus,
  checkStatusSynergies,
} from "./statusEffects.js";
import {
  advanceTimeOfDay,
  ensureWorldTimeDefaults,
  resolvePhase,
  resolvePhaseTint,
  resolveSpawnModifier,
  formatPhaseLabel,
} from "./timeOfDay.js";
import {
  resolveShopPriceMultiplier,
  canSmithUpgradeWeapon,
  resolvePatrolModifier,
  resolveAllFactionEffects,
  FACTION_NAMES,
} from "./factionEffects.js";
import {
  POI_KINDS,
  ensurePoiDefaults,
  markPOIDiscovered,
  isPOIDiscovered,
  findNearbyPOIs,
  findNearbyRoadsideDiscoveries,
  poiUnderInteraction,
  getPOIsForRegion,
  resolvePOILead,
  resolveRoadDiscoveryLead,
  resolveExplorationRenownReward,
  resolveExplorationRenownStatus,
} from "./poiSystem.js";
import {
  CODEX_TABS,
  ensureCodexState,
  unlockCodexEntry,
  listEntriesForTab,
  resolveCodexUnlockForPOI,
  totalCodexProgress,
  getEntry as getCodexEntry,
} from "./codex.js";
import {
  GRAPHICS_PRESETS,
  createInitialGraphicsState,
  resolveRecommendedPreset,
  applyGraphicsAccessibility,
  getColorblindPalette,
  SETTINGS_ROWS,
  readSettingValue,
  stepSetting,
} from "./graphicsSettings.js";
import {
  createInitialCompanionRuntime,
  chooseEligibleCompanion,
  activateCompanion,
  updateCompanionRuntime,
  applyCompanionThreat,
  tickCompanionRecovery,
} from "./companion.js";
import { computeAtmosphere } from "./atmosphere.ts";

const OPENING_CACHE_SEED = resolveFirstMinuteCache({
  mode: "playing",
  time: 0,
  inHouse: false,
  regionId: "frontier",
  inventory: {},
  quests: {},
});
const OPENING_CACHE_START = OPENING_CACHE_SEED?.marker || { x: 12.6, y: 8.85 };

const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const menu = document.getElementById("menu");
  const startBtn = document.getElementById("start-btn");
  const continueBtn = document.getElementById("continue-btn");
  const saveSlotsContainer = document.getElementById("save-slots");
  const difficultyPicker = document.getElementById("difficulty-picker");
  const originPicker = document.getElementById("origin-picker");
  const langSelect = document.getElementById("lang-select");
  const langLabel = document.getElementById("lang-label");

  const LANGUAGE_OPTIONS = LANG_OPTIONS;
  const LANGUAGE_PACKS = LANG_PACKS;
  // Language packs live in src/languagePacks.js

  let currentLang = "en";
  let selectedOriginId = "exiled_marshal";

  function deepGet(obj, path) {
    return path.split(".").reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
  }

  function fmt(template, vars = {}) {
    return template.replace(/\{(\w+)\}/g, (_, token) => (vars[token] !== undefined ? String(vars[token]) : `{${token}}`));
  }

  function t(key, vars) {
    const active = LANGUAGE_PACKS[currentLang] || LANGUAGE_PACKS.en;
    const value = deepGet(active, key) ?? deepGet(LANGUAGE_PACKS.en, key) ?? key;
    return typeof value === "string" ? fmt(value, vars) : value;
  }

  // Refined-menu helper: strips decorative emoji & control glyphs from
  // localized strings without touching in-game logs. The menu chrome relies
  // on type + atmosphere for character; emojis fight that hierarchy.
  const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu;
  function refineMenuText(value) {
    if (typeof value !== "string") return value;
    return value.replace(EMOJI_REGEX, "").replace(/\s{2,}/g, " ").trim();
  }
  function refineMenuTitle(value) {
    const cleaned = refineMenuText(value);
    if (!cleaned) return cleaned;
    // Render the title as proper title-case ("Dustward") regardless of
    // language pack capitalization.
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
  }

  function localizeMenu() {
    const title = document.getElementById("menu-title");
    const subtitle = document.getElementById("menu-subtitle");
    const hint = document.getElementById("hint");
    const controls = document.querySelectorAll("[data-control-index]");
    if (title) {
      title.textContent = "";
      const span = document.createElement("span");
      span.className = "ink";
      span.textContent = refineMenuTitle(t("menu.title"));
      title.appendChild(span);
    }
    if (subtitle) subtitle.textContent = refineMenuText(t("menu.subtitle"));
    if (hint) hint.textContent = refineMenuText(t("menu.goal"));
    if (startBtn) startBtn.textContent = refineMenuText(t("menu.start"));
    if (continueBtn) continueBtn.textContent = refineMenuText(t("menu.continue"));
    if (langLabel) langLabel.textContent = refineMenuText(t("labels.language"));
    controls.forEach((node) => {
      const index = Number(node.getAttribute("data-control-index"));
      const list = t("menu.controls");
      if (Array.isArray(list) && Number.isInteger(index) && list[index]) {
        node.textContent = refineMenuText(list[index]);
      }
    });
  }

  function renderOriginPicker() {
    if (!originPicker) return;
    originPicker.textContent = "";
    for (const origin of Object.values(ORIGINS)) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "origin-card";
      button.dataset.originId = origin.id;
      button.setAttribute("aria-pressed", origin.id === selectedOriginId ? "true" : "false");
      const name = document.createElement("span");
      name.className = "origin-card__name";
      name.textContent = origin.label;
      const summary = document.createElement("span");
      summary.className = "origin-card__summary";
      summary.textContent = origin.summary;
      button.appendChild(name);
      button.appendChild(summary);
      button.addEventListener("click", () => {
        selectedOriginId = origin.id;
        state.progression.identity = applyOrigin(state.progression.identity, selectedOriginId);
        applyProgressionEffects();
        updateOriginPickerSelection();
      });
      originPicker.appendChild(button);
    }
    updateOriginPickerSelection();
  }

  function updateOriginPickerSelection() {
    if (!originPicker) return;
    for (const button of originPicker.querySelectorAll("[data-origin-id]")) {
      const selected = button.dataset.originId === selectedOriginId;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    }
  }

  function renderDifficultyPicker() {
    if (!difficultyPicker) return;
    difficultyPicker.textContent = "";
    const label = document.createElement("span");
    label.className = "difficulty-picker-label";
    label.textContent = "Difficulty";
    difficultyPicker.appendChild(label);
    ensureDifficultyDefaults(state.world);
    for (const id of DIFFICULTY_LEVELS) {
      const profile = resolveDifficultyProfile(id);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "difficulty-pill";
      button.dataset.difficultyId = id;
      button.textContent = profile.label;
      button.title = profile.description;
      button.setAttribute("aria-pressed", id === state.world.difficulty ? "true" : "false");
      button.addEventListener("click", () => {
        setDifficulty(state.world, id);
        updateDifficultyPickerSelection();
      });
      difficultyPicker.appendChild(button);
    }
    updateDifficultyPickerSelection();
  }

  function updateDifficultyPickerSelection() {
    if (!difficultyPicker) return;
    for (const button of difficultyPicker.querySelectorAll("[data-difficulty-id]")) {
      const selected = button.dataset.difficultyId === state.world.difficulty;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    }
  }

  function refreshLocalizedStateText() {
    state.quests.crystal.title = t("quests.crystal");
    state.quests.slime.title = t("quests.slime");
    state.quests.wood.title = t("quests.wood");
    if (state.quests.ashfall_intro) state.quests.ashfall_intro.title = "5) Ashfall Salvage Route";
    if (state.quests.ashfall_boss) state.quests.ashfall_boss.title = "6) Sump Tyrant Shutdown";
    if (state.quests.lantern_probe) state.quests.lantern_probe.title = "7) Lantern Signal Intercept";
    if (state.quests.lantern_revolt) state.quests.lantern_revolt.title = "8) District Pressure Valve";
  }

  function readStorageWithFallback(primaryKey, legacyKeys) {
    try {
      const primaryValue = window.localStorage.getItem(primaryKey);
      if (primaryValue !== null) return { value: primaryValue, key: primaryKey };
      for (const key of legacyKeys) {
        const legacyValue = window.localStorage.getItem(key);
        if (legacyValue !== null) return { value: legacyValue, key };
      }
    } catch {
      // storage unavailable
    }
    return null;
  }

  function migrateStorageValue(nextKey, currentKey, rawValue) {
    if (!rawValue || currentKey === nextKey) return;
    try {
      window.localStorage.setItem(nextKey, rawValue);
    } catch {
      // migration is best-effort
    }
  }

  function buildLanguageOptions() {
    if (!langSelect) return;
    langSelect.textContent = "";
    for (const [code, label] of Object.entries(LANGUAGE_OPTIONS)) {
      if (!LANGUAGE_PACKS[code]) continue;
      const option = document.createElement("option");
      option.value = code;
      option.textContent = label;
      langSelect.appendChild(option);
    }
  }

  function setLanguage(langCode) {
    currentLang = LANGUAGE_PACKS[langCode] ? langCode : "en";
    try {
      window.localStorage.setItem(LOCALE_KEY, currentLang);
    } catch {
      // storage unavailable is non-fatal
    }
    localizeMenu();
    refreshLocalizedStateText();
  }

  function initLanguage() {
    let stored = null;
    const localeEntry = readStorageWithFallback(LOCALE_KEY, LEGACY_LOCALE_KEYS);
    if (localeEntry) {
      stored = localeEntry.value;
      migrateStorageValue(LOCALE_KEY, localeEntry.key, localeEntry.value);
    }
    currentLang = LANGUAGE_PACKS[stored] ? stored : "en";
    if (langSelect) {
      buildLanguageOptions();
      langSelect.value = currentLang;
      langSelect.addEventListener("change", (event) => {
        setLanguage(event.target.value);
      });
    }
    localizeMenu();
  }

  /* ─── Sound Effects System (Web Audio API) ─── */
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;
  let soundEnabled = true;
  let audioBuses = null;
  let ambientEnabled = true;
  let lastAmbientRegion = null;

  function ensureAudio() {
    if (!audioCtx && AudioCtx) {
      try { audioCtx = new AudioCtx(); } catch { audioCtx = null; }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => { });
    }
    if (audioCtx && !audioBuses) {
      try { audioBuses = createAudioBuses(audioCtx); } catch { audioBuses = null; }
    }
    return audioCtx;
  }

  function playCombatCue(type) {
    if (!soundEnabled || state.graphics.accessibility?.combatAudioCues === false) return;
    playCombatAudioCue(audioBuses?.ctx, type);
  }

  function resolveModulatedMusicProfile(regionId) {
    const base = MUSIC_REGION_PROFILE[regionId] || MUSIC_REGION_PROFILE.frontier;
    return applyOutcomeModulation(base, state.narrative);
  }

  function syncAmbientForRegion(regionId) {
    if (!ambientEnabled || !soundEnabled) return;
    const ctx = ensureAudio();
    if (!ctx || !audioBuses) return;
    if (regionId === lastAmbientRegion) return;
    try { setAmbientRegion(audioBuses, regionId); lastAmbientRegion = regionId; } catch { /* audio not critical */ }
    // Procedural music tracks the ambient region. Cross-fades with the same cadence.
    // Profile is modulated by narrative.questOutcomes so post-decision tone shifts.
    try {
      setMusicRegion(audioBuses, regionId, undefined, { profile: resolveModulatedMusicProfile(regionId) });
    } catch { /* music not critical */ }
  }

  // After a quest outcome resolves, re-fire setMusicRegion so the modulation
  // takes effect mid-region without waiting for a region change. Forces the
  // crossfade by clearing lastAmbientRegion. Cheap because the audio nodes
  // get rebuilt on every setMusicRegion call anyway.
  function refreshMusicForCurrentNarrative() {
    if (!ambientEnabled || !soundEnabled || !audioBuses) return;
    const regionId = state.regions?.activeRegion || "frontier";
    try {
      setMusicRegion(audioBuses, regionId, undefined, { profile: resolveModulatedMusicProfile(regionId) });
    } catch { /* music not critical */ }
  }

  // Tension fader: smoothed enemy-pressure signal feeds the combat stem.
  // Recomputed each frame in updateCombatMusicTension(); the music module
  // applies its own audio-rate ramp so we don't have to sample-accurately fade.
  let lastCombatTension = 0;
  function updateCombatMusicTension(dt) {
    if (!ambientEnabled || !soundEnabled || !audioBuses) return;
    const enemies = Array.isArray(state.enemies) ? state.enemies : [];
    let nearestThreat = 0;
    for (const e of enemies) {
      if (!e || !e.alive) continue;
      const dx = e.x - state.player.x;
      const dy = e.y - state.player.y;
      const dist = Math.hypot(dx, dy);
      // Only enemies within 8 units of the player count; closer = scarier.
      const proximity = Math.max(0, 1 - dist / 8);
      if (proximity > nearestThreat) nearestThreat = proximity;
    }
    // Smooth toward the target so combat tension fades naturally.
    const target = Math.min(1, nearestThreat);
    const rate = target > lastCombatTension ? 1.6 : 0.6;
    const eased = lastCombatTension + (target - lastCombatTension) * Math.min(1, rate * dt);
    if (Math.abs(eased - lastCombatTension) > 0.01) {
      try { setCombatTension(audioBuses, eased, 0.25); } catch { /* music not critical */ }
      lastCombatTension = eased;
    }
  }

  function playTone(freq, duration, type, volume, detune) {
    const ctx = ensureAudio();
    if (!ctx || !soundEnabled) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || "square";
      osc.frequency.value = freq;
      if (detune) osc.detune.value = detune;
      gain.gain.setValueAtTime(Math.min(volume || 0.08, 0.15), ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch { /* audio not critical */ }
  }

  function playNoise(duration, volume) {
    const ctx = ensureAudio();
    if (!ctx || !soundEnabled) return;
    try {
      const bufSize = Math.floor(ctx.sampleRate * duration);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      src.buffer = buf;
      gain.gain.setValueAtTime(Math.min(volume || 0.04, 0.1), ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start();
    } catch { /* audio not critical */ }
  }

  const sfx = {
    footstep() { playTone(80 + Math.random() * 40, 0.06, "triangle", 0.04); },
    swordSwing() { playNoise(0.12, 0.07); playTone(220 + Math.random() * 60, 0.1, "sawtooth", 0.05); },
    swordHit() { playTone(160, 0.08, "square", 0.09); playNoise(0.06, 0.08); },
    playerHurt() { playTone(110, 0.15, "sawtooth", 0.08, -200); },
    enemyDie() { playTone(300, 0.06, "square", 0.06); playTone(200, 0.1, "square", 0.05); playTone(100, 0.18, "square", 0.04); },
    pickup() { playTone(523, 0.06, "sine", 0.07); playTone(659, 0.08, "sine", 0.06); },
    questDone() { playTone(392, 0.1, "sine", 0.07); playTone(523, 0.12, "sine", 0.07); playTone(659, 0.14, "sine", 0.07); },
    shopBuy() { playTone(440, 0.05, "triangle", 0.06); playTone(554, 0.08, "triangle", 0.06); },
    doorOpen() { playTone(130, 0.15, "triangle", 0.05); playTone(165, 0.12, "triangle", 0.04); },
    potionUse() { playTone(350, 0.08, "sine", 0.06); playTone(440, 0.12, "sine", 0.05); playTone(523, 0.15, "sine", 0.04); },
    levelUp() { playTone(523, 0.1, "sine", 0.08); playTone(659, 0.1, "sine", 0.08); playTone(784, 0.15, "sine", 0.08); playTone(1047, 0.2, "sine", 0.07); },
    thunder() { playNoise(0.6, 0.09); playTone(40, 0.5, "sawtooth", 0.06); },
    miss() { playNoise(0.08, 0.03); },
    blockHit() { playTone(200, 0.06, "square", 0.06); playTone(90, 0.08, "triangle", 0.05); },
    rain() { playNoise(0.3, 0.02); },
    npcChat() { playTone(280 + Math.random() * 80, 0.04, "triangle", 0.03); },
    death() { playTone(180, 0.2, "sawtooth", 0.08); playTone(120, 0.3, "sawtooth", 0.06); playTone(60, 0.5, "sawtooth", 0.04); },
  };

  let footstepTimer = 0;
  let ambientTimer = 0;

  const npcDialogue = NPC_DIALOGUE;
  const deathMessages = DEATH_MESSAGES;

  /* ─── Shop System ─── */
  let regionEventsEnabled = true;

  function getActiveRegionEventModifiers() {
    if (!regionEventsEnabled) return { priceMult: 1, spawnDensityMult: 1, banner: null };
    return resolveRegionEventModifiers(state.regions?.events);
  }

  function openQuestOutcomeChoice(questId) {
    const outcomes = QUEST_DEFINITIONS[questId]?.outcomes;
    if (!outcomes || state.narrative?.questOutcomes?.[questId]) return false;
    pendingQuestOutcome = {
      questId,
      outcomes: Object.values(outcomes),
    };
    questOutcomeSelection = 0;
    questOutcomeOpen = true;
    shopOpen = false;
    skillScreenOpen = false;
    settingsOpen = false;
    codexOpen = false;
    characterSheetOpen = false;
    jobBoardOpen = false;
    logMsg("Choose how this quest changes Dustward.");
    return true;
  }

  function confirmQuestOutcomeChoice() {
    if (!pendingQuestOutcome) return;
    const questId = pendingQuestOutcome.questId;
    const selected = pendingQuestOutcome.outcomes[questOutcomeSelection];
    const applied = applyQuestOutcome(state.narrative, questId, selected?.id);
    if (applied) {
      logMsg(`${applied.label}: ${applied.summary}`);
      logMsg(createDecisionRecap(state.narrative));
      syncCombatProfileState({ announce: true });
      syncQuestOutcomeCount(state.world, state.narrative);
      const echo = resolveQuestOutcomeEcho(questId, selected?.id);
      if (echo) {
        logMsg(`Word travels: ${echo.line}`);
        showHudNotice(createHudNotice({
          kind: "outcome",
          title: echo.title,
          line: echo.line,
          color: echo.color,
        }));
      }
      const bark = tryQuestOutcomeBark(state.companion, questId, selected?.id, state.time || 0);
      if (bark) logMsg(bark);
      // Music profile re-modulates against the new questOutcomes map so the
      // score reflects the player's most recent decision without waiting for
      // a region change.
      refreshMusicForCurrentNarrative();
    }
    pendingQuestOutcome = null;
    questOutcomeOpen = false;
    if (questId === "lantern_revolt") {
      completeFinalBeat();
    }
  }

  function turnInQuestWithOutcome(questId, { afterTurnIn } = {}) {
    const quest = state.quests[questId];
    if (!quest || quest.status !== "complete") return false;
    quest.status = "turned_in";
    grantXp(quest.reward?.xp || 0);
    state.player.gold += quest.reward?.gold || 0;
    if (quest.reward?.potion) state.inventory.Potion += quest.reward.potion;
    logMsg(`Quest done: ${quest.title}. +${quest.reward?.xp || 0} XP, +${quest.reward?.gold || 0} gold.`);
    if (quest.reward?.potion) logMsg(`Reward: +${quest.reward.potion} Potion.`);
    afterTurnIn?.(quest);
    sfx.questDone();
    const outcomeOpened = openQuestOutcomeChoice(questId);
    if (questId === "lantern_revolt" && !outcomeOpened) {
      completeFinalBeat();
    }
    return true;
  }

  function completeFinalBeat() {
    if (state.mode === "victory") return;
    const ending = resolveNarrativeEnding(state.narrative, state.companion);
    state.narrative.ending = ending;
    completeVictoryRun(state.world, state.narrative, ending, state.time);
    state.mode = "victory";
    questOutcomeOpen = false;
    shopOpen = false;
    skillScreenOpen = false;
    settingsOpen = false;
    codexOpen = false;
    characterSheetOpen = false;
    jobBoardOpen = false;
    state.mouseButtons.left = false;
    state.mouseButtons.right = false;
    state.player.blocking = false;
    logMsg(`Final beat resolved: ${ending.title}.`);
    logMsg(ending.summary);
    spawnParticles(canvas.width / 2, canvas.height * 0.42, 30, "#ffc490", 4.5, 1.4, { decorative: true });
    sfx.questDone();
    saveGame({ silent: true });
    const victorySummary = buildRunSummary(state.world, state.narrative, state.player, state.companion, state.time, null);
    appendRunRecord(victorySummary, state.world.runStats || {});
    if (activeReplaySession) {
      saveReplayLocally(finalizeReplay(activeReplaySession, { ...state.world.runStats, victory: true }));
      activeReplaySession = null;
    }
  }

  let skillScreenOpen = false;
  let skillSelection = 0;
  let settingsOpen = false;
  let settingsSelection = 0;
  let codexOpen = false;
  let codexTab = 0; // index into CODEX_TABS
  let codexEntrySel = 0;
  let characterSheetOpen = false;
  let questOutcomeOpen = false;
  let questOutcomeSelection = 0;
  let pendingQuestOutcome = null;
  let dialogueOpen = false;
  let dialogueSelection = 0;
  let pendingDialogue = null; // { npcId, npcName, choices: DialogueChoice[] }
  let discoveryBanner = null;
  let hudNotice = null;
  let combatReadabilityNotice = null;

  function openDialogueChoiceFor(npcId, npcName) {
    if (!state.narrative) return false;
    ensureDialogueChoiceState(state.narrative);
    const choices = getAvailableDialogueChoices(state.narrative, npcId, state.progression?.identity);
    if (!choices || choices.length === 0) return false;
    pendingDialogue = { npcId, npcName: npcName || npcId, choices };
    dialogueSelection = 0;
    dialogueOpen = true;
    shopOpen = false;
    skillScreenOpen = false;
    settingsOpen = false;
    codexOpen = false;
    characterSheetOpen = false;
    jobBoardOpen = false;
    questOutcomeOpen = false;
    return true;
  }

  function confirmDialogueChoice() {
    if (!pendingDialogue) return;
    const choice = pendingDialogue.choices[dialogueSelection];
    if (!choice) {
      dialogueOpen = false;
      pendingDialogue = null;
      return;
    }
    const applied = applyDialogueChoice(state.narrative, pendingDialogue.npcId, choice.id);
    if (applied) {
      logMsg(applied.response);
      logMsg(createDecisionRecap(state.narrative));
    }
    dialogueOpen = false;
    pendingDialogue = null;
  }

  function closeDialogueChoice() {
    dialogueOpen = false;
    pendingDialogue = null;
  }

  const DIFFICULTY_SETTING_ROW = {
    id: "difficulty",
    label: "Difficulty",
    kind: "enum",
    options: DIFFICULTY_LEVELS,
    target: "world",
  };

  const QUIT_TO_TITLE_ROW = {
    id: "quit_to_title",
    label: "Quit to title (autosaves)",
    kind: "action",
    handler: () => quitToTitle(),
  };

  function getCombinedSettingsRows() {
    return [...SETTINGS_ROWS, DIFFICULTY_SETTING_ROW, QUIT_TO_TITLE_ROW];
  }

  function readSettingsRowValue(row) {
    if (row.kind === "action") return null;
    if (row.target === "world") {
      if (row.id === "difficulty") {
        ensureDifficultyDefaults(state.world);
        return resolveDifficultyProfile(state.world.difficulty).label;
      }
      return null;
    }
    return readSettingValue(state.graphics, row.id);
  }

  function stepSettingsRow(row, dir) {
    if (row.kind === "action") {
      // Direction is ignored; any input on an action row fires the handler.
      try { row.handler && row.handler(); } catch (err) { console.warn("[westward] settings action failed:", err); }
      return null;
    }
    if (row.target === "world") {
      if (row.id === "difficulty") {
        cycleDifficulty(state.world, dir);
        const profile = resolveDifficultyProfile(state.world.difficulty);
        logMsg(`Difficulty: ${profile.label} — ${profile.description}`);
        return profile.label;
      }
      return null;
    }
    const next = stepSetting(state.graphics, row.id, dir);
    if (row.id === "gradientCache") clearGradientCache();
    if (row.id === "preset") {
      state.weather.quality = state.graphics.preset === "high" ? "cinematic" : state.graphics.preset === "low" ? "performance" : "balanced";
    }
    logMsg(`${row.label}: ${typeof next === "boolean" ? (next ? "ON" : "OFF") : next}`);
    if (state.mode === "playing") {
      const settingsStats = ensureRunStats(state.world, state.time);
      settingsStats.settingChanges += 1;
    }
    return next;
  }

  function quitToTitle() {
    // Best-effort autosave to the active slot before exiting back to title.
    if (state.mode === "playing" || state.mode === "victory") {
      try { saveGame({ silent: true }); } catch (err) { console.warn("[westward] quit save failed:", err); }
    }
    // Close any open modals so the picker isn't covered when the title returns.
    settingsOpen = false;
    shopOpen = false;
    workbenchOpen = false;
    skillScreenOpen = false;
    codexOpen = false;
    characterSheetOpen = false;
    jobBoardOpen = false;
    questOutcomeOpen = false;
    dialogueOpen = false;
    state.mode = "menu";
    if (menu) menu.style.display = "";
    updateDifficultyPickerSelection();
    refreshSlotsAndPickActive()
      .then(() => renderSaveSlots())
      .catch((err) => console.warn("[westward] quit refresh failed:", err));
    logMsg("Returned to title.");
  }

  function describeChoiceEffectTags(choice) {
    const eff = choice?.effects || {};
    const parts = [];
    if (eff.axes) {
      for (const [axis, delta] of Object.entries(eff.axes)) {
        const sign = delta > 0 ? "+" : "";
        const short = axis === "controlVsFreedom" ? "Control" : axis === "truthVsComfort" ? "Truth" : "Solidarity";
        parts.push(`${short} ${sign}${delta}`);
      }
    }
    if (eff.factionRep) {
      for (const [f, delta] of Object.entries(eff.factionRep)) {
        const sign = delta > 0 ? "+" : "";
        const short = f === "civicCouncil" ? "Council" : f === "workersGuild" ? "Guild" : f === "marketCartel" ? "Cartel" : f;
        parts.push(`${short} ${sign}${delta}`);
      }
    }
    if (eff.npcAffinity) {
      for (const [n, delta] of Object.entries(eff.npcAffinity)) {
        const sign = delta > 0 ? "+" : "";
        parts.push(`${n} ${sign}${delta}`);
      }
    }
    return parts.join("  ·  ");
  }
  const SKILL_BRANCH_LABELS = [
    { id: "survival", label: "Survival", desc: "Stamina pool, harvest yield, weather grit." },
    { id: "combat", label: "Combat", desc: "Damage, block window, crit chance." },
    { id: "influence", label: "Influence", desc: "Faction sway, shop barter, ideology threshold." },
  ];

  function resolveShopItemCost(item) {
    if (item.cost < 0) return item.cost;
    const mods = getActiveRegionEventModifiers();
    const factionPriceMult = resolveShopPriceMultiplier(state.narrative?.factionRep);
    const identityPriceMult = resolveIdentityShopPriceMultiplier(state.progression.identity);
    const craftPriceMult = item.craftCostKind
      ? resolveCraftingCostMultiplier(state.progression.identity, item.craftCostKind)
      : 1;
    return Math.max(1, Math.round(item.cost * mods.priceMult * factionPriceMult * identityPriceMult * craftPriceMult));
  }

  function shopItemName(item) {
    return item.name || (item.nameKey ? t(item.nameKey) : "Trade");
  }

  function shopItemDesc(item) {
    return item.desc || (item.descKey ? t(item.descKey) : "");
  }

  function cycleWeaponFamily() {
    const order = ["saber", "axe", "spear", "hammer"];
    const gear = normalizeGearState(state.progression.equipment);
    const currentIndex = Math.max(0, order.indexOf(gear.weaponFamily));
    const nextFamily = order[(currentIndex + 1) % order.length];
    if (!equipWeaponFamily(state.progression, nextFamily)) return false;
    applyProgressionEffects();
    const summary = buildGearSummary(state.progression.equipment, state.progression.identity);
    logMsg(`Weapon refit: ${summary.weaponLine}. ${summary.weapon.role}`);
    return true;
  }

  function fitNextArmorPiece() {
    const order = ["iron_duster", "salvage_gloves", "ash_mask", "lantern_charm"];
    const gear = normalizeGearState(state.progression.equipment);
    const nextPieceId = order.find((pieceId) => {
      const pieceSlot = {
        iron_duster: "body",
        salvage_gloves: "hands",
        ash_mask: "head",
        lantern_charm: "trinket",
      }[pieceId];
      return gear.armorSlots[pieceSlot] !== pieceId;
    });
    if (!nextPieceId || !equipArmorPiece(state.progression, nextPieceId)) {
      logMsg("All armor slots are already fitted.");
      return false;
    }
    applyProgressionEffects();
    const summary = buildGearSummary(state.progression.equipment, state.progression.identity);
    logMsg(`Armor fitted: ${summary.armorLine}.`);
    return true;
  }

  let shopOpen = false;
  let workbenchOpen = false;
  let workbenchSelection = 0;
  let jobBoardOpen = false;
  let jobBoardSelection = 0;
  const shopItems = [
    {
      nameKey: "shop.healthPotionName", cost: 18, descKey: "shop.healthPotionDesc",
      action() { state.inventory.Potion += 1; }
    },
    {
      nameKey: "shop.megaPotionName", cost: 40, descKey: "shop.megaPotionDesc",
      action() { state.inventory.Potion += 3; }
    },
    {
      nameKey: "shop.crystalShardName", cost: 30, descKey: "shop.crystalShardDesc",
      action() { state.inventory["Crystal Shard"] += 1; updateQuestProgressFromInventory(); }
    },
    {
      nameKey: "shop.mysteryBoxName", cost: 25, descKey: "shop.mysteryBoxDesc",
      action() {
        const roll = Math.random();
        if (roll < 0.3) { state.inventory.Potion += 2; logMsg("Mystery Box: 2 Potions! Lucky you!"); }
        else if (roll < 0.5) { state.player.gold += 50; logMsg("Mystery Box: 50 gold! The house always wins... except now."); }
        else if (roll < 0.7) { state.inventory["Slime Core"] += 3; logMsg("Mystery Box: 3 Slime Cores! Eww but useful."); }
        else { state.inventory.Stone += 2; logMsg("Mystery Box: 2 Stones. Called it."); }
      }
    },
    {
      nameKey: "shop.sellCoresName", cost: -15, descKey: "shop.sellCoresDesc",
      action() {
        if (state.inventory["Slime Core"] <= 0) { logMsg("No Slime Cores to sell!"); return false; }
        state.inventory["Slime Core"] -= 1;
        state.player.gold += 15;
        return true;
      }
    },
    {
      name: "Refit Weapon Family", cost: 45, desc: "Cycle Saber/Axe/Spear/Hammer. Might changes heft; Craft improves handling.",
      craftCostKind: "repair",
      action() {
        return cycleWeaponFamily();
      }
    },
    {
      name: "Fit Armor Slot", cost: 55, desc: "Adds heavier armor pieces. Grit absorbs weight; Craft trims upkeep.",
      craftCostKind: "repair",
      action() {
        return fitNextArmorPiece();
      }
    },
    {
      nameKey: "shop.refineWeaponName", cost: 60, descKey: "shop.refineWeaponDesc", craftCostKind: "refine",
      action() {
        if (state.progression.equipment.weaponTier !== "Common") { logMsg("Weapon already past Common."); return false; }
        if (!canSmithUpgradeWeapon(state.narrative?.factionRep, "Common")) {
          logMsg("Smith refuses — Workers' Guild standing too low.");
          return false;
        }
        if ((state.inventory.Ashglass || 0) < 4) { logMsg("Need 4 Ashglass to refine."); return false; }
        state.inventory.Ashglass -= 4;
        upgradeWeaponTier(state.progression);
        applyProgressionEffects();
        logMsg(`Weapon refined to ${state.progression.equipment.weaponTier}.`);
        return true;
      }
    },
    {
      nameKey: "shop.relicWeaponName", cost: 180, descKey: "shop.relicWeaponDesc", craftCostKind: "refine",
      action() {
        if (state.progression.equipment.weaponTier !== "Refined") { logMsg("Refine the weapon first."); return false; }
        if (!canSmithUpgradeWeapon(state.narrative?.factionRep, "Refined")) {
          logMsg("Smith refuses — Workers' Guild standing too low for Relic-tier work.");
          return false;
        }
        if ((state.inventory["Cipher Lens"] || 0) < 4) { logMsg("Need 4 Cipher Lens for relic upgrade."); return false; }
        state.inventory["Cipher Lens"] -= 4;
        upgradeWeaponTier(state.progression);
        applyProgressionEffects();
        logMsg(`Weapon ascended to ${state.progression.equipment.weaponTier}.`);
        return true;
      }
    },
    {
      nameKey: "shop.armorStaminaName", cost: 40, descKey: "shop.armorStaminaDesc", craftCostKind: "repair",
      action() {
        if (state.progression.equipment.armorMods.includes("stamina_regen")) { logMsg("Stamina mod already fitted."); return false; }
        if ((state.inventory["Heat Resin"] || 0) < 2) { logMsg("Need 2 Heat Resin."); return false; }
        state.inventory["Heat Resin"] -= 2;
        addArmorModifier(state.progression, "stamina_regen");
        applyProgressionEffects();
        logMsg("Armor modifier installed: stamina regen.");
        return true;
      }
    },
    {
      nameKey: "shop.armorBlockName", cost: 50, descKey: "shop.armorBlockDesc", craftCostKind: "repair",
      action() {
        if (state.progression.equipment.armorMods.includes("block_efficiency")) { logMsg("Block mod already fitted."); return false; }
        if ((state.inventory["Scrap Coil"] || 0) < 2) { logMsg("Need 2 Scrap Coil."); return false; }
        state.inventory["Scrap Coil"] -= 2;
        addArmorModifier(state.progression, "block_efficiency");
        applyProgressionEffects();
        logMsg("Armor modifier installed: block efficiency.");
        return true;
      }
    },
    {
      nameKey: "shop.armorWeatherName", cost: 45, descKey: "shop.armorWeatherDesc", craftCostKind: "repair",
      action() {
        if (state.progression.equipment.armorMods.includes("weather_resistance")) { logMsg("Weather mod already fitted."); return false; }
        if ((state.inventory["Pressurized Ink"] || 0) < 2) { logMsg("Need 2 Pressurized Ink."); return false; }
        state.inventory["Pressurized Ink"] -= 2;
        addArmorModifier(state.progression, "weather_resistance");
        applyProgressionEffects();
        logMsg("Armor modifier installed: weather resistance.");
        return true;
      }
    },
    {
      nameKey: "shop.affixPrefixName", cost: 80, descKey: "shop.affixPrefixDesc", craftCostKind: "refine",
      action() {
        if ((state.inventory["Cipher Lens"] || 0) < 2) { logMsg("Need 2 Cipher Lens to inscribe a prefix."); return false; }
        const affix = rollAffix("prefix");
        if (!affix) { logMsg("Smith finds no prefix to inscribe."); return false; }
        state.inventory["Cipher Lens"] -= 2;
        attachAffix(state.progression.equipment, affix.id);
        applyProgressionEffects();
        logMsg(`Prefix inscribed: ${affix.label}. ${affix.description}`);
        return true;
      }
    },
    {
      nameKey: "shop.affixSuffixName", cost: 80, descKey: "shop.affixSuffixDesc", craftCostKind: "refine",
      action() {
        if ((state.inventory["Cipher Lens"] || 0) < 2) { logMsg("Need 2 Cipher Lens to inscribe a suffix."); return false; }
        const affix = rollAffix("suffix");
        if (!affix) { logMsg("Smith finds no suffix to inscribe."); return false; }
        state.inventory["Cipher Lens"] -= 2;
        attachAffix(state.progression.equipment, affix.id);
        applyProgressionEffects();
        logMsg(`Suffix inscribed: ${affix.label}. ${affix.description}`);
        return true;
      }
    },
  ];
  let shopSelection = 0;
  let latestParticleMultiplier = 1;
  let latestColorblindPalette = null;
  const _gradientCache = createGradientCache();
  const hexToRgba = hexToRgbaUtil;
  const gradientBucket = gradientBucketUtil;

  function isGradientCacheEnabled() {
    return Boolean(state?.graphics?.performance?.gradientCache);
  }

  function clearGradientCache() {
    _gradientCache.clear();
  }

  function getCachedGradient(key, buildFn, enabled) {
    return _gradientCache.fetch(key, buildFn, enabled);
  }

  /* ─── Particle System (pre-allocated pool, no per-frame alloc) ─── */
  const particlePool = createParticlePool(DEFAULT_PARTICLE_CAP);

  /* Spatial hash for enemy radius queries — rebuilt once per tick. */
  const enemyGrid = createSpatialHash(4);
  const _enemyQueryBuf = [];
  function aliveEnemy(e) { return e && e.alive; }

  function spawnParticles(x, y, count, color, speed, life, options = {}) {
    const decorative = Boolean(options.decorative);
    const spawnChance = decorative ? clamp(latestParticleMultiplier, 0, 1) : 1;
    if (spawnChance <= 0) return;
    const baseLife = life || 1;
    const baseSpeed = speed || 2;
    const fillColor = color || "#fff";
    for (let i = 0; i < count; i++) {
      if (spawnChance < 1 && Math.random() > spawnChance) continue;
      spawnParticleInto(
        particlePool,
        x, y,
        (Math.random() - 0.5) * baseSpeed,
        (Math.random() - 0.5) * baseSpeed,
        baseLife * (0.5 + Math.random() * 0.5),
        fillColor,
        2 + Math.random() * 3,
      );
    }
  }

  function updateParticles(dt) {
    updateParticlePool(particlePool, dt);
  }

  function drawParticles() {
    forEachActiveParticle(particlePool, (p) => {
      const alpha = clamp(p.life / p.maxLife, 0, 1);
      const radius = Math.max(1, p.size * 0.56);
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 1.8);
      glow.addColorStop(0, p.color);
      glow.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = glow;
      ctx.globalAlpha = alpha * 0.7;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * 1.7, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = alpha * 0.92;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, TAU);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  // Math utilities moved to ./math.js

  function makeTexture(kind) {
    const tex = document.createElement("canvas");
    tex.width = TEXTURE_SIZE;
    tex.height = TEXTURE_SIZE;
    const tctx = tex.getContext("2d");
    const image = tctx.createImageData(TEXTURE_SIZE, TEXTURE_SIZE);
    const data = image.data;

    for (let y = 0; y < TEXTURE_SIZE; y++) {
      for (let x = 0; x < TEXTURE_SIZE; x++) {
        const i = (y * TEXTURE_SIZE + x) * 4;
        const n = noise2D(x, y, 4.3);
        const n2 = noise2D(x * 0.3, y * 0.3, 19.1);

        let r = 120;
        let g = 110;
        let b = 100;

        if (kind === "stone") {
          const row = Math.floor(y / 14);
          const offset = row % 2 ? 7 : 0;
          const mortar = ((x + offset) % 14) < 2 || y % 14 < 2;
          const grit = noise2D(x * 0.14, y * 0.14, 37.2);
          const tone = 0.56 + n * 0.34 + n2 * 0.2;
          r = (96 + grit * 42) * tone;
          g = (90 + grit * 36) * tone;
          b = (84 + grit * 30) * tone;

          if (mortar) {
            r *= 0.38;
            g *= 0.38;
            b *= 0.38;
          } else {
            const crack = noise2D(x * 0.33, y * 0.33, 81.7) > 0.92;
            const moss = noise2D(x * 0.09, y * 0.11, 54.1) > 0.84;
            if (crack) {
              r *= 0.6;
              g *= 0.58;
              b *= 0.58;
            }
            if (moss) {
              g += 20;
              r -= 8;
              b -= 10;
            }
          }
        } else if (kind === "water") {
          const ripple = Math.sin((x + y) * 0.14 + n * 6.5) * 0.55 + Math.sin(y * 0.28 + x * 0.11) * 0.45;
          const eddy = noise2D(x * 0.12, y * 0.12, 71.3);
          const tone = 0.5 + ripple * 0.13 + n2 * 0.25;
          r = 30 * tone + eddy * 10;
          g = 76 * tone + eddy * 22;
          b = 118 * tone + 24 + eddy * 30;
          const foam = noise2D(x * 0.4, y * 0.4, 16.4) > 0.965;
          if (foam) {
            r += 40;
            g += 45;
            b += 42;
          }
        } else if (kind === "timber") {
          const beam = x % 12 < 2;
          const grainWave = Math.sin(y * 0.18 + n2 * 3.4) * 0.08;
          const grain = 0.66 + n * 0.36 + grainWave;
          r = 136 * grain;
          g = 96 * grain;
          b = 58 * grain;
          if (beam) {
            r *= 0.58;
            g *= 0.58;
            b *= 0.58;
          } else if ((x + y) % 29 < 2) {
            r *= 1.08;
            g *= 1.04;
            b *= 0.96;
          }
        } else if (kind === "plaster") {
          const crack = (x + y) % 17 === 0 || (x * 3 + y * 2) % 31 === 0;
          const grime = noise2D(x * 0.07, y * 0.09, 93.1);
          const course = y % 18 < 2;
          const upright = x % 28 < 2;
          const wornBase = y > TEXTURE_SIZE * 0.72;
          const tone = 0.82 + n * 0.2 - grime * 0.08;
          r = 182 * tone;
          g = 168 * tone;
          b = 152 * tone;
          if (course || upright) {
            r *= course ? 0.76 : 0.68;
            g *= course ? 0.74 : 0.66;
            b *= course ? 0.68 : 0.62;
          } else if (crack) {
            r *= 0.7;
            g *= 0.7;
            b *= 0.7;
          } else if (grime > 0.72) {
            r *= 0.88;
            g *= 0.9;
            b *= 0.86;
          }
          if (wornBase) {
            r *= 0.82;
            g *= 0.78;
            b *= 0.72;
          }
        } else if (kind === "neon") {
          const stripe = (x + y) % 18 < 4;
          const pulse = 0.58 + Math.sin((x - y) * 0.14 + n * 5) * 0.24 + n2 * 0.24;
          r = 54 * pulse;
          g = 98 * pulse;
          b = 150 * pulse + 44;
          if (stripe) {
            r += 38;
            g += 30;
            b += 68;
          } else if (noise2D(x * 0.26, y * 0.26, 44.1) > 0.86) {
            r += 24;
            g += 14;
            b += 36;
          }
        } else {
          const tone = 0.76 + n * 0.34;
          r = 92 * tone;
          g = 107 * tone;
          b = 86 * tone;
        }

        data[i] = clamp(Math.floor(r), 0, 255);
        data[i + 1] = clamp(Math.floor(g), 0, 255);
        data[i + 2] = clamp(Math.floor(b), 0, 255);
        data[i + 3] = 255;
      }
    }

    tctx.putImageData(image, 0, 0);
    return tex;
  }

  function createWorldMap(width, height) {
    const grid = Array.from({ length: height }, (_, y) =>
      Array.from({ length: width }, (_, x) => (x === 0 || y === 0 || x === width - 1 || y === height - 1 ? 1 : 0)),
    );

    const settlementZone = { minX: 4, maxX: 26, minY: 4, maxY: 18 };

    for (let i = 0; i < 260; i++) {
      const x = 2 + Math.floor(Math.random() * (width - 4));
      const y = 2 + Math.floor(Math.random() * (height - 4));
      const inSettlement = x >= settlementZone.minX && x <= settlementZone.maxX && y >= settlementZone.minY && y <= settlementZone.maxY;
      if (!inSettlement && Math.random() < 0.66) {
        grid[y][x] = 1;
      }
    }

    for (let i = 0; i < 70; i++) {
      const cx = 4 + Math.floor(Math.random() * (width - 8));
      const cy = 4 + Math.floor(Math.random() * (height - 8));
      const inSettlement = cx >= settlementZone.minX && cx <= settlementZone.maxX && cy >= settlementZone.minY && cy <= settlementZone.maxY;
      if (inSettlement) continue;
      const radius = 1 + Math.floor(Math.random() * 3);
      for (let y = cy - radius; y <= cy + radius; y++) {
        for (let x = cx - radius; x <= cx + radius; x++) {
          if (x <= 1 || y <= 1 || x >= width - 1 || y >= height - 1) continue;
          if (Math.hypot(x - cx, y - cy) < radius + Math.random() * 0.7) {
            grid[y][x] = 2;
          }
        }
      }
    }

    for (let y = 5; y <= 13; y++) {
      for (let x = 5; x <= 15; x++) {
        grid[y][x] = 0;
      }
    }

    for (let y = 8; y <= 14; y++) {
      for (let x = 11; x <= 27; x++) {
        grid[y][x] = 0;
      }
    }

    for (let y = 5; y <= 14; y++) {
      for (let x = 15; x <= 23; x++) {
        grid[y][x] = 0;
      }
    }

    for (let x = 16; x <= 22; x++) {
      grid[6][x] = 3;
      grid[12][x] = 3;
    }
    for (let y = 6; y <= 12; y++) {
      grid[y][16] = 3;
      grid[y][22] = 3;
    }
    grid[12][19] = 0;

    for (let x = 14; x <= 24; x++) {
      grid[5][x] = 4;
      grid[14][x] = 4;
    }
    for (let y = 5; y <= 14; y++) {
      grid[y][14] = 4;
      grid[y][24] = 4;
    }
    grid[14][19] = 0;
    grid[14][20] = 0;

    for (let y = 11; y <= 14; y++) {
      for (let x = 18; x <= 21; x++) {
        grid[y][x] = 0;
      }
    }

    // Flagship biome: "Glass Gulch", a foggy industrial fringe where ranged enemies thrive.
    for (let y = 32; y <= 50; y++) {
      for (let x = 36; x <= 52; x++) {
        if (x === 36 || y === 32 || x === 52 || y === 50) {
          grid[y][x] = 1;
        } else {
          grid[y][x] = 5;
        }
      }
    }
    for (let y = 38; y <= 43; y++) {
      for (let x = 41; x <= 47; x++) {
        grid[y][x] = 0;
      }
    }
    grid[32][44] = 0;
    grid[31][44] = 0;
    grid[30][44] = 0;

    return grid;
  }

  function createHouseInteriorMap() {
    const width = 18;
    const height = 18;
    const map = Array.from({ length: height }, (_, y) =>
      Array.from({ length: width }, (_, x) => (x === 0 || y === 0 || x === width - 1 || y === height - 1 ? 3 : 0)),
    );

    map[height - 1][9] = 0;

    for (let y = 2; y <= 4; y++) {
      for (let x = 3; x <= 5; x++) {
        map[y][x] = 4;
      }
    }

    for (let y = 2; y <= 3; y++) {
      for (let x = 12; x <= 14; x++) {
        map[y][x] = 4;
      }
    }

    for (let y = 4; y <= 5; y++) {
      for (let x = 7; x <= 10; x++) {
        map[y][x] = 4;
      }
    }

    for (let x = 5; x <= 12; x++) {
      map[8][x] = 4;
    }

    return map;
  }

  function isInHouseLot(x, y) {
    return x >= 16 && x <= 22 && y >= 6 && y <= 12;
  }

  function findEmptyCell(map, minX = 2, minY = 2, maxX = map[0].length - 3, maxY = map.length - 3, extraCheck = null) {
    for (let attempts = 0; attempts < 1200; attempts++) {
      const x = minX + Math.floor(Math.random() * (maxX - minX + 1));
      const y = minY + Math.floor(Math.random() * (maxY - minY + 1));
      if (map[y][x] !== 0) continue;
      if (extraCheck && !extraCheck(x, y)) continue;
      return { x: x + 0.5, y: y + 0.5 };
    }
    return { x: minX + 0.5, y: minY + 0.5 };
  }

  const worldMap = createWorldMap(56, 56);
  const houseInteriorMap = createHouseInteriorMap();
  const regionInteriorMaps = Object.fromEntries(
    Object.keys(REGION_INTERIORS).map((id) => [id, buildRegionInteriorMap(id)]),
  );
  // Shared world entrance position for the active region's interior. Same
  // world tile is reused per region; the prop appearance and destination
  // interior swap based on state.regions.activeRegion.
  const REGION_INTERIOR_ENTRANCE = { x: 10.5, y: 5.5 };
  // Make sure the entrance tile is walkable (in case of procgen variance).
  worldMap[Math.floor(REGION_INTERIOR_ENTRANCE.y)][Math.floor(REGION_INTERIOR_ENTRANCE.x)] = 0;

  const textures = {
    stone: makeTexture("stone"),
    water: makeTexture("water"),
    timber: makeTexture("timber"),
    plaster: makeTexture("plaster"),
    neon: makeTexture("neon"),
  };

  const state = {
    mode: "menu",
    time: 0,
    keys: {},
    mouseButtons: { left: false, right: false },
    mouseLook: 0,
    showMap: true,
    msg: [],
    weather: {
      kind: "clear",
      rain: 0,
      fog: 0.1,
      wind: 0.18,
      lightning: 0,
      timer: 22,
      quality: "balanced",
    },
    player: {
      x: 9.5,
      y: 8.5,
      angle: 0,
      hp: PLAYER_MAX_HP,
      maxHp: PLAYER_MAX_HP,
      level: 1,
      xp: 0,
      nextXp: 80,
      stamina: 100,
      maxStamina: 100,
      gold: 25,
      attackCooldown: 0,
      hurtCooldown: 0,
      chargeAttackWindup: 0,
      chargeAttackWindupMax: 0,
      walkBob: 0,
      inHouse: false,
      regionInterior: null,
      blocking: false,
      guardBroken: false,
      guardBrokenTimer: 0,
      parryChainTimer: 0,
      comboStep: 0,
      comboWindow: 0,
      swingTimer: 0,
      swingDuration: 0.3,
      hitPulse: 0,
      cameraKick: 0,
      screenShake: 0,
      weaponSway: 0,
      deaths: 0,
      loadout: {
        weapon: "Frontier Saber",
        stance: "balanced",
      },
      quickUtility: { active: "smoke", inventory: { smoke: 1, flare: 1, tonic: 1 } },
      perks: [],
      combatProfile: resolveCombatProgression(createInitialNarrativeState(), 1),
    },
    inventory: createInitialInventoryState(),
    quests: createInitialQuestState(),
    narrative: {
      ...createInitialNarrativeState(),
      npcMemory: createInitialNpcMemoryState(),
    },
    progression: createInitialProgressionState(),
    regions: createInitialRegionState(),
    fog: { frontier: createFogGrid(), ashfall: createFogGrid(), ironlantern: createFogGrid() },
    graphics: createInitialGraphicsState(),
    combat: { statusEffectsEnabled: true },
    world: {
      timeOfDay: 0.25,
      difficulty: "standard",
      companionId: null,
      companionHp: null,
      companionDowned: false,
      companionRecoveryTimer: 0,
      runStats: createInitialRunStats(0),
      loot: createInitialLootState(),
      jobs: createInitialJobBoardState(),
      roadRoute: null,
      calendarDay: 0,
      calendarDayTimer: 0,
    },
    companion: createInitialCompanionRuntime(),
    ui: { modals: createInitialUiModalState() },
    codex: { unlocked: { regions: [], enemies: [], items: [], factions: [], ideology: [], letters: [] } },
    npcs: [
      {
        id: "elder",
        name: MAJOR_NPCS.elder.name,
        x: 9.0,
        y: 8.2,
        homeX: 9.0,
        homeY: 8.2,
        color: "#d8bf9f",
        wanderRadius: 0.7,
        wanderAngle: Math.random() * TAU,
        wanderTimer: 0,
      },
      {
        id: "warden",
        name: MAJOR_NPCS.warden.name,
        x: 11.5,
        y: 8.8,
        homeX: 11.5,
        homeY: 8.8,
        color: "#8ab0cf",
        wanderRadius: 0.9,
        wanderAngle: Math.random() * TAU,
        wanderTimer: 0,
      },
      {
        id: "smith",
        name: MAJOR_NPCS.smith.name,
        x: 17.8,
        y: 10.8,
        homeX: 17.8,
        homeY: 10.8,
        color: "#c9937f",
        wanderRadius: 0.8,
        wanderAngle: Math.random() * TAU,
        wanderTimer: 0,
      },
      {
        id: "merchant",
        name: MAJOR_NPCS.merchant.name,
        x: 7.3,
        y: 9.6,
        homeX: 7.3,
        homeY: 9.6,
        color: "#bfa07e",
        wanderRadius: 0.85,
        wanderAngle: Math.random() * TAU,
        wanderTimer: 0,
      },
      {
        id: "innkeeper",
        name: MAJOR_NPCS.innkeeper.name,
        x: 6.4,
        y: 7.4,
        homeX: 6.4,
        homeY: 7.4,
        color: "#9f8db2",
        wanderRadius: 0.75,
        wanderAngle: Math.random() * TAU,
        wanderTimer: 0,
      },
      {
        id: "bard",
        name: "Bard Jingles",
        x: 8.5,
        y: 10.5,
        homeX: 8.5,
        homeY: 10.5,
        color: "#e8c44a",
        wanderRadius: 1.2,
        wanderAngle: Math.random() * TAU,
        wanderTimer: 0,
      },
      {
        id: "cat",
        name: "Whiskers the Cat",
        x: 12.5,
        y: 7.5,
        homeX: 12.5,
        homeY: 7.5,
        color: "#d4a574",
        wanderRadius: 1.5,
        wanderAngle: Math.random() * TAU,
        wanderTimer: 0,
      },
    ],
    pigs: [],
    enemies: [],
    resources: [],
    pigJokeCooldown: 0,
    pigStampedeTimer: 0,
    narrativePulseTimer: 7,
    floatingTexts: [],
    chest: {
      x: OPENING_CACHE_START.x,
      y: OPENING_CACHE_START.y,
      opened: false,
      respawn: 0,
      firstRewardClaimed: false,
      lastReward: null,
    },
    house: {
      unlocked: false,
      built: false,
      outsideDoor: { x: 19.5, y: 12.35 },
      outsideSpawn: { x: 19.5, y: 13.6, angle: -Math.PI / 2 },
      outsideReturn: null,
      interiorDoor: { x: 9.5, y: 15.2 },
      bed: { x: 4.4, y: 5.2 },
      stash: { x: 13.3, y: 3.4 },
      visits: 0,
      workstation: createInitialWorkstationState(),
    },
  };

  initLanguage();
  refreshLocalizedStateText();
  syncChapterFromProgress(state.narrative, state.player.level);
  syncCombatProfileState();
  renderOriginPicker();
  renderDifficultyPicker();

  let hasSaveData = false;
  let lastSaveAt = null;
  let currentSaveSlot = IDB_DEFAULT_SLOT;
  // Tracks whether refreshSlotsAndPickActive has populated cachedSlotMetas at
  // least once. Until then the slot picker rows are click-disabled so a fast
  // click during the ~200ms IDB-init window can't read a stale "empty" meta
  // and overwrite an actual save.
  let savesLoaded = false;
  let autoSaveTimer = 0;

  function currentMap() {
    if (state.player.regionInterior && regionInteriorMaps[state.player.regionInterior]) {
      return regionInteriorMaps[state.player.regionInterior];
    }
    return state.player.inHouse ? houseInteriorMap : worldMap;
  }

  function isIndoors() {
    return Boolean(state.player.inHouse || state.player.regionInterior);
  }

  function spawnEnemies() {
    state.enemies = [];
    const hpMult = getEnemyHpMultiplier(state.world);
    const dmgMult = getEnemyDamageMultiplier(state.world);
    for (let i = 0; i < 16; i++) {
      const pos = findEmptyCell(worldMap, 10, 10, 53, 53, (x, y) => !isInHouseLot(x, y) && Math.hypot(x - 10, y - 8) > 6);
      const type = chooseEnemyType(state.player.level, state.weather.kind);
      const stats = createEnemyStats(type, state.player.level);
      const scaledMax = Math.max(1, Math.round(stats.maxHp * hpMult));
      state.enemies.push({
        id: `slime-${i}`,
        type: stats.type,
        label: stats.label,
        color: stats.color,
        behavior: stats.behavior,
        x: pos.x,
        y: pos.y,
        hp: scaledMax,
        maxHp: scaledMax,
        speed: stats.speed + Math.random() * 0.3,
        attackReach: stats.attackReach,
        baseDamage: Math.max(1, Math.round(stats.baseDamage * dmgMult)),
        damageVariance: stats.damageVariance,
        attackCooldown: Math.random() * 0.75,
        alive: true,
        respawn: 0,
        stagger: 0,
        flashTimer: 0,
      });
    }
    const patrolStats = createEnemyStats("slime", state.player.level);
    const patrolPos = !isBlocking(14.4, 9.4) && !isInHouseLot(14.4, 9.4)
      ? { x: 14.4, y: 9.4 }
      : findEmptyCell(worldMap, 12, 7, 17, 12, (x, y) => !isInHouseLot(x, y) && Math.hypot(x - 9.5, y - 8.5) > 3.2);
    state.enemies.push({
      id: "opening-patrol",
      type: patrolStats.type,
      label: "Road Slime",
      color: patrolStats.color,
      behavior: patrolStats.behavior,
      x: patrolPos.x,
      y: patrolPos.y,
      hp: Math.max(24, Math.round(patrolStats.hp * 0.72)),
      maxHp: Math.max(24, Math.round(patrolStats.maxHp * 0.72)),
      speed: patrolStats.speed,
      attackReach: patrolStats.attackReach,
      baseDamage: Math.max(4, patrolStats.baseDamage - 2),
      damageVariance: patrolStats.damageVariance,
      attackCooldown: 0.35,
      alive: true,
      respawn: 0,
      stagger: 0,
      flashTimer: 0,
      openingPatrol: true,
    });
  }

  function spawnResources() {
    state.resources = [];

    function addResource(type, count, opts = {}) {
      const minX = opts.minX ?? 4;
      const minY = opts.minY ?? 4;
      const maxX = opts.maxX ?? 53;
      const maxY = opts.maxY ?? 53;
      const extraCheck = opts.extraCheck ?? ((x, y) => !isInHouseLot(x, y) && Math.hypot(x - 10, y - 8) > 4);
      for (let i = 0; i < count; i++) {
        const pos = findEmptyCell(worldMap, minX, minY, maxX, maxY, extraCheck);
        state.resources.push({
          id: `${type}-${i}`,
          type,
          x: pos.x,
          y: pos.y,
          harvested: false,
          respawn: 0,
        });
      }
    }

    addResource("crystal", 16);
    addResource("tree", 24);
    addResource("rock", 18);
    addResource("archive-node", 4, {
      minX: 38,
      minY: 34,
      maxX: 50,
      maxY: 48,
      extraCheck: (x, y) => tileTypeAtCurrentMap(x + 0.5, y + 0.5) === 5,
    });
    addResource("ashglass", 4, { minX: 26, minY: 32, maxX: 50, maxY: 50 });
    addResource("scrap-coil", 3, { minX: 26, minY: 32, maxX: 50, maxY: 50 });
    addResource("heat-resin", 3, { minX: 26, minY: 32, maxX: 50, maxY: 50 });
    addResource("lantern-filament", 4, { minX: 4, minY: 32, maxX: 26, maxY: 50 });
    addResource("cipher-lens", 3, { minX: 4, minY: 32, maxX: 26, maxY: 50 });
    addResource("pressurized-ink", 3, { minX: 4, minY: 32, maxX: 26, maxY: 50 });
  }

  const REGION_RESOURCE_MAP = {
    ashglass: { region: "ashfall", item: "Ashglass", respawn: 36, xp: 8, label: "Ashglass" },
    "scrap-coil": { region: "ashfall", item: "Scrap Coil", respawn: 36, xp: 9, label: "Scrap Coil" },
    "heat-resin": { region: "ashfall", item: "Heat Resin", respawn: 40, xp: 9, label: "Heat Resin" },
    "lantern-filament": { region: "ironlantern", item: "Lantern Filament", respawn: 36, xp: 8, label: "Lantern Filament" },
    "cipher-lens": { region: "ironlantern", item: "Cipher Lens", respawn: 40, xp: 10, label: "Cipher Lens" },
    "pressurized-ink": { region: "ironlantern", item: "Pressurized Ink", respawn: 40, xp: 10, label: "Pressurized Ink" },
  };

  function spawnPigs() {
    state.pigs = [];
    const names = [
      "Sheriff Snout",
      "Porkchop Cassidy",
      "Ham Solo",
      "Deputy Wiggles",
      "Saddleback Sue",
      "Mud Maverick",
      "Bandana Bacon",
      "Sir Oinks-a-Lot",
    ];
    const presetPens = [
      { x: 8.2, y: 7.6 },
      { x: 10.7, y: 7.9 },
      { x: 7.1, y: 8.9 },
      { x: 11.9, y: 9.2 },
      { x: 9.3, y: 10.1 },
      { x: 7.9, y: 10.7 },
      { x: 10.9, y: 10.7 },
      { x: 9.5, y: 11.3 },
    ];
    for (let i = 0; i < 8; i++) {
      const style = WESTERN_PIG_ROLES[i % WESTERN_PIG_ROLES.length];
      const candidate = presetPens[i] || findEmptyCell(worldMap, 5, 5, 24, 15, (x, y) => !isInHouseLot(x, y));
      const fallback = findEmptyCell(worldMap, 6, 6, 15, 12, (x, y) => !isInHouseLot(x, y));
      const pos = !isBlocking(candidate.x, candidate.y) ? candidate : fallback;
      state.pigs.push({
        id: `pig-${i}`,
        name: names[i % names.length],
        role: style.role,
        hatColor: style.hat,
        bandanaColor: style.bandana,
        temper: style.temper,
        x: pos.x,
        y: pos.y,
        homeX: pos.x,
        homeY: pos.y,
        wanderRadius: 0.75 + Math.random() * 1.25,
        wanderAngle: Math.random() * TAU,
        wanderTimer: 0.25 + Math.random() * 1.8,
        zoomTimer: 0,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        heading: Math.random() * TAU,
        gaitPhase: Math.random() * TAU,
        emoteTimer: Math.random() * 4,
        pickpocketCooldown: 3 + Math.random() * 2,
      });
    }
  }

  spawnEnemies();
  spawnResources();
  spawnPigs();

  function refreshContinueButton() {
    if (!continueBtn) return;
    continueBtn.style.display = hasSaveData ? "inline-block" : "none";
    renderSaveSlots();
  }

  const REGION_DISPLAY_NAMES = {
    frontier: "Dustward",
    ashfall: "Ashfall",
    ironlantern: "Iron Lantern",
  };

  function formatPlayedTime(seconds) {
    const s = Math.max(0, Math.floor(seconds || 0));
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
  }

  function isSupportedSchemaPayload(payload) {
    return (
      payload &&
      typeof payload === "object" &&
      Number.isFinite(payload.version) &&
      payload.version >= 1 &&
      payload.version <= MAX_SUPPORTED_SAVE_VERSION
    );
  }
  function canAutoLoadSlot(meta) {
    return Boolean(meta && !meta.empty && meta.valid && isSupportedSchemaPayload(meta.payload));
  }
  function isUnsupportedSchemaSlot(meta) {
    return Boolean(meta && meta.valid && !isSupportedSchemaPayload(meta.payload));
  }

  function formatBackupAge(savedAt) {
    if (!Number.isFinite(savedAt)) return "moments ago";
    const ageMs = Math.max(0, Date.now() - savedAt);
    const minutes = Math.floor(ageMs / 60000);
    if (minutes < 1) return "moments ago";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  function buildSlotSummaryText(meta) {
    if (!meta) return "Empty";
    if (meta.empty) return "Empty";
    if (!meta.valid) return "Save corrupted (use ↺ to attempt recovery)";
    if (isUnsupportedSchemaSlot(meta)) {
      const v = Number.isFinite(meta.payload?.version) ? `v${meta.payload.version}` : "unsupported";
      return `${v} — update game to load (v${MAX_SUPPORTED_SAVE_VERSION} supported)`;
    }
    const summary = summarizeSavePayload(meta.payload);
    if (!summary) return "Save present";
    const region = REGION_DISPLAY_NAMES[summary.regionId] || summary.regionId;
    const time = formatPlayedTime(summary.timePlayedSeconds);
    const diffTag = summary.difficulty && summary.difficulty !== "standard"
      ? ` · ${resolveDifficultyProfile(summary.difficulty).label}`
      : "";
    if (summary.victory) {
      const ending = summary.endingId ? ` (${summary.endingId})` : "";
      return `Won${ending} · Lvl ${summary.level} · ${region} · ${time}${diffTag}`;
    }
    return `Lvl ${summary.level} · ${region} · ${time}${diffTag}`;
  }

  function slotDisplayLabel(slot) {
    const idx = IDB_KNOWN_SLOTS.indexOf(slot);
    return `Slot ${idx >= 0 ? idx + 1 : "?"}`;
  }

  function clearChildren(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function chooseBackupToRestore(slot, backups) {
    const info = describeSaveBackupChoices(backups);
    if (info.choices.length === 0) return null;
    if (info.choices.length === 1) return info.choices[0];
    const menu = info.choices
      .map((choice) => `${choice.index}. ${choice.label}`)
      .join("\n");
    const raw = prompt(`Choose backup to restore for ${slotDisplayLabel(slot)}:\n${menu}`, "1");
    if (raw === null) return null;
    const selected = Number.parseInt(raw, 10);
    return info.choices.find((choice) => choice.index === selected) || null;
  }

  function renderSaveSlots() {
    if (!saveSlotsContainer) return;
    const metas = getSlotMetas();
    clearChildren(saveSlotsContainer);
    const ordered = IDB_KNOWN_SLOTS.map((slot) =>
      metas.find((m) => m.slot === slot) || { slot, empty: true, valid: true, payload: null, savedAt: null });
    for (const meta of ordered) {
      const row = document.createElement("div");
      row.className = "save-slot";
      if (meta.empty) row.classList.add("is-empty");
      if (!meta.empty && !meta.valid) row.classList.add("is-corrupted");
      if (!savesLoaded) row.classList.add("is-loading");
      row.dataset.slot = meta.slot;
      const summaryText = buildSlotSummaryText(meta);
      const recovery = describeSaveSlotRecovery(meta, { maxSupportedVersion: MAX_SUPPORTED_SAVE_VERSION });
      const backupInfo = describeSaveBackupChoices(cachedBackupMetasBySlot[meta.slot] || []);
      row.setAttribute("role", "group");
      row.setAttribute("aria-label", `${slotDisplayLabel(meta.slot)}: ${summaryText}. ${recovery.line}`);

      const label = document.createElement("span");
      label.className = "save-slot-label";
      label.textContent = slotDisplayLabel(meta.slot);

      const copy = document.createElement("span");
      copy.className = "save-slot-copy";

      const summary = document.createElement("span");
      summary.className = "save-slot-summary";
      summary.textContent = summaryText;

      const detail = document.createElement("span");
      detail.className = `save-slot-detail is-${recovery.state}`;
      detail.textContent = recovery.line;
      copy.appendChild(summary);
      copy.appendChild(detail);
      if (!meta.empty && backupInfo.totalCount > 0) {
        const backupDetail = document.createElement("span");
        backupDetail.className = `save-slot-backup-detail is-${backupInfo.state}`;
        backupDetail.textContent = backupInfo.line;
        copy.appendChild(backupDetail);
      }

      const schemaUnsupported = isUnsupportedSchemaSlot(meta);
      if (schemaUnsupported) row.classList.add("is-future-schema");

      const activateSlot = async () => {
        // Block clicks until the IDB scan has populated cachedSlotMetas.
        // Otherwise a click during the init window reads stale empty=true and
        // overwrites a real save.
        if (!savesLoaded) return;
        if (schemaUnsupported) {
          logMsg(`${slotDisplayLabel(meta.slot)} uses an unsupported schema (v${meta.payload?.version ?? "?"}). Update WestWard to load it. The slot is preserved and exportable.`);
          return;
        }
        ensureAudio();
        const switched = await setCurrentSaveSlot(meta.slot);
        if (!switched) return;

        // Corrupted-primary path: try the most-recent valid backup before
        // falling through to "begin a new run that overwrites this slot."
        // Without this attempt the "Recover" copy is a lie.
        if (!hasSaveData) {
          const stillCorrupted = cachedSlotMetas.find((m) => m.slot === meta.slot && !m.empty && !m.valid);
          if (stillCorrupted) {
            try {
              const recovered = await idbFindMostRecentValidBackup(meta.slot);
              if (recovered && recovered.ok) {
                await idbRestoreFromBackup(meta.slot, recovered.savedAt);
                setCachedSave(recovered.payload, recovered.savedAt);
                pendingSaveCorruptionMsg = "Save was corrupted; restored from a recent backup.";
                if (!loadGame({ fromMenu: true })) beginSession();
                await refreshSlotsAndPickActive();
                renderSaveSlots();
                return;
              }
            } catch (err) {
              console.warn("[westward] backup recovery on click failed:", err);
            }
          }
        }

        if (hasSaveData) {
          if (!loadGame({ fromMenu: true })) beginSession();
        } else {
          beginSession();
        }
        renderSaveSlots();
      };

      const action = document.createElement("button");
      action.type = "button";
      action.className = "save-slot-action";
      action.textContent = meta.empty
        ? "New"
        : schemaUnsupported
          ? "Locked"
          : meta.valid
            ? "Continue"
            : "Recover";
      action.disabled = !savesLoaded;
      action.setAttribute("aria-label", `${action.textContent} ${slotDisplayLabel(meta.slot)}`);
      action.addEventListener("click", (event) => {
        event.stopPropagation();
        activateSlot();
      });

      const actions = document.createElement("span");
      actions.className = "save-slot-actions";

      row.appendChild(label);
      row.appendChild(copy);
      row.appendChild(action);

      const importToSlot = (e) => {
        if (e) e.stopPropagation();
        if (!meta.empty && !confirm(`Overwrite ${slotDisplayLabel(meta.slot)} with an imported save?`)) return;
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json,application/json";
        input.addEventListener("change", async () => {
          const file = input.files?.[0];
          if (!file) return;
          try {
            const text = await file.text();
            const result = await idbImportSaveFromText(meta.slot, text);
            if (!result?.ok) {
              logMsg("Import failed: save file was invalid or corrupted.");
              return;
            }
            await refreshSlotsAndPickActive();
            renderSaveSlots();
            logMsg(`Save imported to ${slotDisplayLabel(result.slot)}.`);
          } catch (err) {
            console.warn("[westward] importSave failed:", err);
            logMsg("Import failed: could not read the file.");
          }
        });
        input.click();
      };

      const imp = document.createElement("button");
      imp.type = "button";
      imp.className = "save-slot-import";
      imp.setAttribute("aria-label", `Import into ${slotDisplayLabel(meta.slot)}`);
      imp.textContent = "↑";
      imp.title = meta.empty ? "Import save into this slot" : "Import save (replaces this slot)";
      imp.addEventListener("click", importToSlot);
      actions.appendChild(imp);

      if (!meta.empty) {
        if (meta.valid) {
          const exp = document.createElement("button");
          exp.type = "button";
          exp.className = "save-slot-export";
          exp.setAttribute("aria-label", `Export ${slotDisplayLabel(meta.slot)}`);
          exp.textContent = "↓";
          exp.title = schemaUnsupported ? "Export newer save (forward-compatible backup)" : "Export save";
          exp.addEventListener("click", async (e) => {
            e.stopPropagation();
            try {
              const blob = await idbExportSaveBlob(meta.slot);
              if (!blob) return;
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `westward-${meta.slot}-${Date.now()}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            } catch (err) {
              console.warn("[westward] exportSave failed:", err);
            }
          });
          actions.appendChild(exp);
        }

        if (!meta.valid) {
          const rec = document.createElement("button");
          rec.type = "button";
          rec.className = "save-slot-recover";
          rec.setAttribute("aria-label", `Recover ${slotDisplayLabel(meta.slot)} from backup`);
          rec.textContent = "↺";
          rec.title = backupInfo.validCount > 1 ? "Choose a backup to restore" : "Recover from latest valid backup";
          rec.addEventListener("click", async (e) => {
            e.stopPropagation();
            try {
              const backups = (cachedBackupMetasBySlot[meta.slot] || []).length > 0
                ? cachedBackupMetasBySlot[meta.slot]
                : await idbListBackups(meta.slot);
              const target = chooseBackupToRestore(meta.slot, backups);
              if (!target) {
                logMsg(`No valid backup found for ${slotDisplayLabel(meta.slot)}.`);
                return;
              }
              const restoredPayload = await idbRestoreFromBackup(meta.slot, target.savedAt);
              if (currentSaveSlot === meta.slot) {
                setCachedSave(restoredPayload, target.savedAt);
              }
              await refreshSlotsAndPickActive();
              renderSaveSlots();
              logMsg(`${slotDisplayLabel(meta.slot)} restored from backup ${target.index} saved ${formatBackupAge(target.savedAt)}.`);
            } catch (err) {
              console.warn("[westward] manual recovery failed:", err);
              logMsg(`Recovery failed for ${slotDisplayLabel(meta.slot)}.`);
            }
          });
          actions.appendChild(rec);
        }

        const del = document.createElement("button");
        del.type = "button";
        del.className = "save-slot-delete";
        del.setAttribute("aria-label", `Delete ${slotDisplayLabel(meta.slot)}`);
        del.textContent = "×";
        del.addEventListener("click", async (e) => {
          e.stopPropagation();
          if (!confirm(`Delete ${slotDisplayLabel(meta.slot)}? This cannot be undone.`)) return;
          try {
            await idbDeleteSave(meta.slot);
            await refreshSlotsAndPickActive();
            renderSaveSlots();
          } catch (err) {
            console.warn("[westward] deleteSave failed:", err);
          }
        });
        actions.appendChild(del);
      }
      row.appendChild(actions);

      saveSlotsContainer.appendChild(row);
    }

    // Import save — always shown at the bottom of the slot picker
    const importRow = document.createElement("div");
    importRow.className = "save-slot-import-row";
    const importBtn = document.createElement("button");
    importBtn.type = "button";
    importBtn.className = "save-slot-import-btn";
    importBtn.textContent = "Import Save…";
    importBtn.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,application/json";
      input.addEventListener("change", async () => {
        const file = input.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          const result = await idbImportSaveFromText(currentSaveSlot, text);
          if (!result?.ok) {
            logMsg("Import failed: save file was invalid or corrupted.");
            return;
          }
          await refreshSlotsAndPickActive();
          renderSaveSlots();
          logMsg(`Save imported to ${slotDisplayLabel(result.slot)}.`);
        } catch (err) {
          console.warn("[westward] importSave failed:", err);
          logMsg("Import failed: could not read the file.");
        }
      });
      input.click();
    });
    importRow.appendChild(importBtn);
    saveSlotsContainer.appendChild(importRow);

    // Past run history — last 3 completed runs
    const history = getRunHistory().slice(0, 3);
    if (history.length > 0) {
      const histSection = document.createElement("div");
      histSection.className = "run-history";
      const histLabel = document.createElement("div");
      histLabel.className = "run-history-label";
      histLabel.textContent = "Past Runs";
      histSection.appendChild(histLabel);
      for (const record of history) {
        const entry = document.createElement("div");
        entry.className = "run-history-entry" + (record.victory ? " is-victory" : "");
        entry.textContent = formatRunRecord(record) || "Unknown run";
        histSection.appendChild(entry);
      }
      saveSlotsContainer.appendChild(histSection);
    }
  }

  // IDB-backed cache. Populated by initSavePersistenceAsync(); read synchronously
  // by the existing saveGame/loadGame flow. localStorage is a one-shot legacy drain.
  let cachedSavePayload = null;
  let cachedSaveSavedAt = null;

  function readSaveData() {
    return cachedSavePayload;
  }

  // Legacy sync fallback used only if async init hasn't completed yet (rare race
  // between the title screen rendering and the first IDB read finishing).
  function readSaveDataLegacy() {
    const saveEntry = readStorageWithFallback(SAVE_KEY, LEGACY_SAVE_KEYS);
    if (!saveEntry) return null;
    try {
      const parsed = JSON.parse(saveEntry.value);
      if (!parsed || (parsed.version !== 1 && parsed.version !== 2 && parsed.version !== 3)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function setCachedSave(payload, savedAt) {
    cachedSavePayload = payload || null;
    cachedSaveSavedAt = Number.isFinite(savedAt) ? savedAt : (payload ? Date.now() : null);
    hasSaveData = Boolean(payload);
    lastSaveAt = cachedSaveSavedAt;
    refreshContinueButton();
  }

  function syncSaveStateFromStorage() {
    // Best-effort sync seed in case async init hasn't completed yet.
    const legacy = readSaveDataLegacy();
    if (legacy) setCachedSave(legacy, numberOr(legacy.savedAt, Date.now()));
  }

  async function initSavePersistenceAsync() {
    // 1. Drain any localStorage save into the default slot exactly once.
    try {
      await idbMigrateFromLocalStorage(IDB_DEFAULT_SLOT);
    } catch (err) {
      console.warn("[westward] localStorage→IDB migration skipped:", err);
    }
    // 2. Refresh the slot picker so it shows the migrated save plus any
    // pre-existing slots. This also seeds the active-slot cache from the
    // most recent valid slot.
    await refreshSlotsAndPickActive();
    refreshContinueButton();
  }

  // Reads all 3 slots, picks the most-recent-saved as the active one, and
  // primes the read cache so the existing single-slot Continue path works.
  // Falls through to backup recovery for the active slot if the primary is
  // corrupted (existing behavior, now slot-aware).
  let cachedSlotMetas = [];
  let cachedBackupMetasBySlot = {};
  async function refreshSlotsAndPickActive() {
    try {
      cachedSlotMetas = await idbListSlots();
      const backupEntries = await Promise.all(IDB_KNOWN_SLOTS.map(async (slot) => {
        try {
          return [slot, await idbListBackups(slot)];
        } catch (err) {
          console.warn(`[westward] listBackups failed for ${slot}:`, err);
          return [slot, []];
        }
      }));
      cachedBackupMetasBySlot = Object.fromEntries(backupEntries);
    } catch (err) {
      console.warn("[westward] listSlots failed:", err);
      cachedSlotMetas = IDB_KNOWN_SLOTS.map((slot) => ({ slot, empty: true, valid: true, payload: null, savedAt: null }));
      cachedBackupMetasBySlot = {};
    }
    savesLoaded = true;
    const validWritten = cachedSlotMetas
      .filter((m) => canAutoLoadSlot(m) && m.savedAt)
      .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
    if (validWritten.length > 0) {
      const top = validWritten[0];
      currentSaveSlot = top.slot;
      setCachedSave(top.payload, top.savedAt);
      return;
    }
    // Active primary is empty/corrupted — try backup recovery against the
    // current slot before giving up.
    const corruptedActive = cachedSlotMetas.find((m) => m.slot === currentSaveSlot && !m.empty && !m.valid);
    if (corruptedActive) {
      try {
        const recovered = await idbFindMostRecentValidBackup(currentSaveSlot);
        if (recovered && recovered.ok) {
          await idbRestoreFromBackup(currentSaveSlot, recovered.savedAt);
          setCachedSave(recovered.payload, recovered.savedAt);
          pendingSaveCorruptionMsg = "Save was corrupted; restored from a recent backup.";
          return;
        }
      } catch (err) {
        console.warn("[westward] IDB backup recovery failed:", err);
      }
    }
    // Nothing usable across any slot.
    setCachedSave(null, null);
  }

  function getSlotMetas() {
    return cachedSlotMetas;
  }

  async function setCurrentSaveSlot(slot) {
    if (typeof slot !== "string" || !IDB_KNOWN_SLOTS.includes(slot)) return false;
    currentSaveSlot = slot;
    // Re-read the chosen slot's primary so Continue uses its payload.
    try {
      const result = await idbReadSave(slot);
      if (result.ok && isSupportedSchemaPayload(result.payload)) {
        setCachedSave(result.payload, result.savedAt);
      } else {
        setCachedSave(null, null);
      }
    } catch (err) {
      console.warn("[westward] setCurrentSaveSlot read failed:", err);
      setCachedSave(null, null);
    }
    return true;
  }
  let pendingSaveCorruptionMsg = null;

  // Sync runtime modal-selection module-globals → state.ui.modals before save.
  // Module-globals stay authoritative during play; this just snapshots them
  // into state at save boundaries so the persisted file carries them.
  function syncUiModalsFromRuntime() {
    if (!state.ui || !state.ui.modals) state.ui = { modals: createInitialUiModalState() };
    state.ui.modals.dialogue = dialogueSelection;
    state.ui.modals.questOutcome = questOutcomeSelection;
    state.ui.modals.jobBoard = jobBoardSelection;
    state.ui.modals.codexTab = codexTab;
    state.ui.modals.settings = settingsSelection;
  }

  // Sync state.ui.modals → runtime module-globals after load. Mirror of the
  // capture-side sync. Modal-open handlers reset most of these on open, so
  // the practical effect is preserving codexTab + settingsSelection across
  // reload (the two not auto-reset on open).
  function syncUiModalsToRuntime() {
    const m = state.ui && state.ui.modals ? state.ui.modals : createInitialUiModalState();
    dialogueSelection = m.dialogue;
    questOutcomeSelection = m.questOutcome;
    jobBoardSelection = m.jobBoard;
    codexTab = m.codexTab;
    settingsSelection = m.settings;
  }

  function captureSaveData() {
    state.narrative.ending = resolveNarrativeEnding(state.narrative, state.companion);
    ensureRunStats(state.world, state.time);
    syncQuestOutcomeCount(state.world, state.narrative);
    state.progression.identity = normalizeCharacterIdentity(state.progression.identity);
    state.progression.equipment = normalizeGearState(state.progression.equipment);
    state.world.jobs = normalizeJobBoardState(state.world.jobs);
    state.world.roadRoute = normalizeRoadRouteState(state.world.roadRoute);
    syncUiModalsFromRuntime();
    return {
      version: 3,
      savedAt: Date.now(),
      mode: state.mode === "victory" ? "victory" : "playing",
      time: state.time,
      player: {
        x: state.player.x,
        y: state.player.y,
        angle: state.player.angle,
        hp: state.player.hp,
        maxHp: state.player.maxHp,
        level: state.player.level,
        xp: state.player.xp,
        nextXp: state.player.nextXp,
        stamina: state.player.stamina,
        gold: state.player.gold,
        deaths: state.player.deaths,
        inHouse: state.player.inHouse,
        regionInterior: state.player.regionInterior,
        loadout: state.player.loadout,
        perks: state.player.perks,
        upgradePoints: state.progression.upgradePoints,
        equipment: state.progression.equipment,
        traits: state.progression.traits,
        quickUtility: state.player.quickUtility,
      },
      inventory: normalizeInventoryState(state.inventory),
      quests: {
        crystal: { status: state.quests.crystal.status, progress: state.quests.crystal.progress },
        slime: { status: state.quests.slime.status, progress: state.quests.slime.progress },
        wood: { status: state.quests.wood.status, progress: state.quests.wood.progress },
        archive: state.quests.archive
          ? { status: state.quests.archive.status, progress: state.quests.archive.progress }
          : null,
        ashfall_intro: state.quests.ashfall_intro
          ? { status: state.quests.ashfall_intro.status, progress: state.quests.ashfall_intro.progress }
          : null,
        ashfall_boss: state.quests.ashfall_boss
          ? { status: state.quests.ashfall_boss.status, progress: state.quests.ashfall_boss.progress }
          : null,
        lantern_probe: state.quests.lantern_probe
          ? { status: state.quests.lantern_probe.status, progress: state.quests.lantern_probe.progress }
          : null,
        lantern_revolt: state.quests.lantern_revolt
          ? { status: state.quests.lantern_revolt.status, progress: state.quests.lantern_revolt.progress }
          : null,
      },
      house: {
        unlocked: state.house.unlocked,
        built: state.house.built,
        visits: state.house.visits,
        workstation: state.house.workstation,
      },
      world: {
        chest: {
          x: state.chest.x,
          y: state.chest.y,
          opened: state.chest.opened,
          respawn: state.chest.respawn,
          firstRewardClaimed: Boolean(state.chest.firstRewardClaimed),
          lastReward: state.chest.lastReward,
        },
        harvestedResourceIds: state.resources.filter((resource) => resource.harvested).map((resource) => resource.id),
        defeatedEnemyIds: state.enemies.filter((enemy) => !enemy.alive).map((enemy) => enemy.id),
        timeOfDay: typeof state.world?.timeOfDay === "number" ? state.world.timeOfDay : 0.25,
        difficulty: ensureDifficultyDefaults(state.world),
        companionId: state.companion.active ? state.companion.id : (state.world?.companionId || null),
        companionHp: state.companion.active ? Math.max(1, Math.round(state.companion.hp)) : null,
        companionDowned: Boolean(state.companion.downed),
        companionRecoveryTimer: Math.max(0, state.companion.recoveryTimer || 0),
        runStats: state.world.runStats,
        loot: state.world.loot,
        jobs: state.world.jobs,
        roadRoute: state.world.roadRoute,
        calendarDay: state.world.calendarDay || 0,
        calendarDayTimer: state.world.calendarDayTimer || 0,
      },
      narrative: state.narrative,
      codex: state.codex,
      showMap: state.showMap,
      progression: state.progression,
      regions: state.regions,
      graphics: state.graphics,
      ui: { modals: { ...state.ui.modals } },
      fog: state.fog || {},
    };
  }

  function applyQuestState(key, questData) {
    const quest = state.quests[key];
    if (!quest || !questData) return;
    const nextStatus = QUEST_STATUSES.has(questData.status) ? questData.status : quest.status;
    const nextProgress = Math.floor(numberOr(questData.progress, quest.progress));
    quest.status = nextStatus;
    quest.progress = clamp(nextProgress, 0, quest.need);
  }

  function applySaveData(save) {
    if (!save || (save.version !== 1 && save.version !== 2 && save.version !== 3)) return false;
    const migrated = migrateSaveToV3(save);
    if (!migrated) return false;
    save = migrated;

    resetWorld({ countDeath: false, silent: true });
    state.time = Math.max(0, numberOr(save.time, state.time));

    const player = save.player || {};
    state.player.maxHp = Math.max(40, Math.floor(numberOr(player.maxHp, state.player.maxHp)));
    state.player.level = Math.max(1, Math.floor(numberOr(player.level, state.player.level)));
    state.player.xp = Math.max(0, Math.floor(numberOr(player.xp, state.player.xp)));
    state.player.nextXp = Math.max(50, Math.floor(numberOr(player.nextXp, state.player.nextXp)));
    state.player.hp = clamp(numberOr(player.hp, state.player.maxHp), 0, state.player.maxHp);
    state.player.stamina = clamp(numberOr(player.stamina, state.player.maxStamina), 0, state.player.maxStamina);
    state.player.gold = Math.max(0, Math.floor(numberOr(player.gold, state.player.gold)));
    state.player.deaths = Math.max(0, Math.floor(numberOr(player.deaths, state.player.deaths)));
    const allowedStances = new Set(["balanced", "aggressive", "defensive"]);
    const nextStance = player?.loadout?.stance;
    state.player.loadout.stance = allowedStances.has(nextStance) ? nextStance : state.player.loadout.stance;
    state.player.loadout.weapon = typeof player?.loadout?.weapon === "string" ? player.loadout.weapon : state.player.loadout.weapon;
    state.player.perks = Array.isArray(player?.perks) ? player.perks.filter((perk) => typeof perk === "string").slice(0, 12) : state.player.perks;

    state.inventory = normalizeInventoryState(save.inventory);

    applyQuestState("crystal", save.quests?.crystal);
    applyQuestState("slime", save.quests?.slime);
    applyQuestState("wood", save.quests?.wood);
    applyQuestState("archive", save.quests?.archive);
    applyQuestState("ashfall_intro", save.quests?.ashfall_intro);
    applyQuestState("ashfall_boss", save.quests?.ashfall_boss);
    applyQuestState("lantern_probe", save.quests?.lantern_probe);
    applyQuestState("lantern_revolt", save.quests?.lantern_revolt);

    state.house.unlocked = Boolean(save.house?.unlocked);
    state.house.built = Boolean(save.house?.built || state.house.unlocked);
    state.house.visits = Math.max(0, Math.floor(numberOr(save.house?.visits, state.house.visits)));
    state.house.workstation = normalizeWorkstationState(save.house?.workstation);

    state.showMap = typeof save.showMap === "boolean" ? save.showMap : state.showMap;
    state.narrative = migrateNarrativeState(save);
    state.narrative.npcMemory = normalizeNpcMemoryState(save.narrative?.npcMemory);
    state.codex = save.codex || state.codex;
    ensureCodexState(state);
    state.world = {
      timeOfDay: typeof save.world?.timeOfDay === "number" ? save.world.timeOfDay : 0.25,
      difficulty: typeof save.world?.difficulty === "string" ? save.world.difficulty : "standard",
      companionId: typeof save.world?.companionId === "string" ? save.world.companionId : null,
      companionHp: typeof save.world?.companionHp === "number" ? save.world.companionHp : null,
      companionDowned: Boolean(save.world?.companionDowned),
      companionRecoveryTimer: Math.max(0, numberOr(save.world?.companionRecoveryTimer, 0)),
      runStats: ensureRunStats({ runStats: save.world?.runStats }, state.time),
      loot: normalizeLootState(save.world?.loot),
      jobs: normalizeJobBoardState(save.world?.jobs),
      roadRoute: normalizeRoadRouteState(save.world?.roadRoute),
      calendarDay: typeof save.world?.calendarDay === "number" ? save.world.calendarDay : 0,
      calendarDayTimer: typeof save.world?.calendarDayTimer === "number" ? save.world.calendarDayTimer : 0,
    };
    ensureDifficultyDefaults(state.world);
    state.mode = save.mode === "victory" || state.world.runStats?.victory ? "victory" : state.mode;
    state.progression = save.progression || createInitialProgressionState();
    state.progression.identity = normalizeCharacterIdentity(state.progression.identity);
    state.progression.equipment = normalizeGearState(state.progression.equipment);
    selectedOriginId = state.progression.identity.originId;
    updateOriginPickerSelection();
    state.regions = save.regions || createInitialRegionState();
    state.fog = {
      frontier:    normalizeFogGrid(save.fog?.frontier),
      ashfall:     normalizeFogGrid(save.fog?.ashfall),
      ironlantern: normalizeFogGrid(save.fog?.ironlantern),
    };
    state.ui = { modals: normalizeUiModalState(save.ui?.modals) };
    syncUiModalsToRuntime();
    const graphicsDefaults = createInitialGraphicsState();
    state.graphics = {
      ...graphicsDefaults,
      ...(save.graphics || {}),
      accessibility: {
        ...graphicsDefaults.accessibility,
        ...(save.graphics?.accessibility || {}),
      },
      performance: {
        ...graphicsDefaults.performance,
        ...(save.graphics?.performance || {}),
      },
    };
    state.player.quickUtility = save.player?.quickUtility || state.player.quickUtility;
    syncCombatProfileState();
    for (const regionId of state.regions.discovered) {
      ensureRegionMiniBosses(regionId);
    }

    const harvested = new Set(Array.isArray(save.world?.harvestedResourceIds) ? save.world.harvestedResourceIds : []);
    for (const resource of state.resources) {
      if (harvested.has(resource.id)) {
        resource.harvested = true;
        resource.respawn = Math.max(1, numberOr(resource.respawn, 14));
      }
    }

    const defeated = new Set(Array.isArray(save.world?.defeatedEnemyIds) ? save.world.defeatedEnemyIds : []);
    for (const enemy of state.enemies) {
      if (defeated.has(enemy.id)) {
        enemy.alive = false;
        enemy.hp = 0;
        enemy.stagger = 0;
        enemy.attackCooldown = 0;
        enemy.respawn = 8 + Math.random() * 8;
      }
    }

    if (save.world?.chest) {
      const chest = save.world.chest;
      state.chest.opened = Boolean(chest.opened);
      state.chest.respawn = state.chest.opened ? clamp(numberOr(chest.respawn, 24), 1, 80) : 0;
      state.chest.firstRewardClaimed = Boolean(chest.firstRewardClaimed);
      state.chest.lastReward = typeof chest.lastReward === "string" ? chest.lastReward : null;
      const chestX = clamp(numberOr(chest.x, state.chest.x), 1.2, worldMap[0].length - 1.2);
      const chestY = clamp(numberOr(chest.y, state.chest.y), 1.2, worldMap.length - 1.2);
      if (!isInHouseLot(chestX, chestY)) {
        state.chest.x = chestX;
        state.chest.y = chestY;
      }
    }

    const wantsHouse = Boolean(player.inHouse && state.house.unlocked);
    state.player.inHouse = wantsHouse;
    // Saved region interior id, if valid; otherwise null. Loading inside an
    // unknown interior id should drop the player back outdoors safely.
    const savedInterior = typeof player.regionInterior === "string" ? player.regionInterior : null;
    state.player.regionInterior = savedInterior && regionInteriorMaps[savedInterior] ? savedInterior : null;

    const activeMap = currentMap();
    const interiorSpawn = state.player.regionInterior
      ? REGION_INTERIORS[state.player.regionInterior].spawn
      : null;
    const fallback = interiorSpawn
      ? { ...interiorSpawn }
      : state.player.inHouse
        ? { x: 9.5, y: 14.2, angle: -Math.PI / 2 }
        : { x: 9.5, y: 8.5, angle: 0 };
    const px = clamp(numberOr(player.x, fallback.x), 1.2, activeMap[0].length - 1.2);
    const py = clamp(numberOr(player.y, fallback.y), 1.2, activeMap.length - 1.2);
    if (isBlocking(px, py)) {
      state.player.x = fallback.x;
      state.player.y = fallback.y;
    } else {
      state.player.x = px;
      state.player.y = py;
    }
    state.player.angle = normalizeAngle(numberOr(player.angle, fallback.angle));
    state.companion = createInitialCompanionRuntime();
    if (state.world.companionId) {
      const def = chooseEligibleCompanion({ [state.world.companionId]: 100 }, 0);
      activateCompanion(state.companion, def, state.player, state.world.companionHp);
      resetBarkState(state.companion);
      if (state.world.companionDowned) {
        state.companion.active = false;
        state.companion.downed = true;
        state.companion.recoveryTimer = state.world.companionRecoveryTimer;
      }
    }

    updateQuestProgressFromInventory();
    syncChapterFromProgress(state.narrative, state.player.level);
    syncCombatProfileState();
    return true;
  }

  function saveGame(options = {}) {
    const { silent = false } = options;
    if (state.mode !== "playing" && state.mode !== "gameover" && state.mode !== "victory") {
      if (!silent) logMsg("Start your journey before saving.");
      return false;
    }

    const payload = captureSaveData();
    setCachedSave(payload, payload.savedAt);
    autoSaveTimer = 0;
    // Async write-through to IDB. localStorage is no longer the primary store;
    // the only fallback is the cache held in memory (which is enough for the
    // current session — and the next session if IDB succeeds before tab close).
    idbWriteSave(currentSaveSlot, payload).catch((err) => {
      console.warn("[westward] save write failed:", err);
      if (!silent) logMsg("Save failed: storage error.");
    });
    if (!silent) logMsg("Progress saved.");
    return true;
  }

  function loadGame(options = {}) {
    const { silent = false, fromMenu = false } = options;
    const payload = readSaveData();
    if (!payload) {
      hasSaveData = false;
      refreshContinueButton();
      if (!silent) logMsg("No saved journey found.");
      return false;
    }

    if (!applySaveData(payload)) {
      if (!silent) logMsg("Save file is incompatible.");
      return false;
    }

    hasSaveData = true;
    lastSaveAt = numberOr(payload.savedAt, Date.now());
    autoSaveTimer = 0;
    refreshContinueButton();

    if ((fromMenu || state.mode !== "playing") && state.mode !== "victory") {
      beginSession({ fromLoad: true });
    }

    if (!silent) logMsg("Journey loaded.");
    return true;
  }

  function beginSession(options = {}) {
    const { fromLoad = false } = options;
    state.mode = "playing";
    menu.style.display = "none";
    autoSaveTimer = 0;
    if (!fromLoad) {
      state.progression.identity = applyOrigin(state.progression.identity, selectedOriginId);
      state.progression.equipment = normalizeGearState(state.progression.equipment);
      syncCombatProfileState();
      state.world.runStats = createInitialRunStats(state.time);
      logMsg("Welcome to Dustward, drifter. Talk to townsfolk, duel slimes, and avoid being trampled by outlaw pigs.");
      ensureAudio();
    }
    activeReplaySession = createReplaySession(Date.now());
    syncAmbientForRegion(state.regions?.activeRegion || "frontier");
    if (pendingSaveCorruptionMsg) {
      logMsg(pendingSaveCorruptionMsg);
      pendingSaveCorruptionMsg = null;
    }
    snapshotFactionRepBands();
    canvas.focus();
  }

  function tickAutoSave(dt) {
    autoSaveTimer += dt;
    if (autoSaveTimer >= AUTOSAVE_INTERVAL) {
      saveGame({ silent: true });
    }
  }

  function logMsg(text) {
    state.msg.unshift({ text, ttl: 8 });
    if (state.msg.length > 8) state.msg.length = 8;
  }

  function showHudNotice(notice) {
    if (!notice) return;
    hudNotice = {
      ...notice,
      ttl: Number.isFinite(notice.ttl) ? notice.ttl : 5.2,
    };
  }

  function showCombatReadabilityNotice(notice) {
    if (!notice) return;
    combatReadabilityNotice = {
      kind: notice.kind || "combat",
      title: notice.title || "Combat",
      line: notice.line || "",
      rewardLine: notice.rewardLine || null,
      state: notice.state || null,
      ttl: Number.isFinite(notice.ttl) ? notice.ttl : 2.8,
    };
  }

  // Wraps unlockCodexEntry: surfaces a player-visible message on first unlock.
  // Returns whatever unlockCodexEntry returned so callers can chain conditional logic.
  function unlockCodexAndPing(tab, id) {
    const newlyUnlocked = unlockCodexEntry(state, tab, id);
    if (!newlyUnlocked) return false;
    const entry = getCodexEntry(tab, id);
    const title = entry?.title || id;
    logMsg(`Codex unlocked: ${title}.`);
    showHudNotice(createCodexUnlockNotice(entry || { title }, tab));
    return true;
  }

  // Faction rep bands and HUD ribbon — closes the audit's "shipped but invisible"
  // finding for factionEffects. The rep itself was wired (price multipliers,
  // smith gates) but never surfaced to the player during open-world play.
  const FACTION_DISPLAY_NAMES = {
    civicCouncil: "Civic Council",
    workersGuild: "Workers' Guild",
    marketCartel: "Market Cartel",
  };

  function factionRepBand(value) {
    const v = Number.isFinite(value) ? value : 0;
    if (v <= -50) return -50;
    if (v <= -25) return -25;
    if (v <= -10) return -10;
    if (v < 10) return 0;
    if (v < 25) return 10;
    if (v < 50) return 25;
    return 50;
  }

  function factionBandLabel(band) {
    if (band >= 50) return "allied";
    if (band >= 25) return "friendly";
    if (band >= 10) return "favorable";
    if (band === 0) return "neutral";
    if (band === -10) return "wary";
    if (band === -25) return "hostile";
    return "vendetta";
  }

  let factionRepBandSnapshot = { civicCouncil: 0, workersGuild: 0, marketCartel: 0 };

  // Re-snapshot without firing pings — used on session start / save load.
  function snapshotFactionRepBands() {
    const rep = state?.narrative?.factionRep;
    if (!rep) return;
    for (const fid of Object.keys(FACTION_DISPLAY_NAMES)) {
      factionRepBandSnapshot[fid] = factionRepBand(rep[fid]);
    }
  }

  function tickFactionRepBands() {
    const rep = state?.narrative?.factionRep;
    if (!rep) return;
    for (const fid of Object.keys(FACTION_DISPLAY_NAMES)) {
      const current = factionRepBand(rep[fid]);
      const previous = factionRepBandSnapshot[fid];
      if (current === previous) continue;
      const direction = current > previous ? "rises" : "falls";
      const name = FACTION_DISPLAY_NAMES[fid];
      const label = factionBandLabel(current);
      logMsg(`Word travels: ${name} standing ${direction} to ${label}.`);
      const priceLine = fid === "marketCartel"
        ? (current > previous ? "Shop prices may soften." : "Shop prices may harden.")
        : "";
      showHudNotice(createFactionRepNotice({ factionName: name, direction, label, priceLine }));
      factionRepBandSnapshot[fid] = current;
    }
  }

  function showDiscoveryBanner(feedback) {
    if (!feedback) return;
    discoveryBanner = {
      ...feedback,
      ttl: Number.isFinite(feedback.ttl) ? feedback.ttl : 5.2,
    };
  }

  function emitCompanionBark(eventType) {
    if (!state.companion?.active) return null;
    const line = trySpeakBark(state.companion, eventType, state.time || 0);
    if (line) logMsg(line);
    return line;
  }

  function applyProgressionEffects() {
    state.progression.identity = normalizeCharacterIdentity(state.progression.identity);
    state.progression.equipment = normalizeGearState(state.progression.equipment);
    const modifiers = buildProgressionModifiers(state.progression);
    const gearSummary = buildGearSummary(state.progression.equipment, state.progression.identity);
    // Merge capstone perk effects into progressionMods
    const activeCapstones = getUnlockedCapstonePerkIds(state.progression, state.narrative.factionRep);
    if (activeCapstones.includes("iron_constitution")) {
      modifiers.maxHpBonus = (modifiers.maxHpBonus || 0) + 30;
      modifiers.guardBreakRecoveryMult = 0.6;
    }
    if (activeCapstones.includes("perfect_form")) {
      modifiers.perfectWindowBonus = (modifiers.perfectWindowBonus || 0) + 0.05;
    }
    state.player.progressionMods = modifiers;
    state.player.maxHp = PLAYER_MAX_HP + (modifiers.maxHpBonus || 0);
    state.player.hp = Math.min(state.player.hp, state.player.maxHp);
    state.player.maxStamina = 100 + (modifiers.staminaReserveBonus || 0);
    state.player.stamina = Math.min(state.player.stamina, state.player.maxStamina);
    state.player.loadout.weapon = gearSummary.weaponName;
    state.player.quickUtility = state.player.quickUtility || {
      active: "smoke",
      inventory: { smoke: 1, flare: 1, tonic: 1 },
    };
    if (!state.player.quickUtility.inventory) {
      state.player.quickUtility.inventory = { smoke: 1, flare: 1, tonic: 1 };
    }
    const ideologyTraits = resolveIdeologyTraits(state.narrative);
    state.progression.traits = ideologyTraits;
    state.player.traits = ideologyTraits;
    state.progression.upgradePoints = Math.max(
      state.progression.upgradePoints,
      Math.max(0, Math.floor(state.player.level / 2) - 1),
    );
  }

  function syncCombatProfileState(options = {}) {
    const { announce = false } = options;
    const previousPerks = new Set(state.player.perks || []);
    const profile = resolveCombatProgression(state.narrative, state.player.level);
    state.player.combatProfile = profile;
    state.player.perks = [...profile.perks];
    const stanceMap = {
      civicBulwark: "defensive",
      commonsDuelist: "balanced",
      cartelTrickster: "aggressive",
    };
    state.player.loadout.stance = stanceMap[profile.styleId] || "balanced";
    state.player.loadout.weapon =
      profile.styleId === "civicBulwark"
        ? "Marshal Saber"
        : profile.styleId === "cartelTrickster"
          ? "Cartel Rapier"
          : "Commons Blade";

    if (announce) {
      const unlocked = profile.perkDetails.filter((perk) => !previousPerks.has(perk.id));
      for (const perk of unlocked) {
        logMsg(`Perk unlocked: ${perk.label}. ${perk.description}`);
      }
      if (unlocked.length > 0) {
        logMsg(`Combat doctrine updated: ${profile.style.label}.`);
      }
    }
    applyProgressionEffects();
  }

  function getStanceModifiers() {
    const stance = state.player.loadout.stance;
    if (stance === "aggressive") {
      return { damageMult: 1.12, staminaMult: 1.1, cooldownMult: 1.04, blockPenalty: 1.08, sprintMult: 1.02 };
    }
    if (stance === "defensive") {
      return { damageMult: 0.92, staminaMult: 0.9, cooldownMult: 0.94, blockPenalty: 0.8, sprintMult: 0.95 };
    }
    return { damageMult: 1, staminaMult: 1, cooldownMult: 1, blockPenalty: 1, sprintMult: 1 };
  }

  function grantXp(amount) {
    state.player.xp += amount;
    const previousChapter = state.narrative.chapter;
    while (state.player.xp >= state.player.nextXp) {
      state.player.xp -= state.player.nextXp;
      state.player.level += 1;
      state.player.nextXp = Math.round(state.player.nextXp * 1.34 + 28);
      state.player.maxHp += 14;
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + 28);
      state.player.stamina = state.player.maxStamina;
      logMsg(`Level up! You reached level ${state.player.level}. The valley trembles!`);
      sfx.levelUp();
      spawnParticles(canvas.width / 2, canvas.height / 2, 20, "#ffd700", 4, 1.5, { decorative: true });
      syncCombatProfileState({ announce: true });
      emitCompanionBark("level_up");
    }
    syncChapterFromProgress(state.narrative, state.player.level);
    if (state.narrative.chapter !== previousChapter) {
      const chapterInfo = STORY_CHAPTERS[state.narrative.chapterIndex] || STORY_CHAPTERS[0];
      logMsg(`Story chapter advanced: ${chapterInfo.title}.`);
      const chapterStats = ensureRunStats(state.world, state.time);
      chapterStats.chapterReached = Math.max(chapterStats.chapterReached, state.narrative.chapter || 1);
    }
  }

  const MINI_BOSS_DEFS = {
    ashfall_scrap_tyrant: { region: "ashfall", label: "Scrap Tyrant", behavior: "tank", baseType: "brute", phaseTwo: getMiniBossPhaseTwo("ashfall_scrap_tyrant"), spawnArea: { minX: 36, minY: 38, maxX: 50, maxY: 50 }, hpMult: 3.2, damageMult: 1.4, rewardGold: 80, rewardResource: { item: "Heat Resin", count: 2 } },
    ashfall_scorch_engine: { region: "ashfall", label: "Scorch Engine", behavior: "charge", baseType: "charger", phaseTwo: getMiniBossPhaseTwo("ashfall_scorch_engine"), spawnArea: { minX: 28, minY: 32, maxX: 42, maxY: 46 }, hpMult: 2.8, damageMult: 1.3, rewardGold: 90, rewardResource: { item: "Scrap Coil", count: 2 } },
    lantern_overseer: { region: "ironlantern", label: "Lantern Overseer", behavior: "shield", baseType: "shield_brute", phaseTwo: getMiniBossPhaseTwo("lantern_overseer"), spawnArea: { minX: 6, minY: 38, maxX: 22, maxY: 50 }, hpMult: 3.5, damageMult: 1.4, rewardGold: 120, rewardResource: { item: "Cipher Lens", count: 2 } },
    lantern_iron_chanter: { region: "ironlantern", label: "Iron Chanter", behavior: "control", baseType: "suppressor", phaseTwo: getMiniBossPhaseTwo("lantern_iron_chanter"), spawnArea: { minX: 10, minY: 32, maxX: 24, maxY: 44 }, hpMult: 2.6, damageMult: 1.2, rewardGold: 110, rewardResource: { item: "Pressurized Ink", count: 2 } },
  };

  function transitionMiniBossPhaseIfNeeded(enemy) {
    if (!enemy?.miniBossId) return false;
    const def = MINI_BOSS_DEFS[enemy.miniBossId];
    const transition = applyMiniBossPhaseTransition(enemy, def?.phaseTwo);
    if (!transition) return false;
    const stats = createEnemyStats(transition.type, state.player.level);
    enemy.color = stats.color || enemy.color;
    enemy.attackReach = Math.max(enemy.attackReach || 0, stats.attackReach + 0.25);
    enemy.damageVariance = Math.max(enemy.damageVariance || 0, stats.damageVariance + 2);
    enemy.phaseCueTimer = 2.4;
    const vfx = resolveBossPhaseVfx({
      bossId: enemy.miniBossId,
      label: def?.label || enemy.label || "Mini-boss",
      phaseLabel: transition.phaseLabel,
    });
    state.floatingTexts.push({ wx: enemy.x, wy: enemy.y, text: vfx.floatingText, life: 1.0, maxLife: 1.0, color: vfx.ringColor });
    spawnParticles(canvas.width / 2, canvas.height * 0.38, vfx.particleBurst, vfx.particleColor, vfx.particleSpeed, vfx.particleLife, { decorative: false });
    state.player.screenShake = clamp(state.player.screenShake + vfx.screenShake, 0, 0.95);
    logMsg(`${def?.label || enemy.label || "Mini-boss"} enters Phase 2: ${transition.phaseLabel}.`);
    showCombatReadabilityNotice({
      kind: "boss_phase",
      title: "Boss phase transition",
      line: `${def?.label || enemy.label || "Mini-boss"} changed pattern: ${transition.phaseLabel}.`,
      state: "phase",
      ttl: 4.2,
    });
    recordCombatEvent(combatSubtitles, "boss_phase");
    playCombatCue("boss_phase");
    sfx.thunder();
    return true;
  }

  function spawnMiniBossById(bossId) {
    const def = MINI_BOSS_DEFS[bossId];
    if (!def) return;
    if (state.regions.miniBosses[bossId]?.defeated) return;
    if (state.enemies.some((e) => e.miniBossId === bossId && e.alive)) return;
    const pos = findEmptyCell(worldMap, def.spawnArea.minX, def.spawnArea.minY, def.spawnArea.maxX, def.spawnArea.maxY, (x, y) => !isInHouseLot(x, y));
    const stats = createEnemyStats(def.baseType, state.player.level);
    state.enemies.push({
      id: `miniboss-${bossId}`,
      miniBossId: bossId,
      type: stats.type,
      label: def.label,
      color: stats.color,
      behavior: def.behavior,
      phase: 1,
      phaseTwo: def.phaseTwo,
      invulnTimer: 0,
      x: pos.x,
      y: pos.y,
      hp: Math.round(stats.maxHp * def.hpMult),
      maxHp: Math.round(stats.maxHp * def.hpMult),
      speed: stats.speed * 0.95,
      attackReach: stats.attackReach + 0.2,
      baseDamage: Math.round(stats.baseDamage * def.damageMult),
      damageVariance: stats.damageVariance + 2,
      attackCooldown: 1.0,
      alive: true,
      respawn: 0,
      stagger: 0,
      flashTimer: 0,
    });
    logMsg(`Mini-boss prowling ${REGIONS[def.region]?.name || def.region}: ${def.label}.`);
    emitCompanionBark("mini_boss");
  }

  function ensureRegionMiniBosses(regionId) {
    for (const [bossId, def] of Object.entries(MINI_BOSS_DEFS)) {
      if (def.region !== regionId) continue;
      spawnMiniBossById(bossId);
    }
  }

  function applyDynamicRegionProgression() {
    if (state.player.level >= 4 && !state.regions.discovered.includes("ashfall")) {
      unlockRegion(state.regions, "ashfall");
      if (state.quests.ashfall_intro && state.quests.ashfall_intro.status === "locked") {
        state.quests.ashfall_intro.status = "active";
      }
      logMsg("Region unlocked: Ashfall Basin. Heat haze now distorts the horizon.");
      ensureRegionMiniBosses("ashfall");
      unlockCodexAndPing("regions", "ashfall");
      emitCompanionBark("region_entry");
    }
    if (state.player.level >= 7 && !state.regions.discovered.includes("ironlantern")) {
      unlockRegion(state.regions, "ironlantern");
      if (state.quests.lantern_probe && state.quests.lantern_probe.status === "locked") {
        state.quests.lantern_probe.status = "active";
      }
      logMsg("Region unlocked: Iron Lantern District. Surveillance pressure is rising.");
      ensureRegionMiniBosses("ironlantern");
      unlockCodexAndPing("regions", "ironlantern");
      emitCompanionBark("region_entry");
    }
  }

  function cycleRegion() {
    const order = ["frontier", "ashfall", "ironlantern"];
    const unlocked = order.filter((regionId) => state.regions.discovered.includes(regionId));
    if (unlocked.length <= 1) {
      logMsg("No other regions are unlocked yet.");
      return;
    }
    const idx = unlocked.indexOf(state.regions.activeRegion);
    const next = unlocked[(idx + 1) % unlocked.length];
    unlockRegion(state.regions, next);
    const name = REGIONS[next]?.name || next;
    logMsg(`Travelled to region: ${name}.`);
    invalidateMinimapCache(minimapTileCache);
    syncAmbientForRegion(next);
    emitCompanionBark("region_entry");
  }

  function applySmokeBlind() {
    queryEnemyRadius(enemyGrid, state.player.x, state.player.y, 6.5, _enemyQueryBuf);
    for (let i = 0; i < _enemyQueryBuf.length; i++) {
      const enemy = _enemyQueryBuf[i];
      enemy.searchTimer = 3.0;
      enemy.attackCooldown = Math.max(enemy.attackCooldown || 0, 1.4);
      enemy.stagger = Math.max(enemy.stagger || 0, 0.6);
    }
    return _enemyQueryBuf.length;
  }

  function applyFlareSlow() {
    queryEnemyRadius(enemyGrid, state.player.x, state.player.y, 9, _enemyQueryBuf);
    for (let i = 0; i < _enemyQueryBuf.length; i++) {
      _enemyQueryBuf[i].flareSlowTimer = Math.max(_enemyQueryBuf[i].flareSlowTimer || 0, 4.0);
    }
    state.player.flareRevealTimer = Math.max(state.player.flareRevealTimer || 0, 6.0);
    return _enemyQueryBuf.length;
  }

  function applyTonicHoT() {
    state.player.tonicTimer = 5.0;
    state.player.tonicTickAccum = 0;
    state.player.stamina = Math.min(state.player.maxStamina, state.player.stamina + 12);
  }

  function useQuickUtility() {
    const quick = state.player.quickUtility;
    if (!quick) return;
    const current = quick.active || "smoke";
    const available = Math.max(0, Math.floor(numberOr(quick.inventory?.[current], 0)));
    if (available <= 0) {
      logMsg(`No ${current} left in utility slot.`);
      return;
    }
    quick.inventory[current] = available - 1;
    if (current === "smoke") {
      const blinded = applySmokeBlind();
      logMsg(`Smoke canister popped. ${blinded ? `${blinded} enemies lose your trail.` : "No enemies in range."}`);
    } else if (current === "flare") {
      const slowed = applyFlareSlow();
      state.weather.lightning = Math.max(state.weather.lightning, 0.35);
      logMsg(`Flare deployed. ${slowed ? `${slowed} enemies slowed; map reveal active.` : "Map reveal active."}`);
    } else {
      applyTonicHoT();
      logMsg("Tonic ingested. Health regenerating.");
    }
  }

  function setQuickUtility(slot) {
    if (!state.player.quickUtility) return;
    if (!["smoke", "flare", "tonic"].includes(slot)) return;
    state.player.quickUtility.active = slot;
    logMsg(`Quick utility set to ${slot}.`);
  }

  function performDodgeStep() {
    if (state.mode !== "playing" || state.player.inHouse) return;
    if (cancelChargedAttack(state.player)) {
      logMsg("Charged attack canceled into a dodge.");
    }
    if (state.player.dodgeCooldown > 0 || state.player.stamina < 12) {
      return;
    }
    const heading = state.player.angle;
    const dx = Math.cos(heading) * 0.82;
    const dy = Math.sin(heading) * 0.82;
    moveWithCollision(dx, dy);
    state.player.dodgeCooldown = 1.1;
    const freedomBonus = state.progression.traits.includes("freedom_strider") ? 0.78 : 1;
    state.player.stamina = Math.max(0, state.player.stamina - 12 * freedomBonus);

    // Perfect dodge: an enemy was about to strike within 1.2 tiles AND its
    // attack was imminent (windupTimer near zero or attackCooldown ≤ 0.15).
    let perfect = false;
    queryEnemyRadius(enemyGrid, state.player.x, state.player.y, 1.2, _enemyQueryBuf);
    for (let i = 0; i < _enemyQueryBuf.length; i++) {
      const enemy = _enemyQueryBuf[i];
      const imminent = (enemy.attackCooldown || 0) <= 0.15
        || ((enemy.windupTimer || 0) > 0 && (enemy.windupTimer || 0) < 0.2);
      if (imminent) { perfect = true; break; }
    }
    if (perfect) {
      state.player.stamina = Math.min(state.player.maxStamina, state.player.stamina + 12 * freedomBonus);
      state.player.perfectDodgeFlash = 0.4;
      state.player.timeScale = 0.45;
      state.player.timeScaleTimer = 0.32;
      spawnParticles(canvas.width / 2, canvas.height * 0.45, 14, "#cce4ff", 4, 0.55, { decorative: false });
      state.floatingTexts.push({ wx: state.player.x, wy: state.player.y, text: "PERFECT", life: 0.7, maxLife: 0.7, color: "#cce4ff" });
      logMsg("Perfect dodge!");
      emitCompanionBark("perfect_dodge");
      recordCombatEvent(combatSubtitles, "perfect_dodge");
      playCombatCue("perfect_dodge");
    } else {
      logMsg("Dodge step executed.");
    }
  }

  function performChargedAttack() {
    if (!startChargedAttack(state.player, state.progression.traits, state.mode)) return;
    state.mouseButtons.right = false;
    logMsg("Charged attack winding up.");
  }

  function releaseChargedAttack() {
    if (state.mode !== "playing") return;
    const prevCombo = state.player.comboStep;
    clearChargedAttack(state.player);
    state.player.comboWindow = Math.max(state.player.comboWindow, 0.55);
    state.player.comboStep = 2;
    attack();
    if (state.player.comboStep !== 3) state.player.comboStep = prevCombo;
    state.player.attackCooldown += state.progression.traits.includes("order_keeper") ? 0.05 : 0.14;
    logMsg("Charged attack released.");
  }

  function isBlocking(x, y) {
    const map = currentMap();
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    if (ty < 0 || tx < 0 || ty >= map.length || tx >= map[0].length) return true;
    return map[ty][tx] !== 0;
  }

  function isWorldDecorationPlacement(x, y) {
    if (isInHouseLot(x, y)) return false;
    const samples = [[0, 0], [0.22, 0], [-0.22, 0], [0, 0.22], [0, -0.22]];
    return samples.every(([ox, oy]) => {
      const tx = Math.floor(x + ox);
      const ty = Math.floor(y + oy);
      if (ty < 0 || tx < 0 || ty >= worldMap.length || tx >= worldMap[0].length) return false;
      return worldMap[ty][tx] === 0;
    });
  }

  function worldPresentationContext() {
    return {
      isPassable: isWorldDecorationPlacement,
      isVisible: isWorldDecorationPlacement,
    };
  }

  function tileTypeAtCurrentMap(x, y) {
    const map = currentMap();
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    if (ty < 0 || tx < 0 || ty >= map.length || tx >= map[0].length) return 1;
    return map[ty][tx];
  }

  function getRoadSignPrompt() {
    if (state.player.inHouse || !state.regions?.activeRegion) return null;
    const presentation = buildRegionWorldPresentation(state.regions.activeRegion, worldPresentationContext());
    return resolveRoadSignPrompt(presentation.roadSigns, state.player.x, state.player.y);
  }

  function getRoadRouteObjective() {
    if (state.player.inHouse || !state.regions?.activeRegion) return null;
    return resolveRoadRouteObjective(
      state.world?.roadRoute,
      state.player.x,
      state.player.y,
      state.regions.activeRegion,
    );
  }

  function canOccupy(x, y, radius = PLAYER_COLLISION_RADIUS) {
    const diag = radius * 0.7;
    return (
      !isBlocking(x, y) &&
      !isBlocking(x + radius, y) &&
      !isBlocking(x - radius, y) &&
      !isBlocking(x, y + radius) &&
      !isBlocking(x, y - radius) &&
      !isBlocking(x + diag, y + diag) &&
      !isBlocking(x - diag, y + diag) &&
      !isBlocking(x + diag, y - diag) &&
      !isBlocking(x - diag, y - diag)
    );
  }

  function moveWithCollision(dx, dy) {
    const px = state.player.x;
    const py = state.player.y;
    const nx = px + dx;
    const ny = py + dy;

    if (canOccupy(nx, py)) state.player.x = nx;
    if (canOccupy(state.player.x, ny)) state.player.y = ny;
  }

  function castRay(angle) {
    const map = currentMap();
    const rayDirX = Math.cos(angle);
    const rayDirY = Math.sin(angle);
    let mapX = Math.floor(state.player.x);
    let mapY = Math.floor(state.player.y);

    const deltaDistX = rayDirX === 0 ? 1e30 : Math.abs(1 / rayDirX);
    const deltaDistY = rayDirY === 0 ? 1e30 : Math.abs(1 / rayDirY);

    let sideDistX;
    let sideDistY;
    let stepX;
    let stepY;

    if (rayDirX < 0) {
      stepX = -1;
      sideDistX = (state.player.x - mapX) * deltaDistX;
    } else {
      stepX = 1;
      sideDistX = (mapX + 1 - state.player.x) * deltaDistX;
    }

    if (rayDirY < 0) {
      stepY = -1;
      sideDistY = (state.player.y - mapY) * deltaDistY;
    } else {
      stepY = 1;
      sideDistY = (mapY + 1 - state.player.y) * deltaDistY;
    }

    let side = 0;
    let tileType = 0;
    let traveled = 0;

    while (traveled < MAX_RAY_DIST) {
      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX;
        mapX += stepX;
        side = 0;
        traveled = sideDistX - deltaDistX;
      } else {
        sideDistY += deltaDistY;
        mapY += stepY;
        side = 1;
        traveled = sideDistY - deltaDistY;
      }

      if (mapY < 0 || mapX < 0 || mapY >= map.length || mapX >= map[0].length) {
        tileType = 1;
        break;
      }

      tileType = map[mapY][mapX];
      if (tileType !== 0) break;
    }

    let distToWall;
    if (side === 0) {
      distToWall = (mapX - state.player.x + (1 - stepX) * 0.5) / (rayDirX || 1e-6);
    } else {
      distToWall = (mapY - state.player.y + (1 - stepY) * 0.5) / (rayDirY || 1e-6);
    }
    distToWall = clamp(distToWall, 0.0001, MAX_RAY_DIST);

    const wallSampleDist = Math.max(distToWall, WALL_TEXTURE_NEAR_CLIP);
    let wallX = side === 0 ? state.player.y + wallSampleDist * rayDirY : state.player.x + wallSampleDist * rayDirX;
    wallX -= Math.floor(wallX);
    if (!Number.isFinite(wallX)) wallX = 0;

    return { dist: distToWall, tileType: tileType || 1, side, wallX };
  }

  function nearestEntity(entities, filter, maxDist) {
    let nearest = null;
    let best = maxDist;
    for (const entity of entities) {
      if (!filter(entity)) continue;
      const d = dist(state.player, entity);
      if (d < best) {
        best = d;
        nearest = entity;
      }
    }
    return nearest;
  }

  function getInteractionPrompt() {
    if (state.mode !== "playing") return null;
    const candidates = [];
    const player = state.player;
    const addCandidate = (kind, label, target, options = {}) => {
      const distance = target && Number.isFinite(target.x) && Number.isFinite(target.y)
        ? dist(player, target)
        : 0;
      candidates.push({ kind, label, distance, ...options });
    };

    const roadSignPrompt = getRoadSignPrompt();
    if (roadSignPrompt) {
      addCandidate("road-sign", roadSignPrompt.targetLabel || "Road sign", roadSignPrompt, {
        line: roadSignPrompt.line || roadSignPrompt.targetLabel,
        color: roadSignPrompt.color || "#ffde91",
      });
    }

    if (!player.inHouse && state.regions?.activeRegion) {
      const poi = poiUnderInteraction(state.regions, state.regions.activeRegion, player.x, player.y);
      if (poi) {
        const kind = POI_KINDS[poi.kind] || POI_KINDS.cache;
        addCandidate("poi", poi.label, poi, {
          line: `${kind.label}: ${poi.returnReason || poi.mysteryLine || "search for a useful find"}`,
          color: kind.color,
        });
      }
    }

    if (player.regionInterior) {
      const interior = REGION_INTERIORS[player.regionInterior];
      if (interior && dist(player, interior.exit) < 1.7) {
        addCandidate("interior-exit", "Exit", interior.exit, { line: "Return to the open road" });
      }
      return resolveInteractionPrompt(candidates);
    }

    if (player.inHouse) {
      if (dist(player, state.house.interiorDoor) < 1.7) addCandidate("house-exit", "Door", state.house.interiorDoor);
      if (dist(player, state.house.bed) < 1.7) addCandidate("bed", "Bed", state.house.bed, { line: "Recover HP and stamina" });
      if (dist(player, state.house.stash) < 1.7) addCandidate("workbench", "Stash workbench", state.house.stash, { line: "Craft, repair, refine" });
      const trophy = resolveHouseTrophyInspection({
        player,
        inventory: state.inventory,
        jobState: state.world.jobs,
        house: state.house,
      });
      if (trophy) addCandidate("trophy", trophy.label, { x: player.x, y: player.y }, { line: trophy.planningLine || trophy.line });
      return resolveInteractionPrompt(candidates);
    }

    if (dist(player, state.house.outsideDoor) < 1.8) {
      addCandidate("house-door", "House door", state.house.outsideDoor, {
        line: state.house.unlocked ? "Enter your home" : "Locked until Smith Varo's house quest",
      });
    }

    const regionInterior = getRegionInteriorByRegion(state.regions.activeRegion);
    if (regionInterior && dist(player, REGION_INTERIOR_ENTRANCE) < 1.8) {
      addCandidate("region-interior", regionInterior.label, REGION_INTERIOR_ENTRANCE, { line: regionInterior.entryLog });
    }

    const boardProp = getActiveJobBoardProp();
    if (boardProp && dist(player, boardProp) < 2.15) {
      addCandidate("job-board", "Boone's job board", boardProp, { line: "Pick up paid road work", color: boardProp.color });
    }

    const jobMarker = getJobRouteMarker();
    if (jobMarker && dist(player, jobMarker) < 1.65) {
      addCandidate("job-route", jobMarker.label || "Job marker", jobMarker, {
        line: jobMarker.objectiveLine || jobMarker.actionLine || "Advance the active job",
        color: jobMarker.color,
      });
    }

    const npc = nearestEntity(state.npcs, () => true, 1.95);
    if (npc) addCandidate("npc", npc.name, npc, { line: npc.role || "Talk" });

    const pig = nearestEntity(state.pigs, () => true, 1.7);
    if (pig) addCandidate("pig", pig.name, pig, { line: pig.role || "Frontier pig" });

    const resource = nearestEntity(state.resources, (r) => !r.harvested, 1.6);
    if (resource) {
      addCandidate("resource", resource.label || resource.item || resource.type, resource, {
        line: resource.item || resource.label || "Gather resource",
      });
    }

    return resolveInteractionPrompt(candidates);
  }

  function updateQuestProgressFromInventory() {
    const logs = updateQuestProgressFromInventoryDataDriven(state.quests, state.inventory);
    for (const entry of logs) {
      logMsg(entry);
    }
  }

  function grantRolledLoot(source, regionId, baseGold = 0) {
    state.world.loot = normalizeLootState(state.world.loot);
    const drop = rollLootDrop({
      source,
      regionId,
      playerLevel: state.player.level,
      identity: state.progression.identity,
    });
    const applied = applyLootDropToState({
      lootState: state.world.loot,
      inventory: state.inventory,
      progression: state.progression,
      drop,
    });
    state.player.gold += baseGold + applied.gold;
    state.progression.equipment = normalizeGearState(state.progression.equipment);
    applyProgressionEffects();
    updateQuestProgressFromInventory();
    logMsg(`Loot found: ${drop.summary}.`);
    return drop;
  }

  function grantOpeningCacheReward(reward) {
    state.world.loot = normalizeLootState(state.world.loot);
    const drop = {
      source: "opening_cache",
      regionId: reward.regionId || state.regions.activeRegion,
      gold: reward.gold,
      items: reward.items,
      gear: { armorPieces: [], weaponFamilyTokens: [] },
      summary: reward.summary,
    };
    const applied = applyLootDropToState({
      lootState: state.world.loot,
      inventory: state.inventory,
      progression: state.progression,
      drop,
    });
    state.player.gold += applied.gold;
    if (reward.xp > 0) grantXp(reward.xp);
    state.progression.equipment = normalizeGearState(state.progression.equipment);
    applyProgressionEffects();
    updateQuestProgressFromInventory();
    state.chest.lastReward = reward.summary;
    logMsg(`Opening cache secured: ${reward.summary}.`);
  }

  function grantJobReward(reward) {
    const safeReward = reward || { gold: 0, xp: 0, items: {} };
    state.player.gold += Math.max(0, Math.floor(safeReward.gold || 0));
    if ((safeReward.xp || 0) > 0) grantXp(safeReward.xp);
    for (const [name, count] of Object.entries(safeReward.items || {})) {
      state.inventory[name] = Math.max(0, Math.floor(state.inventory[name] || 0)) + Math.max(0, Math.floor(count || 0));
    }
    updateQuestProgressFromInventory();
  }

  function recordJobCompletionMemory(job) {
    if (!job?.id) return;
    state.narrative.npcMemory = normalizeNpcMemoryState(state.narrative.npcMemory);
    recordNpcMemoryEvent(state.narrative.npcMemory, job.npcId || "warden", {
      type: "job_completed",
      at: Math.round(state.time),
      jobId: job.id,
      jobTitle: job.title || job.id,
      regionId: job.regionId || state.regions.activeRegion,
      houseUnlocked: state.house.unlocked,
    });
  }

  function recordKillForJobs(enemy) {
    state.world.jobs = normalizeJobBoardState(state.world.jobs);
    const result = recordJobEvent(state.world.jobs, {
      type: "kill",
      enemyType: enemy?.type,
      behavior: enemy?.behavior,
      label: enemy?.label,
      regionId: state.regions.activeRegion,
      time: state.time,
    });
    if (result.ok && result.message) logMsg(result.message);
    return result;
  }

  function recordCollectionForJobs(resourceType, item, label = item) {
    state.world.jobs = normalizeJobBoardState(state.world.jobs);
    const result = recordJobEvent(state.world.jobs, {
      type: "collect",
      resourceType,
      item,
      label,
      regionId: state.regions.activeRegion,
      time: state.time,
    });
    if (result.ok && result.message) logMsg(result.message);
    return result;
  }

  function recordPickupForJobs(targetId) {
    state.world.jobs = normalizeJobBoardState(state.world.jobs);
    const result = recordJobEvent(state.world.jobs, {
      type: "pickup",
      targetId,
      regionId: state.regions.activeRegion,
      time: state.time,
    });
    if (result.ok && result.message) logMsg(result.message);
    return result;
  }

  function recordDeliveryForJobs(npcId) {
    state.world.jobs = normalizeJobBoardState(state.world.jobs);
    const result = recordJobEvent(state.world.jobs, {
      type: "deliver",
      npcId,
      regionId: state.regions.activeRegion,
      time: state.time,
    });
    if (result.ok && result.message) logMsg(result.message);
    return result;
  }

  function recordCheckpointForJobs(targetId) {
    state.world.jobs = normalizeJobBoardState(state.world.jobs);
    const result = recordJobEvent(state.world.jobs, {
      type: "checkpoint",
      targetId,
      regionId: state.regions.activeRegion,
      time: state.time,
    });
    if (result.ok && result.message) logMsg(result.message);
    return result;
  }

  function recordDropoffForJobs(targetId) {
    state.world.jobs = normalizeJobBoardState(state.world.jobs);
    const result = recordJobEvent(state.world.jobs, {
      type: "dropoff",
      targetId,
      regionId: state.regions.activeRegion,
      time: state.time,
    });
    if (result.ok && result.message) logMsg(result.message);
    return result;
  }

  function recordRouteActionForJobs(action, targetId) {
    state.world.jobs = normalizeJobBoardState(state.world.jobs);
    const result = recordJobEvent(state.world.jobs, {
      type: action,
      targetId,
      regionId: state.regions.activeRegion,
      time: state.time,
    });
    if (result.ok && result.message) logMsg(result.message);
    return result;
  }

  function getBooneJobChoices() {
    const handcrafted = getJobBoardChoices({
      regionId: state.regions.activeRegion,
      playerLevel: state.player.level,
      jobState: state.world.jobs,
      npcId: "warden",
      inventory: state.inventory,
      narrative: state.narrative,
      limit: 5,
    });
    const generated = generateSideJobs({
      regionId: state.regions.activeRegion,
      factionRep: state.narrative.factionRep,
      questOutcomes: state.narrative.questOutcomes,
      dailySeed: todaysSeedString(),
      count: 2,
    });
    return [...handcrafted, ...generated].slice(0, 7);
  }

  function getJobRouteMarker() {
    if (state.player.inHouse) return null;
    return resolveJobRouteMarker({
      jobState: state.world.jobs,
      player: state.player,
      resources: state.resources,
      enemies: state.enemies,
      npcs: state.npcs,
    });
  }

  function getActiveJobBoardProp() {
    if (state.player.inHouse) return null;
    return getJobBoardProp({ regionId: state.regions.activeRegion });
  }

  function vendorServiceProfile(vendorId) {
    return getVendorServiceProfile(vendorId, {
      regionId: state.regions.activeRegion,
      identity: normalizeCharacterIdentity(state.progression.identity),
      house: state.house,
      narrative: state.narrative,
    });
  }

  function economySnapshot() {
    return buildEconomySnapshot({
      regionId: state.regions.activeRegion,
      identity: normalizeCharacterIdentity(state.progression.identity),
      house: state.house,
      activeJob: getActiveJobSummary(state.world.jobs),
      narrative: state.narrative,
    });
  }

  function openJobBoard() {
    const choices = getBooneJobChoices();
    if (choices.length === 0) return false;
    const boardCopy = getJobBoardPresentation({ regionId: state.regions.activeRegion });
    jobBoardOpen = true;
    jobBoardSelection = 0;
    shopOpen = false;
    workbenchOpen = false;
    skillScreenOpen = false;
    settingsOpen = false;
    codexOpen = false;
    characterSheetOpen = false;
    logMsg(boardCopy.openLine);
    sfx.npcChat();
    return true;
  }

  function confirmJobBoardChoice() {
    const choices = getBooneJobChoices();
    if (choices.length === 0) {
      jobBoardOpen = false;
      return;
    }
    jobBoardSelection = clamp(jobBoardSelection, 0, choices.length - 1);
    const choiceJob = choices[jobBoardSelection];
    if (!choiceJob) return;
    if (choiceJob.status === "ready" || choiceJob.boardState === "ready" || choiceJob.status === "failed" || choiceJob.boardState === "failed") {
      const paid = claimJobReward(state.world.jobs, choiceJob.id);
      if (paid.ok) {
        if (paid.failed) {
          logMsg(paid.message || `Job closed: ${paid.job.title}. No pay issued.`);
          sfx.npcChat();
          spawnParticles(canvas.width / 2, canvas.height / 2, 10, "#ff8f6d", 2.4, 0.8, { decorative: true });
        } else {
          grantJobReward(paid.reward);
          recordJobCompletionMemory(paid.job);
          const feedback = resolveJobRewardFeedback({
            job: paid.job,
            reward: paid.reward,
            bonusAwarded: paid.bonusAwarded,
            house: state.house,
            inventory: state.inventory,
            jobState: state.world.jobs,
          });
          logMsg(feedback.logLine);
          if (feedback.housePromptLine) logMsg(feedback.housePromptLine);
          showHudNotice(createJobLoopNotice({ job: paid.job, feedback, house: state.house }));
          sfx.questDone();
          spawnParticles(canvas.width / 2, canvas.height / 2, 14, "#ffd36b", 3.4, 1.1, { decorative: true });
        }
        jobBoardOpen = false;
      }
      return;
    }
    if (choiceJob.boardState === "available") {
      const accepted = acceptJob(state.world.jobs, choiceJob.id, { time: state.time, inventory: state.inventory, narrative: state.narrative });
      if (accepted.ok) {
        const condition = [accepted.job.bonusLine, accepted.job.failureLine].filter(Boolean).join(" ");
        logMsg(`Job accepted: ${accepted.job.title}. ${accepted.job.hint} Reward ${accepted.job.rewardLine}.${condition ? ` ${condition}` : ""}`);
        if (accepted.job.goldenPath?.starter) {
          showHudNotice({
            kind: "golden-path",
            title: "First road loop",
            line: `${accepted.job.goldenPath.routeLine} ${accepted.job.goldenPath.rewardUseLine}`,
            color: "#ffd77b",
            ttl: 6.8,
          });
        }
        sfx.shopBuy();
        jobBoardOpen = false;
        const jobStats = ensureRunStats(state.world, state.time);
        if (jobStats.timeToFirstJobAccepted === null) {
          jobStats.timeToFirstJobAccepted = Math.max(0, state.time - (jobStats.startedAt || 0));
        }
      } else {
        logMsg(accepted.message);
      }
      return;
    }
    logMsg(`Marshal Boone: ${choiceJob.title} is still open. ${choiceJob.progressLine}.`);
    jobBoardOpen = false;
  }

  function handleBooneJobBoard() {
    state.world.jobs = normalizeJobBoardState(state.world.jobs);
    return openJobBoard();
  }

  function getWorkbenchActions() {
    return getAvailableCraftingActions({
      inventory: state.inventory,
      progression: state.progression,
      house: state.house,
    });
  }

  function getWorkbenchActionCatalog() {
    return getCraftingActionCatalog({
      inventory: state.inventory,
      progression: state.progression,
      house: state.house,
    });
  }

  function openWorkbench() {
    workbenchOpen = true;
    workbenchSelection = 0;
    shopOpen = false;
    skillScreenOpen = false;
    settingsOpen = false;
    codexOpen = false;
    characterSheetOpen = false;
    jobBoardOpen = false;
    logMsg("Workbench opened.");
  }

  function applyCraftingResult(result) {
    state.inventory = result.inventory;
    state.progression = result.progression;
    state.progression.identity = normalizeCharacterIdentity(state.progression.identity);
    state.progression.equipment = normalizeGearState(state.progression.equipment);
    state.house = {
      ...state.house,
      ...result.house,
      outsideDoor: state.house.outsideDoor,
      outsideSpawn: state.house.outsideSpawn,
      outsideReturn: state.house.outsideReturn,
      interiorDoor: state.house.interiorDoor,
      bed: state.house.bed,
      stash: state.house.stash,
    };
    applyProgressionEffects();
    updateQuestProgressFromInventory();
  }

  function confirmWorkbenchAction() {
    const actions = getWorkbenchActions();
    if (actions.length === 0) {
      logMsg("Workbench: bring 2 Wood + 1 Stone, gear finds, or refine materials.");
      return;
    }
    const action = actions[clamp(workbenchSelection, 0, actions.length - 1)];
    const result = resolveCraftingAction(action.id, {
      inventory: state.inventory,
      progression: state.progression,
      house: state.house,
    });
    if (result.ok) {
      applyCraftingResult(result);
      sfx.pickup();
    }
    logMsg(`Workbench: ${result.message}`);
  }

  function storyReactiveQuip(npcId) {
    const memoryLine = resolveNpcReactiveLine(npcId, state.narrative.npcMemory, {
      factionRep: state.narrative.factionRep,
      npcAffinity: state.narrative.npcAffinity,
      recentQuestOutcome: Object.values(state.narrative.questOutcomes || {}).slice(-1)[0] || null,
      questOutcomes: state.narrative.questOutcomes || {},
      inventory: state.inventory,
      completedJobIds: state.world.jobs?.completedJobIds || [],
    });
    if (memoryLine) return memoryLine;

    const affinity = state.narrative.npcAffinity[npcId] || 0;
    const control = state.narrative.thematicAxes.controlVsFreedom;
    const truth = state.narrative.thematicAxes.truthVsComfort;
    const solidarity = state.narrative.thematicAxes.solidarityVsStatus;

    if (npcId === "elder" && truth > 12) {
      return "Mayor Clem: Publishing truth was brave. Also politically catastrophic. Nice work.";
    }
    if (npcId === "warden" && control > 15) {
      return "Marshal Boone: The streets are calm. The people are less so. That's governance.";
    }
    if (npcId === "smith" && solidarity > 10) {
      return "Professor Cogwheel: Shared tools, shared leverage. Funny how equality scares investors.";
    }
    if (npcId === "merchant" && truth < -8) {
      return "Reverend Quill: Information scarcity remains my most charitable product.";
    }
    if (affinity >= 18) {
      return `${state.npcs.find((npc) => npc.id === npcId)?.name || "NPC"}: You keep your word. That's rarer than ammo.`;
    }
    if (affinity <= -10) {
      return `${state.npcs.find((npc) => npc.id === npcId)?.name || "NPC"}: You talk reform, then negotiate like an accountant with a knife.`;
    }
    // Archetype recognition — NPCs react to recognized player build type
    const archetype = resolvePlayerArchetype(
      state.progression.identity,
      state.player.curses || [],
      state.narrative.factionRep,
    );
    if (archetype && ARCHETYPE_NPC_REACTIONS[archetype.id]) {
      return ARCHETYPE_NPC_REACTIONS[archetype.id];
    }
    // Curse NPC reaction — if player carries a curse, certain NPCs notice
    const curseReaction = resolveCurseNpcReaction(npcId, state.player.curses || []);
    if (curseReaction) return curseReaction.line;
    return null;
  }

  function describeNpcBackground(npcId) {
    const profile = MAJOR_NPCS[npcId];
    if (!profile) return;
    const affinity = state.narrative.npcAffinity[npcId] || 0;
    const stance =
      affinity >= 15 ? "allied" : affinity <= -10 ? "hostile" : "uncertain";
    logMsg(`${profile.name} profile: public "${profile.publicPersona}" | private "${profile.privateTruth}" | relationship ${stance} (${affinity}).`);
  }

  function recordNpcInteraction(npcId) {
    state.narrative.npcMemory = normalizeNpcMemoryState(state.narrative.npcMemory);
    const identity = normalizeCharacterIdentity(state.progression.identity);
    const gearSummary = buildGearSummary(state.progression.equipment, identity);
    return recordNpcMemoryEvent(state.narrative.npcMemory, npcId, {
      type: "greeting",
      at: Math.round(state.time),
      originId: identity.originId,
      regionId: state.regions.activeRegion,
      houseUnlocked: state.house.unlocked,
      gearMilestone: gearSummary.weaponLine,
      recentQuestOutcome: Object.values(state.narrative.questOutcomes || {}).slice(-1)[0] || null,
    });
  }

  function tickNarrativeEvents(dt) {
    state.narrativePulseTimer = Math.max(0, state.narrativePulseTimer - dt);
    if (state.narrativePulseTimer > 0) return;
    state.narrativePulseTimer = 9 + Math.random() * 6;

    const flags = state.narrative.globalFlags;
    if (flags.ledgerPublished && flags.curfewNormalized && !flags.crossroad_civic_backlash) {
      flags.crossroad_civic_backlash = true;
      state.narrative.factionRep.civicCouncil = clamp(state.narrative.factionRep.civicCouncil - 6, -100, 100);
      state.narrative.npcAffinity.elder = clamp((state.narrative.npcAffinity.elder || 0) + 4, -100, 100);
      state.narrative.npcAffinity.warden = clamp((state.narrative.npcAffinity.warden || 0) - 5, -100, 100);
      logMsg("Crossroad event: public transparency collides with curfew control. The council splinters.");
      return;
    }

    if (flags.toolCommonsCreated && flags.curfewNormalized && !flags.crossroad_tools_policed) {
      flags.crossroad_tools_policed = true;
      state.narrative.thematicAxes.controlVsFreedom = clamp(state.narrative.thematicAxes.controlVsFreedom + 7, -100, 100);
      state.narrative.thematicAxes.solidarityVsStatus = clamp(state.narrative.thematicAxes.solidarityVsStatus - 5, -100, 100);
      logMsg("Crossroad event: open tooling is now permit-locked. Innovation survives, autonomy shrinks.");
      return;
    }

    if (state.narrative.decisions.length >= 3 && !state.narrative.globalFlags.midpoint_reflection) {
      state.narrative.globalFlags.midpoint_reflection = true;
      logMsg("Midpoint reflection: your choices changed who holds leverage, not just who likes you.");
    }
  }

  function enterHouse() {
    if (!state.house.unlocked) {
      logMsg("The cottage door is barred. Finish Smith Varo's quest.");
      return;
    }

    state.house.outsideReturn = {
      x: state.player.x,
      y: state.player.y,
      angle: state.player.angle,
    };

    state.player.inHouse = true;
    state.player.blocking = false;
    state.mouseButtons.right = false;
    state.player.x = 9.5;
    state.player.y = 14.2;
    state.player.angle = -Math.PI / 2;
    state.house.visits += 1;
    logMsg("You enter your house. Home sweet questionable home.");
    sfx.doorOpen();
  }

  function exitHouse() {
    const fallback = state.house.outsideSpawn;
    const ret = state.house.outsideReturn || fallback;
    state.player.inHouse = false;
    state.player.x = ret.x;
    state.player.y = ret.y;
    state.player.angle = ret.angle;
    state.player.blocking = false;
    state.mouseButtons.right = false;
    logMsg("You step back into the valley. Nature awaits... and so do the slimes.");
    sfx.doorOpen();
  }

  function enterRegionInterior(interiorId) {
    const interior = REGION_INTERIORS[interiorId];
    if (!interior || !regionInteriorMaps[interiorId]) return;
    state.regionInteriorReturn = {
      x: state.player.x,
      y: state.player.y,
      angle: state.player.angle,
    };
    state.player.regionInterior = interiorId;
    state.player.inHouse = false;
    state.player.blocking = false;
    state.mouseButtons.right = false;
    state.player.x = interior.spawn.x;
    state.player.y = interior.spawn.y;
    state.player.angle = interior.spawn.angle;
    logMsg(interior.entryLog);
    sfx.doorOpen();

    ensureInteriorVisitState(state.regions);
    if (!hasVisitedInterior(state.regions, interiorId)) {
      markInteriorVisited(state.regions, interiorId);
      logMsg(interior.firstVisitLore);
      const loot = interior.firstVisitLoot || {};
      if (Number.isFinite(loot.gold) && loot.gold > 0) {
        state.player.gold += loot.gold;
        logMsg(`You pocket ${loot.gold} gold from the dust.`);
      }
      if (loot.items) {
        for (const [item, qty] of Object.entries(loot.items)) {
          if (!Number.isFinite(qty) || qty <= 0) continue;
          state.inventory[item] = (state.inventory[item] || 0) + qty;
          logMsg(`You recover ${qty}× ${item}.`);
        }
      }
    }
  }

  function exitRegionInterior() {
    const ret = state.regionInteriorReturn || { x: REGION_INTERIOR_ENTRANCE.x, y: REGION_INTERIOR_ENTRANCE.y + 1, angle: -Math.PI / 2 };
    state.player.regionInterior = null;
    state.player.inHouse = false;
    state.player.x = ret.x;
    state.player.y = ret.y;
    state.player.angle = Number.isFinite(ret.angle) ? ret.angle : -Math.PI / 2;
    state.player.blocking = false;
    state.mouseButtons.right = false;
    logMsg("You return to the open road.");
    sfx.doorOpen();
  }

  function interact() {
    if (state.mode !== "playing") return;

    const roadSignPrompt = getRoadSignPrompt();
    if (roadSignPrompt) {
      logMsg(roadSignPrompt.line);
      if (roadSignPrompt.mysteryLine) logMsg(roadSignPrompt.mysteryLine);
      const pinnedRoute = createRoadRouteFromSignPrompt(roadSignPrompt, {
        regionId: state.regions.activeRegion,
        time: state.time,
      });
      if (pinnedRoute) {
        state.world.roadRoute = pinnedRoute;
        const routeDistance = pinnedRoute.distanceLine ? ` ${pinnedRoute.distanceLine}.` : "";
        logMsg(`Pinned road route: ${pinnedRoute.targetLabel}.${routeDistance}`);
      }
      sfx.pickup();
      return;
    }

    // POI interaction (caches / shrines / camps / road discoveries).
    if (!state.player.inHouse && state.regions?.activeRegion) {
      ensurePoiDefaults(state.regions);
      const poi = poiUnderInteraction(state.regions, state.regions.activeRegion, state.player.x, state.player.y);
      if (poi) {
        const completesPinnedRoadRoute = state.world?.roadRoute?.targetId === poi.id;
        const newlyDiscovered = markPOIDiscovered(state.regions, poi.id);
        const kind = POI_KINDS[poi.kind] || POI_KINDS.cache;
        let summary = `Discovered ${poi.label} (${kind.label})`;
        const discoveryReward = { gold: 0, items: {}, hp: 0, stamina: 0 };
        let renownReward = null;
        let codexUnlock = null;
        let routeReward = null;
        if (newlyDiscovered) {
          recordNpcMemoryEvent(state.narrative.npcMemory, "elder", {
            type: "poi_discovered",
            poiId: poi.id,
            poiLabel: poi.label,
            regionId: state.regions.activeRegion,
            at: state.time,
          });
          renownReward = resolveExplorationRenownReward(state.regions.poisDiscovered.length);
          if (renownReward) {
            grantXp(renownReward.xp);
            state.player.gold += renownReward.gold;
            state.progression.upgradePoints += renownReward.upgradePoints;
            summary += `. ${renownReward.summary}`;
          }
          if (poi.mysteryLine) summary += `. ${poi.mysteryLine}`;
          if (poi.returnReason) summary += `. ${poi.returnReason}`;
        }
        codexUnlock = resolveCodexUnlockForPOI(poi);
        if (codexUnlock && unlockCodexAndPing(codexUnlock.tab, codexUnlock.id)) {
          summary += `. Letter unlocked: ${codexUnlock.title}`;
        } else {
          codexUnlock = null;
        }
        // Unlock any handcrafted letters tied to this POI id
        for (const letter of getLetterByPoiId(poi.id || "")) {
          if (unlockCodexAndPing("letters", letter.id)) {
            logMsg(`${letter.title} — added to codex.`);
          }
        }
        if (poi.loot?.gold) {
          state.player.gold += poi.loot.gold;
          discoveryReward.gold += poi.loot.gold;
          summary += `. +${poi.loot.gold}g`;
        }
        if (poi.loot?.items) {
          for (const [name, count] of Object.entries(poi.loot.items)) {
            state.inventory[name] = (state.inventory[name] || 0) + count;
            discoveryReward.items[name] = (discoveryReward.items[name] || 0) + count;
          }
          const itemList = Object.entries(poi.loot.items).map(([k, v]) => `${v} ${k}`).join(", ");
          summary += `. ${itemList}`;
        }
        if (poi.buff?.hp) {
          state.player.hp = Math.min(state.player.maxHp, state.player.hp + poi.buff.hp);
          discoveryReward.hp += poi.buff.hp;
          summary += `. +${poi.buff.hp} HP`;
        }
        if (poi.buff?.stamina) {
          state.player.stamina = Math.min(state.player.maxStamina, state.player.stamina + poi.buff.stamina);
          discoveryReward.stamina += poi.buff.stamina;
          summary += `. +${poi.buff.stamina} stamina`;
        }
        if (completesPinnedRoadRoute) {
          routeReward = resolveRoadRouteCompletionReward(state.world.roadRoute);
          if (routeReward) {
            state.player.gold += routeReward.gold;
            grantXp(routeReward.xp);
            summary += `. ${routeReward.summary}`;
          }
          state.world.roadRoute = null;
        }
        logMsg(summary + ".");
        showDiscoveryBanner(resolveDiscoveryRewardFeedback({
          poi,
          reward: discoveryReward,
          codexUnlock,
          renownReward,
          routeReward,
        }));
        if (poi.rollLoot !== false) {
          grantRolledLoot(poi.kind === "camp" || poi.kind === "hideout" ? "poi_camp" : "poi_cache", state.regions.activeRegion);
        }
        sfx.pickup();
        spawnParticles(canvas.width / 2, canvas.height * 0.5, 12, kind.color, 3, 0.6, { decorative: false });
        return;
      }
    }

    if (state.player.regionInterior) {
      const interior = REGION_INTERIORS[state.player.regionInterior];
      if (interior && dist(state.player, interior.exit) < 1.7) {
        exitRegionInterior();
        return;
      }
      logMsg("Quiet down here. Find the door to leave.");
      return;
    }

    if (state.player.inHouse) {
      if (dist(state.player, state.house.interiorDoor) < 1.7) {
        exitHouse();
        return;
      }

      if (dist(state.player, state.house.bed) < 1.7) {
        state.player.hp = state.player.maxHp;
        state.player.stamina = state.player.maxStamina;
        state.player.hurtCooldown = 0;
        logMsg(choice(["You rest and recover fully. Ah, the sweet embrace of a mediocre mattress.", "Full health restored! The bed was slightly lumpy but did the job.", "You nap like a champion. All HP restored."]));
        sfx.potionUse();
        return;
      }

      if (dist(state.player, state.house.stash) < 1.7) {
        openWorkbench();
        return;
      }

      const trophy = resolveHouseTrophyInspection({
        player: state.player,
        inventory: state.inventory,
        jobState: state.world.jobs,
        house: state.house,
      });
      if (trophy) {
        logMsg(trophy.message);
        sfx.npcChat();
        return;
      }

      logMsg("You are home. Rest, craft, or head back out.");
      return;
    }

    if (dist(state.player, state.house.outsideDoor) < 1.8) {
      enterHouse();
      return;
    }

    {
      const regionInterior = getRegionInteriorByRegion(state.regions.activeRegion);
      if (regionInterior && dist(state.player, REGION_INTERIOR_ENTRANCE) < 1.8) {
        enterRegionInterior(regionInterior.id);
        return;
      }
    }

    const boardProp = getActiveJobBoardProp();
    if (boardProp && dist(state.player, boardProp) < 1.85) {
      openJobBoard();
      return;
    }

    const jobMarker = getJobRouteMarker();
    if (jobMarker?.action === "pickup" && dist(state.player, jobMarker) < 1.55) {
      const pickedUp = recordPickupForJobs(jobMarker.targetId);
      if (pickedUp.ok) {
        sfx.pickup();
        spawnParticles(canvas.width / 2, canvas.height * 0.5, 12, jobMarker.color || "#9bd3ff", 3, 0.6, { decorative: false });
        return;
      }
    }

    if (jobMarker?.action === "checkpoint" && dist(state.player, jobMarker) < 1.6) {
      const checked = recordCheckpointForJobs(jobMarker.targetId);
      if (checked.ok) {
        sfx.pickup();
        spawnParticles(canvas.width / 2, canvas.height * 0.5, 10, jobMarker.color || "#8fd0ff", 2.6, 0.55, { decorative: false });
        return;
      }
    }

    if (jobMarker?.action === "dropoff" && dist(state.player, jobMarker) < 1.6) {
      const dropped = recordDropoffForJobs(jobMarker.targetId);
      if (dropped.ok) {
        sfx.questDone();
        spawnParticles(canvas.width / 2, canvas.height * 0.5, 12, jobMarker.color || "#ffcf7a", 3, 0.7, { decorative: false });
        return;
      }
    }

    if (["rescue", "safe_return", "escort_start", "escort_finish"].includes(jobMarker?.action) && dist(state.player, jobMarker) < 1.65) {
      const routed = recordRouteActionForJobs(jobMarker.action, jobMarker.targetId);
      if (routed.ok) {
        if (routed.completed) sfx.questDone();
        else sfx.pickup();
        spawnParticles(canvas.width / 2, canvas.height * 0.5, routed.completed ? 14 : 10, jobMarker.color || "#9bd3ff", routed.completed ? 3.2 : 2.6, 0.7, { decorative: false });
        return;
      }
    }

    const pig = nearestEntity(state.pigs, () => true, 1.7);
    if (pig) {
      if (Math.random() < 0.2) {
        state.player.gold += 1;
        logMsg(`${pig.name} (${pig.role}) tips you one coin for "frontier services." +1 gold.`);
      } else {
        logMsg(choice([
          `${pig.name} (${pig.role}): OINK, partner.`,
          `${pig.name} adjusts its tiny hat and snorts with authority.`,
          `You pet ${pig.name}. The pig accepts your alliance.`,
        ]));
      }
      return;
    }

    const npc = nearestEntity(state.npcs, () => true, 1.95);
    if (npc) {
      recordNpcInteraction(npc.id);
      const delivered = recordDeliveryForJobs(npc.id);
      if (delivered.ok) {
        sfx.questDone();
        return;
      }
      if (npc.id === "elder") {
        if (turnInQuestWithOutcome("ashfall_intro", {
          afterTurnIn() {
            if (state.quests.ashfall_boss?.status === "locked") {
              state.quests.ashfall_boss.status = "active";
              logMsg("Ashfall escalation: hunt the Sump Tyrant mini-boss.");
            }
          },
        })) return;
        if (turnInQuestWithOutcome("ashfall_boss")) return;
        if (turnInQuestWithOutcome("lantern_probe", {
          afterTurnIn() {
            if (state.quests.lantern_revolt?.status === "locked") {
              state.quests.lantern_revolt.status = "active";
              logMsg("Iron Lantern escalation: pressure the district valves.");
            }
          },
        })) return;
        if (turnInQuestWithOutcome("lantern_revolt")) return;
        const q = state.quests.crystal;
        const archiveQuest = state.quests.archive;
        if (archiveQuest && archiveQuest.status === "complete") {
          archiveQuest.status = "turned_in";
          grantXp(archiveQuest.reward.xp);
          state.player.gold += archiveQuest.reward.gold;
          const truthBias = state.narrative.thematicAxes.truthVsComfort;
          if (truthBias >= 0) {
            state.narrative.factionRep.workersGuild = clamp(state.narrative.factionRep.workersGuild + 8, -100, 100);
            state.narrative.factionRep.marketCartel = clamp(state.narrative.factionRep.marketCartel - 6, -100, 100);
          } else {
            state.narrative.factionRep.civicCouncil = clamp(state.narrative.factionRep.civicCouncil + 6, -100, 100);
          }
          state.narrative.ending = resolveNarrativeEnding(state.narrative, state.companion);
          logMsg(`Quest done: ${archiveQuest.title}. +${archiveQuest.reward.xp} XP, +${archiveQuest.reward.gold} gold.`);
          logMsg(`Ending trajectory: ${state.narrative.ending.title} - ${state.narrative.ending.summary}`);
          sfx.questDone();
          openQuestOutcomeChoice("archive");
          return;
        }
        if (q.status === "locked") {
          q.status = "active";
          q.progress = 0;
          logMsg("Mayor Clem: Bring me 4 Crystal Shards to map this frontier. I'd ride out myself, but my knees retired.");
          sfx.npcChat();
          return;
        }
        if (q.status === "active") {
          logMsg(`Mayor Clem: Crystal Shards ${q.progress}/${q.need}. I'm counting. Very slowly.`);
          sfx.npcChat();
          return;
        }
        if (q.status === "complete") {
          q.status = "turned_in";
          state.inventory["Crystal Shard"] = Math.max(0, state.inventory["Crystal Shard"] - q.need);
          grantXp(q.reward.xp);
          state.player.gold += q.reward.gold;
          logMsg(`Quest done: ${q.title}. +${q.reward.xp} XP, +${q.reward.gold} gold. Mayor Clem nods approvingly.`);
          sfx.questDone();
          spawnParticles(canvas.width / 2, canvas.height / 2, 15, "#8fd0ff", 3, 1.2, { decorative: true });
          if (state.quests.slime.status === "locked") {
            state.quests.slime.status = "active";
            logMsg("Mayor Clem: Marshal Boone needs the marsh cleared.");
          }
          if (!openQuestOutcomeChoice("crystal")) {
            const decision = applyMajorDecision(state.narrative, "elder");
            if (decision) {
              logMsg(decision.immediateLog);
              logMsg(createDecisionRecap(state.narrative));
              syncCombatProfileState({ announce: true });
            }
          }
          return;
        }
        if (openDialogueChoiceFor("elder", npc.name)) { sfx.npcChat(); return; }
        logMsg(storyReactiveQuip("elder") || choice(npcDialogue.elder.idle));
        if (Math.random() < 0.35) describeNpcBackground("elder");
        sfx.npcChat();
        return;
      }

      if (npc.id === "warden") {
        const q = state.quests.slime;
        if (q.status === "locked") {
          if (state.quests.crystal.status !== "turned_in") {
            logMsg("Marshal Boone: Earn the Elder's trust first.");
            return;
          }
          q.status = "active";
          q.progress = 0;
          logMsg("Marshal Boone: Clear 3 slimes near the marsh. Frontier law says no jiggly bandits after sundown.");
          sfx.npcChat();
          return;
        }
        if (q.status === "active") {
          logMsg(`Marshal Boone: Slimes defeated ${q.progress}/${q.need}. They're not happy about it.`);
          sfx.npcChat();
          return;
        }
        if (q.status === "complete") {
          q.status = "turned_in";
          grantXp(q.reward.xp);
          state.player.gold += q.reward.gold;
          state.inventory.Potion += q.reward.potion;
          logMsg(`Quest done: ${q.title}. +${q.reward.xp} XP, +${q.reward.gold} gold, +1 Potion. The marsh smells slightly better.`);
          sfx.questDone();
          spawnParticles(canvas.width / 2, canvas.height / 2, 15, "#6be873", 3, 1.2, { decorative: true });
          if (state.quests.wood.status === "locked") {
            state.quests.wood.status = "active";
            logMsg("Marshal Boone: Smith Varo can now build your house.");
          }
          const decision = applyMajorDecision(state.narrative, "warden");
          if (decision) {
            logMsg(decision.immediateLog);
            logMsg(createDecisionRecap(state.narrative));
            syncCombatProfileState({ announce: true });
          }
          return;
        }
        if (handleBooneJobBoard()) return;
        if (openDialogueChoiceFor("warden", npc.name)) { sfx.npcChat(); return; }
        logMsg(storyReactiveQuip("warden") || choice(npcDialogue.warden.idle));
        if (Math.random() < 0.35) describeNpcBackground("warden");
        sfx.npcChat();
        return;
      }

      if (npc.id === "smith") {
        const q = state.quests.wood;
        if (q.status === "locked") {
          if (state.quests.slime.status !== "turned_in") {
            logMsg("Smith Varo: Help Marshal Boone first.");
            return;
          }
          q.status = "active";
          q.progress = 0;
          state.house.built = true;
          logMsg("Smith Varo: Bring 6 Wood and 4 Stone. We'll raise your ranch shack by sunset. No refunds.");
          sfx.npcChat();
          return;
        }
        if (q.status === "active") {
          const woodPart = Math.min(q.needWood, state.inventory.Wood);
          const stonePart = Math.min(q.needStone, state.inventory.Stone);
          logMsg(`Smith Varo: Wood ${woodPart}/${q.needWood}, Stone ${stonePart}/${q.needStone}.`);
          return;
        }
        if (q.status === "complete") {
          q.status = "turned_in";
          state.inventory.Wood = Math.max(0, state.inventory.Wood - q.needWood);
          state.inventory.Stone = Math.max(0, state.inventory.Stone - q.needStone);
          grantXp(q.reward.xp);
          state.player.gold += q.reward.gold;
          state.house.unlocked = true;
          state.player.maxHp += 10;
          state.player.hp = Math.min(state.player.maxHp, state.player.hp + 24);
          logMsg(`Quest done: ${q.title}. You now own the house! It even has a roof. Probably.`);
          sfx.questDone();
          emitCompanionBark("house_unlock");
          spawnParticles(canvas.width / 2, canvas.height / 2, 25, "#d8bc6a", 4, 1.5, { decorative: true });
          if (!openQuestOutcomeChoice("wood")) {
            const decision = applyMajorDecision(state.narrative, "smith");
            if (decision) {
              logMsg(decision.immediateLog);
              logMsg(createDecisionRecap(state.narrative));
              syncCombatProfileState({ announce: true });
            }
          }
          if (state.quests.archive && state.quests.archive.status === "locked") {
            state.quests.archive.status = "active";
            logMsg("Professor Cogwheel: One final job. Bring me the Redacted Archive from the north watchtower.");
          }
          return;
        }
        if (openDialogueChoiceFor("smith", npc.name)) { sfx.npcChat(); return; }
        logMsg(storyReactiveQuip("smith") || choice(npcDialogue.smith.idle));
        const smithProfile = vendorServiceProfile("smith");
        logMsg(smithProfile.priceNote);
        if (smithProfile.outcomeReactionLine) logMsg(smithProfile.outcomeReactionLine);
        if (Math.random() < 0.35) describeNpcBackground("smith");
        sfx.npcChat();
        return;
      }

      if (npc.id === "merchant") {
        if (!shopOpen && openDialogueChoiceFor("merchant", npc.name)) { sfx.npcChat(); return; }
        shopOpen = !shopOpen;
        shopSelection = 0;
        if (shopOpen) jobBoardOpen = false;
        if (shopOpen) {
          sfx.npcChat();
          logMsg(storyReactiveQuip("merchant") || choice(npcDialogue.merchant.idle));
          const merchantProfile = vendorServiceProfile("merchant");
          logMsg(merchantProfile.serviceLine);
          if (merchantProfile.outcomeReactionLine) logMsg(merchantProfile.outcomeReactionLine);
          if (Math.random() < 0.35) describeNpcBackground("merchant");
        } else {
          logMsg("Reverend Quill: Come back when you have more gold... or desperation.");
        }
        return;
      }

      if (npc.id === "innkeeper") {
        if (state.player.hp < state.player.maxHp && state.player.gold >= 8) {
          state.player.gold -= 8;
          state.player.hp = Math.min(state.player.maxHp, state.player.hp + 28);
          sfx.potionUse();
          logMsg("Nora Knuckles patched your wounds for 8 gold. 'You owe me a tip.'");
        } else if (state.player.hp >= state.player.maxHp) {
          if (openDialogueChoiceFor("innkeeper", "Nora Knuckles")) { sfx.npcChat(); return; }
          logMsg(storyReactiveQuip("innkeeper") || choice(npcDialogue.innkeeper.idle));
          if (Math.random() < 0.35) describeNpcBackground("innkeeper");
          sfx.npcChat();
        } else {
          logMsg("Nora Knuckles: 8 gold for healing. I don't do charity... or quality.");
          sfx.npcChat();
        }
        return;
      }

      if (npc.id === "bard") {
        sfx.npcChat();
        logMsg(choice(npcDialogue.bard.idle));
        if (state.quests.archive && state.quests.archive.status === "active") {
          logMsg("Bard Jingles: The watchtower in Glass Gulch hums with redacted ledgers. Bring all four pages.");
        }
        if (Math.random() < 0.3) {
          grantXp(3);
          logMsg("The song was oddly inspiring. +3 XP.");
        }
        return;
      }

      if (npc.id === "cat") {
        sfx.npcChat();
        logMsg(choice(npcDialogue.cat.idle));
        if (Math.random() < 0.15) {
          state.inventory.Potion += 1;
          logMsg("Whiskers coughed up... a potion? +1 Potion. Gross.");
          sfx.pickup();
        }
        return;
      }
    }

    const resource = nearestEntity(state.resources, (r) => !r.harvested, 1.6);
    if (resource) {
      resource.harvested = true;
      if (resource.type === "crystal") {
        resource.respawn = 26;
        state.inventory["Crystal Shard"] += 1;
        grantXp(6);
        recordCollectionForJobs(resource.type, "Crystal Shard", "Crystal Shard");
        logMsg(choice(["Collected Crystal Shard. Ooh, shiny!", "Crystal Shard acquired. It's warm to the touch.", "Got a Crystal Shard! The Elder will be thrilled."]));
        sfx.pickup();
      } else if (resource.type === "tree") {
        resource.respawn = 20;
        state.inventory.Wood += 1;
        grantXp(4);
        recordCollectionForJobs(resource.type, "Wood", "Wood");
        logMsg(choice(["Collected Wood. Timber!", "Wood acquired. Bob the Builder approves.", "Got Wood! ...phrasing."]));
        sfx.pickup();
      } else if (resource.type === "archive-node") {
        const archiveQuest = state.quests.archive;
        if (!archiveQuest || archiveQuest.status === "locked") {
          resource.harvested = false;
          logMsg("Encrypted watchtower node: locked behind Professor Cogwheel's final brief.");
          return;
        }
        resource.respawn = 45;
        archiveQuest.progress = Math.min(archiveQuest.need, archiveQuest.progress + 1);
        grantXp(12);
        logMsg(choice([
          "Recovered a redacted archive page. Truth gets heavier.",
          "Archive fragment decrypted. The supply chain suddenly looks like a power map.",
          "Watchtower node cracked. Somebody profits every time fear spikes.",
        ]));
        if (archiveQuest.progress >= archiveQuest.need && archiveQuest.status === "active") {
          archiveQuest.status = "complete";
          logMsg("Archive objective complete. Bring findings back to the town circle.");
        }
        sfx.pickup();
      } else if (REGION_RESOURCE_MAP[resource.type]) {
        const def = REGION_RESOURCE_MAP[resource.type];
        if (state.regions.activeRegion !== def.region) {
          resource.harvested = false;
          logMsg(`${def.label} can only be harvested while in ${REGIONS[def.region]?.name || def.region}.`);
          return;
        }
        resource.respawn = def.respawn;
        state.inventory[def.item] = (state.inventory[def.item] || 0) + 1;
        grantXp(def.xp);
        recordCollectionForJobs(resource.type, def.item, def.label);
        if (state.quests.ashfall_intro && state.quests.ashfall_intro.status === "active" && resource.type === "ashglass") {
          const q = state.quests.ashfall_intro;
          q.progress = Math.min(q.need, q.progress + 1);
          if (q.progress >= q.need) {
            q.status = "complete";
            logMsg("Ashfall salvage objective complete. Bring it to the town circle.");
          }
        }
        if (state.quests.lantern_probe && state.quests.lantern_probe.status === "active" && (resource.type === "cipher-lens" || resource.type === "lantern-filament")) {
          const q = state.quests.lantern_probe;
          q.progress = Math.min(q.need, q.progress + 1);
          if (q.progress >= q.need) {
            q.status = "complete";
            logMsg("Lantern signal objective complete. Bring it to the town circle.");
          }
        }
        if (state.quests.lantern_revolt && state.quests.lantern_revolt.status === "active" && resource.type === "pressurized-ink") {
          const q = state.quests.lantern_revolt;
          q.progress = Math.min(q.need, q.progress + 1);
          if (q.progress >= q.need) {
            q.status = "complete";
            logMsg("District pressure objective complete. Bring it to the town circle.");
          }
        }
        logMsg(`Harvested ${def.label}.`);
        if (Math.random() < 0.35) {
          grantRolledLoot("resource_find", def.region);
        }
        sfx.pickup();
      } else {
        resource.respawn = 22;
        state.inventory.Stone += 1;
        grantXp(4);
        recordCollectionForJobs(resource.type, "Stone", "Stone");
        logMsg(choice(["Collected Stone. Rock solid choice.", "Stone acquired. This one has personality.", "Got Stone! It's not just any rock. It's YOUR rock."]));
        sfx.pickup();
      }
      recordResourceHarvest(state.world);
      updateQuestProgressFromInventory();
      return;
    }

    if (!state.chest.opened && dist(state.player, state.chest) < 1.75) {
      state.chest.opened = true;
      state.chest.respawn = 38;
      sfx.pickup();
      spawnParticles(canvas.width / 2, canvas.height * 0.4, 12, "#d8bc6a", 3, 1, { decorative: true });
      const openingReward = resolveFirstMinuteCacheReward({
        regionId: state.regions.activeRegion,
        opened: false,
        claimed: state.chest.firstRewardClaimed,
      });
      if (openingReward.ok) {
        state.chest.firstRewardClaimed = true;
        grantOpeningCacheReward(openingReward);
        return;
      }
      const loot = choice(["Potion", "Gold", "Gold", "Stone", "Crystal"]);
      if (loot === "Potion") {
        state.inventory.Potion += 1;
        state.chest.lastReward = "+1 Potion";
        logMsg("Supply cache: found 1 Potion! Someone left this here. Score!");
      } else if (loot === "Stone") {
        state.inventory.Stone += 1;
        state.chest.lastReward = "+1 Stone";
        logMsg("Supply cache: found 1 Stone. Not gold, but we'll take it.");
      } else if (loot === "Crystal") {
        state.inventory["Crystal Shard"] += 1;
        state.chest.lastReward = "+1 Crystal Shard";
        logMsg("Supply cache: found 1 Crystal Shard! Jackpot!");
      } else {
        const coins = 10 + Math.floor(Math.random() * 14);
        state.player.gold += coins;
        state.chest.lastReward = `+${coins}g`;
        logMsg(`Supply cache: found ${coins} gold. Ka-ching!`);
      }
      updateQuestProgressFromInventory();
      return;
    }

    logMsg(choice(["Nothing useful here. Keep looking!", "You interact with the air. It's not impressed.", "Nothing to do here. The void stares back."]));
  }

  function attack() {
    if (state.mode !== "playing") return;
    if (!canAttack(state.player)) {
      if (state.player.stamina < 8) logMsg("Too exhausted to swing.");
      return;
    }

    const stance = getStanceModifiers();
    const combos = BASE_COMBOS;
    state.player.comboStep = resolveNextComboStep(state.player.comboStep, state.player.comboWindow);

    const affixMods = buildAffixModifiers(state.progression.equipment?.affixes);
    const swingBase = applySwingLoadout(combos[state.player.comboStep - 1], state.player.combatProfile, {
      weatherKind: state.weather.kind,
      solidarityVsStatus: state.narrative.thematicAxes.solidarityVsStatus,
      affixMods,
    });
    const progressionMods = state.player.progressionMods || buildProgressionModifiers(state.progression);
    const swingGeometry = applyMovesetGeometry(swingBase, state.progression.equipment?.weaponTier || "Common");
    const swing = {
      ...swingGeometry,
      damage: Math.max(1, Math.round(swingGeometry.damage * (progressionMods.weaponDamageMult || 1))),
      stamina: Math.max(1, Math.round(swingGeometry.stamina * (progressionMods.weaponStaminaMult || 1))),
      reach: swingGeometry.reach * (progressionMods.weaponReachMult || 1),
      staggerBonus: (swingGeometry.staggerBonus || 0) + (progressionMods.weaponStaggerBonus || 0),
    };
    state.player.attackCooldown = swing.cooldown * stance.cooldownMult;
    state.player.comboWindow = 0.55;
    state.player.swingDuration = swing.duration;
    state.player.swingTimer = swing.duration;
    state.player.blocking = false;
    state.mouseButtons.right = false;
    state.player.stamina = Math.max(0, state.player.stamina - swing.stamina * stance.staminaMult);
    state.player.cameraKick = clamp(state.player.cameraKick + 0.14 + state.player.comboStep * 0.04, 0, 0.7);
    sfx.swordSwing();

    if (!state.player.inHouse) {
      moveWithCollision(Math.cos(state.player.angle) * swing.lunge, Math.sin(state.player.angle) * swing.lunge);
    }

    if (state.player.inHouse) {
      logMsg("Your blade whistles through the room. The furniture is unimpressed.");
      return;
    }

    // Optimize enemy targeting by using squared distances to avoid sqrt
    const targets = state.enemies.filter(e => e.alive);
    const px = state.player.x;
    const py = state.player.y;
    targets.sort((a, b) => {
      const daSq = (a.x - px) * (a.x - px) + (a.y - py) * (a.y - py);
      const dbSq = (b.x - px) * (b.x - px) + (b.y - py) * (b.y - py);
      return daSq - dbSq;
    });

    const maxTargets = state.narrative.globalFlags.toolCommonsCreated ? 3 : 2;
    let hitCount = 0;
    let maxDamage = 0;
    let killedAny = false;
    let interruptedAny = false;
    for (const enemy of targets) {
      if (hitCount >= maxTargets) break;
      const dx = enemy.x - state.player.x;
      const dy = enemy.y - state.player.y;
      const d = Math.hypot(dx, dy);
      if (d > swing.reach) continue;

      const angleToEnemy = Math.atan2(dy, dx);
      const facingDiff = Math.abs(normalizeAngle(angleToEnemy - state.player.angle));
      if (facingDiff > swing.arc) continue;

      if ((enemy.invulnTimer || 0) > 0) {
        enemy.attackCooldown = Math.max(enemy.attackCooldown || 0, 0.25);
        enemy.flashTimer = 0.1;
        hitCount += 1;
        state.floatingTexts.push({ wx: enemy.x, wy: enemy.y, text: "IMMUNE", life: 0.55, maxLife: 0.55, color: "#ffc490" });
        logMsg(`${enemy.label || "Enemy"} shrugs off the strike during the phase shift.`);
        continue;
      }

      const damage = Math.floor((swing.damage * stance.damageMult))
        + Math.floor(state.player.level * 1.8)
        + Math.floor(Math.random() * 4) - 1;
      maxDamage = Math.max(maxDamage, damage);
      enemy.hp -= damage;
      enemy.attackCooldown += 0.45;
      enemy.stagger = 0.2 + state.player.comboStep * 0.05 + (swing.staggerBonus || 0);
      enemy.flashTimer = 0.1;
      const phased = transitionMiniBossPhaseIfNeeded(enemy);

      // Hit interrupts a heavy windup → big stagger reward.
      let interruptedHit = false;
      if ((enemy.windupTimer || 0) > 0) {
        enemy.windupTimer = 0;
        enemy.windupConsumed = false;
        enemy.stagger = Math.max(enemy.stagger, 0.95);
        interruptedHit = true;
        interruptedAny = true;
        state.floatingTexts.push({ wx: enemy.x, wy: enemy.y, text: "INTERRUPT", life: 0.7, maxLife: 0.7, color: "#ffe16a" });
      }

      if (state.combat?.statusEffectsEnabled) {
        const tier = state.progression.equipment?.weaponTier || "Common";
        // Bleed on charged/finisher attacks (comboStep 3 marks charged or third hit).
        if (state.player.comboStep === 3) {
          applyStatus(enemy, "bleed", { magnitude: 1, sourceTier: tier });
        }
        // Burn while flare reveal active (player just popped a flare).
        if ((state.player.flareRevealTimer || 0) > 0) {
          applyStatus(enemy, "burn", { magnitude: 1, sourceTier: tier });
        }
        // Shock with chain on Relic-tier hits, low chance to keep it special.
        if (tier === "Relic" && Math.random() < 0.18) {
          applyStatus(enemy, "shock", { magnitude: 1, sourceTier: tier });
        }
        // Frost when tonic HoT is active and the swing was a heavy/charged step.
        if ((state.player.tonicTimer || 0) > 0 && state.player.comboStep >= 2) {
          applyStatus(enemy, "frost", { magnitude: 1, sourceTier: tier });
        }
        // Affix-driven on-hit statuses.
        for (const entry of affixMods.statusOnHit) {
          applyStatus(enemy, entry.kind, { magnitude: entry.magnitude, sourceTier: tier });
        }
        // Status synergies — check for combo triggers after applying all effects.
        const synergies = checkStatusSynergies(enemy);
        for (const syn of synergies) {
          if (syn.type === "ice_burst") {
            const burstDmg = syn.burst;
            enemy.hp = Math.max(0, (enemy.hp || 1) - burstDmg);
            spawnParticles(canvas.width / 2, canvas.height * 0.45, 14, "#b0e8ff", 4.5, 0.55, { decorative: false });
            state.floatingTexts.push({ wx: enemy.x, wy: enemy.y, text: `ICE BURST −${burstDmg}`, life: 0.8, maxLife: 0.8, color: "#b0e8ff" });
            logMsg("Burn + Frost — ice burst!");
          } else if (syn.type === "bleed_chain") {
            // Spread shock to the nearest other alive enemy
            const nearest = state.enemies.find((e) => e !== enemy && e.alive);
            if (nearest) {
              applyStatus(nearest, "shock", { magnitude: 1, sourceTier: tier });
              state.floatingTexts.push({ wx: nearest.x, wy: nearest.y, text: "CHAIN SHOCK", life: 0.7, maxLife: 0.7, color: "#ffe16a" });
            }
          }
        }
      }
      // Affix lifesteal — heals a percentage of dealt damage, capped at maxHp.
      if (affixMods.lifestealPct > 0 && damage > 0) {
        const heal = Math.max(1, Math.floor(damage * affixMods.lifestealPct));
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + heal);
      }

      const nx = dx / (d + 1e-6);
      const ny = dy / (d + 1e-6);
      const pushX = enemy.x + nx * swing.knock;
      const pushY = enemy.y + ny * swing.knock;
      if (!isBlocking(pushX, enemy.y)) enemy.x = pushX;
      if (!isBlocking(enemy.x, pushY)) enemy.y = pushY;

      hitCount += 1;
      const isKill = !phased && enemy.hp <= 0;
      if (isKill) killedAny = true;
      const hitFeedback = resolveHitFeedback({
        hitCount: 1,
        comboStep: state.player.comboStep,
        maxDamage: damage,
        killed: isKill,
        interrupted: interruptedHit,
      });
      state.floatingTexts.push({ wx: enemy.x, wy: enemy.y, text: isKill ? "SLAIN" : `-${damage}`, life: hitFeedback.floatingTextLife, maxLife: hitFeedback.floatingTextLife, color: isKill ? "#ff5555" : damage >= 24 ? "#ff9f3a" : "#ffe84e" });
      if (!isKill) {
        if (interruptedHit || enemy.stagger >= 0.75) {
          state.floatingTexts.push({ wx: enemy.x, wy: enemy.y, text: "STAGGER", life: 0.62, maxLife: 0.62, color: "#ffe16a" });
          showCombatReadabilityNotice({
            kind: "stagger",
            title: "Enemy staggered",
            line: `${enemy.label || "Enemy"} is open. Press the attack while it recovers.`,
            state: "stagger",
            ttl: 2.4,
          });
          recordCombatEvent(combatSubtitles, "stagger");
          playCombatCue("stagger");
        } else {
          recordCombatEvent(combatSubtitles, damage >= 24 ? "crit" : "hit");
          if (damage >= 24) playCombatCue("crit");
        }
      }

      const eDx = enemy.x - state.player.x;
      const eDy = enemy.y - state.player.y;
      const eAng = normalizeAngle(Math.atan2(eDy, eDx) - state.player.angle);
      const eSx = clamp(((eAng + FOV / 2) / FOV) * canvas.width, 0, canvas.width);
      const eSy = canvas.height * 0.42;
      spawnParticles(eSx, eSy, hitFeedback.particleBurst, enemy.color || "#6be873", 2.9, 0.48);

      if (isKill) {
        enemy.alive = false;
        const killStats = recordRunKill(state.world, enemy);
        if (killStats.kills === 1 && killStats.timeToFirstKill === null) {
          killStats.timeToFirstKill = Math.max(0, state.time - (killStats.startedAt || 0));
        }
        recordKillForJobs(enemy);
        unlockCodexAndPing("enemies", enemy.behavior === "balanced" ? "slime" : enemy.behavior);
        unlockCodexAndPing("regions", "frontier");
        const spawnMods = getActiveRegionEventModifiers();
        const phaseMods = state.world ? resolveSpawnModifier(state.world.timeOfDay || 0) : { hostileMult: 1 };
        const influenceMult = resolveInfluenceSpawnMult(state.regions?.activeRegion || "frontier", state.narrative?.factionRep);
        const patrolMult = resolvePatrolDensityMult(state.regions?.activeRegion || "frontier", state.narrative?.factionRep);
        const seasonMods = resolveSeasonModifiers(resolveCurrentSeason(state.world.calendarDay || 0), state.regions?.activeRegion || "frontier");
        const totalDensity = Math.max(0.4, spawnMods.spawnDensityMult * phaseMods.hostileMult * influenceMult * patrolMult * seasonMods.spawnMult);
        enemy.respawn = (22 + Math.random() * 8) / totalDensity;
        state.inventory["Slime Core"] += 1;
        const civicBounty = state.narrative.globalFlags.curfewNormalized ? 3 : 0;
        const truthBonusXp = state.narrative.globalFlags.ledgerPublished ? 4 : 0;
        const rewardMult = getRewardMultiplier(state.world);
        state.player.gold += Math.max(1, Math.round((10 + civicBounty) * rewardMult));
        grantXp(Math.max(1, Math.round((22 + truthBonusXp) * rewardMult)));
        emitCompanionBark("first_kill");
        const normalDefeatCallout = resolveEnemyDefeatCallout({
          label: enemy.label || "Slime",
          gold: 10 + civicBounty,
          xp: 22 + truthBonusXp,
          items: { "Slime Core": 1 },
          color: enemy.color || "#6be873",
        });
        state.floatingTexts.push({
          wx: enemy.x,
          wy: enemy.y,
          text: normalDefeatCallout.floatingText,
          life: 0.9,
          maxLife: 0.9,
          color: "#ffd77b",
        });
        const deathVfx = resolveEnemyDeathVfx({
          label: enemy.label || "Slime",
          color: enemy.color || "#6be873",
          miniBoss: false,
        });
        state.floatingTexts.push({
          wx: enemy.x,
          wy: enemy.y,
          text: deathVfx.floatingText,
          life: deathVfx.particleLife,
          maxLife: deathVfx.particleLife,
          color: deathVfx.smokeColor,
        });
        spawnParticles(eSx, eSy, deathVfx.particleBurst, deathVfx.particleColor, deathVfx.particleSpeed, deathVfx.particleLife);
        state.player.screenShake = clamp(state.player.screenShake + normalDefeatCallout.screenShake, 0, 0.75);
        showCombatReadabilityNotice({
          kind: "reward_drop",
          title: "Reward dropped",
          line: normalDefeatCallout.logLine,
          rewardLine: normalDefeatCallout.floatingText,
          state: "dead",
          ttl: 4.2,
        });
        recordCombatEvent(combatSubtitles, "enemy_death");
        recordCombatEvent(combatSubtitles, "reward_drop");
        playCombatCue("reward_drop");

        if (enemy.miniBossId) {
          const def = MINI_BOSS_DEFS[enemy.miniBossId];
          if (def) {
            if (state.regions.miniBosses[enemy.miniBossId]) state.regions.miniBosses[enemy.miniBossId].defeated = true;
            state.player.gold += def.rewardGold;
            state.inventory[def.rewardResource.item] = (state.inventory[def.rewardResource.item] || 0) + def.rewardResource.count;
            state.progression.upgradePoints += 1;
            grantXp(120);
            enemy.respawn = 1e9;
            const bossCallout = resolveEnemyDefeatCallout({
              label: def.label,
              miniBoss: true,
              gold: def.rewardGold,
              xp: 120,
              items: { [def.rewardResource.item]: def.rewardResource.count },
              color: enemy.color || "#ffc490",
            });
            state.floatingTexts.push({
              wx: enemy.x,
              wy: enemy.y,
              text: bossCallout.floatingText,
              life: 1.15,
              maxLife: 1.15,
              color: "#ffc490",
            });
            const bossDeathVfx = resolveEnemyDeathVfx({
              bossId: enemy.miniBossId,
              label: def.label,
              color: enemy.color || "#ffc490",
              miniBoss: true,
            });
            state.floatingTexts.push({
              wx: enemy.x,
              wy: enemy.y,
              text: bossDeathVfx.floatingText,
              life: 1.15,
              maxLife: 1.15,
              color: bossDeathVfx.smokeColor,
            });
            spawnParticles(eSx, eSy, bossDeathVfx.particleBurst, bossDeathVfx.particleColor, bossDeathVfx.particleSpeed, bossDeathVfx.particleLife);
            state.player.screenShake = clamp(state.player.screenShake + bossCallout.screenShake + bossDeathVfx.screenShake, 0, 0.95);
            showCombatReadabilityNotice({
              kind: "reward_drop",
              title: "Boss reward dropped",
              line: bossCallout.logLine,
              rewardLine: bossCallout.floatingText,
              state: "dead",
              ttl: 5.2,
            });
            logMsg(`Mini-boss defeated: ${def.label}! +${def.rewardGold}g, +${def.rewardResource.count} ${def.rewardResource.item}, +1 upgrade point.`);
            grantRolledLoot("mini_boss", def.region);
            if (enemy.miniBossId === "ashfall_scrap_tyrant" && state.quests.ashfall_boss?.status === "active") {
              state.quests.ashfall_boss.status = "complete";
              state.quests.ashfall_boss.progress = state.quests.ashfall_boss.need;
              logMsg("Ashfall boss objective complete.");
            }
          }
        }

        logMsg(choice([
          `Slime obliterated! +${10 + civicBounty} gold, +${22 + truthBonusXp} XP, +1 Slime Core.`,
          `Splat! One less blob. +${10 + civicBounty} gold, +${22 + truthBonusXp} XP, +1 Core.`,
          `Slime defeated! It died as it lived: jiggly. +${10 + civicBounty}g, +${22 + truthBonusXp} XP.`,
          `Another slime bites the dust(ward). +${10 + civicBounty}g, +${22 + truthBonusXp} XP, +1 Core.`,
        ]));
        sfx.enemyDie();
        spawnParticles(eSx, eSy, 14, enemy.color || "#6be873", 3.5, 0.85);

        const quest = state.quests.slime;
        if (quest.status === "active") {
          quest.progress += 1;
          if (quest.progress >= quest.need) {
            quest.progress = quest.need;
            quest.status = "complete";
            logMsg("Quest complete objective: Marsh Cleansing ready to turn in.");
          }
        }
      } else {
        logMsg(`Sword hit for ${damage}. ${choice(["Ouch!", "That'll leave a mark!", "Jelly everywhere!", "Take that, blob!"])}`);
        sfx.swordHit();
      }
    }

    if (hitCount === 0) {
      logMsg(choice(["Your strike misses. The air is very dead though.", "Swing and a miss! Elegant, yet useless.", "You hit nothing. The wind is offended."]));
      sfx.miss();
    } else {
      const feedback = resolveHitFeedback({
        hitCount,
        comboStep: state.player.comboStep,
        maxDamage,
        killed: killedAny,
        interrupted: interruptedAny,
      });
      state.player.timeScale = Math.min(state.player.timeScale || 1, 0.54);
      state.player.timeScaleTimer = Math.max(state.player.timeScaleTimer || 0, feedback.hitStop);
      state.player.hitPulse = Math.max(state.player.hitPulse || 0, feedback.hitPulse);
      state.player.screenShake = clamp(state.player.screenShake + feedback.screenShake, 0, 0.75);
      state.player.cameraKick = clamp(state.player.cameraKick + feedback.cameraKick, 0, 1.15);
      if (hitCount > 1) logMsg("Cleave strike landed on multiple targets.");
    }
  }

  function usePotion() {
    if (state.mode !== "playing") return;
    if (state.inventory.Potion <= 0) {
      logMsg("No potion left.");
      return;
    }
    if (state.player.hp >= state.player.maxHp) {
      logMsg("Health is already full.");
      return;
    }

    state.inventory.Potion -= 1;
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + 38);
    logMsg(choice(["Potion used. Tastes like victory... and feet.", "Glug glug. Health restored. Dignity pending.", "Potion consumed. Your taste buds will never forgive you."]));
    sfx.potionUse();
    spawnParticles(canvas.width / 2, canvas.height * 0.8, 8, "#5fe0b5", 2, 0.6, { decorative: true });
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  function resetWorld(options = {}) {
    const { countDeath = true, silent = false } = options;
    const preservedOpeningCache = {
      claimed: countDeath ? Boolean(state.chest.firstRewardClaimed) : false,
      lastReward: countDeath ? state.chest.lastReward : null,
    };
    state.player.x = 9.5;
    state.player.y = 8.5;
    state.player.angle = 0;
    state.player.hp = state.player.maxHp;
    state.player.attackCooldown = 0;
    state.player.hurtCooldown = 0;
    clearChargedAttack(state.player);
    resetParryChain(state.player);
    state.player.walkBob = 0;
    state.player.comboStep = 0;
    state.player.comboWindow = 0;
    state.player.swingTimer = 0;
    state.player.cameraKick = 0;
    state.player.hitPulse = 0;
    state.player.screenShake = 0;
    state.player.weaponSway = 0;
    state.floatingTexts = [];
    clearParticlePool(particlePool);
    state.player.inHouse = false;
    state.player.blocking = false;
    state.player.guardBroken = false;
    state.player.guardBrokenTimer = 0;
    state.player.stamina = 100;
    if (countDeath) state.player.deaths += 1;
    state.mouseButtons.right = false;

    spawnEnemies();
    spawnResources();
    spawnPigs();

    state.chest.opened = false;
    state.chest.respawn = 0;
    state.chest.x = OPENING_CACHE_START.x;
    state.chest.y = OPENING_CACHE_START.y;
    state.chest.firstRewardClaimed = preservedOpeningCache.claimed;
    state.chest.lastReward = preservedOpeningCache.lastReward;
    state.pigJokeCooldown = 0;
    state.narrativePulseTimer = 7;
    if (!silent) logMsg("You recover at camp. The valley reshapes itself. The slimes reset. It's like nothing happened... except your pride.");
  }

  function weatherLabel(kind) {
    if (kind === "mist") return t("labels.mist");
    if (kind === "rain") return t("labels.rain");
    if (kind === "storm") return t("labels.storm");
    if (kind === "sandstorm") return "Sandstorm";
    if (kind === "heatwave") return "Heatwave";
    if (kind === "neon_rain") return "Neon Rain";
    return t("labels.clear");
  }

  function updateWeather(dt) {
    tickWeather(state.weather, state.regions.activeRegion, dt);
  }

  function updateNPCs(dt) {
    if (state.player.inHouse) return;
    const npcCtx = {
      dt,
      timeOfDay: state.world.timeOfDay || 0,
      isBlocking,
      dist,
      player: state.player,
      TAU,
    };
    for (const npc of state.npcs) {
      tickNpc(npc, npcCtx);
    }
  }

  function updatePigs(dt) {
    if (state.player.inHouse) return;

    if (state.pigs.length === 0) return;

    let nearestEnemyDist = Infinity;
    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;
      const d = dist(enemy, state.player);
      if (d < nearestEnemyDist) nearestEnemyDist = d;
    }
    if (nearestEnemyDist < 2.8 || (state.weather.kind === "storm" && Math.random() < dt * 0.22)) {
      state.pigStampedeTimer = Math.max(state.pigStampedeTimer, 1.1 + Math.random() * 1.1);
    }
    state.pigStampedeTimer = Math.max(0, state.pigStampedeTimer - dt);

    const herdCenter = { x: 0, y: 0 };
    for (const pig of state.pigs) {
      herdCenter.x += pig.x;
      herdCenter.y += pig.y;
    }
    herdCenter.x /= state.pigs.length;
    herdCenter.y /= state.pigs.length;

    for (let i = 0; i < state.pigs.length; i++) {
      const pig = state.pigs[i];
      pig.wanderTimer -= dt;
      pig.zoomTimer = Math.max(0, pig.zoomTimer - dt);
      pig.emoteTimer = Math.max(0, pig.emoteTimer - dt);
      pig.pickpocketCooldown = Math.max(0, pig.pickpocketCooldown - dt);

      let separationX = 0;
      let separationY = 0;
      let alignmentX = 0;
      let alignmentY = 0;
      let cohesionX = 0;
      let cohesionY = 0;
      let neighbors = 0;

      for (let j = 0; j < state.pigs.length; j++) {
        if (i === j) continue;
        const other = state.pigs[j];
        const dx = pig.x - other.x;
        const dy = pig.y - other.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > 3.6 * 3.6) continue;
        const d = Math.sqrt(d2) || 0.001;
        neighbors += 1;
        if (d < 1.35) {
          const push = (1.35 - d) / 1.35;
          separationX += (dx / d) * push;
          separationY += (dy / d) * push;
        }
        alignmentX += other.vx;
        alignmentY += other.vy;
        cohesionX += other.x;
        cohesionY += other.y;
      }

      if (neighbors > 0) {
        alignmentX /= neighbors;
        alignmentY /= neighbors;
        cohesionX = cohesionX / neighbors - pig.x;
        cohesionY = cohesionY / neighbors - pig.y;
      }

      const toHomeX = pig.homeX - pig.x;
      const toHomeY = pig.homeY - pig.y;
      const toHerdX = herdCenter.x - pig.x;
      const toHerdY = herdCenter.y - pig.y;
      const playerDx = state.player.x - pig.x;
      const playerDy = state.player.y - pig.y;
      const playerDist = Math.hypot(playerDx, playerDy) || 0.001;
      const playerAwayX = -playerDx / playerDist;
      const playerAwayY = -playerDy / playerDist;

      const noiseA = state.time * (1.2 + pig.temper * 1.8) + pig.gaitPhase + i * 0.77;
      const noiseB = state.time * (1.8 + pig.temper * 1.5) + pig.gaitPhase * 1.7 + i * 0.43;
      const wanderX = Math.cos(noiseA) * 0.75 + Math.sin(noiseB) * 0.25;
      const wanderY = Math.sin(noiseA) * 0.75 + Math.cos(noiseB) * 0.25;

      let intentX =
        separationX * 1.6 +
        alignmentX * 0.52 +
        cohesionX * 0.36 +
        toHomeX * 0.36 +
        toHerdX * 0.24 +
        wanderX * (0.33 + pig.temper * 0.16);
      let intentY =
        separationY * 1.6 +
        alignmentY * 0.52 +
        cohesionY * 0.36 +
        toHomeY * 0.36 +
        toHerdY * 0.24 +
        wanderY * (0.33 + pig.temper * 0.16);

      // Keep pigs in a readable town herd so players can find all characters.
      const homeDist = Math.hypot(toHomeX, toHomeY);
      if (homeDist > pig.wanderRadius) {
        const leash = Math.min(2, (homeDist - pig.wanderRadius) * 1.4);
        intentX += (toHomeX / homeDist) * leash;
        intentY += (toHomeY / homeDist) * leash;
      }

      if (playerDist < 2.5) {
        const panicWeight = 0.8 + (2.5 - playerDist) * 0.4;
        intentX += playerAwayX * panicWeight;
        intentY += playerAwayY * panicWeight;
        pig.zoomTimer = Math.max(pig.zoomTimer, 0.45 + pig.temper * 0.25);
      } else if (playerDist < 6.5 && pig.role === "Sheriff") {
        const tangent = normalizeVec(-playerDy, playerDx);
        intentX += tangent.x * 0.5;
        intentY += tangent.y * 0.5;
      } else if (playerDist < 5.2 && (pig.role === "Gambler" || pig.role === "Bandit")) {
        intentX += (playerDx / playerDist) * 0.32;
        intentY += (playerDy / playerDist) * 0.32;
      }

      if (state.pigStampedeTimer > 0) {
        const stampedeHeading = normalizeVec(playerAwayX + Math.cos(pig.gaitPhase), playerAwayY + Math.sin(pig.gaitPhase));
        intentX += stampedeHeading.x * (1.6 + pig.temper * 0.8);
        intentY += stampedeHeading.y * (1.6 + pig.temper * 0.8);
      }

      const intentNorm = normalizeVec(intentX, intentY);
      const calmSpeed = 0.58 + pig.temper * 0.58;
      const burst = pig.zoomTimer > 0 ? 1.02 + pig.temper * 0.58 : 0;
      const stampedeBoost = state.pigStampedeTimer > 0 ? 1.15 : 0;
      const targetSpeed = calmSpeed + burst + stampedeBoost;
      const targetVelX = intentNorm.x * targetSpeed;
      const targetVelY = intentNorm.y * targetSpeed;

      pig.vx = lerp(pig.vx, targetVelX, clamp(dt * 4.2, 0, 1));
      pig.vy = lerp(pig.vy, targetVelY, clamp(dt * 4.2, 0, 1));
      const clampedVel = clampVec(pig.vx, pig.vy, 2.95);
      pig.vx = clampedVel.x;
      pig.vy = clampedVel.y;

      const stepX = pig.vx * dt;
      const stepY = pig.vy * dt;
      const nx = pig.x + stepX;
      const ny = pig.y + stepY;
      const shoulderRoom = 0.66;

      if (!isBlocking(nx, pig.y) && dist({ x: nx, y: pig.y }, state.player) > shoulderRoom) {
        pig.x = nx;
      } else {
        pig.vx *= -0.42;
      }
      if (!isBlocking(pig.x, ny) && dist({ x: pig.x, y: ny }, state.player) > shoulderRoom) {
        pig.y = ny;
      } else {
        pig.vy *= -0.42;
      }

      if (vecLength(pig.vx, pig.vy) > 0.06) {
        pig.heading = Math.atan2(pig.vy, pig.vx);
      }
      pig.gaitPhase += dt * (5 + vecLength(pig.vx, pig.vy) * 4.5);

      if (playerDist < 1.2 && pig.role === "Bandit" && pig.pickpocketCooldown <= 0 && state.player.gold > 0) {
        const stolen = Math.min(2, state.player.gold);
        state.player.gold -= stolen;
        logMsg(`${pig.name} (${pig.role}) steals ${stolen} gold and vanishes in a cloud of dignity.`);
        pig.pickpocketCooldown = 9 + Math.random() * 7;
        pig.zoomTimer = 1.3;
        state.pigStampedeTimer = Math.max(state.pigStampedeTimer, 0.9);
      }
    }

    const nearestPig = nearestEntity(state.pigs, () => true, 7);
    if (nearestPig && state.pigJokeCooldown <= 0 && Math.random() < dt * 0.42) {
      logMsg(choice([
        "A posse of pigs stampedes across the trail like tiny furry outlaws.",
        `${nearestPig.name} yells OINK-HAW and kicks up dust.`,
        "You hear spurs jingling. It's the pig herd again.",
        "The western wind carries dramatic pig snorts across Dustward.",
      ]));
      state.pigJokeCooldown = 7 + Math.random() * 7;
    }
  }

  function updateAmbientSatire(dt) {
    state.narrative.ambientBanterTimer = Math.max(0, numberOr(state.narrative.ambientBanterTimer, 0) - dt);
    if (state.mode !== "playing" || state.player.inHouse) return;
    if (state.narrative.ambientBanterTimer > 0) return;
    if (Math.random() > dt * 0.18) return;

    const lines = [];
    if (state.weather.kind === "storm") {
      lines.push("Town notice: Lightning is now considered a motivational speaker.");
    }
    if (state.narrative.thematicAxes.controlVsFreedom > 15) {
      lines.push("Public service reminder: Curfew starts at dusk and ends when someone important feels safe.");
    }
    if (state.narrative.thematicAxes.truthVsComfort > 10) {
      lines.push("Bard bulletin: The truth has entered the chat and everyone is suddenly busy.");
    }
    if (state.narrative.thematicAxes.solidarityVsStatus > 10) {
      lines.push("Workshop update: Shared tools increased productivity and arguments by 40%.");
    }
    if (lines.length > 0) {
      logMsg(choice(lines));
      state.narrative.ambientBanterTimer = 9 + Math.random() * 7;
    }
  }

  function updateCompanion(dt) {
    if (state.player.inHouse) return;
    if (state.companion.downed) {
      const recovered = tickCompanionRecovery(state.companion, state.player, dt);
      state.world.companionDowned = state.companion.downed;
      state.world.companionRecoveryTimer = state.companion.recoveryTimer || 0;
      if (recovered) {
        state.world.companionHp = state.companion.hp;
        logMsg(`${state.companion.name} recovers and rejoins you.`);
      } else {
        return;
      }
    }
    if (!state.companion.active) {
      const def = chooseEligibleCompanion(state.narrative?.npcAffinity);
      if (def && activateCompanion(state.companion, def, state.player, state.world?.companionHp)) {
        resetBarkState(state.companion);
        state.world.companionId = def.id;
        state.world.companionHp = state.companion.hp;
        state.world.companionDowned = false;
        state.world.companionRecoveryTimer = 0;
        logMsg(`${def.name} joins you as a companion.`);
      }
    }

    const hit = updateCompanionRuntime(state.companion, state.player, state.enemies, dt, isBlocking);
    const threat = applyCompanionThreat(state.companion, state.enemies, dt, state.narrative?.npcAffinity);
    if (state.companion.active) {
      state.world.companionId = state.companion.id;
      state.world.companionHp = state.companion.hp;
      state.world.companionDowned = false;
      state.world.companionRecoveryTimer = 0;
    } else if (state.companion.downed) {
      state.world.companionId = state.companion.id;
      state.world.companionHp = null;
      state.world.companionDowned = true;
      state.world.companionRecoveryTimer = state.companion.recoveryTimer || 0;
    }
    if (hit) {
      state.floatingTexts.push({ wx: hit.x, wy: hit.y, text: "ALLY", life: 0.58, maxLife: 0.58, color: state.companion.color });
      if (!hit.alive) {
        logMsg(`${state.companion.name} drops ${hit.label || "an enemy"}.`);
      }
    }
    if (threat?.downed) {
      logMsg(`${threat.downed.name} is down and needs time to recover. Affinity -${threat.downed.affinityPenalty}.`);
    }
  }

  function anyModalOpen() {
    return dialogueOpen || jobBoardOpen || codexOpen || questOutcomeOpen
      || shopOpen || settingsOpen || skillScreenOpen || characterSheetOpen
      || workbenchOpen;
  }

  function grantEnemyKillRewards(enemy) {
    const civicBounty = state.narrative.globalFlags.curfewNormalized ? 3 : 0;
    const truthBonusXp = state.narrative.globalFlags.ledgerPublished ? 4 : 0;
    const rewardMult = getRewardMultiplier(state.world);
    state.player.gold += Math.max(1, Math.round((10 + civicBounty) * rewardMult));
    grantXp(Math.max(1, Math.round((22 + truthBonusXp) * rewardMult)));
    state.inventory["Slime Core"] += 1;
    const rewardCallout = resolveEnemyDefeatCallout({
      label: enemy?.label || "Slime",
      gold: 10 + civicBounty,
      xp: 22 + truthBonusXp,
      items: { "Slime Core": 1 },
      color: enemy?.color || "#6be873",
    });
    showCombatReadabilityNotice({
      kind: "reward_drop",
      title: "Reward dropped",
      line: rewardCallout.logLine,
      rewardLine: rewardCallout.floatingText,
      state: "dead",
      ttl: 4.2,
    });
    recordCombatEvent(combatSubtitles, "enemy_death");
    recordCombatEvent(combatSubtitles, "reward_drop");
    playCombatCue("reward_drop");
    const spawnMods = getActiveRegionEventModifiers();
    const phaseMods = state.world ? resolveSpawnModifier(state.world.timeOfDay || 0) : { hostileMult: 1 };
    const influenceMult = resolveInfluenceSpawnMult(state.regions?.activeRegion || "frontier", state.narrative?.factionRep);
    const patrolMult = resolvePatrolDensityMult(state.regions?.activeRegion || "frontier", state.narrative?.factionRep);
    const seasonMods = resolveSeasonModifiers(resolveCurrentSeason(state.world.calendarDay || 0), state.regions?.activeRegion || "frontier");
    const totalDensity = Math.max(0.4, spawnMods.spawnDensityMult * phaseMods.hostileMult * influenceMult * patrolMult * seasonMods.spawnMult);
    enemy.respawn = (22 + Math.random() * 8) / totalDensity;
    if (enemy.miniBossId) {
      const def = MINI_BOSS_DEFS[enemy.miniBossId];
      if (def) {
        if (state.regions.miniBosses[enemy.miniBossId]) state.regions.miniBosses[enemy.miniBossId].defeated = true;
        state.player.gold += def.rewardGold;
        state.inventory[def.rewardResource.item] = (state.inventory[def.rewardResource.item] || 0) + def.rewardResource.count;
        state.progression.upgradePoints += 1;
        grantXp(120);
        enemy.respawn = 1e9;
      }
    }
  }

  function update(dt) {
    state.time += dt;
    if ((state.player.timeScaleTimer || 0) > 0) {
      state.player.timeScaleTimer = Math.max(0, state.player.timeScaleTimer - dt);
      if (state.player.timeScaleTimer <= 0) state.player.timeScale = 1;
    }
    if ((state.player.perfectDodgeFlash || 0) > 0) {
      state.player.perfectDodgeFlash = Math.max(0, state.player.perfectDodgeFlash - dt);
    }
    const tScale = state.player.timeScale || 1;
    if (tScale !== 1) dt = dt * tScale;
    state.player.dodgeCooldown = Math.max(0, numberOr(state.player.dodgeCooldown, 0) - dt);
    rebuildSpatialHash(enemyGrid, state.enemies, { filter: aliveEnemy });
    if (state.graphics.autoRecommended) {
      const recommended = resolveRecommendedPreset({
        width: canvas.width,
        height: canvas.height,
        deviceMemory: navigator.deviceMemory || 4,
      });
      state.graphics.preset = recommended;
      state.weather.quality = recommended === "high" ? "cinematic" : recommended === "low" ? "performance" : "balanced";
    }

    for (const m of state.msg) {
      m.ttl -= dt;
    }
    if (discoveryBanner) {
      discoveryBanner.ttl -= dt;
      if (discoveryBanner.ttl <= 0) discoveryBanner = null;
    }
    if (hudNotice) {
      hudNotice.ttl -= dt;
      if (hudNotice.ttl <= 0) hudNotice = null;
    }
    if (combatReadabilityNotice) {
      combatReadabilityNotice.ttl -= dt;
      if (combatReadabilityNotice.ttl <= 0) combatReadabilityNotice = null;
    }
    // Use reverse loop to remove expired messages without creating new array
    for (let i = state.msg.length - 1; i >= 0; i--) {
      if (state.msg[i].ttl <= 0) {
        state.msg.splice(i, 1);
      }
    }

    const player = state.player;
    player.attackCooldown = Math.max(0, player.attackCooldown - dt);
    player.hurtCooldown = Math.max(0, player.hurtCooldown - dt);
    tickParryChain(player, dt);
    player.comboWindow = Math.max(0, player.comboWindow - dt);
    player.swingTimer = Math.max(0, player.swingTimer - dt);
    player.hitPulse = Math.max(0, player.hitPulse - dt * 2.4);
    player.cameraKick = Math.max(0, player.cameraKick - dt * 1.8);
    player.screenShake = Math.max(0, player.screenShake - dt * 7);
    const strafeDir = (state.keys.KeyD ? 1 : 0) - (state.keys.KeyA ? 1 : 0);
    player.weaponSway = lerp(player.weaponSway, strafeDir * -20, Math.min(1, dt * 9));
    for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
      const ft = state.floatingTexts[i];
      ft.life -= dt;
      ft.wy -= 0.55 * dt;
      if (ft.life <= 0) state.floatingTexts.splice(i, 1);
    }
    state.pigJokeCooldown = Math.max(0, state.pigJokeCooldown - dt);
    updateWeather(dt);

    if (state.mode !== "playing" || anyModalOpen()) return;
    if (state.world) {
      advanceTimeOfDay(state.world, dt);
      advanceCalendarDay(state.world, dt);
    }
    rollRegionEvent(state.regions, dt);
    applyDynamicRegionProgression();
    if (tickChargedAttack(player, dt)) {
      releaseChargedAttack();
    }

    const turnInput = (state.keys.ArrowLeft ? -1 : 0) + (state.keys.ArrowRight ? 1 : 0);
    player.angle = normalizeAngle(player.angle + turnInput * PLAYER_ROT_SPEED * dt + state.mouseLook);
    state.mouseLook = 0;

    const guard = resolveGuardBreakState(player, dt);
    player.guardBroken = guard.guardBroken;
    player.guardBrokenTimer = guard.guardBrokenTimer;

    const wasBlocking = player.blocking;
    player.blocking = !player.guardBroken && (state.mouseButtons.right || state.keys.KeyC) && player.swingTimer <= 0;
    if (player.blocking && !wasBlocking) {
      player.blockStartTime = state.time;
    } else if (!player.blocking) {
      player.blockStartTime = -Infinity;
    }

    const forward = (state.keys.KeyW || state.keys.ArrowUp ? 1 : 0) - (state.keys.KeyS || state.keys.ArrowDown ? 1 : 0);
    const strafe = (state.keys.KeyD ? 1 : 0) - (state.keys.KeyA ? 1 : 0);
    const stance = getStanceModifiers();

    const sprinting = (state.keys.ShiftLeft || state.keys.ShiftRight) && !player.blocking && !player.inHouse;
    let speedFactor = 1;
    if (sprinting && player.stamina > 4) {
      speedFactor = 1.42 * getSprintModifier(state.player.combatProfile) * stance.sprintMult;
      player.stamina = Math.max(0, player.stamina - dt * 24);
    } else {
      const regenRate = resolveStaminaRegenRate(player, state.player.progressionMods);
      player.stamina = Math.min(state.player.maxStamina, player.stamina + dt * regenRate);
    }

    if (player.blocking) speedFactor *= 0.62;
    if (player.inHouse) speedFactor *= 0.85;
    if (!player.inHouse && state.weather.rain > 0.45) {
      const weatherRelief = clamp(state.player.progressionMods?.weatherPenaltyReduction || 0, 0, 0.7);
      speedFactor *= 1 - 0.07 * (1 - weatherRelief);
    }
    if (!player.inHouse && player.stamina < 20) speedFactor *= 0.9;

    // Pre-compute trigonometric values to avoid duplicate calculations
    const cosAngle = Math.cos(player.angle);
    const sinAngle = Math.sin(player.angle);
    const cos90 = -sinAngle; // cos(angle + PI/2) = -sin(angle)
    const sin90 = cosAngle;  // sin(angle + PI/2) = cos(angle)

    const vx = (cosAngle * forward + cos90 * strafe) * PLAYER_SPEED * speedFactor * dt;
    const vy = (sinAngle * forward + sin90 * strafe) * PLAYER_SPEED * speedFactor * dt;
    moveWithCollision(vx, vy);

    const moving = Math.abs(forward) + Math.abs(strafe) > 0;
    player.walkBob += dt * (moving ? 9.8 * speedFactor : 1.8);

    /* Footstep sounds */
    if (moving) {
      footstepTimer -= dt;
      if (footstepTimer <= 0) {
        sfx.footstep();
        footstepTimer = sprinting ? 0.25 : 0.38;
      }
    } else {
      footstepTimer = 0;
    }

    /* Ambient weather sounds */
    ambientTimer -= dt;
    if (ambientTimer <= 0 && !player.inHouse) {
      if (state.weather.rain > 0.3) sfx.rain();
      if (state.weather.lightning > 0.5) sfx.thunder();
      ambientTimer = 1.5 + Math.random();
    }

    /* Particles */
    updateParticles(dt);

    updateNPCs(dt);
    updatePigs(dt);
    updateCompanion(dt);
    updateAmbientSatire(dt);
    tickNarrativeEvents(dt);

    // Reveal fog around player position in the active region
    const activeRegion = state.regions?.activeRegion || "frontier";
    if (!state.fog) state.fog = {};
    if (!state.fog[activeRegion]) state.fog[activeRegion] = createFogGrid();
    revealAroundPlayer(state.fog[activeRegion], activeRegion, state.player.x, state.player.y);

    if (player.inHouse) {
      updateQuestProgressFromInventory();
      tickAutoSave(dt);
      return;
    }

    if ((state.player.tonicTimer || 0) > 0) {
      state.player.tonicTimer = Math.max(0, state.player.tonicTimer - dt);
      state.player.tonicTickAccum = (state.player.tonicTickAccum || 0) + dt;
      while (state.player.tonicTickAccum >= 0.5) {
        state.player.tonicTickAccum -= 0.5;
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + 4);
      }
    }
    if ((state.player.flareRevealTimer || 0) > 0) {
      state.player.flareRevealTimer = Math.max(0, state.player.flareRevealTimer - dt);
    }

    const weatherPursuitMult = 1 - state.weather.rain * 0.18;
    for (const enemy of state.enemies) {
      if (!enemy.alive) {
        enemy.respawn -= dt;
        if (enemy.respawn <= 0) {
          const pos = findEmptyCell(worldMap, 10, 10, 53, 53, (x, y) => !isInHouseLot(x, y));
          const nextType = chooseEnemyType(state.player.level, state.weather.kind);
          const stats = createEnemyStats(nextType, state.player.level);
          enemy.x = pos.x;
          enemy.y = pos.y;
          enemy.type = stats.type;
          enemy.label = stats.label;
          enemy.color = stats.color;
          enemy.behavior = stats.behavior;
          const _hpMult = getEnemyHpMultiplier(state.world);
          const _dmgMult = getEnemyDamageMultiplier(state.world);
          const _scaledHp = Math.max(1, Math.round(stats.maxHp * _hpMult));
          enemy.maxHp = _scaledHp;
          enemy.hp = _scaledHp;
          enemy.speed = stats.speed;
          enemy.attackReach = stats.attackReach;
          enemy.baseDamage = Math.max(1, Math.round(stats.baseDamage * _dmgMult));
          enemy.damageVariance = stats.damageVariance;
          enemy.alive = true;
          enemy.attackCooldown = 0.7;
          enemy.stagger = 0;
          enemy.alerted = false;
          enemy.alertTimer = 0;
          enemy.windupWarned = false;
          clearStatuses(enemy);
        }
        continue;
      }

      if (enemy.flashTimer > 0) enemy.flashTimer = Math.max(0, enemy.flashTimer - dt);
      if (enemy.phaseCueTimer > 0) enemy.phaseCueTimer = Math.max(0, enemy.phaseCueTimer - dt);
      if (enemy.alertTimer > 0) enemy.alertTimer = Math.max(0, enemy.alertTimer - dt);
      tickMiniBossInvulnerability(enemy, dt);
      if (enemy.stagger > 0) {
        enemy.stagger -= dt;
      }
      if (enemy.searchTimer > 0) enemy.searchTimer = Math.max(0, enemy.searchTimer - dt);

      if (state.combat?.statusEffectsEnabled && enemy.statuses && enemy.statuses.length > 0) {
        updateStatuses(enemy, dt, {
          applyDamage: (ent, amt) => {
            if ((ent.invulnTimer || 0) > 0) return;
            ent.hp -= amt;
            if (transitionMiniBossPhaseIfNeeded(ent)) return;
            if (ent.hp <= 0 && ent.alive) {
              ent.alive = false;
              recordRunKill(state.world, ent);
              recordKillForJobs(ent);
              grantEnemyKillRewards(ent);
              emitCompanionBark("first_kill");
            }
          },
          spawnShatter: (ent) => {
            spawnParticles(canvas.width / 2, canvas.height * 0.5, 12, "#9be0ff", 4, 0.6, { decorative: false });
            ent.stagger = Math.max(ent.stagger || 0, 1.0);
          },
        });
      }
      if (enemy.flareSlowTimer > 0) enemy.flareSlowTimer = Math.max(0, enemy.flareSlowTimer - dt);

      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const d = Math.hypot(dx, dy);
      const combatProfile = createEnemyCombatProfile(enemy, player.level);
      const onGlassGulchTile = tileTypeAtCurrentMap(enemy.x, enemy.y) === 5;
      if (onGlassGulchTile && enemy.type === "spitter") {
        combatProfile.pursuitRange += 2.4;
        combatProfile.attackRange += 0.35;
      }

      const pursuingPlayer = d < combatProfile.pursuitRange && enemy.stagger <= 0 && (enemy.searchTimer || 0) <= 0;
      if (pursuingPlayer) {
        if (!enemy.alerted) {
          enemy.alerted = true;
          enemy.alertTimer = 1;
          state.floatingTexts.push({ wx: enemy.x, wy: enemy.y, text: "HOSTILE", life: 0.62, maxLife: 0.62, color: "#92f0a3" });
          showCombatReadabilityNotice({
            kind: "enemy_alert",
            title: "Enemy noticed you",
            line: `${enemy.label || "Enemy"} has aggro. Face it, block, or make space.`,
            state: "aggro",
            ttl: 2.4,
          });
          recordCombatEvent(combatSubtitles, "enemy_alert");
          playCombatCue("enemy_alert");
        }
        // Pre-compute inverse distance to avoid division in both calculations
        const invD = 1 / (d + 1e-6);
        const nx = dx * invD;
        const ny = dy * invD;
        const behaviorMove = resolveBehaviorMove(enemy, { nx, ny, distance: d, dt });
        const flareMult = (enemy.flareSlowTimer || 0) > 0 ? 0.5 : 1;
        const statusMult = state.combat?.statusEffectsEnabled ? getStatusSpeedMult(enemy) : 1;
        const move = enemy.speed * weatherPursuitMult * dt * behaviorMove.speedMult * flareMult * statusMult;
        const nextX = enemy.x + behaviorMove.mx * move;
        const nextY = enemy.y + behaviorMove.my * move;

        if (!isBlocking(nextX, enemy.y)) enemy.x = nextX;
        if (!isBlocking(enemy.x, nextY)) enemy.y = nextY;

        enemy.attackCooldown -= dt;
        // Telegraph: heavy archetypes wind up before striking. Player can interrupt
        // mid-windup by hitting the enemy (damage path zeroes windupTimer).
        const heavyTelegraph = enemy.behavior === "charge"
          || enemy.behavior === "tank"
          || enemy.behavior === "shield"
          || enemy.behavior === "control";
        if (d < combatProfile.attackRange && enemy.attackCooldown <= 0 && heavyTelegraph && (enemy.windupTimer || 0) <= 0 && !enemy.windupConsumed) {
          // Start the windup.
          enemy.windupTimer = enemy.behavior === "tank" ? 0.95
            : enemy.behavior === "shield" ? 0.85
              : enemy.behavior === "control" ? 0.75
                : 0.55;
          enemy.windupMax = enemy.windupTimer;
          enemy.windupConsumed = false;
          enemy.windupWarned = true;
          state.floatingTexts.push({ wx: enemy.x, wy: enemy.y, text: "WINDUP", life: 0.62, maxLife: 0.62, color: "#ff6048" });
          showCombatReadabilityNotice({
            kind: "windup",
            title: "Heavy attack incoming",
            line: `${enemy.label || "Enemy"} is winding up. Interrupt, block, or backstep now.`,
            state: "windup",
            ttl: 2.2,
          });
          recordCombatEvent(combatSubtitles, "windup");
          playCombatCue("windup");
        }
        if ((enemy.windupTimer || 0) > 0) {
          enemy.windupTimer = Math.max(0, enemy.windupTimer - dt);
          // Counter-windup bait: elite enemies occasionally cancel mid-windup and re-commit.
          // Only applies to tank/control archetypes at 20-40% of windup elapsed.
          if (!enemy.windupBaitUsed && (enemy.behavior === "tank" || enemy.behavior === "control")) {
            const elapsed = 1 - (enemy.windupTimer / Math.max(0.01, enemy.windupMax || 1));
            if (elapsed >= 0.2 && elapsed <= 0.4 && Math.random() < dt * 0.55) {
              enemy.windupTimer = enemy.windupMax;
              enemy.windupBaitUsed = true;
              state.floatingTexts.push({ wx: enemy.x, wy: enemy.y, text: "FEINT", life: 0.55, maxLife: 0.55, color: "#ffcf5a" });
            }
          }
          if (enemy.windupTimer <= 0) {
            enemy.windupConsumed = true;
            enemy.windupBaitUsed = false;
            enemy.windupWarned = false;
          }
        }
        const heavyReady = heavyTelegraph && enemy.windupConsumed;
        const lightReady = !heavyTelegraph;
        if (d < combatProfile.attackRange && enemy.attackCooldown <= 0 && (lightReady || heavyReady)) {
          enemy.attackCooldown = (1 + Math.random() * 0.5) * combatProfile.cooldownFactor;
          enemy.windupConsumed = false;
          enemy.windupTimer = 0;
          if (player.hurtCooldown <= 0) {
            player.hurtCooldown = 0.33;
            let damage = (enemy.baseDamage || 7) + Math.floor(Math.random() * (enemy.damageVariance || 6));

            if (player.blocking) {
              const angleToEnemy = Math.atan2(enemy.y - player.y, enemy.x - player.x);
              const facingDiff = Math.abs(normalizeAngle(angleToEnemy - player.angle));
              const stance = getStanceModifiers();
              const mitigated = resolveIncomingDamage(damage, state.player.combatProfile, { blocked: true });
              const blockBonus = clamp(state.player.progressionMods?.blockEfficiencyBonus || 0, 0, 0.35);
              const sinceBlockStart = state.time - (player.blockStartTime ?? -Infinity);
              const parryWindow = sinceBlockStart >= 0 && sinceBlockStart <= 0.15;
              if (parryWindow && facingDiff < 1.12) {
                // Perfect parry: no damage, stagger, riposte particle, refund stamina.
                const parry = resolveParryChain(player);
                damage = 0;
                enemy.stagger = Math.max(enemy.stagger || 0, parry.stagger);
                enemy.windupTimer = 0;
                enemy.windupConsumed = false;
                if (parry.chained) {
                  enemy.attackCooldown = Math.max(enemy.attackCooldown || 0, 0.85);
                }
                player.stamina = Math.min(state.player.maxStamina, player.stamina + parry.staminaRefund);
                player.parryChainTimer = parry.nextTimer;
                state.floatingTexts.push({ wx: enemy.x, wy: enemy.y, text: parry.text, life: 0.7, maxLife: 0.7, color: parry.chained ? "#ffe16a" : "#9be0ff" });
                spawnParticles(canvas.width / 2, canvas.height * 0.45, 12, "#cce4ff", 4, 0.45, { decorative: false });
                logMsg(parry.chained ? "Parry chain! Enemy interrupted." : "Perfect parry! Riposte primed.");
                sfx.blockHit();
                emitCompanionBark("perfect_parry");
                recordCombatEvent(combatSubtitles, "perfect_parry");
                playCombatCue("perfect_parry");
              } else if (facingDiff < 1.12 && player.stamina > 10) {
                damage = Math.max(mitigated.chip, Math.floor(mitigated.blocked * stance.blockPenalty * (1 - blockBonus)));
                const guardBroke = applyBlockStaminaChip(player, mitigated.staminaChip);
                if (guardBroke) {
                  player.blocking = false;
                  state.floatingTexts.push({ wx: player.x, wy: player.y, text: "GUARD BREAK", life: 0.85, maxLife: 0.85, color: "#ffcf8a" });
                  logMsg("Guard broken! Stamina depleted by sustained blocking. Recover before defending again.");
                  recordCombatEvent(combatSubtitles, "guard_break");
                  playCombatCue("guard_break");
                } else {
                  logMsg(`Block absorbed most of the hit. ${mitigated.chip} chip damage slipped through. (−${mitigated.staminaChip} stamina)`);
                  recordCombatEvent(combatSubtitles, "block");
                  playCombatCue("block");
                }
                sfx.blockHit();
              } else {
                damage = Math.max(1, Math.floor(mitigated.glancing));
              }
            }

            if (damage > 0) resetParryChain(player);
            player.hp -= damage;
            player.hitPulse = Math.max(player.hitPulse, 0.16);
            player.cameraKick = clamp(player.cameraKick + 0.18, 0, 1);
            player.screenShake = clamp(player.screenShake + 0.6, 0, 1);
            logMsg(`A slime strikes for ${damage}. ${choice(["Ow!", "That stings!", "Gross AND painful!", "It's so slimy!"])}`);
            sfx.playerHurt();
            if (player.hp > 0 && player.hp / Math.max(1, player.maxHp) <= 0.25) {
              emitCompanionBark("low_hp");
              recordCombatEvent(combatSubtitles, "low_hp");
              playCombatCue("low_hp");
            }

            if (player.hp <= 0) {
              player.hp = 0;
              state.mode = "gameover";
              logMsg(choice(deathMessages) + " Press R to recover.");
              sfx.death();
              if (activeReplaySession) {
                saveReplayLocally(finalizeReplay(activeReplaySession, state.world.runStats || {}));
                activeReplaySession = null;
              }
              const deathStats = ensureRunStats(state.world, state.time);
              if (!deathStats.deathCause) {
                deathStats.deathCause = `${enemy.behavior || "enemy"} in ${state.regions?.activeRegion || "frontier"}`;
              }
            }
          }
        }
      } else if (d > combatProfile.pursuitRange + 2) {
        enemy.alerted = false;
        enemy.alertTimer = 0;
        enemy.windupWarned = false;
      }
    }

    for (const resource of state.resources) {
      if (resource.harvested) {
        resource.respawn -= dt;
        if (resource.respawn <= 0) {
          resource.harvested = false;
          const pos = findEmptyCell(worldMap, 4, 4, 53, 53, (x, y) => !isInHouseLot(x, y));
          resource.x = pos.x;
          resource.y = pos.y;
        }
      }
    }

    if (state.chest.opened) {
      state.chest.respawn -= dt;
      if (state.chest.respawn <= 0) {
        state.chest.opened = false;
        const pos = findEmptyCell(worldMap, 8, 6, 20, 15, (x, y) => !isInHouseLot(x, y));
        state.chest.x = pos.x;
        state.chest.y = pos.y;
      }
    }

    /* Auto-close shop if player walks away from merchant */
    if (shopOpen) {
      const merchant = state.npcs.find(n => n.id === "merchant");
      if (!merchant || dist(state.player, merchant) > 2.5) {
        shopOpen = false;
      }
    }

    updateQuestProgressFromInventory();
    updateCombatMusicTension(dt);
    tickFactionRepBands();
    tickAutoSave(dt);
  }

  const _renderHelpers = createRenderHelpers(ctx);
  const roundedRectPath = _renderHelpers.roundedRectPath;
  const fillRoundedRect = _renderHelpers.fillRoundedRect;
  const strokeRoundedRect = _renderHelpers.strokeRoundedRect;
  const drawSoftPanel = _renderHelpers.drawSoftPanel;
  const fitText = _renderHelpers.fitText;
  const drawClippedText = _renderHelpers.drawClippedText;
  const drawPillLabel = _renderHelpers.drawPillLabel;
  const _hudRenderer = createHudRenderer({
    ctx,
    helpers: _renderHelpers,
    hexToRgba: hexToRgbaUtil,
  });
  const drawHudBar = _hudRenderer.drawHudBar;
  const drawHudNoticePanel = _hudRenderer.drawHudNoticePanel;
  const drawDiscoveryBannerPanel = _hudRenderer.drawDiscoveryBannerPanel;
  const drawInteractionPromptPanel = _hudRenderer.drawInteractionPromptPanel;
  const _modalController = createModalController({
    ctx,
    helpers: _renderHelpers,
    skillBranches: SKILL_BRANCH_LABELS,
  });
  const _spriteLightHelpers = createSpriteLightHelpers(ctx, { hexToRgba: hexToRgbaUtil });
  const drawSpriteGlow = _spriteLightHelpers.drawSpriteGlow;
  const drawSpritePulseRing = _spriteLightHelpers.drawSpritePulseRing;

  function drawInteriorBackdrop(width, height) {
    const horizon = Math.floor(height * 0.57);

    const ceilGrad = ctx.createLinearGradient(0, 0, 0, horizon);
    ceilGrad.addColorStop(0, "#151b20");
    ceilGrad.addColorStop(0.5, "#2b2b28");
    ceilGrad.addColorStop(1, "#574636");
    ctx.fillStyle = ceilGrad;
    ctx.fillRect(0, 0, width, horizon);

    const floorGrad = ctx.createLinearGradient(0, horizon, 0, height);
    floorGrad.addColorStop(0, "#75614b");
    floorGrad.addColorStop(1, "#241e19");
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, horizon, width, height - horizon);

    const lampX = width * 0.55 + Math.sin(state.time * 0.8) * 18;
    const lampY = horizon * 0.3;
    const lamp = ctx.createRadialGradient(lampX, lampY, 4, lampX, lampY, Math.max(width, height) * 0.48);
    lamp.addColorStop(0, "rgba(255, 206, 128, 0.28)");
    lamp.addColorStop(0.42, "rgba(184, 111, 58, 0.1)");
    lamp.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = lamp;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(43, 27, 18, 0.28)";
    ctx.lineWidth = 4;
    for (let x = -80; x < width + 120; x += 120) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + width * 0.18, horizon + 14);
      ctx.stroke();
    }

    for (let i = 0; i < 18; i++) {
      const t = i / 18;
      const y = horizon + t * (height - horizon);
      ctx.strokeStyle = `rgba(25, 16, 11, ${0.18 * (1 - t)})`;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    for (let i = 0; i < 20; i++) {
      const t = i / 19;
      const floorX = width * (0.5 + (t - 0.5) * 1.8);
      ctx.strokeStyle = `rgba(255, 219, 156, ${0.05 + 0.05 * (1 - Math.abs(t - 0.5) * 2)})`;
      ctx.beginPath();
      ctx.moveTo(width * 0.5, horizon);
      ctx.lineTo(floorX, height);
      ctx.stroke();
    }

    return horizon;
  }

  // Cache for gradients to avoid recreation every frame
  let cachedCloudGradient = null;
  let lastCloudOpacity = -1;

  function drawRegionHorizonAccents(regionId, regionProfile, horizon, width, height, normalizedDay, weather) {
    const baseAlpha = 0.16 + normalizedDay * 0.12 + weather.fog * 0.06;
    if (regionId === "ashfall") {
      ctx.fillStyle = hexToRgba(regionProfile.groundPalette[1], 0.42 + weather.fog * 0.12);
      for (let i = 0; i < 6; i++) {
        const x = width * (0.08 + i * 0.16);
        const towerH = 20 + (i % 3) * 12;
        ctx.fillRect(x, horizon - towerH, 10 + (i % 2) * 5, towerH + 26);
        ctx.beginPath();
        ctx.moveTo(x - 16, horizon + 2);
        ctx.lineTo(x + 4, horizon - towerH - 10);
        ctx.lineTo(x + 26, horizon + 4);
        ctx.closePath();
        ctx.fill();
      }
      for (let i = 0; i < 5; i++) {
        const plumeX = width * (0.18 + i * 0.17);
        const plumeY = horizon - 42 - (i % 2) * 10;
        for (let puff = 0; puff < 4; puff++) {
          ctx.fillStyle = `rgba(230, 156, 104, ${0.08 + puff * 0.03})`;
          ctx.beginPath();
          ctx.ellipse(plumeX + puff * 10, plumeY - puff * 8, 18 - puff * 2, 10 - puff, 0, 0, TAU);
          ctx.fill();
        }
      }
      return;
    }

    if (regionId === "ironlantern") {
      ctx.strokeStyle = hexToRgba(regionProfile.minimapTint || regionProfile.skyTint, 0.24 + normalizedDay * 0.08);
      ctx.lineWidth = 2;
      for (let i = 0; i < 7; i++) {
        const x = width * (0.1 + i * 0.13);
        const mastH = 28 + (i % 3) * 16;
        ctx.beginPath();
        ctx.moveTo(x, horizon + 14);
        ctx.lineTo(x, horizon - mastH);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - 7, horizon - mastH + 12);
        ctx.lineTo(x + 7, horizon - mastH + 12);
        ctx.stroke();
        ctx.fillStyle = hexToRgba(regionProfile.minimapTint || regionProfile.skyTint, 0.34);
        ctx.fillRect(x - 2, horizon - mastH - 5, 4, 5);
      }
      ctx.strokeStyle = hexToRgba(regionProfile.roadEdgeColor || regionProfile.groundPalette[0], 0.34);
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 3; i++) {
        const y = horizon - 34 + i * 18;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y + Math.sin(i + state.time * 0.08) * 4);
        ctx.stroke();
      }
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = `rgba(155, 211, 255, ${0.18 + (i % 3) * 0.05})`;
        ctx.fillRect(width * (0.06 + i * 0.09), horizon + 2 + (i % 2) * 6, 10, 3);
      }
      return;
    }

    const townAlpha = 0.3 + baseAlpha * 0.35;
    const roofColor = hexToRgba(regionProfile.roadEdgeColor || "#8d6c43", townAlpha);
    const wallColor = hexToRgba(regionProfile.groundPalette[0], townAlpha * 0.85);
    for (let i = 0; i < 8; i++) {
      const baseX = width * (0.05 + i * 0.105);
      const roofY = horizon - 18 - (i % 3) * 7;
      const bodyW = 14 + (i % 3) * 5;
      const bodyH = 19 + (i % 2) * 8;
      ctx.fillStyle = wallColor;
      ctx.fillRect(baseX, roofY, bodyW, bodyH);
      ctx.fillStyle = roofColor;
      ctx.beginPath();
      ctx.moveTo(baseX - 5, roofY + 1);
      ctx.lineTo(baseX + bodyW * 0.5, roofY - 12 - (i % 2) * 3);
      ctx.lineTo(baseX + bodyW + 5, roofY + 1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = `rgba(255, 215, 123, ${0.07 + normalizedDay * 0.05})`;
      ctx.fillRect(baseX + bodyW * 0.62, roofY + bodyH * 0.42, 3, 4);
    }

    const towerX = width * 0.78;
    const towerBase = horizon + 14;
    const towerTop = horizon - 68;
    ctx.fillStyle = hexToRgba(regionProfile.roadEdgeColor || "#8d6c43", 0.58);
    ctx.fillRect(towerX, towerTop + 12, 12, towerBase - towerTop);
    ctx.fillRect(towerX - 10, towerTop + 18, 32, 7);
    ctx.beginPath();
    ctx.moveTo(towerX - 9, towerTop + 12);
    ctx.lineTo(towerX + 6, towerTop - 4);
    ctx.lineTo(towerX + 21, towerTop + 12);
    ctx.closePath();
    ctx.fill();
    const beaconPulse = 0.5 + Math.sin(state.time * 2.7) * 0.5;
    const beacon = ctx.createRadialGradient(towerX + 6, towerTop + 8, 2, towerX + 6, towerTop + 8, 54 + beaconPulse * 16);
    beacon.addColorStop(0, `rgba(255, 215, 123, ${0.22 + beaconPulse * 0.14})`);
    beacon.addColorStop(1, "rgba(255, 215, 123, 0)");
    ctx.fillStyle = beacon;
    ctx.fillRect(towerX - 60, towerTop - 52, 132, 112);

    ctx.strokeStyle = hexToRgba(regionProfile.roadEdgeColor || "#8d6c43", 0.34);
    ctx.lineWidth = 2;
    for (let side = -1; side <= 1; side += 2) {
      ctx.beginPath();
      ctx.moveTo(width * 0.5 + side * width * 0.035, horizon + 5);
      ctx.bezierCurveTo(width * (0.5 + side * 0.18), horizon + 30, width * (0.5 + side * 0.34), horizon + 72, width * (0.5 + side * 0.47), height + 10);
      ctx.stroke();
    }
    for (let i = 0; i < 11; i++) {
      const t = i / 10;
      const x = width * (0.11 + i * 0.078);
      const postH = 16 + (1 - t) * 16 + (i % 2) * 5;
      const y0 = horizon + 18 + Math.pow(t, 1.8) * 32;
      ctx.strokeStyle = hexToRgba(regionProfile.roadEdgeColor || "#8d6c43", 0.24 + (1 - t) * 0.12);
      ctx.beginPath();
      ctx.moveTo(x, y0 + postH);
      ctx.lineTo(x, y0);
      ctx.stroke();
      if (i % 3 === 1) {
        ctx.fillStyle = `rgba(255, 216, 128, ${0.12 + (1 - t) * 0.08})`;
        ctx.fillRect(x - 2, y0 - 4, 4, 3);
      }
    }

    ctx.fillStyle = "rgba(105, 73, 43, 0.28)";
    ctx.fillRect(width * 0.59, horizon + 16, 34, 8);
    ctx.fillRect(width * 0.585, horizon + 21, 8, 11);
    ctx.fillRect(width * 0.635, horizon + 21, 8, 11);
  }

  function drawRegionRoadSurface(regionId, regionProfile, horizon, width, height, trailCenter, normalizedDay) {
    const groundDepth = height - horizon;
    const roadColor = regionProfile.roadColor || regionProfile.groundPalette?.[2] || "#c79d5f";
    const edgeColor = regionProfile.roadEdgeColor || regionProfile.groundPalette?.[0] || "#7d5d3e";
    const roadStyle = resolveRoadSurfaceVisualStyle({ regionId, width, height, horizon, normalizedDay });

    if (regionId === "ashfall") {
      ctx.fillStyle = hexToRgba("#2b211b", 0.88);
      ctx.beginPath();
      ctx.moveTo(trailCenter - width * 0.03, horizon + 4);
      ctx.bezierCurveTo(width * 0.42, horizon + groundDepth * 0.32, width * 0.28, height * 0.82, width * 0.18, height + 18);
      ctx.lineTo(width * 0.82, height + 18);
      ctx.bezierCurveTo(width * 0.72, height * 0.82, width * 0.58, horizon + groundDepth * 0.32, trailCenter + width * 0.03, horizon + 4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = hexToRgba(roadColor, roadStyle.edgeAlpha);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(trailCenter - width * 0.04, horizon + 2);
      ctx.bezierCurveTo(width * 0.4, horizon + groundDepth * 0.34, width * 0.24, height * 0.82, width * 0.12, height + 14);
      ctx.moveTo(trailCenter + width * 0.04, horizon + 2);
      ctx.bezierCurveTo(width * 0.6, horizon + groundDepth * 0.34, width * 0.76, height * 0.82, width * 0.88, height + 14);
      ctx.stroke();
      for (let i = 0; i < 14; i++) {
        const t = i / 13;
        const y = horizon + Math.pow(t, 1.4) * groundDepth;
        const spread = lerp(width * 0.01, width * 0.1, t);
        ctx.fillStyle = `rgba(255, 192, 120, ${0.05 + (1 - t) * roadStyle.centerGlowAlpha})`;
        ctx.fillRect(trailCenter - spread, y, 4 + (1 - t) * 4, 1.5);
        ctx.fillRect(trailCenter + spread - 4, y + 1.5, 4 + (1 - t) * 4, 1.5);
      }
      for (let i = 0; i < roadStyle.chevronCount; i++) {
        const t = (i + 1) / (roadStyle.chevronCount + 1);
        const y = horizon + Math.pow(t, 1.34) * groundDepth;
        const span = lerp(width * 0.018, width * 0.12, t);
        ctx.strokeStyle = hexToRgba(roadStyle.accent, roadStyle.chevronAlpha * (1 - t * 0.45));
        ctx.lineWidth = lerp(1, 3, t);
        ctx.beginPath();
        ctx.moveTo(trailCenter - span, y + 8);
        ctx.lineTo(trailCenter, y);
        ctx.lineTo(trailCenter + span, y + 8);
        ctx.stroke();
      }
      return;
    }

    if (regionId === "ironlantern") {
      ctx.fillStyle = hexToRgba("#1c2634", 0.9);
      ctx.beginPath();
      ctx.moveTo(trailCenter - width * 0.018, horizon + 3);
      ctx.bezierCurveTo(width * 0.44, horizon + groundDepth * 0.34, width * 0.38, height * 0.84, width * 0.34, height + 18);
      ctx.lineTo(width * 0.66, height + 18);
      ctx.bezierCurveTo(width * 0.62, height * 0.84, width * 0.56, horizon + groundDepth * 0.34, trailCenter + width * 0.018, horizon + 3);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = hexToRgba(roadColor, roadStyle.edgeAlpha);
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(trailCenter - width * 0.03, horizon + 2);
      ctx.lineTo(width * 0.35, height + 12);
      ctx.moveTo(trailCenter + width * 0.03, horizon + 2);
      ctx.lineTo(width * 0.65, height + 12);
      ctx.stroke();
      for (let i = 0; i < 11; i++) {
        const t = i / 10;
        const y = horizon + Math.pow(t, 1.3) * groundDepth;
        ctx.fillStyle = `rgba(155, 211, 255, ${0.12 + (1 - t) * roadStyle.centerGlowAlpha})`;
        ctx.fillRect(trailCenter - width * 0.006, y, width * 0.012, 2.5);
      }
      for (let i = 0; i < roadStyle.chevronCount; i++) {
        const t = (i + 1) / (roadStyle.chevronCount + 1);
        const y = horizon + Math.pow(t, 1.28) * groundDepth;
        const span = lerp(width * 0.016, width * 0.1, t);
        ctx.strokeStyle = hexToRgba(roadStyle.accent, roadStyle.chevronAlpha * (1 - t * 0.35));
        ctx.lineWidth = lerp(1, 3.2, t);
        ctx.beginPath();
        ctx.moveTo(trailCenter - span, y + 6);
        ctx.lineTo(trailCenter, y);
        ctx.lineTo(trailCenter + span, y + 6);
        ctx.stroke();
      }
      return;
    }

    const trail = ctx.createLinearGradient(0, horizon, 0, height);
    trail.addColorStop(0, hexToRgba(roadColor, 0.1 + normalizedDay * 0.06));
    trail.addColorStop(0.42, hexToRgba(roadColor, 0.2 + normalizedDay * 0.08));
    trail.addColorStop(1, hexToRgba(roadColor, 0.34 + normalizedDay * 0.12));
    ctx.fillStyle = trail;
    ctx.beginPath();
    ctx.moveTo(trailCenter - width * 0.04, horizon + 4);
    ctx.bezierCurveTo(width * 0.36, horizon + groundDepth * 0.34, width * 0.22, height * 0.78, width * 0.08, height + 18);
    ctx.lineTo(width * 0.94, height + 18);
    ctx.bezierCurveTo(width * 0.78, height * 0.78, width * 0.64, horizon + groundDepth * 0.34, trailCenter + width * 0.04, horizon + 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = hexToRgba(edgeColor, roadStyle.edgeAlpha);
    ctx.lineWidth = 2.2;
    for (let side = -1; side <= 1; side += 2) {
      ctx.beginPath();
      ctx.moveTo(trailCenter + side * width * 0.035, horizon + 2);
      ctx.bezierCurveTo(width * (0.5 + side * 0.11), horizon + groundDepth * 0.26, width * (0.5 + side * 0.26), height * 0.74, width * (0.5 + side * 0.42), height + 8);
      ctx.stroke();
    }

    for (let i = 0; i < 16; i++) {
      const t = i / 15;
      const y = horizon + Math.pow(t, 1.38) * groundDepth;
      const spread = lerp(width * 0.015, width * 0.14, t);
      const rutW = lerp(width * 0.007, width * 0.02, t);
      ctx.fillStyle = `rgba(70, 50, 31, ${0.08 + (1 - t) * 0.08})`;
      ctx.fillRect(trailCenter - spread, y, rutW, 2.2 + t * 2.4);
      ctx.fillRect(trailCenter + spread - rutW, y + 1.5, rutW, 2.2 + t * 2.4);
      if (i % 2 === 0) {
        ctx.fillStyle = `rgba(255, 226, 160, ${0.06 + (1 - t) * roadStyle.centerGlowAlpha})`;
        ctx.fillRect(trailCenter - rutW * 0.5, y + 2, rutW, 1.8);
      }
    }

    for (let i = 0; i < roadStyle.chevronCount; i++) {
      const t = (i + 1) / (roadStyle.chevronCount + 1);
      const y = horizon + Math.pow(t, 1.32) * groundDepth;
      const span = lerp(width * 0.018, width * 0.13, t);
      ctx.strokeStyle = hexToRgba(roadStyle.accent, roadStyle.chevronAlpha * (1 - t * 0.4));
      ctx.lineWidth = lerp(1, 3.4, t);
      ctx.beginPath();
      ctx.moveTo(trailCenter - span, y + 7);
      ctx.lineTo(trailCenter, y);
      ctx.lineTo(trailCenter + span, y + 7);
      ctx.stroke();
    }

    for (let i = 0; i < roadStyle.postCount; i++) {
      const t = i / Math.max(1, roadStyle.postCount - 1);
      const y = horizon + Math.pow(t, 1.55) * groundDepth;
      const leftX = lerp(trailCenter - width * 0.045, width * 0.11, t);
      const rightX = lerp(trailCenter + width * 0.045, width * 0.89, t);
      const postH = lerp(8, 42, t);
      ctx.strokeStyle = `rgba(92, 64, 38, ${roadStyle.railAlpha + t * 0.16})`;
      ctx.lineWidth = lerp(1, 3, t);
      ctx.beginPath();
      ctx.moveTo(leftX, y);
      ctx.lineTo(leftX, y + postH);
      ctx.moveTo(rightX, y);
      ctx.lineTo(rightX, y + postH);
      ctx.stroke();
      if (i % 3 === 1) {
        ctx.fillStyle = `rgba(255, 216, 128, ${0.12 + t * 0.16})`;
        ctx.fillRect(rightX - 3, y - 4, 6, 4);
      }
    }
  }

  function drawSkyAndGround(width, height, day, visualMood) {
    if (isIndoors()) {
      return drawInteriorBackdrop(width, height);
    }

    const weather = state.weather;
    const normalizedDay = clamp(day, 0, 1);
    const horizon = Math.floor(height * 0.5);
    const { stormShade, skyTop, skyBottom } = computeAtmosphere(normalizedDay, weather.rain, weather.fog);

    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizon);
    skyGrad.addColorStop(0, `rgb(${skyTop.r}, ${skyTop.g}, ${skyTop.b})`);
    skyGrad.addColorStop(1, `rgb(${skyBottom.r}, ${skyBottom.g}, ${skyBottom.b})`);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, horizon);
    const regionProfile = visualMood?.regionProfile || getRegionVisualIdentity(state.regions.activeRegion);
    if (regionProfile?.skyTint) {
      ctx.fillStyle = hexToRgba(regionProfile.skyTint, 0.1 + normalizedDay * 0.06);
      ctx.fillRect(0, 0, width, horizon);
    }

    if (normalizedDay < 0.35) {
      const starAlpha = clamp((0.35 - normalizedDay) / 0.35, 0, 1) * (1 - weather.rain * 0.75);
      ctx.fillStyle = `rgba(232, 241, 255, ${0.58 * starAlpha})`;
      for (let i = 0; i < 90; i++) {
        const sx = ((i * 137 + 53) % (width + 23)) - 12;
        const sy = (i * 97 + 31) % Math.floor(horizon * 0.85);
        const twinkle = 0.4 + Math.sin(state.time * 0.9 + i * 2.7) * 0.35;
        const size = twinkle > 0.62 ? 2 : 1;
        ctx.globalAlpha = clamp(starAlpha * twinkle, 0, 1);
        ctx.fillRect(sx, sy, size, size);
      }
      ctx.globalAlpha = 1;
    }

    const sunX = width * (0.16 + (Math.sin(state.time * 0.006) * 0.5 + 0.5) * 0.68);
    const sunY = horizon * (0.2 + Math.cos(state.time * 0.006) * 0.08);
    const sunR = lerp(30, 56, normalizedDay);
    if (normalizedDay > 0.16) {
      const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 2.8);
      sunGrad.addColorStop(0, `rgba(255, 247, 204, ${0.68 * normalizedDay * (1 - weather.rain * 0.7)})`);
      sunGrad.addColorStop(1, "rgba(255, 247, 204, 0)");
      ctx.fillStyle = sunGrad;
      ctx.fillRect(0, 0, width, horizon);
      ctx.fillStyle = `rgba(255, 226, 149, ${0.46 * normalizedDay * (1 - weather.rain * 0.75)})`;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR * 0.34, 0, TAU);
      ctx.fill();
    } else {
      const moonGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 2.2);
      moonGrad.addColorStop(0, "rgba(220, 234, 255, 0.52)");
      moonGrad.addColorStop(1, "rgba(220, 234, 255, 0)");
      ctx.fillStyle = moonGrad;
      ctx.fillRect(0, 0, width, horizon);
      ctx.fillStyle = `rgba(227, 238, 255, ${0.34 * (1 - weather.rain * 0.6)})`;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR * 0.28, 0, TAU);
      ctx.fill();
    }

    const cloudCount = 7 + Math.floor(weather.fog * 10);
    const cloudOpacity = 0.12 + normalizedDay * 0.14 + weather.fog * 0.22;

    // Cache cloud gradient if opacity hasn't changed significantly
    if (!cachedCloudGradient || Math.abs(lastCloudOpacity - cloudOpacity) > 0.01) {
      cachedCloudGradient = ctx.createRadialGradient(0, 0, 4, 0, 0, 72);
      cachedCloudGradient.addColorStop(0, `rgba(255,255,255,${cloudOpacity})`);
      cachedCloudGradient.addColorStop(1, "rgba(255,255,255,0)");
      lastCloudOpacity = cloudOpacity;
    }

    for (let i = 0; i < cloudCount; i++) {
      const cx = ((i * 260 + state.time * (6 + i) + state.weather.wind * 230) % (width + 320)) - 140;
      const cy = 58 + (i % 3) * 34 + Math.sin(state.time * 0.1 + i) * 8;

      // Use cached gradient with translation
      ctx.save();
      ctx.translate(cx, cy);
      ctx.fillStyle = cachedCloudGradient;
      ctx.fillRect(-90, -55, 180, 110);
      ctx.restore();
    }

    const dustLine = ctx.createLinearGradient(0, horizon - 88, 0, horizon + 22);
    dustLine.addColorStop(0, "rgba(226, 189, 130, 0)");
    dustLine.addColorStop(0.62, `rgba(226, 189, 130, ${0.08 + weather.fog * 0.08 + normalizedDay * 0.05})`);
    dustLine.addColorStop(1, "rgba(226, 189, 130, 0)");
    ctx.fillStyle = dustLine;
    ctx.fillRect(0, horizon - 88, width, 120);

    const ridge = (amp, offset, elev, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, elev);
      for (let x = 0; x <= width; x += 18) {
        const y = elev + Math.sin(x * 0.006 + offset) * amp + Math.sin(x * 0.011 + offset * 0.75) * amp * 0.52;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, horizon + 120);
      ctx.lineTo(0, horizon + 120);
      ctx.closePath();
      ctx.fill();
    };

    ridge(13, state.time * 0.03, horizon - 52, `rgba(120, 98, 78, ${0.24 + normalizedDay * 0.2 + weather.fog * 0.26})`);
    ridge(18, state.time * 0.04 + 1.4, horizon - 22, `rgba(83, 78, 72, ${0.34 + normalizedDay * 0.18 + weather.fog * 0.24})`);

    ctx.fillStyle = `rgba(45, 73, 50, ${0.32 + normalizedDay * 0.12 + weather.fog * 0.1})`;
    ctx.beginPath();
    ctx.moveTo(0, horizon + 24);
    for (let x = 0; x <= width + 14; x += 14) {
      const treeLine = horizon + 18 + Math.sin(x * 0.02 + state.time * 0.11) * 3;
      const canopy = 7 + ((x / 14) % 3);
      ctx.lineTo(x, treeLine);
      ctx.lineTo(x + 7, treeLine - canopy);
      ctx.lineTo(x + 14, treeLine);
    }
    ctx.lineTo(width, horizon + 38);
    ctx.lineTo(0, horizon + 38);
    ctx.closePath();
    ctx.fill();
    drawRegionHorizonAccents(regionProfile.id, regionProfile, horizon, width, height, normalizedDay, weather);

    const groundGrad = ctx.createLinearGradient(0, horizon, 0, height);
    groundGrad.addColorStop(
      0,
      `rgb(${Math.floor(lerp(48, 128, normalizedDay) * (1 - weather.rain * 0.18))}, ${Math.floor(lerp(61, 148, normalizedDay) * (1 - weather.rain * 0.22))}, ${Math.floor(
        lerp(50, 96, normalizedDay) * (1 - weather.rain * 0.16),
      )})`,
    );
    groundGrad.addColorStop(
      1,
      `rgb(${Math.floor(lerp(36, 91, normalizedDay) * (1 - weather.rain * 0.14))}, ${Math.floor(lerp(43, 107, normalizedDay) * (1 - weather.rain * 0.18))}, ${Math.floor(
        lerp(34, 68, normalizedDay) * (1 - weather.rain * 0.12),
      )})`,
    );
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, horizon, width, height - horizon);
    if (regionProfile?.groundPalette?.length) {
      ctx.fillStyle = hexToRgba(regionProfile.groundPalette[0], 0.1);
      ctx.fillRect(0, horizon, width, height - horizon);
    }

    const trailCenter = width * 0.5 + Math.sin(state.player.angle * 1.7) * width * 0.08;
    drawRegionRoadSurface(regionProfile.id, regionProfile, horizon, width, height, trailCenter, normalizedDay);

    const groundDepth = height - horizon;
    for (let i = 0; i < 30; i++) {
      const t = i / 29;
      const y = horizon + t * t * (height - horizon);
      const alpha = (1 - t) * 0.12;
      ctx.strokeStyle = `rgba(34, 66, 42, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(0, y + (i % 2));
      ctx.lineTo(width, y + (i % 2));
      ctx.stroke();
    }

    if (weather.fog > 0.06) {
      const haze = ctx.createLinearGradient(0, horizon - 20, 0, height);
      haze.addColorStop(0, `rgba(204, 219, 232, ${weather.fog * 0.2})`);
      haze.addColorStop(1, `rgba(204, 219, 232, ${weather.fog * 0.34})`);
      ctx.fillStyle = haze;
      ctx.fillRect(0, horizon - 20, width, height - horizon + 20);
    }

    // Graphics V2: stronger cinematic grade in sky/ground pass.
    if (visualMood) {
      const tint = visualMood.skyTint;
      ctx.fillStyle = `rgba(${tint.r + 40}, ${tint.g + 20}, ${tint.b + 50}, ${Math.min(0.24, visualMood.gradeStrength * 0.46)})`;
      ctx.fillRect(0, 0, width, height);
    }

    // Day/night phase tint — multiplicative-ish overlay. Day is neutral
    // (effectively a no-op); dusk/night darken and shift.
    if (state.world && typeof state.world.timeOfDay === "number") {
      const phaseTint = resolvePhaseTint(state.world.timeOfDay);
      if (phaseTint.brightness < 0.999) {
        const darken = Math.min(0.9, (1 - phaseTint.brightness) * 0.85);
        const shiftR = Math.round(20 * (phaseTint.r - 1));
        const shiftG = Math.round(20 * (phaseTint.g - 1));
        const shiftB = Math.round(40 * (phaseTint.b - 1));
        ctx.fillStyle = `rgba(${10 + shiftR}, ${10 + shiftG}, ${30 + shiftB}, ${darken})`;
        ctx.fillRect(0, 0, width, height);
      }
    }

    return horizon;
  }

  function drawGroundDetails(horizon, width, height, visualMood) {
    if (state.player.inHouse) return;

    const weather = state.weather;
    const depth = height - horizon;
    const regionProfile = visualMood?.regionProfile || getRegionVisualIdentity(state.regions.activeRegion);
    const regionId = regionProfile.id;

    if (regionId === "ashfall") {
      const shardCount = Math.floor(width / 9);
      for (let i = 0; i < shardCount; i++) {
        const t = ((i * 53) % 100) / 100;
        const near = 1 - t;
        const y = horizon + Math.pow(t, 1.28) * depth;
        const x = (i * 71.7 + 13) % width;
        const heightScale = 3 + near * 12;
        const lean = Math.sin(state.time * 0.45 + i * 0.8) * (1.5 + near * 3);
        ctx.strokeStyle = `rgba(${182 + near * 28}, ${108 + near * 24}, ${72 + near * 18}, ${0.12 + near * 0.26})`;
        ctx.lineWidth = 0.8 + near * 1.1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + lean, y - heightScale);
        ctx.stroke();
      }
      for (let i = 0; i < Math.floor(width / 12); i++) {
        const t = ((i * 41) % 100) / 100;
        const near = 1 - t;
        const y = horizon + (0.5 + t * 0.48) * depth;
        const x = (i * 83.2 + 7) % width;
        ctx.fillStyle = `rgba(255, 194, 126, ${0.06 + near * 0.12})`;
        ctx.fillRect(x, y, 1.4 + near * 2.2, 1.1 + near * 0.6);
      }
      for (let i = 0; i < Math.floor(width / 75); i++) {
        const baseX = (i * 163 + 29) % width;
        const baseY = height - 14 - ((i * 31) % 44);
        ctx.strokeStyle = "rgba(76, 54, 40, 0.34)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(baseX - 8, baseY + 2);
        ctx.lineTo(baseX + 3, baseY - 9);
        ctx.lineTo(baseX + 12, baseY + 4);
        ctx.stroke();
      }
      return;
    }

    if (regionId === "ironlantern") {
      for (let i = 0; i < Math.floor(width / 10); i++) {
        const t = ((i * 59) % 100) / 100;
        const near = 1 - t;
        const y = horizon + Math.pow(t, 1.18) * depth;
        const x = (i * 79.4 + 9) % width;
        const barWidth = 2 + near * 4;
        ctx.fillStyle = `rgba(95, 122, 157, ${0.1 + near * 0.16})`;
        ctx.fillRect(x, y, barWidth, 1.2 + near * 0.4);
        ctx.fillStyle = `rgba(155, 211, 255, ${0.08 + near * 0.18})`;
        ctx.fillRect(x + 0.4, y - 0.8, Math.max(1, barWidth - 0.8), 0.9);
      }
      for (let i = 0; i < Math.floor(width / 58); i++) {
        const baseX = (i * 149 + 47) % width;
        const baseY = height - 16 - ((i * 17) % 30);
        ctx.strokeStyle = "rgba(120, 145, 186, 0.22)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(baseX - 10, baseY);
        ctx.lineTo(baseX + 10, baseY - 3);
        ctx.stroke();
      }
      return;
    }

    const tuftCount = Math.floor(width / 7);

    for (let i = 0; i < tuftCount; i++) {
      const t = ((i * 67) % 100) / 100;
      const near = 1 - t;
      const y = horizon + Math.pow(t, 1.35) * depth;
      const x = (i * 53.7) % width;
      const sway = Math.sin(state.time * (1.7 + weather.wind * 2.4) + i * 0.93) * (1.4 + weather.wind * 7.2) * near;
      const length = 2 + near * 12;
      const tint = 55 + near * 55 - weather.rain * 16;
      const moodPush = visualMood ? visualMood.gradeStrength * 28 : 0;
      ctx.strokeStyle = `rgba(${24 + near * 20}, ${tint}, ${30 + near * 18}, ${0.12 + near * 0.3})`;
      if (moodPush > 0) {
        ctx.strokeStyle = `rgba(${28 + near * 24 + moodPush * 0.2}, ${tint + moodPush * 0.35}, ${34 + near * 16 + moodPush * 0.3}, ${0.14 + near * 0.34})`;
      }
      ctx.lineWidth = 0.8 + near * 1.05;
      ctx.beginPath();
      ctx.moveTo(x + sway, y + 1);
      ctx.lineTo(x + sway + weather.wind * 4 * near, y - length);
      ctx.stroke();
    }

    const pebbleCount = Math.floor(width / 11);
    for (let i = 0; i < pebbleCount; i++) {
      const t = ((i * 37) % 100) / 100;
      const near = 1 - t;
      const y = horizon + (0.5 + t * 0.48) * depth;
      const x = (i * 91.3 + 19) % width;
      const size = 0.7 + near * 2.2;
      ctx.fillStyle = `rgba(${78 + near * 22}, ${84 + near * 18}, ${72 + near * 15}, ${0.09 + near * 0.18})`;
      ctx.fillRect(x, y, size, size * 0.72);
    }

    const scrubCount = Math.floor(width / 64);
    for (let i = 0; i < scrubCount; i++) {
      const baseX = (i * 157 + 41) % width;
      const baseY = height - 18 - ((i * 29) % 50);
      const scale = 0.7 + ((i * 17) % 10) / 10;
      ctx.strokeStyle = `rgba(70, 91, 58, ${0.18 + scale * 0.08})`;
      ctx.lineWidth = 1.2;
      for (let branch = 0; branch < 5; branch++) {
        const angle = -Math.PI / 2 + (branch - 2) * 0.38;
        const len = (12 + branch * 3) * scale;
        ctx.beginPath();
        ctx.moveTo(baseX, baseY);
        ctx.lineTo(baseX + Math.cos(angle) * len, baseY + Math.sin(angle) * len);
        ctx.stroke();
      }
    }
  }

  function drawWeatherOverlay(visualMood) {
    if (state.player.inHouse) return;

    const weather = state.weather;
    const dustAlpha = clamp((0.24 + weather.wind * 0.34) * (1 - weather.rain * 0.85), 0, 0.34);
    if (dustAlpha > 0.03) {
      ctx.fillStyle = `rgba(246, 214, 156, ${dustAlpha})`;
      const motes = Math.floor(canvas.width / 18);
      for (let i = 0; i < motes; i++) {
        const x = ((i * 101 + state.time * (18 + weather.wind * 64)) % (canvas.width + 80)) - 40;
        const y = ((i * 67 + Math.sin(state.time * 0.4 + i) * 30) % canvas.height);
        const size = 0.7 + ((i * 13) % 9) * 0.11;
        ctx.globalAlpha = dustAlpha * (0.35 + ((i * 7) % 10) / 20);
        ctx.fillRect(x, y, size, size);
      }
      ctx.globalAlpha = 1;
    }

    if (weather.rain > 0.03) {
      const depthBoost = visualMood?.rainDepthStrength || 0;
      const streaks = Math.floor(canvas.width * (0.03 + weather.rain * (0.1 + depthBoost * 0.08)));
      ctx.strokeStyle = `rgba(196, 218, 238, ${0.1 + weather.rain * 0.2})`;
      ctx.lineWidth = 1.1;
      for (let i = 0; i < streaks; i++) {
        const x = ((i * 29 + state.time * (300 + weather.wind * 500)) % (canvas.width + 80)) - 40;
        const y = ((i * 53 + state.time * (590 + weather.rain * 700)) % (canvas.height + 100)) - 50;
        const len = 12 + weather.rain * 11;
        const dx = 3 + weather.wind * 18;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + dx, y + len);
        ctx.stroke();
      }
    }

    if (weather.kind === "sandstorm") {
      const bands = Math.floor(canvas.width / 14);
      for (let i = 0; i < bands; i++) {
        const x = ((i * 37 + state.time * (120 + weather.wind * 80)) % (canvas.width + 120)) - 60;
        const y = ((i * 23 + state.time * 20) % canvas.height);
        const w = 12 + (i % 5) * 4;
        const h = 1 + (i % 3);
        ctx.fillStyle = `rgba(219, 171, 114, ${0.12 + weather.wind * 0.12})`;
        ctx.fillRect(x, y, w, h);
      }
    }

    if (weather.fog > 0.08) {
      const fog = ctx.createLinearGradient(0, 0, 0, canvas.height);
      fog.addColorStop(0, `rgba(229, 221, 202, ${weather.fog * 0.07})`);
      fog.addColorStop(0.55, `rgba(220, 214, 197, ${weather.fog * 0.12})`);
      fog.addColorStop(1, `rgba(198, 180, 150, ${weather.fog * 0.22})`);
      ctx.fillStyle = fog;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (weather.lightning > 0.01) {
      const flash = clamp(weather.lightning, 0, 1);
      ctx.fillStyle = `rgba(242, 247, 255, ${flash * 0.28})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (visualMood?.weatherHazardTint) {
      const tint = visualMood.weatherHazardTint;
      ctx.fillStyle = `rgba(${tint.r}, ${tint.g}, ${tint.b}, ${tint.a})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  function drawBillboardSprite(sprite, left, top, spriteWidth, spriteHeight, lightFactor) {
    ctx.save();
    ctx.translate(left, top);
    const gradientCacheEnabled = isGradientCacheEnabled();
    const sizeKey = `${Math.max(8, Math.round(spriteWidth / 8) * 8)}x${Math.max(8, Math.round(spriteHeight / 8) * 8)}`;
    const distNorm = clamp(numberOr(sprite.distToPlayer, MAX_RAY_DIST) / MAX_RAY_DIST, 0, 0.999);
    const distBand = Math.max(0, Math.min(7, Math.floor(distNorm * 8)));

    const cbPalSprite = latestColorblindPalette;
    const enemyGlow = cbPalSprite ? hexToRgba(cbPalSprite.foe, 0.38) : "rgba(112, 246, 126, 0.38)";
    const npcGlow = cbPalSprite ? hexToRgba(cbPalSprite.friend, 0.32) : "rgba(255, 220, 163, 0.16)";
    // Windup pulse: when enemy is winding up, pulse a saturated red overlay glow.
    let enemyEffectiveGlow = enemyGlow;
    if (sprite.kind === "enemy" && sprite.windupTimer && sprite.windupTimer > 0) {
      const pulse = 0.55 + 0.45 * Math.sin(state.time * 18);
      enemyEffectiveGlow = `rgba(255, 48, 48, ${0.6 + 0.35 * pulse})`;
    }
    // Status overlay glow when burning/freezing/shocked (visual feedback only).
    if (sprite.kind === "enemy" && sprite.statuses && sprite.statuses.length > 0) {
      const top = sprite.statuses[0];
      if (top.kind === "burn") enemyEffectiveGlow = "rgba(255, 138, 56, 0.55)";
      else if (top.kind === "frost") enemyEffectiveGlow = "rgba(140, 220, 255, 0.55)";
      else if (top.kind === "shock") enemyEffectiveGlow = "rgba(255, 240, 140, 0.55)";
      else if (top.kind === "bleed") enemyEffectiveGlow = "rgba(220, 60, 80, 0.55)";
    }
    const glowColor =
      sprite.kind === "enemy" ? enemyEffectiveGlow :
        sprite.kind === "npc" ? npcGlow :
          sprite.kind === "resource" && sprite.label === "Crystal" ? "rgba(124, 205, 255, 0.35)" :
            sprite.kind === "resource" && sprite.label === "Archive" ? "rgba(218, 108, 255, 0.34)" :
              "rgba(255, 220, 163, 0.16)";
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = sprite.kind === "enemy" || sprite.label === "Crystal" || sprite.label === "Archive" ? 14 : 6;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = `rgba(0, 0, 0, ${0.24 * lightFactor})`;
    ctx.beginPath();
    ctx.ellipse(spriteWidth * 0.5, spriteHeight * 0.94, spriteWidth * 0.42, spriteHeight * 0.1, 0, 0, TAU);
    ctx.fill();
    ctx.shadowOffsetY = 0;

    if (sprite.kind === "npc") {
      const cycle = resolveWalkCycle({
        id: sprite.label || sprite.color,
        time: state.time,
        kind: "npc",
        moving: sprite.moving !== false,
      });
      const bobPx = cycle.bob * spriteHeight;
      const swayPx = cycle.swayX * spriteWidth;
      const robe = getCachedGradient(
        `sprite-npc-robe|${sizeKey}|${sprite.color}`,
        () => {
          const g = ctx.createLinearGradient(0, 0, 0, spriteHeight);
          g.addColorStop(0, shadeHex(sprite.color, 1.2));
          g.addColorStop(1, shadeHex(sprite.color, 0.55));
          return g;
        },
        gradientCacheEnabled,
      );
      ctx.fillStyle = robe;
      ctx.strokeStyle = "rgba(21, 18, 16, 0.34)";
      ctx.lineWidth = Math.max(1, spriteWidth * 0.025);
      ctx.fillRect(spriteWidth * 0.3 + swayPx, spriteHeight * 0.3 + bobPx, spriteWidth * 0.4, spriteHeight * 0.5);
      ctx.strokeRect(spriteWidth * 0.3 + swayPx, spriteHeight * 0.3 + bobPx, spriteWidth * 0.4, spriteHeight * 0.5);
      ctx.fillStyle = "rgba(30, 23, 18, 0.24)";
      ctx.fillRect(spriteWidth * 0.36 + swayPx, spriteHeight * 0.58 + bobPx, spriteWidth * 0.28, spriteHeight * 0.04);
      // Alternating legs — sweep one forward while the other tucks back.
      const legSweep = cycle.legPhase * cycle.legAmp * spriteHeight;
      ctx.fillStyle = shadeHex(sprite.color, 0.42);
      ctx.fillRect(spriteWidth * 0.36 + swayPx, spriteHeight * 0.78 - Math.max(0, legSweep), spriteWidth * 0.1, spriteHeight * 0.16 + Math.max(0, legSweep));
      ctx.fillRect(spriteWidth * 0.54 + swayPx, spriteHeight * 0.78 + Math.max(0, -legSweep), spriteWidth * 0.1, spriteHeight * 0.16 + Math.max(0, -legSweep));
      ctx.fillStyle = "#e0c0a7";
      ctx.beginPath();
      ctx.arc(spriteWidth * 0.5 + swayPx * 0.6, spriteHeight * 0.2 + bobPx * 1.2, Math.max(3, spriteWidth * 0.14), 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#4e3428";
      ctx.fillRect(spriteWidth * 0.38 + swayPx * 0.6, spriteHeight * 0.08 + bobPx * 1.2, spriteWidth * 0.24, spriteHeight * 0.06);
      ctx.fillStyle = "rgba(42, 30, 24, 0.72)";
      ctx.fillRect(spriteWidth * 0.43 + swayPx * 0.6, spriteHeight * 0.18 + bobPx * 1.2, spriteWidth * 0.035, spriteHeight * 0.025);
      ctx.fillRect(spriteWidth * 0.55 + swayPx * 0.6, spriteHeight * 0.18 + bobPx * 1.2, spriteWidth * 0.035, spriteHeight * 0.025);
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(spriteWidth * 0.35 + swayPx, spriteHeight * 0.34 + bobPx, spriteWidth * 0.06, spriteHeight * 0.35);
    } else if (sprite.kind === "enemy") {
      const enemyBase = sprite.color || "#6be873";
      const enemyTypeKey = sprite.enemyType || "slime";
      const cue = sprite.readabilityCue || resolveEnemyReadabilityCue(sprite);
      const enemyCycle = resolveWalkCycle({
        id: `${enemyTypeKey}-${sprite.label || ""}`,
        time: state.time,
        kind: "enemy",
        moving: (sprite.windupTimer || 0) <= 0,
      });
      const enemyAttack = resolveAttackCycle({
        windupTimer: sprite.windupTimer,
        windupMax: sprite.windupMax,
      });
      const breathScale = 1 + enemyCycle.breath;
      const lungeY = enemyAttack.active ? -enemyAttack.lunge * spriteHeight * 0.04 : enemyCycle.bob * spriteHeight;
      const bodyScale = clamp((cue.bodyScale || 1) * breathScale, 0.86, 1.2);
      if ((sprite.windupTimer || 0) > 0) {
        const windupPulse = 0.5 + Math.sin(state.time * 18) * 0.5;
        const windupRatio = clamp(sprite.windupTimer / Math.max(0.01, sprite.windupMax || sprite.windupTimer), 0, 1);
        drawSpriteGlow(spriteWidth * 0.5, spriteHeight * 0.5, spriteWidth * (0.66 + windupPulse * 0.18), "#ff4438", 0.18 + windupPulse * 0.15);
        drawSpritePulseRing(spriteWidth * 0.5, spriteHeight * 0.52, spriteWidth * (0.46 + (1 - windupRatio) * 0.2), "#ffcf65", 0.44 + windupPulse * 0.28, spriteWidth * 0.035);
      }
      if (cue.fillAlpha > 0) {
        const pulse = cue.pulseRate ? (Math.sin(state.time * cue.pulseRate) * 0.5 + 0.5) : 0.5;
        ctx.fillStyle = hexToRgbaUtil(cue.color || "#ffd77b", clamp(cue.fillAlpha + pulse * 0.08, 0, 0.32));
        ctx.beginPath();
        ctx.ellipse(spriteWidth * 0.5, spriteHeight * 0.5, spriteWidth * 0.52, spriteHeight * 0.48, 0, 0, TAU);
        ctx.fill();
      }
      if (cue.outlineAlpha > 0.3) {
        const ringPulse = cue.pulseRate ? (Math.sin(state.time * cue.pulseRate) * 0.5 + 0.5) : 0.4;
        ctx.strokeStyle = hexToRgbaUtil(cue.ringColor || cue.color || "#ffd77b", clamp(cue.outlineAlpha * (0.72 + ringPulse * 0.28), 0, 1));
        ctx.lineWidth = Math.max(2, spriteWidth * 0.035);
        ctx.beginPath();
        ctx.ellipse(spriteWidth * 0.5, spriteHeight * 0.52, spriteWidth * 0.48 * bodyScale, spriteHeight * 0.43 * bodyScale, 0, 0, TAU);
        ctx.stroke();
      }
      const slime = getCachedGradient(
        `sprite-enemy-core|${enemyTypeKey}|band${distBand}|${sizeKey}|${enemyBase}`,
        () => {
          const g = ctx.createRadialGradient(spriteWidth * 0.45, spriteHeight * 0.34, 2, spriteWidth * 0.45, spriteHeight * 0.52, spriteHeight * 0.5);
          g.addColorStop(0, shadeHex(enemyBase, 1.72));
          g.addColorStop(0.58, enemyBase);
          g.addColorStop(1, shadeHex(enemyBase, 0.5));
          return g;
        },
        gradientCacheEnabled,
      );
      ctx.save();
      ctx.translate(0, lungeY);
      ctx.fillStyle = slime;
      ctx.beginPath();
      ctx.moveTo(spriteWidth * 0.14, spriteHeight * 0.84);
      ctx.quadraticCurveTo(spriteWidth * (0.07 - (bodyScale - 1) * 0.05), spriteHeight * 0.45, spriteWidth * 0.33, spriteHeight * (0.2 - (bodyScale - 1) * 0.06));
      ctx.quadraticCurveTo(spriteWidth * 0.5, spriteHeight * (0.08 - (bodyScale - 1) * 0.08), spriteWidth * 0.67, spriteHeight * (0.2 - (bodyScale - 1) * 0.06));
      ctx.quadraticCurveTo(spriteWidth * (0.93 + (bodyScale - 1) * 0.05), spriteHeight * 0.45, spriteWidth * 0.86, spriteHeight * 0.84);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(10, 32, 20, 0.42)";
      ctx.lineWidth = Math.max(1, spriteWidth * 0.028);
      ctx.stroke();
      ctx.fillStyle = shadeHex(enemyBase, 0.32);
      ctx.fillRect(spriteWidth * 0.34, spriteHeight * 0.43, spriteWidth * 0.08, spriteHeight * 0.06);
      ctx.fillRect(spriteWidth * 0.58, spriteHeight * 0.43, spriteWidth * 0.08, spriteHeight * 0.06);
      ctx.fillStyle = "rgba(255, 255, 255, 0.32)";
      ctx.beginPath();
      ctx.arc(spriteWidth * 0.38, spriteHeight * 0.33, spriteWidth * 0.06, 0, TAU);
      ctx.fill();
      ctx.restore();
      if ((sprite.flashTimer || 0) > 0) {
        ctx.fillStyle = "rgba(255, 248, 216, 0.42)";
        ctx.beginPath();
        ctx.ellipse(spriteWidth * 0.5, spriteHeight * 0.5, spriteWidth * 0.36, spriteHeight * 0.36, 0, 0, TAU);
        ctx.fill();
      }
      if ((sprite.windupTimer || 0) > 0) {
        const ratio = clamp(sprite.windupTimer / Math.max(0.01, sprite.windupMax || sprite.windupTimer), 0, 1);
        ctx.strokeStyle = "rgba(255, 215, 123, 0.9)";
        ctx.lineWidth = Math.max(2, spriteWidth * 0.045);
        ctx.beginPath();
        ctx.arc(spriteWidth * 0.5, spriteHeight * 0.48, spriteWidth * (0.42 + (1 - ratio) * 0.16), Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
        ctx.fillStyle = "rgba(255, 72, 56, 0.94)";
        ctx.beginPath();
        ctx.moveTo(spriteWidth * 0.5, spriteHeight * 0.02);
        ctx.lineTo(spriteWidth * 0.62, spriteHeight * 0.23);
        ctx.lineTo(spriteWidth * 0.38, spriteHeight * 0.23);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#fff4cf";
        ctx.font = `bold ${Math.max(10, spriteWidth * 0.18)}px Georgia`;
        ctx.textAlign = "center";
        ctx.fillText("!", spriteWidth * 0.5, spriteHeight * 0.2);
        ctx.textAlign = "left";
      }
    } else if (sprite.kind === "pig") {
      const hatColor = sprite.hatColor || "#5b4129";
      const bandanaColor = sprite.bandanaColor || "#8e4040";
      const trot = Math.sin((sprite.gaitPhase || 0) + state.time * 1.4) * 0.5 + 0.5;
      const body = getCachedGradient(
        `sprite-pig-body|${sizeKey}`,
        () => {
          const g = ctx.createLinearGradient(0, spriteHeight * 0.26, 0, spriteHeight * 0.9);
          g.addColorStop(0, "#efb8b2");
          g.addColorStop(1, "#d58f8a");
          return g;
        },
        gradientCacheEnabled,
      );
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(spriteWidth * 0.5, spriteHeight * 0.62, spriteWidth * 0.32, spriteHeight * 0.24, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(80, 48, 48, 0.32)";
      ctx.lineWidth = Math.max(1, spriteWidth * 0.025);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(spriteWidth * 0.5, spriteHeight * 0.38, spriteWidth * 0.24, spriteHeight * 0.18, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = bandanaColor;
      ctx.fillRect(spriteWidth * 0.38, spriteHeight * 0.5, spriteWidth * 0.24, spriteHeight * 0.05);
      ctx.fillStyle = "#f3cbc6";
      ctx.beginPath();
      ctx.ellipse(spriteWidth * 0.5, spriteHeight * 0.45, spriteWidth * 0.16, spriteHeight * 0.1, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#7a4f50";
      ctx.fillRect(spriteWidth * 0.45, spriteHeight * 0.43, spriteWidth * 0.03, spriteHeight * 0.04);
      ctx.fillRect(spriteWidth * 0.53, spriteHeight * 0.43, spriteWidth * 0.03, spriteHeight * 0.04);
      ctx.fillStyle = "#432f35";
      ctx.fillRect(spriteWidth * 0.34, spriteHeight * 0.37, spriteWidth * 0.06, spriteHeight * 0.03);
      ctx.fillRect(spriteWidth * 0.6, spriteHeight * 0.37, spriteWidth * 0.06, spriteHeight * 0.03);
      ctx.fillStyle = "#d18986";
      ctx.beginPath();
      ctx.moveTo(spriteWidth * 0.32, spriteHeight * 0.28);
      ctx.lineTo(spriteWidth * 0.39, spriteHeight * 0.2);
      ctx.lineTo(spriteWidth * 0.41, spriteHeight * 0.33);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(spriteWidth * 0.68, spriteHeight * 0.28);
      ctx.lineTo(spriteWidth * 0.61, spriteHeight * 0.2);
      ctx.lineTo(spriteWidth * 0.59, spriteHeight * 0.33);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#c97574";
      ctx.lineWidth = Math.max(1, spriteWidth * 0.03);
      ctx.beginPath();
      ctx.arc(spriteWidth * 0.75, spriteHeight * 0.62, spriteWidth * 0.08, 0, TAU * 0.8);
      ctx.stroke();
      ctx.fillStyle = hatColor;
      ctx.fillRect(spriteWidth * 0.28, spriteHeight * 0.23, spriteWidth * 0.44, spriteHeight * 0.04);
      ctx.fillRect(spriteWidth * 0.36, spriteHeight * 0.14, spriteWidth * 0.28, spriteHeight * 0.09);
      if (sprite.role === "Sheriff") {
        ctx.fillStyle = "#d8b754";
        ctx.beginPath();
        ctx.moveTo(spriteWidth * 0.5, spriteHeight * 0.18);
        ctx.lineTo(spriteWidth * 0.53, spriteHeight * 0.24);
        ctx.lineTo(spriteWidth * 0.6, spriteHeight * 0.24);
        ctx.lineTo(spriteWidth * 0.54, spriteHeight * 0.28);
        ctx.lineTo(spriteWidth * 0.56, spriteHeight * 0.35);
        ctx.lineTo(spriteWidth * 0.5, spriteHeight * 0.3);
        ctx.lineTo(spriteWidth * 0.44, spriteHeight * 0.35);
        ctx.lineTo(spriteWidth * 0.46, spriteHeight * 0.28);
        ctx.lineTo(spriteWidth * 0.4, spriteHeight * 0.24);
        ctx.lineTo(spriteWidth * 0.47, spriteHeight * 0.24);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = "#8f6663";
      const legLift = trot * spriteHeight * 0.025;
      ctx.fillRect(spriteWidth * 0.34, spriteHeight * 0.78 - legLift, spriteWidth * 0.06, spriteHeight * 0.12 + legLift);
      ctx.fillRect(spriteWidth * 0.43, spriteHeight * 0.8 + legLift * 0.3, spriteWidth * 0.06, spriteHeight * 0.1 - legLift * 0.3);
      ctx.fillRect(spriteWidth * 0.54, spriteHeight * 0.78 + legLift * 0.2, spriteWidth * 0.06, spriteHeight * 0.12 - legLift * 0.2);
      ctx.fillRect(spriteWidth * 0.63, spriteHeight * 0.8 - legLift * 0.4, spriteWidth * 0.06, spriteHeight * 0.1 + legLift * 0.4);
    } else if (sprite.kind === "resource" && sprite.label === "Tree") {
      ctx.fillStyle = "#63472f";
      ctx.fillRect(spriteWidth * 0.44, spriteHeight * 0.36, spriteWidth * 0.14, spriteHeight * 0.58);
      ctx.fillStyle = "#3f824b";
      ctx.beginPath();
      ctx.arc(spriteWidth * 0.5, spriteHeight * 0.33, spriteWidth * 0.27, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(184, 231, 170, 0.38)";
      ctx.beginPath();
      ctx.arc(spriteWidth * 0.42, spriteHeight * 0.26, spriteWidth * 0.12, 0, TAU);
      ctx.fill();
    } else if (sprite.kind === "resource" && sprite.label === "Stone") {
      ctx.fillStyle = "#8f969f";
      ctx.beginPath();
      ctx.moveTo(spriteWidth * 0.2, spriteHeight * 0.85);
      ctx.lineTo(spriteWidth * 0.27, spriteHeight * 0.42);
      ctx.lineTo(spriteWidth * 0.51, spriteHeight * 0.2);
      ctx.lineTo(spriteWidth * 0.77, spriteHeight * 0.45);
      ctx.lineTo(spriteWidth * 0.82, spriteHeight * 0.84);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillRect(spriteWidth * 0.4, spriteHeight * 0.35, spriteWidth * 0.08, spriteHeight * 0.24);
    } else if (sprite.kind === "resource") {
      ctx.fillStyle = "#8fd0ff";
      ctx.beginPath();
      ctx.moveTo(spriteWidth * 0.5, spriteHeight * 0.1);
      ctx.lineTo(spriteWidth * 0.8, spriteHeight * 0.44);
      ctx.lineTo(spriteWidth * 0.5, spriteHeight * 0.9);
      ctx.lineTo(spriteWidth * 0.2, spriteHeight * 0.44);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(spriteWidth * 0.46, spriteHeight * 0.2, spriteWidth * 0.08, spriteHeight * 0.5);
    } else if (sprite.kind === "chest") {
      const wood = getCachedGradient(
        `sprite-chest-wood|${sizeKey}`,
        () => {
          const g = ctx.createLinearGradient(0, 0, 0, spriteHeight);
          g.addColorStop(0, "#bc8b55");
          g.addColorStop(1, "#6c4b30");
          return g;
        },
        gradientCacheEnabled,
      );
      ctx.fillStyle = wood;
      ctx.fillRect(spriteWidth * 0.18, spriteHeight * 0.45, spriteWidth * 0.64, spriteHeight * 0.45);
      ctx.fillStyle = "#c8ac43";
      ctx.fillRect(spriteWidth * 0.46, spriteHeight * 0.52, spriteWidth * 0.08, spriteHeight * 0.22);
      ctx.fillStyle = "#8b6c3e";
      ctx.fillRect(spriteWidth * 0.18, spriteHeight * 0.42, spriteWidth * 0.64, spriteHeight * 0.08);
    } else if (sprite.kind === "pressure") {
      const pulse = 0.5 + Math.sin(state.time * 5) * 0.5;
      drawSpriteGlow(spriteWidth * 0.5, spriteHeight * 0.5, spriteWidth * (0.5 + pulse * 0.12), "#ffd77b", 0.17 + pulse * 0.14);
      drawSpritePulseRing(spriteWidth * 0.5, spriteHeight * 0.56, spriteWidth * (0.32 + pulse * 0.08), "#fff0b8", 0.24 + pulse * 0.24, spriteWidth * 0.025);
      ctx.fillStyle = "rgba(255, 215, 123, 0.18)";
      ctx.beginPath();
      ctx.arc(spriteWidth * 0.5, spriteHeight * 0.52, spriteWidth * (0.34 + pulse * 0.08), 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#6c4a2c";
      ctx.fillRect(spriteWidth * 0.3, spriteHeight * 0.58, spriteWidth * 0.4, spriteHeight * 0.28);
      ctx.fillStyle = sprite.color || "#ffd77b";
      ctx.fillRect(spriteWidth * 0.34, spriteHeight * 0.52, spriteWidth * 0.32, spriteHeight * 0.08);
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = `rgba(220, 213, 188, ${0.18 + i * 0.08})`;
        ctx.beginPath();
        ctx.ellipse(spriteWidth * (0.4 + i * 0.08), spriteHeight * (0.36 - i * 0.08), spriteWidth * 0.12, spriteHeight * 0.1, 0, 0, TAU);
        ctx.fill();
      }
    } else if (sprite.kind === "roadside-discovery") {
      const color = sprite.color || "#d8bc6a";
      const pulse = 0.5 + Math.sin(state.time * 4.6) * 0.5;
      drawSpriteGlow(spriteWidth * 0.5, spriteHeight * 0.58, spriteWidth * (0.42 + pulse * 0.08), color, 0.1 + pulse * 0.08);
      ctx.fillStyle = `rgba(255, 232, 168, ${0.16 + pulse * 0.12})`;
      ctx.beginPath();
      ctx.arc(spriteWidth * 0.5, spriteHeight * 0.6, spriteWidth * (0.32 + pulse * 0.06), 0, TAU);
      ctx.fill();
      if (sprite.poiKind === "wagon") {
        ctx.fillStyle = shadeHex(color, 0.46);
        ctx.fillRect(spriteWidth * 0.2, spriteHeight * 0.48, spriteWidth * 0.6, spriteHeight * 0.18);
        ctx.fillRect(spriteWidth * 0.28, spriteHeight * 0.36, spriteWidth * 0.44, spriteHeight * 0.12);
        ctx.strokeStyle = "#5b402b";
        ctx.lineWidth = Math.max(1.6, spriteWidth * 0.04);
        ctx.beginPath();
        ctx.arc(spriteWidth * 0.32, spriteHeight * 0.74, spriteWidth * 0.1, 0, TAU);
        ctx.arc(spriteWidth * 0.68, spriteHeight * 0.74, spriteWidth * 0.1, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.fillRect(spriteWidth * 0.22, spriteHeight * 0.32, spriteWidth * 0.08, spriteHeight * 0.18);
        drawSpriteGlow(spriteWidth * 0.26, spriteHeight * 0.34, spriteWidth * 0.18, "#ffd27a", 0.28 + pulse * 0.14);
        ctx.fillStyle = "#fff0b8";
        ctx.fillRect(spriteWidth * 0.24, spriteHeight * 0.34, spriteWidth * 0.04, spriteHeight * 0.06);
      } else if (sprite.poiKind === "shrine") {
        drawSpriteGlow(spriteWidth * 0.5, spriteHeight * 0.26, spriteWidth * (0.32 + pulse * 0.08), "#d9a8ff", 0.16 + pulse * 0.13);
        ctx.fillStyle = shadeHex(color, 0.42);
        ctx.fillRect(spriteWidth * 0.42, spriteHeight * 0.34, spriteWidth * 0.16, spriteHeight * 0.52);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(spriteWidth * 0.5, spriteHeight * 0.12);
        ctx.lineTo(spriteWidth * 0.74, spriteHeight * 0.42);
        ctx.lineTo(spriteWidth * 0.26, spriteHeight * 0.42);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "rgba(255, 246, 205, 0.34)";
        ctx.fillRect(spriteWidth * 0.47, spriteHeight * 0.16, spriteWidth * 0.06, spriteHeight * 0.12);
      } else {
        drawSpriteGlow(spriteWidth * 0.5, spriteHeight * 0.64, spriteWidth * (0.24 + pulse * 0.08), "#ff9f46", 0.22 + pulse * 0.16);
        ctx.fillStyle = "#5b402b";
        ctx.fillRect(spriteWidth * 0.28, spriteHeight * 0.54, spriteWidth * 0.44, spriteHeight * 0.3);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(spriteWidth * 0.16, spriteHeight * 0.58);
        ctx.lineTo(spriteWidth * 0.5, spriteHeight * 0.2);
        ctx.lineTo(spriteWidth * 0.84, spriteHeight * 0.58);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "rgba(255, 201, 110, 0.32)";
        ctx.beginPath();
        ctx.arc(spriteWidth * 0.5, spriteHeight * 0.6, spriteWidth * 0.08, 0, TAU);
        ctx.fill();
      }
    } else if (sprite.kind === "poi") {
      const color = sprite.color || "#d8bc6a";
      const pulse = 0.5 + Math.sin(state.time * 4.2) * 0.5;
      drawSpriteGlow(spriteWidth * 0.5, spriteHeight * 0.58, spriteWidth * (0.42 + pulse * 0.08), color, 0.09 + pulse * 0.07);
      ctx.fillStyle = `rgba(255, 236, 176, ${0.14 + pulse * 0.08})`;
      ctx.beginPath();
      ctx.arc(spriteWidth * 0.5, spriteHeight * 0.58, spriteWidth * (0.34 + pulse * 0.08), 0, TAU);
      ctx.fill();
      if (sprite.poiKind === "shrine") {
        drawSpriteGlow(spriteWidth * 0.5, spriteHeight * 0.28, spriteWidth * (0.3 + pulse * 0.08), "#d9a8ff", 0.14 + pulse * 0.11);
        ctx.fillStyle = shadeHex(color, 0.42);
        ctx.fillRect(spriteWidth * 0.42, spriteHeight * 0.34, spriteWidth * 0.16, spriteHeight * 0.52);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(spriteWidth * 0.5, spriteHeight * 0.12);
        ctx.lineTo(spriteWidth * 0.74, spriteHeight * 0.42);
        ctx.lineTo(spriteWidth * 0.26, spriteHeight * 0.42);
        ctx.closePath();
        ctx.fill();
      } else if (sprite.poiKind === "camp") {
        drawSpriteGlow(spriteWidth * 0.5, spriteHeight * 0.66, spriteWidth * (0.22 + pulse * 0.08), "#ff9f46", 0.2 + pulse * 0.14);
        ctx.fillStyle = "#5b402b";
        ctx.fillRect(spriteWidth * 0.3, spriteHeight * 0.52, spriteWidth * 0.4, spriteHeight * 0.34);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(spriteWidth * 0.18, spriteHeight * 0.58);
        ctx.lineTo(spriteWidth * 0.5, spriteHeight * 0.2);
        ctx.lineTo(spriteWidth * 0.82, spriteHeight * 0.58);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#ffd77b";
        ctx.beginPath();
        ctx.moveTo(spriteWidth * 0.5, spriteHeight * 0.56);
        ctx.lineTo(spriteWidth * 0.57, spriteHeight * 0.7);
        ctx.lineTo(spriteWidth * 0.43, spriteHeight * 0.7);
        ctx.closePath();
        ctx.fill();
      } else if (sprite.poiKind === "mine") {
        ctx.fillStyle = "#3d3126";
        ctx.fillRect(spriteWidth * 0.22, spriteHeight * 0.5, spriteWidth * 0.56, spriteHeight * 0.36);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(spriteWidth * 0.18, spriteHeight * 0.52);
        ctx.lineTo(spriteWidth * 0.5, spriteHeight * 0.18);
        ctx.lineTo(spriteWidth * 0.82, spriteHeight * 0.52);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "rgba(20, 16, 12, 0.7)";
        ctx.fillRect(spriteWidth * 0.42, spriteHeight * 0.58, spriteWidth * 0.16, spriteHeight * 0.24);
        drawSpriteGlow(spriteWidth * 0.62, spriteHeight * 0.58, spriteWidth * 0.18, "#ffd27a", 0.22 + pulse * 0.12);
      } else if (sprite.poiKind === "ruin") {
        ctx.fillStyle = shadeHex(color, 0.5);
        ctx.fillRect(spriteWidth * 0.24, spriteHeight * 0.44, spriteWidth * 0.16, spriteHeight * 0.42);
        ctx.fillRect(spriteWidth * 0.58, spriteHeight * 0.34, spriteWidth * 0.16, spriteHeight * 0.52);
        ctx.fillStyle = color;
        ctx.fillRect(spriteWidth * 0.2, spriteHeight * 0.38, spriteWidth * 0.24, spriteHeight * 0.08);
        ctx.fillRect(spriteWidth * 0.54, spriteHeight * 0.28, spriteWidth * 0.24, spriteHeight * 0.08);
      } else if (sprite.poiKind === "hideout") {
        ctx.fillStyle = "#2b211b";
        ctx.fillRect(spriteWidth * 0.24, spriteHeight * 0.54, spriteWidth * 0.52, spriteHeight * 0.32);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(spriteWidth * 0.22, spriteHeight * 0.54);
        ctx.lineTo(spriteWidth * 0.5, spriteHeight * 0.26);
        ctx.lineTo(spriteWidth * 0.78, spriteHeight * 0.54);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "rgba(255, 218, 150, 0.38)";
        ctx.fillRect(spriteWidth * 0.58, spriteHeight * 0.62, spriteWidth * 0.1, spriteHeight * 0.1);
      } else if (sprite.poiKind === "stranger") {
        ctx.fillStyle = shadeHex(color, 0.4);
        ctx.fillRect(spriteWidth * 0.46, spriteHeight * 0.36, spriteWidth * 0.08, spriteHeight * 0.48);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(spriteWidth * 0.5, spriteHeight * 0.26, spriteWidth * 0.12, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 245, 210, 0.5)";
        ctx.lineWidth = Math.max(1, spriteWidth * 0.025);
        ctx.beginPath();
        ctx.arc(spriteWidth * 0.5, spriteHeight * 0.58, spriteWidth * 0.28, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
      } else {
        ctx.fillStyle = "#6c4b30";
        ctx.fillRect(spriteWidth * 0.25, spriteHeight * 0.52, spriteWidth * 0.5, spriteHeight * 0.34);
        ctx.fillStyle = color;
        ctx.fillRect(spriteWidth * 0.31, spriteHeight * 0.44, spriteWidth * 0.38, spriteHeight * 0.12);
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.fillRect(spriteWidth * 0.45, spriteHeight * 0.58, spriteWidth * 0.1, spriteHeight * 0.16);
      }
    } else if (sprite.kind === "landmark") {
      const color = sprite.color || "#d9b66d";
      const beaconPulse = 0.5 + Math.sin(state.time * 3.8) * 0.5;
      if (sprite.landmarkVariant === "slag_tower") {
        drawSpriteGlow(spriteWidth * 0.5, spriteHeight * 0.58, spriteWidth * (0.36 + beaconPulse * 0.12), "#ff8f3d", 0.16 + beaconPulse * 0.12);
        ctx.fillStyle = shadeHex(color, 0.34);
        ctx.fillRect(spriteWidth * 0.34, spriteHeight * 0.2, spriteWidth * 0.32, spriteHeight * 0.66);
        ctx.fillStyle = color;
        ctx.fillRect(spriteWidth * 0.3, spriteHeight * 0.14, spriteWidth * 0.4, spriteHeight * 0.12);
        ctx.fillRect(spriteWidth * 0.4, spriteHeight * 0.08, spriteWidth * 0.2, spriteHeight * 0.1);
        ctx.fillStyle = `rgba(255, 136, 54, ${0.45 + beaconPulse * 0.28})`;
        ctx.fillRect(spriteWidth * 0.42, spriteHeight * 0.55, spriteWidth * 0.16, spriteHeight * 0.14);
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = `rgba(236, 174, 110, ${0.14 + i * 0.08})`;
          ctx.beginPath();
          ctx.ellipse(spriteWidth * (0.48 + i * 0.06), spriteHeight * (0.02 + i * 0.06), spriteWidth * 0.14, spriteHeight * 0.08, 0, 0, TAU);
          ctx.fill();
        }
      } else if (sprite.landmarkVariant === "signal_mast") {
        drawSpriteGlow(spriteWidth * 0.5, spriteHeight * 0.1, spriteWidth * (0.34 + beaconPulse * 0.18), "#9bd3ff", 0.22 + beaconPulse * 0.18);
        drawSpritePulseRing(spriteWidth * 0.5, spriteHeight * 0.1, spriteWidth * (0.18 + beaconPulse * 0.18), "#9bd3ff", 0.2 + beaconPulse * 0.22, spriteWidth * 0.025);
        ctx.strokeStyle = shadeHex(color, 0.58);
        ctx.lineWidth = Math.max(2, spriteWidth * 0.05);
        ctx.beginPath();
        ctx.moveTo(spriteWidth * 0.5, spriteHeight * 0.12);
        ctx.lineTo(spriteWidth * 0.5, spriteHeight * 0.9);
        ctx.moveTo(spriteWidth * 0.34, spriteHeight * 0.26);
        ctx.lineTo(spriteWidth * 0.66, spriteHeight * 0.26);
        ctx.moveTo(spriteWidth * 0.38, spriteHeight * 0.44);
        ctx.lineTo(spriteWidth * 0.62, spriteHeight * 0.44);
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.fillRect(spriteWidth * 0.47, spriteHeight * 0.12, spriteWidth * 0.06, spriteHeight * 0.62);
        ctx.fillStyle = "rgba(155, 211, 255, 0.46)";
        ctx.beginPath();
        ctx.arc(spriteWidth * 0.5, spriteHeight * 0.08, spriteWidth * 0.1, 0, TAU);
        ctx.fill();
        ctx.fillRect(spriteWidth * 0.32, spriteHeight * 0.22, spriteWidth * 0.08, spriteHeight * 0.06);
        ctx.fillRect(spriteWidth * 0.6, spriteHeight * 0.22, spriteWidth * 0.08, spriteHeight * 0.06);
      } else {
        drawSpriteGlow(spriteWidth * 0.5, spriteHeight * 0.12, spriteWidth * (0.24 + beaconPulse * 0.08), "#ffe8a8", 0.15 + beaconPulse * 0.1);
        ctx.fillStyle = shadeHex(color, 0.52);
        ctx.fillRect(spriteWidth * 0.44, spriteHeight * 0.2, spriteWidth * 0.12, spriteHeight * 0.72);
        ctx.fillStyle = color;
        ctx.fillRect(spriteWidth * 0.32, spriteHeight * 0.14, spriteWidth * 0.36, spriteHeight * 0.12);
        ctx.fillStyle = "rgba(255, 236, 176, 0.45)";
        ctx.fillRect(spriteWidth * 0.47, spriteHeight * 0.06, spriteWidth * 0.06, spriteHeight * 0.16);
        ctx.strokeStyle = "rgba(30, 22, 16, 0.45)";
        ctx.lineWidth = Math.max(1, spriteWidth * 0.025);
        ctx.strokeRect(spriteWidth * 0.44, spriteHeight * 0.2, spriteWidth * 0.12, spriteHeight * 0.72);
      }
    } else if (sprite.kind === "world-prop") {
      const color = sprite.color || "#b9824d";
      if (sprite.propKind === "lamp" || sprite.propKind === "seam" || sprite.propKind === "relay") {
        const pulse = 0.5 + Math.sin(state.time * (sprite.propKind === "lamp" ? 5.2 : 3.2)) * 0.5;
        const lightColor = sprite.propKind === "relay" ? "#9bd3ff" : sprite.propKind === "seam" ? "#ff9f46" : "#ffe8a8";
        drawSpriteGlow(spriteWidth * 0.5, spriteHeight * 0.28, spriteWidth * (0.34 + pulse * 0.08), lightColor, 0.24 + pulse * 0.17);
        drawSpritePulseRing(spriteWidth * 0.5, spriteHeight * 0.28, spriteWidth * (0.2 + pulse * 0.08), lightColor, 0.12 + pulse * 0.2, spriteWidth * 0.018);
        ctx.fillStyle = shadeHex(color, 0.45);
        ctx.fillRect(spriteWidth * 0.47, spriteHeight * 0.34, spriteWidth * 0.06, spriteHeight * 0.54);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(spriteWidth * 0.5, spriteHeight * 0.28, spriteWidth * 0.18, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "rgba(255, 248, 200, 0.35)";
        ctx.beginPath();
        ctx.arc(spriteWidth * 0.5, spriteHeight * 0.28, spriteWidth * 0.28, 0, TAU);
        ctx.fill();
        ctx.fillStyle = hexToRgbaUtil(lightColor, 0.82);
        ctx.beginPath();
        ctx.arc(spriteWidth * 0.5, spriteHeight * 0.28, spriteWidth * 0.09, 0, TAU);
        ctx.fill();
      } else if (sprite.propKind === "road-sign") {
        ctx.fillStyle = "#4a3323";
        ctx.fillRect(spriteWidth * 0.47, spriteHeight * 0.34, spriteWidth * 0.06, spriteHeight * 0.54);
        ctx.fillStyle = shadeHex(color, 0.62);
        ctx.fillRect(spriteWidth * 0.22, spriteHeight * 0.22, spriteWidth * 0.56, spriteHeight * 0.16);
        ctx.fillRect(spriteWidth * 0.28, spriteHeight * 0.42, spriteWidth * 0.44, spriteHeight * 0.14);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(spriteWidth * 0.74, spriteHeight * 0.2);
        ctx.lineTo(spriteWidth * 0.88, spriteHeight * 0.3);
        ctx.lineTo(spriteWidth * 0.74, spriteHeight * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "rgba(32, 22, 10, 0.42)";
        ctx.fillRect(spriteWidth * 0.3, spriteHeight * 0.28, spriteWidth * 0.28, spriteHeight * 0.03);
        ctx.fillRect(spriteWidth * 0.34, spriteHeight * 0.48, spriteWidth * 0.24, spriteHeight * 0.03);
      } else if (sprite.propKind === "sign") {
        ctx.fillStyle = "#5b402b";
        ctx.fillRect(spriteWidth * 0.47, spriteHeight * 0.36, spriteWidth * 0.06, spriteHeight * 0.52);
        ctx.fillStyle = color;
        ctx.fillRect(spriteWidth * 0.22, spriteHeight * 0.24, spriteWidth * 0.56, spriteHeight * 0.2);
        ctx.strokeStyle = "rgba(28, 18, 12, 0.5)";
        ctx.strokeRect(spriteWidth * 0.22, spriteHeight * 0.24, spriteWidth * 0.56, spriteHeight * 0.2);
      } else if (sprite.propKind === "cart") {
        ctx.fillStyle = shadeHex(color, 0.48);
        ctx.fillRect(spriteWidth * 0.2, spriteHeight * 0.48, spriteWidth * 0.6, spriteHeight * 0.18);
        ctx.fillRect(spriteWidth * 0.3, spriteHeight * 0.36, spriteWidth * 0.4, spriteHeight * 0.12);
        ctx.strokeStyle = "#5b402b";
        ctx.lineWidth = Math.max(1.4, spriteWidth * 0.04);
        ctx.beginPath();
        ctx.arc(spriteWidth * 0.32, spriteHeight * 0.74, spriteWidth * 0.1, 0, TAU);
        ctx.arc(spriteWidth * 0.68, spriteHeight * 0.74, spriteWidth * 0.1, 0, TAU);
        ctx.stroke();
      } else if (sprite.propKind === "crate") {
        ctx.fillStyle = shadeHex(color, 0.52);
        ctx.fillRect(spriteWidth * 0.22, spriteHeight * 0.48, spriteWidth * 0.24, spriteHeight * 0.28);
        ctx.fillRect(spriteWidth * 0.48, spriteHeight * 0.4, spriteWidth * 0.26, spriteHeight * 0.36);
        ctx.strokeStyle = "rgba(46, 28, 14, 0.45)";
        ctx.lineWidth = Math.max(1, spriteWidth * 0.025);
        ctx.strokeRect(spriteWidth * 0.22, spriteHeight * 0.48, spriteWidth * 0.24, spriteHeight * 0.28);
        ctx.strokeRect(spriteWidth * 0.48, spriteHeight * 0.4, spriteWidth * 0.26, spriteHeight * 0.36);
      } else if (sprite.propKind === "post") {
        ctx.fillStyle = shadeHex(color, 0.5);
        ctx.fillRect(spriteWidth * 0.44, spriteHeight * 0.18, spriteWidth * 0.12, spriteHeight * 0.68);
        ctx.fillStyle = color;
        ctx.fillRect(spriteWidth * 0.28, spriteHeight * 0.16, spriteWidth * 0.44, spriteHeight * 0.1);
      } else if (sprite.propKind === "pipe") {
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(2, spriteWidth * 0.07);
        ctx.beginPath();
        ctx.moveTo(spriteWidth * 0.28, spriteHeight * 0.24);
        ctx.lineTo(spriteWidth * 0.28, spriteHeight * 0.64);
        ctx.quadraticCurveTo(spriteWidth * 0.3, spriteHeight * 0.8, spriteWidth * 0.52, spriteHeight * 0.8);
        ctx.lineTo(spriteWidth * 0.74, spriteHeight * 0.8);
        ctx.stroke();
        ctx.fillStyle = "rgba(255, 214, 154, 0.2)";
        ctx.beginPath();
        ctx.arc(spriteWidth * 0.74, spriteHeight * 0.8, spriteWidth * 0.08, 0, TAU);
        ctx.fill();
      } else if (sprite.propKind === "smoke") {
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = `rgba(222, 216, 196, ${0.12 + i * 0.06})`;
          ctx.beginPath();
          ctx.ellipse(spriteWidth * (0.42 + i * 0.08), spriteHeight * (0.64 - i * 0.12), spriteWidth * (0.16 - i * 0.01), spriteHeight * (0.12 - i * 0.01), 0, 0, TAU);
          ctx.fill();
        }
        const emberPulse = 0.5 + Math.sin(state.time * 7.5) * 0.5;
        drawSpriteGlow(spriteWidth * 0.45, spriteHeight * 0.82, spriteWidth * (0.18 + emberPulse * 0.06), "#ff9f46", 0.12 + emberPulse * 0.12);
      } else if (sprite.propKind === "fence" || sprite.propKind === "rail" || sprite.propKind === "cable") {
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(2, spriteWidth * 0.08);
        ctx.beginPath();
        ctx.moveTo(spriteWidth * 0.12, spriteHeight * 0.58);
        ctx.lineTo(spriteWidth * 0.88, spriteHeight * 0.46);
        ctx.moveTo(spriteWidth * 0.16, spriteHeight * 0.72);
        ctx.lineTo(spriteWidth * 0.84, spriteHeight * 0.62);
        ctx.stroke();
      } else if (sprite.propKind === "town" || sprite.propKind === "checkpoint") {
        ctx.fillStyle = shadeHex(color, 0.45);
        ctx.fillRect(spriteWidth * 0.18, spriteHeight * 0.5, spriteWidth * 0.18, spriteHeight * 0.34);
        ctx.fillRect(spriteWidth * 0.41, spriteHeight * 0.38, spriteWidth * 0.2, spriteHeight * 0.46);
        ctx.fillRect(spriteWidth * 0.66, spriteHeight * 0.55, spriteWidth * 0.16, spriteHeight * 0.29);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(spriteWidth * 0.16, spriteHeight * 0.5);
        ctx.lineTo(spriteWidth * 0.27, spriteHeight * 0.35);
        ctx.lineTo(spriteWidth * 0.38, spriteHeight * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(spriteWidth * 0.39, spriteHeight * 0.38);
        ctx.lineTo(spriteWidth * 0.51, spriteHeight * 0.2);
        ctx.lineTo(spriteWidth * 0.63, spriteHeight * 0.38);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "rgba(255, 235, 175, 0.22)";
        ctx.fillRect(spriteWidth * 0.46, spriteHeight * 0.58, spriteWidth * 0.1, spriteHeight * 0.12);
        drawSpriteGlow(spriteWidth * 0.51, spriteHeight * 0.64, spriteWidth * 0.18, "#ffe8a8", 0.18);
      } else if (sprite.propKind === "watchtower" || sprite.propKind === "tower" || sprite.propKind === "signal") {
        const pulse = 0.5 + Math.sin(state.time * 4.3) * 0.5;
        const towerLight = sprite.propKind === "signal" ? "#9bd3ff" : "#ffe8a8";
        drawSpriteGlow(spriteWidth * 0.5, spriteHeight * 0.12, spriteWidth * (0.24 + pulse * 0.08), towerLight, 0.18 + pulse * 0.12);
        ctx.fillStyle = shadeHex(color, 0.42);
        ctx.fillRect(spriteWidth * 0.46, spriteHeight * 0.24, spriteWidth * 0.08, spriteHeight * 0.64);
        ctx.fillStyle = color;
        ctx.fillRect(spriteWidth * 0.3, spriteHeight * 0.16, spriteWidth * 0.4, spriteHeight * 0.12);
        ctx.strokeStyle = hexToRgbaUtil(color, 0.55);
        ctx.lineWidth = Math.max(1, spriteWidth * 0.028);
        ctx.beginPath();
        ctx.moveTo(spriteWidth * 0.46, spriteHeight * 0.34);
        ctx.lineTo(spriteWidth * 0.32, spriteHeight * 0.88);
        ctx.moveTo(spriteWidth * 0.54, spriteHeight * 0.34);
        ctx.lineTo(spriteWidth * 0.68, spriteHeight * 0.88);
        ctx.stroke();
        ctx.fillStyle = "rgba(255, 248, 205, 0.38)";
        ctx.fillRect(spriteWidth * 0.47, spriteHeight * 0.08, spriteWidth * 0.06, spriteHeight * 0.12);
      } else if (sprite.propKind === "gate") {
        drawSpriteGlow(spriteWidth * 0.31, spriteHeight * 0.42, spriteWidth * 0.16, "#ffe8a8", 0.16);
        drawSpriteGlow(spriteWidth * 0.69, spriteHeight * 0.42, spriteWidth * 0.16, "#ffe8a8", 0.16);
        ctx.fillStyle = shadeHex(color, 0.48);
        ctx.fillRect(spriteWidth * 0.24, spriteHeight * 0.28, spriteWidth * 0.1, spriteHeight * 0.6);
        ctx.fillRect(spriteWidth * 0.66, spriteHeight * 0.28, spriteWidth * 0.1, spriteHeight * 0.6);
        ctx.fillStyle = color;
        ctx.fillRect(spriteWidth * 0.22, spriteHeight * 0.24, spriteWidth * 0.56, spriteHeight * 0.08);
        ctx.fillStyle = "rgba(255, 235, 175, 0.3)";
        ctx.fillRect(spriteWidth * 0.28, spriteHeight * 0.36, spriteWidth * 0.06, spriteHeight * 0.1);
        ctx.fillRect(spriteWidth * 0.66, spriteHeight * 0.36, spriteWidth * 0.06, spriteHeight * 0.1);
      } else if (sprite.propKind === "mine") {
        drawSpriteGlow(spriteWidth * 0.5, spriteHeight * 0.65, spriteWidth * 0.2, "#ff9f46", 0.12);
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(2, spriteWidth * 0.07);
        ctx.beginPath();
        ctx.moveTo(spriteWidth * 0.18, spriteHeight * 0.84);
        ctx.lineTo(spriteWidth * 0.5, spriteHeight * 0.22);
        ctx.lineTo(spriteWidth * 0.82, spriteHeight * 0.84);
        ctx.moveTo(spriteWidth * 0.3, spriteHeight * 0.64);
        ctx.lineTo(spriteWidth * 0.7, spriteHeight * 0.64);
        ctx.stroke();
      } else if (sprite.propKind === "road") {
        drawSpriteGlow(spriteWidth * 0.5, spriteHeight * 0.36, spriteWidth * 0.18, "#ffe8a8", 0.1);
        ctx.fillStyle = shadeHex(color, 0.52);
        ctx.fillRect(spriteWidth * 0.45, spriteHeight * 0.42, spriteWidth * 0.1, spriteHeight * 0.44);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(spriteWidth * 0.5, spriteHeight * 0.18);
        ctx.lineTo(spriteWidth * 0.76, spriteHeight * 0.36);
        ctx.lineTo(spriteWidth * 0.5, spriteHeight * 0.54);
        ctx.lineTo(spriteWidth * 0.24, spriteHeight * 0.36);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "rgba(255, 246, 205, 0.34)";
        ctx.fillRect(spriteWidth * 0.36, spriteHeight * 0.34, spriteWidth * 0.28, spriteHeight * 0.04);
      } else {
        ctx.fillStyle = color;
        ctx.fillRect(spriteWidth * 0.25, spriteHeight * 0.48, spriteWidth * 0.5, spriteHeight * 0.34);
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fillRect(spriteWidth * 0.32, spriteHeight * 0.52, spriteWidth * 0.18, spriteHeight * 0.08);
      }
    } else if (sprite.kind === "job-route") {
      const color = sprite.color || "#ffd77b";
      const pulse = 0.5 + Math.sin(state.time * 5.5) * 0.5;
      drawSpriteGlow(spriteWidth * 0.5, spriteHeight * 0.48, spriteWidth * (0.46 + pulse * 0.12), color, 0.16 + pulse * 0.16);
      drawSpritePulseRing(spriteWidth * 0.5, spriteHeight * 0.5, spriteWidth * (0.34 + pulse * 0.1), "#fff0b8", 0.18 + pulse * 0.24, spriteWidth * 0.024);
      ctx.fillStyle = `rgba(255, 235, 155, ${0.16 + pulse * 0.12})`;
      ctx.beginPath();
      ctx.arc(spriteWidth * 0.5, spriteHeight * 0.52, spriteWidth * (0.36 + pulse * 0.1), 0, TAU);
      ctx.fill();
      ctx.fillStyle = shadeHex(color, 0.48);
      ctx.fillRect(spriteWidth * 0.46, spriteHeight * 0.36, spriteWidth * 0.08, spriteHeight * 0.5);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(spriteWidth * 0.5, spriteHeight * 0.08);
      ctx.lineTo(spriteWidth * 0.72, spriteHeight * 0.42);
      ctx.lineTo(spriteWidth * 0.56, spriteHeight * 0.42);
      ctx.lineTo(spriteWidth * 0.56, spriteHeight * 0.68);
      ctx.lineTo(spriteWidth * 0.44, spriteHeight * 0.68);
      ctx.lineTo(spriteWidth * 0.44, spriteHeight * 0.42);
      ctx.lineTo(spriteWidth * 0.28, spriteHeight * 0.42);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(32, 22, 10, 0.45)";
      ctx.fillRect(spriteWidth * 0.46, spriteHeight * 0.32, spriteWidth * 0.08, spriteHeight * 0.18);
    } else if (sprite.kind === "job-board") {
      const color = sprite.color || "#d8a84f";
      const pulse = 0.5 + Math.sin(state.time * 4.8) * 0.5;
      drawSpriteGlow(spriteWidth * 0.5, spriteHeight * 0.38, spriteWidth * (0.46 + pulse * 0.1), "#ffd77b", 0.14 + pulse * 0.12);
      ctx.fillStyle = "#5b402b";
      ctx.fillRect(spriteWidth * 0.47, spriteHeight * 0.34, spriteWidth * 0.07, spriteHeight * 0.56);
      ctx.fillStyle = shadeHex(color, 0.74);
      ctx.fillRect(spriteWidth * 0.16, spriteHeight * 0.22, spriteWidth * 0.68, spriteHeight * 0.34);
      ctx.strokeStyle = "rgba(31, 22, 12, 0.55)";
      ctx.lineWidth = Math.max(1, spriteWidth * 0.03);
      ctx.strokeRect(spriteWidth * 0.16, spriteHeight * 0.22, spriteWidth * 0.68, spriteHeight * 0.34);
      ctx.fillStyle = color;
      ctx.fillRect(spriteWidth * 0.22, spriteHeight * 0.29, spriteWidth * 0.56, spriteHeight * 0.06);
      ctx.fillStyle = "rgba(255, 245, 200, 0.38)";
      ctx.fillRect(spriteWidth * 0.26, spriteHeight * 0.41, spriteWidth * 0.48, spriteHeight * 0.04);
      ctx.fillStyle = "rgba(255, 215, 123, 0.18)";
      ctx.beginPath();
      ctx.arc(spriteWidth * 0.5, spriteHeight * 0.4, spriteWidth * 0.42, 0, TAU);
      ctx.fill();
    } else if (sprite.kind === "house-door") {
      ctx.fillStyle = state.house.unlocked ? "#7f694a" : "#5f4f3a";
      ctx.fillRect(spriteWidth * 0.3, spriteHeight * 0.22, spriteWidth * 0.4, spriteHeight * 0.72);
      ctx.fillStyle = state.house.unlocked ? "#d8ba6d" : "#885a34";
      ctx.fillRect(spriteWidth * 0.62, spriteHeight * 0.56, spriteWidth * 0.05, spriteHeight * 0.05);
      if (state.house.unlocked) {
        ctx.fillStyle = "rgba(255, 232, 154, 0.28)";
        ctx.fillRect(spriteWidth * 0.36, spriteHeight * 0.3, spriteWidth * 0.28, spriteHeight * 0.2);
      }
    } else if (sprite.kind === "bed") {
      ctx.fillStyle = "#5f4836";
      ctx.fillRect(spriteWidth * 0.18, spriteHeight * 0.62, spriteWidth * 0.64, spriteHeight * 0.3);
      ctx.fillStyle = "#7c2f2f";
      ctx.fillRect(spriteWidth * 0.22, spriteHeight * 0.42, spriteWidth * 0.56, spriteHeight * 0.22);
      ctx.fillStyle = "#dbd2be";
      ctx.fillRect(spriteWidth * 0.22, spriteHeight * 0.34, spriteWidth * 0.2, spriteHeight * 0.1);
    } else if (sprite.kind === "stash") {
      ctx.fillStyle = "#7a5a3d";
      ctx.fillRect(spriteWidth * 0.2, spriteHeight * 0.34, spriteWidth * 0.6, spriteHeight * 0.56);
      ctx.fillStyle = "#d2b457";
      ctx.fillRect(spriteWidth * 0.46, spriteHeight * 0.56, spriteWidth * 0.08, spriteHeight * 0.16);
    } else if (sprite.kind === "exit-door") {
      ctx.fillStyle = "#6f553a";
      ctx.fillRect(spriteWidth * 0.34, spriteHeight * 0.2, spriteWidth * 0.32, spriteHeight * 0.74);
      ctx.fillStyle = "#e1d29f";
      ctx.fillRect(spriteWidth * 0.6, spriteHeight * 0.55, spriteWidth * 0.04, spriteHeight * 0.05);
    }

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.fillStyle = `rgba(0, 0, 0, ${resolveSpriteLightOverlayAlpha(sprite, lightFactor)})`;
    ctx.fillRect(0, 0, spriteWidth, spriteHeight);
    if (sprite.flashTimer > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${clamp(sprite.flashTimer / 0.1, 0, 1) * 0.72})`;
      ctx.fillRect(0, 0, spriteWidth, spriteHeight);
    }
    ctx.restore();
  }

  function drawWeaponOverlay() {
    if (state.mode !== "playing") return;

    const p = state.player;
    const idleBob = Math.sin(p.walkBob * 2.1) * 4;
    const swingT = p.swingTimer > 0 ? 1 - p.swingTimer / p.swingDuration : 0;
    const eased = easeOutCubic(swingT);

    let x = canvas.width * 0.74 + idleBob + p.weaponSway;
    let y = canvas.height * 0.86 + Math.abs(idleBob) * 0.45;
    let rot = -0.28;

    if (p.blocking) {
      x = canvas.width * 0.64 + idleBob * 0.3;
      y = canvas.height * 0.84;
      rot = -1.08;
    }

    if (p.swingTimer > 0) {
      if (p.comboStep === 1) {
        x = lerp(canvas.width * 0.87, canvas.width * 0.55, eased);
        y = lerp(canvas.height * 0.88, canvas.height * 0.7, eased);
        rot = lerp(0.95, -0.48, eased);
      } else if (p.comboStep === 2) {
        x = lerp(canvas.width * 0.54, canvas.width * 0.88, eased);
        y = lerp(canvas.height * 0.72, canvas.height * 0.86, eased);
        rot = lerp(-0.72, 0.55, eased);
      } else {
        x = lerp(canvas.width * 0.64, canvas.width * 0.74, eased);
        y = lerp(canvas.height * 0.58, canvas.height * 0.87, eased);
        rot = lerp(-1.62, -0.2, eased);
      }
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    const weaponScale = p.blocking ? 0.86 : 0.8;
    ctx.scale(weaponScale, weaponScale);

    if (p.swingTimer > 0) {
      ctx.strokeStyle = "rgba(229, 241, 255, 0.42)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(22, -124);
      ctx.lineTo(25, -20);
      ctx.stroke();
      ctx.lineWidth = 2;
    }

    const blade = ctx.createLinearGradient(0, -142, 0, 34);
    blade.addColorStop(0, "#ffffff");
    blade.addColorStop(0.35, "#e9f1f7");
    blade.addColorStop(1, "#8298ad");
    ctx.fillStyle = blade;
    ctx.beginPath();
    ctx.moveTo(17, -132);
    ctx.lineTo(33, -132);
    ctx.lineTo(31, 11);
    ctx.lineTo(19, 11);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.44)";
    ctx.fillRect(20, -126, 3, 125);

    ctx.fillStyle = "#637c95";
    ctx.beginPath();
    ctx.moveTo(7, 12);
    ctx.lineTo(44, 12);
    ctx.lineTo(40, 22);
    ctx.lineTo(11, 22);
    ctx.closePath();
    ctx.fill();

    const grip = ctx.createLinearGradient(17, 20, 33, 78);
    grip.addColorStop(0, "#845839");
    grip.addColorStop(1, "#5b3a24");
    ctx.fillStyle = grip;
    ctx.fillRect(19, 20, 12, 56);

    ctx.fillStyle = "#cba377";
    ctx.fillRect(17, 76, 16, 6);

    for (let wrap = 0; wrap < 6; wrap++) {
      const yWrap = 23 + wrap * 9;
      ctx.fillStyle = wrap % 2 === 0 ? "rgba(35, 24, 18, 0.32)" : "rgba(229, 210, 174, 0.18)";
      ctx.fillRect(19, yWrap, 12, 3);
    }

    const lowerSleeve = ctx.createLinearGradient(-8, 84, 58, 126);
    lowerSleeve.addColorStop(0, "#415975");
    lowerSleeve.addColorStop(1, "#22354e");
    ctx.fillStyle = lowerSleeve;
    ctx.beginPath();
    ctx.moveTo(-2, 85);
    ctx.lineTo(48, 83);
    ctx.lineTo(61, 118);
    ctx.lineTo(-12, 121);
    ctx.closePath();
    ctx.fill();

    const rearPalm = ctx.createLinearGradient(6, 58, 42, 94);
    rearPalm.addColorStop(0, "#e2bfa7");
    rearPalm.addColorStop(1, "#c69378");
    ctx.fillStyle = rearPalm;
    ctx.beginPath();
    ctx.moveTo(6, 58);
    ctx.lineTo(36, 56);
    ctx.lineTo(42, 84);
    ctx.lineTo(10, 92);
    ctx.closePath();
    ctx.fill();

    for (let finger = 0; finger < 4; finger++) {
      const fx = 8 + finger * 6;
      ctx.fillStyle = finger % 2 === 0 ? "#dbb69d" : "#cfaa91";
      ctx.fillRect(fx, 53, 5, 19);
      ctx.fillStyle = "rgba(96, 60, 43, 0.24)";
      ctx.fillRect(fx, 65, 5, 2);
    }
    ctx.fillStyle = "#c68f76";
    ctx.beginPath();
    ctx.moveTo(34, 62);
    ctx.lineTo(43, 68);
    ctx.lineTo(37, 77);
    ctx.lineTo(30, 71);
    ctx.closePath();
    ctx.fill();

    const upperSleeve = ctx.createLinearGradient(18, 26, 65, 60);
    upperSleeve.addColorStop(0, "#3b516b");
    upperSleeve.addColorStop(1, "#1e2f46");
    ctx.fillStyle = upperSleeve;
    ctx.beginPath();
    ctx.moveTo(29, 30);
    ctx.lineTo(58, 36);
    ctx.lineTo(63, 62);
    ctx.lineTo(35, 58);
    ctx.closePath();
    ctx.fill();

    const frontPalm = ctx.createLinearGradient(24, 27, 47, 54);
    frontPalm.addColorStop(0, "#e3c3ad");
    frontPalm.addColorStop(1, "#cb9c84");
    ctx.fillStyle = frontPalm;
    ctx.beginPath();
    ctx.moveTo(24, 30);
    ctx.lineTo(43, 34);
    ctx.lineTo(45, 54);
    ctx.lineTo(29, 54);
    ctx.closePath();
    ctx.fill();

    for (let finger = 0; finger < 3; finger++) {
      const fy = 32 + finger * 6;
      ctx.fillStyle = finger % 2 === 0 ? "#dcb8a0" : "#cda58e";
      ctx.fillRect(22, fy, 11, 4);
    }
    ctx.fillStyle = "#c89177";
    ctx.beginPath();
    ctx.moveTo(42, 41);
    ctx.lineTo(49, 46);
    ctx.lineTo(44, 54);
    ctx.lineTo(37, 50);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // Per-frame depth buffer reused across frames; reallocates on canvas resize only.
  let cachedDepthBuffer = null;

  function pushDynamicLight(lights, light) {
    if (!light || !Number.isFinite(light.x) || !Number.isFinite(light.y)) return;
    lights.push(light);
  }

  function pushPropDynamicLight(lights, prop, fallback = {}) {
    if (!prop) return;
    const propKind = prop.propKind || prop.kind;
    const lightKinds = {
      lamp: { radius: 5.4, intensity: 0.72, flicker: 0.55 },
      seam: { radius: 4.6, intensity: 0.55, flicker: 0.25 },
      relay: { radius: 5.8, intensity: 0.68, flicker: 0.18 },
      smoke: { radius: 4.8, intensity: 0.34, flicker: 0.75 },
      gate: { radius: 4.6, intensity: 0.38, flicker: 0.08 },
      road: { radius: 3.6, intensity: 0.2, flicker: 0.08 },
      "road-sign": { radius: 3.2, intensity: 0.22, flicker: 0.18 },
      signal: { radius: 6.4, intensity: 0.62, flicker: 0.12 },
      tower: { radius: 5.6, intensity: 0.38, flicker: 0.28 },
      watchtower: { radius: 5.6, intensity: 0.36, flicker: 0.22 },
    };
    const config = lightKinds[propKind];
    if (!config) return;
    pushDynamicLight(lights, {
      id: fallback.id || `${propKind}-${prop.x}-${prop.y}`,
      kind: propKind,
      x: prop.x,
      y: prop.y,
      color: prop.color || fallback.color || "#ffd77b",
      ...config,
    });
  }

  function collectSceneDynamicLights(regionPresentation, visualMood) {
    const lights = [];
    const moodStrength = clamp(numberOr(visualMood?.dynamicLightStrength, 0.35), 0, 1.4);
    const nightBoost = state.world?.timeOfDay > 0.68 || state.world?.timeOfDay < 0.2 ? 0.18 : 0;
    pushDynamicLight(lights, {
      id: "player-lantern",
      kind: "player",
      x: state.player.x,
      y: state.player.y,
      color: state.player.inHouse ? "#ffd7a0" : "#ffd77b",
      radius: state.player.inHouse ? 4.8 : 5.6,
      intensity: 0.26 + moodStrength * 0.18 + nightBoost,
      flicker: 0.18,
    });

    if (state.player.inHouse) {
      pushDynamicLight(lights, { id: "house-bed-light", kind: "lamp", x: state.house.bed.x, y: state.house.bed.y, color: "#ffd0a0", radius: 4.6, intensity: 0.42, flicker: 0.3 });
      pushDynamicLight(lights, { id: "house-stash-light", kind: "lamp", x: state.house.stash.x, y: state.house.stash.y, color: "#ffd77b", radius: 4.2, intensity: 0.34, flicker: 0.2 });
      return selectDynamicLights(lights, state.player, { maxLights: 8 });
    }

    const regionProfile = visualMood?.regionProfile || getRegionVisualIdentity(state.regions.activeRegion);
    if (regionPresentation?.landmark) {
      const variant = regionPresentation.landmark.variant;
      pushDynamicLight(lights, {
        id: `landmark-${variant || regionPresentation.landmark.label}`,
        kind: "landmark",
        x: regionPresentation.landmark.x,
        y: regionPresentation.landmark.y,
        color: regionPresentation.landmark.color || regionProfile.minimapTint || "#ffd77b",
        radius: variant === "signal_mast" ? 7.2 : variant === "slag_tower" ? 6.4 : 5.4,
        intensity: variant === "signal_mast" ? 0.64 : variant === "slag_tower" ? 0.52 : 0.36,
        flicker: variant === "slag_tower" ? 0.38 : 0.16,
      });
    }
    for (const prop of regionPresentation?.props || []) pushPropDynamicLight(lights, prop);
    for (const vista of regionPresentation?.vistas || []) pushPropDynamicLight(lights, vista);
    for (const road of regionPresentation?.roads || []) pushPropDynamicLight(lights, road);
    for (const sign of regionPresentation?.roadSigns || []) pushPropDynamicLight(lights, sign, { color: sign.color });

    const boardProp = getActiveJobBoardProp();
    if (boardProp) {
      pushDynamicLight(lights, { id: "job-board-light", kind: "job-board", x: boardProp.x, y: boardProp.y, color: boardProp.color || "#d8a84f", radius: 4.8, intensity: 0.5, flicker: 0.22 });
    }

    const pressure = resolveFirstMinutePressure({
      mode: state.mode,
      time: state.time,
      inHouse: state.player.inHouse,
      regionId: state.regions.activeRegion,
      player: state.player,
      inventory: state.inventory,
      quests: state.quests,
    });
    if (pressure?.marker) {
      pushDynamicLight(lights, { id: "first-pressure-light", kind: "pressure", x: pressure.marker.x, y: pressure.marker.y, color: pressure.marker.color || "#ffd77b", radius: 5.2, intensity: 0.64, flicker: 0.65 });
    }

    for (const discovery of findNearbyRoadsideDiscoveries(state.regions, state.regions.activeRegion, state.player.x, state.player.y, MAX_RAY_DIST).slice(0, 3)) {
      const isShrine = discovery.kind === "shrine";
      const isCamp = discovery.kind === "camp";
      pushDynamicLight(lights, {
        id: `roadside-${discovery.id}`,
        kind: discovery.kind,
        x: discovery.x,
        y: discovery.y,
        color: discovery.color || (isShrine ? "#cdb8ff" : "#ffd77b"),
        radius: isShrine ? 5.4 : isCamp ? 4.8 : 3.6,
        intensity: isShrine ? 0.58 : isCamp ? 0.5 : 0.26,
        flicker: isCamp || isShrine ? 0.58 : 0.18,
      });
    }

    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;
      const windup = (enemy.windupTimer || 0) > 0;
      pushDynamicLight(lights, {
        id: `enemy-${enemy.id}`,
        kind: "enemy",
        x: enemy.x,
        y: enemy.y,
        color: windup ? "#ff4838" : enemy.color || "#6be873",
        radius: windup ? 5.8 : 4.2,
        intensity: windup ? 0.68 : 0.34,
        flicker: windup ? 0.6 : 0.12,
      });
    }

    for (const resource of state.resources) {
      if (resource.harvested) continue;
      const glowResources = {
        crystal: "#8dc4ff",
        "archive-node": "#d96cff",
        ashglass: "#e2a36b",
        "heat-resin": "#ff8a4c",
        "lantern-filament": "#9bd3ff",
        "cipher-lens": "#c8a8ff",
        "pressurized-ink": "#7e8cff",
      };
      const color = glowResources[resource.type];
      if (!color) continue;
      pushDynamicLight(lights, { id: `resource-${resource.id}`, kind: "resource", x: resource.x, y: resource.y, color, radius: 3.6, intensity: 0.34, flicker: 0.16 });
    }

    if (!state.chest.opened) {
      pushDynamicLight(lights, { id: "smoke-cache-light", kind: "cache", x: state.chest.x, y: state.chest.y, color: state.chest.firstRewardClaimed ? "#bf8a4f" : "#ffd77b", radius: 4.6, intensity: state.chest.firstRewardClaimed ? 0.26 : 0.52, flicker: 0.42 });
    }

    return selectDynamicLights(lights, state.player, { maxLights: 8 });
  }

  function drawDynamicLightPools(lights, horizon, width, height, shakeX, visualMood) {
    if (!Array.isArray(lights) || lights.length === 0) return;
    const strength = clamp(numberOr(visualMood?.dynamicLightStrength, 0.35), 0, 1.4);
    for (const light of lights) {
      const dx = light.x - state.player.x;
      const dy = light.y - state.player.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 0.2 || distance > MAX_RAY_DIST) continue;
      const ang = normalizeAngle(Math.atan2(dy, dx) - state.player.angle);
      if (Math.abs(ang) > FOV * 0.72) continue;
      const sx = ((ang + FOV / 2) / FOV) * width + shakeX;
      const depthFactor = clamp(1 - distance / Math.max(0.1, light.radius + 8), 0, 1);
      if (depthFactor <= 0) continue;
      const poolRadius = clamp((height / (distance + 0.8)) * light.radius * 0.12, 18, width * 0.22);
      const y = clamp(horizon + (height - horizon) * (0.42 + distance / (MAX_RAY_DIST * 2.2)), horizon + 14, height - poolRadius * 0.35);
      const alpha = clamp(light.intensity * depthFactor * strength * 0.2, 0, 0.24);
      const gradient = ctx.createRadialGradient(sx, y, 0, sx, y, poolRadius);
      gradient.addColorStop(0, `rgba(${light.rgb.r}, ${light.rgb.g}, ${light.rgb.b}, ${alpha})`);
      gradient.addColorStop(1, `rgba(${light.rgb.r}, ${light.rgb.g}, ${light.rgb.b}, 0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(sx - poolRadius, y - poolRadius, poolRadius * 2, poolRadius * 2);
    }
  }

  function resolveWorldNightStrength() {
    const t = state.world?.timeOfDay;
    if (!Number.isFinite(t)) return 0;
    if (t < 0.22) return clamp(1 - t / 0.22, 0, 1);
    if (t > 0.72) return clamp((t - 0.72) / 0.28, 0, 1);
    return 0;
  }

  function drawNightContrastOverlay(width, height, horizon, visualMood) {
    if (state.player.inHouse) return;
    const night = clamp(numberOr(visualMood?.nightStrength, 0), 0, 1);
    const dusk = clamp(numberOr(visualMood?.duskStrength, 0), 0, 1);
    const alpha = clamp(night * 0.34 + dusk * 0.07, 0, 0.42);
    if (alpha <= 0.01) return;
    const regionId = visualMood?.regionProfile?.id || state.regions.activeRegion;
    const tint = regionId === "ironlantern"
      ? { r: 4, g: 12, b: 28 }
      : regionId === "ashfall"
        ? { r: 30, g: 13, b: 8 }
        : { r: 6, g: 13, b: 21 };
    const veil = ctx.createLinearGradient(0, 0, 0, height);
    veil.addColorStop(0, `rgba(${tint.r}, ${tint.g}, ${tint.b + 10}, ${alpha * 0.8})`);
    veil.addColorStop(0.55, `rgba(${tint.r}, ${tint.g}, ${tint.b}, ${alpha})`);
    veil.addColorStop(1, `rgba(${tint.r}, ${tint.g}, ${tint.b}, ${alpha * 1.15})`);
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, width, height);

    const horizonGlow = ctx.createLinearGradient(0, horizon - 44, 0, horizon + 68);
    if (regionId === "ironlantern") {
      horizonGlow.addColorStop(0, "rgba(105, 171, 255, 0)");
      horizonGlow.addColorStop(0.58, `rgba(105, 171, 255, ${0.05 + night * 0.08})`);
      horizonGlow.addColorStop(1, "rgba(105, 171, 255, 0)");
    } else if (regionId === "ashfall") {
      horizonGlow.addColorStop(0, "rgba(255, 138, 76, 0)");
      horizonGlow.addColorStop(0.58, `rgba(255, 138, 76, ${0.05 + night * 0.08})`);
      horizonGlow.addColorStop(1, "rgba(255, 138, 76, 0)");
    } else {
      horizonGlow.addColorStop(0, "rgba(255, 215, 123, 0)");
      horizonGlow.addColorStop(0.58, `rgba(255, 215, 123, ${0.04 + night * 0.06})`);
      horizonGlow.addColorStop(1, "rgba(255, 215, 123, 0)");
    }
    ctx.fillStyle = horizonGlow;
    ctx.fillRect(0, horizon - 44, width, 112);
  }

  function render3D() {
    const width = canvas.width;
    const height = canvas.height;
    const dayForMood = 0.5 + Math.sin(state.time * 0.014) * 0.45;
    const visualMoodBase = buildVisualMood({
      weather: state.weather,
      chapterIndex: state.narrative.chapterIndex,
      day: dayForMood,
      qualitySetting: state.weather.quality,
      biome: state.regions.activeRegion,
    });
    visualMoodBase.regionProfile = getRegionVisualIdentity(state.regions.activeRegion);
    const visualMood = applyGraphicsAccessibility(visualMoodBase, state.graphics.accessibility);
    const worldNightStrength = resolveWorldNightStrength();
    visualMood.nightStrength = Math.max(numberOr(visualMood.nightStrength, 0), worldNightStrength);
    visualMood.dynamicLightStrength = numberOr(visualMood.dynamicLightStrength, 0.35) + worldNightStrength * 0.24;
    latestParticleMultiplier = clamp(numberOr(visualMood.particleMultiplier, 1), 0, 1);
    latestColorblindPalette = getColorblindPalette(visualMood.colorblindMode);
    const gradientCacheEnabled = isGradientCacheEnabled();
    const cameraShakeStrength = clamp(visualMood.cameraShake ?? 1, 0, 1.5);
    const sceneRegionPresentation = state.player.inHouse
      ? null
      : buildRegionWorldPresentation(state.regions.activeRegion, worldPresentationContext());
    const sceneLights = collectSceneDynamicLights(sceneRegionPresentation, visualMood);

    const baseHorizon = drawSkyAndGround(width, height, dayForMood, visualMood);
    const bobOffset = Math.sin(state.player.walkBob * 2.2) * (state.player.inHouse ? 1.2 : 2.2);
    const hitJitter = Math.sin(state.time * 120) * state.player.hitPulse * 5;
    const shakeAmt = state.player.screenShake * cameraShakeStrength;
    const shakeX = shakeAmt > 0 ? Math.sin(state.time * 89 + 1.2) * shakeAmt * 14 : 0;
    const shakeY = shakeAmt > 0 ? Math.cos(state.time * 73) * shakeAmt * 9 : 0;
    const horizon = clamp(baseHorizon + bobOffset + hitJitter + shakeY, height * 0.38, height * 0.66);
    drawGroundDetails(horizon, width, height, visualMood);

    if (!cachedDepthBuffer || cachedDepthBuffer.length !== width) {
      cachedDepthBuffer = new Float32Array(width);
    }
    const depth = cachedDepthBuffer;
    ctx.imageSmoothingEnabled = false;

    for (let x = 0; x < width; x++) {
      const rayAngle = state.player.angle - FOV / 2 + (x / width) * FOV;
      const hit = castRay(rayAngle);
      const correctedDist = Math.max(0.0001, hit.dist * Math.cos(rayAngle - state.player.angle));
      const hitX = state.player.x + Math.cos(rayAngle) * hit.dist;
      const hitY = state.player.y + Math.sin(rayAngle) * hit.dist;
      depth[x] = correctedDist;
      const projection = resolveWallProjection({
        height,
        horizon,
        correctedDist,
        inHouse: state.player.inHouse,
        nearClip: WALL_RENDER_NEAR_CLIP,
      });
      const projectedDist = projection.projectedDist;
      const wallHeight = projection.wallHeight;
      const y = projection.y;

      let tex = textures.stone;
      if (hit.tileType === 2) tex = textures.water;
      if (hit.tileType === 3) tex = textures.timber;
      if (hit.tileType === 4) tex = textures.plaster;
      if (hit.tileType === 5) tex = textures.neon;

      let texX = Math.floor(hit.wallX * (TEXTURE_SIZE - 1));
      if (!Number.isFinite(texX)) texX = 0;
      if ((hit.side === 0 && Math.cos(rayAngle) > 0) || (hit.side === 1 && Math.sin(rayAngle) < 0)) {
        texX = TEXTURE_SIZE - 1 - texX;
      }
      texX = clamp(texX, 0, TEXTURE_SIZE - 1);

      ctx.drawImage(tex, texX, 0, 1, TEXTURE_SIZE, x, y, 1, wallHeight);

      const shade = clamp(1.24 - projectedDist / (MAX_RAY_DIST * 0.86) - (hit.side === 1 ? 0.14 : 0), 0.2, 1);
      const contrastPass = (state.player.inHouse ? 0.74 : 0.94) * clamp(visualMood.contrastBoost || 1, 0.9, 1.4);
      ctx.fillStyle = `rgba(8, 12, 18, ${(1 - shade) * contrastPass * (1 + visualMood.gradeStrength * 0.22)})`;
      ctx.fillRect(x, y, 1, wallHeight);
      const baseShadow = clamp((projectedDist / MAX_RAY_DIST) * 0.5 + 0.06, 0.08, 0.56);
      ctx.fillStyle = `rgba(9, 14, 18, ${baseShadow})`;
      ctx.fillRect(x, y + wallHeight * 0.82, 1, wallHeight * 0.18);
      const wallLight = resolveDynamicLightAtPoint(
        { x: hitX, y: hitY },
        sceneLights,
        { time: state.time, strength: visualMood.dynamicLightStrength },
      );
      if (wallLight.active) {
        const verticalAlpha = Number((wallLight.alpha * 0.09).toFixed(3));
        ctx.fillStyle = wallLight.style;
        ctx.fillRect(x, y, 1, wallHeight);
        ctx.fillStyle = `rgba(${wallLight.r}, ${wallLight.g}, ${wallLight.b}, ${verticalAlpha})`;
        ctx.fillRect(x, y + wallHeight * 0.72, 1, wallHeight * 0.28);
      }
      const nearWall = resolveNearWallVisualTreatment({
        correctedDist,
        nearClip: WALL_RENDER_NEAR_CLIP,
        side: hit.side,
        inHouse: state.player.inHouse,
      });
      if (nearWall.active) {
        ctx.fillStyle = `rgba(7, 10, 12, ${nearWall.alpha + nearWall.sideShade})`;
        ctx.fillRect(x, 0, 1, height);
        const grain = (Math.sin(state.time * 21 + x * 0.42) * 0.5 + 0.5) * nearWall.grainAlpha;
        ctx.fillStyle = `rgba(255, 235, 190, ${grain})`;
        ctx.fillRect(x, Math.max(0, y), 1, Math.min(height, wallHeight));
        const visibleTop = Math.max(0, y);
        const visibleBottom = Math.min(height, y + wallHeight);
        const visibleH = Math.max(0, visibleBottom - visibleTop);
        if (visibleH > 0) {
          ctx.fillStyle = `rgba(0, 0, 0, ${nearWall.contactAlpha})`;
          ctx.fillRect(x, visibleBottom - Math.max(3, visibleH * 0.13), 1, Math.max(3, visibleH * 0.13));
          ctx.fillStyle = `rgba(255, 218, 148, ${nearWall.highlightAlpha})`;
          ctx.fillRect(x, visibleTop, 1, Math.max(2, visibleH * 0.035));
          const trimY = visibleTop + visibleH * 0.32 + Math.sin(x * 0.13) * 1.5;
          ctx.fillStyle = `rgba(255, 205, 132, ${nearWall.trimAlpha})`;
          ctx.fillRect(x, trimY, 1, Math.max(1, visibleH * 0.012));
          const decalY = visibleTop + visibleH * (0.56 + Math.sin(x * 0.037 + state.time * 0.4) * 0.04);
          ctx.fillStyle = `rgba(33, 24, 18, ${nearWall.decalAlpha})`;
          ctx.fillRect(x, decalY, 1, Math.max(1, visibleH * 0.018));
          const supportPhase = x % 112;
          if (supportPhase < 2 || supportPhase > 109) {
            ctx.fillStyle = `rgba(28, 19, 13, ${nearWall.supportAlpha})`;
            ctx.fillRect(x, visibleTop, 1, visibleH);
            ctx.fillStyle = `rgba(255, 219, 150, ${nearWall.highlightAlpha * 0.65})`;
            ctx.fillRect(x + 1, visibleTop, 1, visibleH);
          }
          const courseLines = [0.18, 0.44, 0.7];
          for (const course of courseLines) {
            const courseY = visibleTop + visibleH * course + Math.sin(x * 0.06 + course * 12) * 1.2;
            ctx.fillStyle = `rgba(35, 24, 16, ${nearWall.courseAlpha})`;
            ctx.fillRect(x, courseY, 1, Math.max(1, visibleH * 0.01));
          }
          const baseboardH = Math.max(6, visibleH * 0.07);
          ctx.fillStyle = `rgba(37, 25, 16, ${nearWall.baseboardAlpha})`;
          ctx.fillRect(x, visibleBottom - baseboardH, 1, baseboardH);
        }
        if (x < 3 || x > width - 4) {
          ctx.fillStyle = `rgba(0, 0, 0, ${nearWall.edgeAlpha})`;
          ctx.fillRect(x, 0, 1, height);
        }
      }

      if (hit.tileType === 2 && !state.player.inHouse) {
        const shimmer = (Math.sin(state.time * 3.2 + x * 0.07) * 0.5 + 0.5) * 0.2 * (1 + visualMood.shimmerStrength);
        ctx.fillStyle = `rgba(126, 188, 226, ${shimmer * 0.4})`;
        ctx.fillRect(x, y, 1, wallHeight);
      }

      if (!state.player.inHouse) {
        const fog = clamp((projectedDist - 5) / (MAX_RAY_DIST - 5), 0, 1);
        if (fog > 0) {
          const tint = visualMood.skyTint;
          ctx.fillStyle = `rgba(${tint.r + 100}, ${tint.g + 112}, ${tint.b + 120}, ${fog * (0.28 + visualMood.fogStrength)})`;
          ctx.fillRect(x, y, 1, wallHeight);
        }
      }
    }
    ctx.imageSmoothingEnabled = true;
    drawNightContrastOverlay(width, height, horizon, visualMood);
    drawDynamicLightPools(sceneLights, horizon, width, height, shakeX, visualMood);

    const sprites = [];

    if (state.player.regionInterior) {
      const interior = REGION_INTERIORS[state.player.regionInterior];
      if (interior) {
        sprites.push({ x: interior.exit.x, y: interior.exit.y, color: "#6d5a45", label: "Exit", size: 0.95, kind: "exit-door" });
      }
    } else if (state.player.inHouse) {
      const houseProgress = resolveHouseProgressDisplay({
        inventory: state.inventory,
        jobState: state.world.jobs,
        house: state.house,
      });
      sprites.push({ x: state.house.bed.x, y: state.house.bed.y, color: "#7f4a43", label: "Bed", size: 0.95, kind: "bed" });
      sprites.push({ x: state.house.stash.x, y: state.house.stash.y, color: "#896748", label: "Stash", size: 0.9, kind: "stash" });
      sprites.push({ x: state.house.interiorDoor.x, y: state.house.interiorDoor.y, color: "#6d5a45", label: "Exit", size: 0.95, kind: "exit-door" });
      for (const trophy of houseProgress.trophies) {
        sprites.push({
          x: trophy.x,
          y: trophy.y,
          color: trophy.color,
          label: trophy.label,
          size: 0.58,
          kind: "house-trophy",
          trophyId: trophy.id,
        });
      }
    } else {
      const regionPresentation = sceneRegionPresentation || buildRegionWorldPresentation(state.regions.activeRegion, worldPresentationContext());
      const regionInteriorEntry = getRegionInteriorByRegion(state.regions.activeRegion);
      if (regionInteriorEntry) {
        sprites.push({
          x: REGION_INTERIOR_ENTRANCE.x,
          y: REGION_INTERIOR_ENTRANCE.y,
          color: regionInteriorEntry.propColor,
          label: regionInteriorEntry.propLabel,
          size: 1.05,
          kind: "exit-door",
        });
      }
      sprites.push({
        ...regionPresentation.landmark,
        kind: "landmark",
        landmarkVariant: regionPresentation.landmark.variant,
        label: regionPresentation.landmark.label,
        size: regionPresentation.landmark.size || 1.2,
      });
      for (const vista of regionPresentation.vistas || []) {
        sprites.push({
          ...vista,
          kind: "world-prop",
          propKind: vista.kind,
          label: vista.label,
          size: vista.size || 0.94,
        });
      }
      for (const road of regionPresentation.roads || []) {
        sprites.push({
          ...road,
          kind: "world-prop",
          propKind: road.kind,
          label: road.label,
          size: road.size || 0.44,
        });
      }
      for (const roadSign of regionPresentation.roadSigns || []) {
        sprites.push({
          ...roadSign,
          kind: "world-prop",
          propKind: roadSign.kind,
          label: roadSign.targetLabel || roadSign.label,
          size: roadSign.size || 0.6,
        });
      }
      for (const prop of regionPresentation.props) {
        sprites.push({
          ...prop,
          kind: "world-prop",
          propKind: prop.kind,
          label: prop.label,
          size: prop.size || 0.58,
        });
      }
      const boardProp = getActiveJobBoardProp();
      if (boardProp) {
        sprites.push({
          ...boardProp,
          kind: "job-board",
          label: boardProp.label,
          size: 1.08,
        });
      }

      const pressure = resolveFirstMinutePressure({
        mode: state.mode,
        time: state.time,
        inHouse: state.player.inHouse,
        regionId: state.regions.activeRegion,
        player: state.player,
        inventory: state.inventory,
        quests: state.quests,
      });
      if (pressure?.marker) {
        sprites.push({
          ...pressure.marker,
          kind: "pressure",
          label: pressure.marker.label,
          size: pressure.marker.size || 0.82,
        });
      }
      const roadsideDiscoveries = findNearbyRoadsideDiscoveries(
        state.regions,
        state.regions.activeRegion,
        state.player.x,
        state.player.y,
        MAX_RAY_DIST,
      ).slice(0, 3);
      const roadsideIds = new Set(roadsideDiscoveries.map((poi) => poi.id));
      for (const discovery of roadsideDiscoveries) {
        sprites.push({
          x: discovery.x,
          y: discovery.y,
          color: discovery.color,
          label: discovery.label,
          poiKind: discovery.kind,
          kind: "roadside-discovery",
          size: discovery.kind === "camp" || discovery.kind === "wagon" ? 0.98 : 0.86,
        });
      }
      const poiLead = resolveRoadDiscoveryLead(state.regions, state.regions.activeRegion, state.player.x, state.player.y, { maxDistance: MAX_RAY_DIST })
        || resolvePOILead(state.regions, state.regions.activeRegion, state.player.x, state.player.y, { maxDistance: MAX_RAY_DIST });
      if (poiLead && !roadsideIds.has(poiLead.id)) {
        sprites.push({
          x: poiLead.x,
          y: poiLead.y,
          color: poiLead.color,
          label: poiLead.label,
          poiKind: poiLead.kind,
          kind: "poi",
          size: poiLead.kind === "camp" || poiLead.kind === "hideout" ? 1.02 : 0.9,
        });
      }
      const jobMarker = getJobRouteMarker();
      if (jobMarker) {
        sprites.push({
          ...jobMarker,
          kind: "job-route",
          label: jobMarker.label,
          size: jobMarker.kind === "job_turn_in" ? 0.94 : 0.82,
        });
      }

      for (const npc of state.npcs) {
        sprites.push({ x: npc.x, y: npc.y, color: npc.color, label: npc.name, size: 1.04, kind: "npc" });
      }

      if (state.companion.active) {
        sprites.push({
          x: state.companion.x,
          y: state.companion.y,
          color: state.companion.color,
          label: `${state.companion.name} (Companion)`,
          size: 0.98,
          kind: "npc",
        });
      }

      for (const pig of state.pigs) {
        sprites.push({
          x: pig.x,
          y: pig.y,
          color: "#e29da0",
          label: pig.name,
          size: 0.92,
          kind: "pig",
          role: pig.role,
          hatColor: pig.hatColor,
          bandanaColor: pig.bandanaColor,
          gaitPhase: pig.gaitPhase,
          heading: pig.heading,
        });
      }

      for (const enemy of state.enemies) {
        if (!enemy.alive) continue;
        sprites.push({
          x: enemy.x,
          y: enemy.y,
          color: enemy.color || "#6be873",
          label: enemy.label || "Slime",
          enemyType: enemy.type,
          size: enemy.type === "brute" ? 1.18 : enemy.type === "spitter" ? 0.86 : 1.0,
          kind: "enemy",
          hp: enemy.hp,
          maxHp: enemy.maxHp,
          flashTimer: enemy.flashTimer,
          windupTimer: enemy.windupTimer || 0,
          windupMax: enemy.windupMax || 0,
          stagger: enemy.stagger || 0,
          phase: enemy.phase || 1,
          phaseLabel: enemy.phaseLabel,
          statuses: enemy.statuses,
          readabilityCue: resolveEnemyReadabilityCue(enemy),
        });
      }

      for (const resource of state.resources) {
        if (resource.harvested) continue;
        if (resource.type === "crystal") {
          sprites.push({ x: resource.x, y: resource.y, color: "#8dc4ff", label: "Crystal", size: 0.62, kind: "resource" });
        } else if (resource.type === "archive-node") {
          sprites.push({ x: resource.x, y: resource.y, color: "#d96cff", label: "Archive", size: 0.78, kind: "resource" });
        } else if (resource.type === "rock") {
          sprites.push({ x: resource.x, y: resource.y, color: "#8f969f", label: "Stone", size: 0.72, kind: "resource" });
        } else if (resource.type === "ashglass") {
          sprites.push({ x: resource.x, y: resource.y, color: "#e2a36b", label: "Ashglass", size: 0.6, kind: "resource" });
        } else if (resource.type === "scrap-coil") {
          sprites.push({ x: resource.x, y: resource.y, color: "#b89060", label: "Scrap Coil", size: 0.66, kind: "resource" });
        } else if (resource.type === "heat-resin") {
          sprites.push({ x: resource.x, y: resource.y, color: "#ff8a4c", label: "Heat Resin", size: 0.58, kind: "resource" });
        } else if (resource.type === "lantern-filament") {
          sprites.push({ x: resource.x, y: resource.y, color: "#9bd3ff", label: "Filament", size: 0.6, kind: "resource" });
        } else if (resource.type === "cipher-lens") {
          sprites.push({ x: resource.x, y: resource.y, color: "#c8a8ff", label: "Cipher Lens", size: 0.62, kind: "resource" });
        } else if (resource.type === "pressurized-ink") {
          sprites.push({ x: resource.x, y: resource.y, color: "#7e8cff", label: "Pressure Ink", size: 0.62, kind: "resource" });
        } else {
          sprites.push({ x: resource.x, y: resource.y, color: "#2d6138", label: "Tree", size: 1.35, kind: "resource" });
        }
      }

      if (!state.chest.opened) {
        sprites.push({
          x: state.chest.x,
          y: state.chest.y,
          color: state.chest.firstRewardClaimed ? "#bf8a4f" : "#ffd77b",
          label: state.chest.firstRewardClaimed ? "Cache" : "Smoke Cache",
          size: state.chest.firstRewardClaimed ? 0.82 : 0.94,
          kind: "chest",
        });
      }

      sprites.push({ x: state.house.outsideDoor.x, y: state.house.outsideDoor.y, color: "#7f664b", label: "House", size: 1.03, kind: "house-door" });
    }

    const projected = [];
    const MAX_RAY_DIST_SQ = MAX_RAY_DIST * MAX_RAY_DIST;
    const MIN_DIST_SQ = 0.12 * 0.12;

    for (const sprite of sprites) {
      const dx = sprite.x - state.player.x;
      const dy = sprite.y - state.player.y;

      // Quick distance check using squared distance (avoids sqrt)
      const distSq = dx * dx + dy * dy;
      if (distSq < MIN_DIST_SQ || distSq > MAX_RAY_DIST_SQ) continue;

      const ang = normalizeAngle(Math.atan2(dy, dx) - state.player.angle);
      if (Math.abs(ang) > FOV * 0.72) continue;

      // Only compute actual distance when needed
      const d = Math.sqrt(distSq);
      const sx = ((ang + FOV / 2) / FOV) * width;
      const scale = (height / (d + 0.01)) * sprite.size * 0.58;
      projected.push({ ...sprite, sx, distToPlayer: d, scale });
    }

    projected.sort((a, b) => b.distToPlayer - a.distToPlayer);

    for (const sprite of projected) {
      const widthScale = sprite.kind === "resource" && sprite.label === "Tree" ? 0.82 : sprite.kind === "pig" ? 0.72 : 0.62;
      const nearDampen = clamp((sprite.distToPlayer - 0.35) / 1.7, 0.52, 1);
      const visualScale = sprite.scale * nearDampen;
      const maxHeight =
        sprite.kind === "npc" ? height * 0.56 :
          sprite.kind === "pig" ? height * 0.42 :
            sprite.kind === "enemy" ? height * 0.5 : height * 0.7;
      const spriteWidth = clamp(visualScale * widthScale, 6, width * 0.34);
      const spriteHeight = clamp(visualScale, 8, maxHeight);
      const left = Math.floor(sprite.sx - spriteWidth / 2 + shakeX);
      const top = Math.floor(horizon - spriteHeight * 0.67);

      const depthIdx = Math.min(Math.floor(sprite.sx), width - 1);
      if (sprite.sx >= 0 && sprite.sx < width && sprite.distToPlayer > depth[depthIdx] + 0.08) continue;

      const spriteLight = resolveDynamicLightAtPoint(
        { x: sprite.x, y: sprite.y },
        sceneLights,
        { time: state.time, strength: visualMood.dynamicLightStrength },
      );
      const light = clamp(1 - sprite.distToPlayer / MAX_RAY_DIST + visualMood.dynamicLightStrength * 0.08 + spriteLight.alpha * 0.36, 0.25, 1.24);
      if (spriteLight.active && spriteLight.alpha > 0.08) {
        const haloRadius = clamp(spriteWidth * (0.58 + spriteLight.alpha * 0.9), 8, width * 0.18);
        const halo = ctx.createRadialGradient(left + spriteWidth * 0.5, top + spriteHeight * 0.48, 0, left + spriteWidth * 0.5, top + spriteHeight * 0.48, haloRadius);
        halo.addColorStop(0, `rgba(${spriteLight.r}, ${spriteLight.g}, ${spriteLight.b}, ${clamp(spriteLight.alpha * 0.18, 0, 0.28)})`);
        halo.addColorStop(1, `rgba(${spriteLight.r}, ${spriteLight.g}, ${spriteLight.b}, 0)`);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = halo;
        ctx.fillRect(left + spriteWidth * 0.5 - haloRadius, top + spriteHeight * 0.48 - haloRadius, haloRadius * 2, haloRadius * 2);
        ctx.restore();
      }
      drawBillboardSprite(sprite, left, top, spriteWidth, spriteHeight, light);

      if (sprite.kind === "enemy") {
        if (visualMood.silhouetteStrength > 0.05) {
          ctx.strokeStyle = `rgba(255, 238, 192, ${0.18 + visualMood.silhouetteStrength * 0.35})`;
          ctx.lineWidth = 1.2;
          ctx.strokeRect(left - 1, top - 1, spriteWidth + 2, spriteHeight + 2);
        }
        const hpRatio = clamp(sprite.hp / sprite.maxHp, 0, 1);
        const barW = spriteWidth;
        const barY = top - 6;
        fillRoundedRect(left, barY, barW, 5, 2, "rgba(22, 8, 8, 0.82)");
        fillRoundedRect(left, barY, barW * hpRatio, 5, 2, "#92f0a3");
        const cue = sprite.readabilityCue;
        if (cue && cue.state !== "aggro") {
          const cueY = barY - 11;
          ctx.font = "bold 9px Georgia";
          const cueW = clamp(spriteWidth * 0.72, 34, 76);
          fillRoundedRect(left + (spriteWidth - cueW) / 2, cueY, cueW, 9, 4, "rgba(20, 10, 8, 0.78)");
          drawClippedText(cue.label, left + (spriteWidth - cueW) / 2 + 4, cueY + 7, cueW - 8, cue.color || "#ffd77b");
          if (cue.meter > 0) {
            fillRoundedRect(left + (spriteWidth - cueW) / 2, cueY + 10, cueW, 3, 2, "rgba(0,0,0,0.35)");
            fillRoundedRect(left + (spriteWidth - cueW) / 2, cueY + 10, cueW * cue.meter, 3, 2, cue.color || "#ffd77b");
          }
        }
      }

      const centeredLabel = Math.abs(sprite.sx - width / 2) < width * 0.24;
      const labelImportant = sprite.kind === "npc"
        || sprite.kind === "enemy"
        || sprite.kind === "chest"
        || sprite.kind === "landmark"
        || sprite.kind === "house-door"
        || sprite.kind === "pressure"
        || sprite.kind === "job-route"
        || sprite.kind === "job-board"
        || (sprite.kind === "world-prop" && ["road-sign", "sign", "lamp"].includes(sprite.propKind));
      if (state.mode === "playing" && sprite.label && centeredLabel && sprite.distToPlayer < 5.8 && labelImportant) {
        ctx.font = "bold 11px Georgia";
        drawPillLabel(fitText(sprite.label, 116), left + spriteWidth / 2, top - 10);
      }
    }

    if (state.floatingTexts.length > 0) {
      const MAX_RAY_DIST_SQ_FT = MAX_RAY_DIST * MAX_RAY_DIST;
      ctx.save();
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0,0,0,0.85)";
      ctx.shadowBlur = 5;
      for (const ft of state.floatingTexts) {
        const ftDx = ft.wx - state.player.x;
        const ftDy = ft.wy - state.player.y;
        const ftDistSq = ftDx * ftDx + ftDy * ftDy;
        if (ftDistSq < 0.04 || ftDistSq > MAX_RAY_DIST_SQ_FT) continue;
        const ftAng = normalizeAngle(Math.atan2(ftDy, ftDx) - state.player.angle);
        if (Math.abs(ftAng) > FOV * 0.6) continue;
        const ftD = Math.sqrt(ftDistSq);
        const ftSx = ((ftAng + FOV / 2) / FOV) * width + shakeX;
        const rise = (1 - ft.life / ft.maxLife) * 40;
        const ftSy = horizon - (height / (ftD + 0.01)) * 0.44 - rise;
        const ftDepthIdx = clamp(Math.floor(ftSx), 0, width - 1);
        if (ftD > depth[ftDepthIdx] + 0.3) continue;
        const alpha = Math.min(1, ft.life / ft.maxLife * 2.5);
        const fontSize = clamp(height / (ftD + 0.01) * 0.2, 11, 26);
        ctx.font = `bold ${fontSize}px Georgia`;
        ctx.globalAlpha = alpha;
        let ftColor = ft.color;
        if (latestColorblindPalette) {
          if (ft.text === "SLAIN" || ft.text.startsWith("-")) ftColor = latestColorblindPalette.foe;
          else if (ft.text.startsWith("+")) ftColor = latestColorblindPalette.friend;
          else ftColor = latestColorblindPalette.neutral;
        }
        ctx.fillStyle = ftColor;
        ctx.fillText(ft.text, ftSx, ftSy);
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = "left";
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    if (state.mode !== "menu") {
      const crossSize = state.player.blocking ? 6 : 4;
      const hitMarkerStrength = clamp(visualMood.hitMarkerStrength ?? 1, 0.4, 2);
      const crossColor = state.player.hitPulse > 0
        ? `rgba(255, 186, 159, ${clamp(0.56 + hitMarkerStrength * 0.22, 0.55, 1)})`
        : "rgba(255, 244, 218, 0.92)";
      const cx = width / 2;
      const cy = height / 2;
      ctx.save();
      ctx.shadowColor = "rgba(255, 219, 156, 0.32)";
      ctx.shadowBlur = 8;
      ctx.strokeStyle = crossColor;
      ctx.lineWidth = 1.2 + hitMarkerStrength * 0.55;
      ctx.beginPath();
      ctx.moveTo(cx - crossSize - 7, cy);
      ctx.lineTo(cx - crossSize, cy);
      ctx.moveTo(cx + crossSize, cy);
      ctx.lineTo(cx + crossSize + 7, cy);
      ctx.moveTo(cx, cy - crossSize - 7);
      ctx.lineTo(cx, cy - crossSize);
      ctx.moveTo(cx, cy + crossSize);
      ctx.lineTo(cx, cy + crossSize + 7);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, state.player.blocking ? 13 : 8, 0, TAU);
      ctx.strokeStyle = state.player.blocking ? "rgba(126, 220, 255, 0.58)" : "rgba(255, 255, 255, 0.26)";
      ctx.stroke();

      if (state.player.comboWindow > 0) {
        const pipColors = ["#ffe84e", "#ff9f3a", "#ff5555"];
        const pipR = 4;
        const pipSpacing = 11;
        const totalW = 3 * pipSpacing - (pipSpacing - pipR * 2);
        let px = cx - totalW / 2 + pipR;
        for (let i = 0; i < 3; i++) {
          const filled = i < state.player.comboStep;
          ctx.beginPath();
          ctx.arc(px, cy + 22, pipR, 0, TAU);
          ctx.fillStyle = filled ? pipColors[state.player.comboStep - 1] : "rgba(255,255,255,0.18)";
          ctx.shadowColor = filled ? pipColors[state.player.comboStep - 1] : "transparent";
          ctx.shadowBlur = filled ? 8 : 0;
          ctx.fill();
          px += pipSpacing;
        }
        ctx.shadowBlur = 0;
      }

      ctx.restore();

      if (state.player.hitPulse > 0) {
        const flash = ctx.createRadialGradient(width / 2, height / 2, 8, width / 2, height / 2, 120);
        flash.addColorStop(0, `rgba(255, 132, 132, ${state.player.hitPulse * (0.18 + hitMarkerStrength * 0.16)})`);
        flash.addColorStop(1, "rgba(255,132,132,0)");
        ctx.fillStyle = flash;
        ctx.fillRect(0, 0, width, height);
      }

      if (state.player.hurtCooldown > 0) {
        const hurtT = clamp(state.player.hurtCooldown / 0.33, 0, 1);
        const hurtBucket = gradientBucket(hurtT, 12);
        const hurtVig = getCachedGradient(
          `hurt-vig|${width}|${height}|${hurtBucket}`,
          () => {
            const g = ctx.createRadialGradient(width * 0.5, height * 0.5, width * 0.14, width * 0.5, height * 0.5, width * 0.72);
            g.addColorStop(0, `rgba(190, 0, 0, ${hurtBucket * 0.06})`);
            g.addColorStop(0.55, `rgba(210, 0, 0, ${hurtBucket * 0.1})`);
            g.addColorStop(1, `rgba(230, 10, 10, ${hurtBucket * 0.58})`);
            return g;
          },
          gradientCacheEnabled,
        );
        ctx.fillStyle = hurtVig;
        ctx.fillRect(0, 0, width, height);
      }
    }

    const bloomAlpha = clamp(0.12 + visualMood.bloomStrength * 0.22, 0, 1);
    const bloomBucket = gradientBucket(bloomAlpha, 12);
    const bloom = getCachedGradient(
      `bloom|${width}|${height}|${bloomBucket}`,
      () => {
        const g = ctx.createRadialGradient(width * 0.5, height * 0.46, width * 0.06, width * 0.5, height * 0.46, width * 0.62);
        g.addColorStop(0, `rgba(255, 240, 218, ${bloomBucket})`);
        g.addColorStop(1, "rgba(255, 240, 218, 0)");
        return g;
      },
      gradientCacheEnabled,
    );
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, width, height);

    const grade = visualMood.skyTint;
    ctx.fillStyle = `rgba(${grade.r + 28}, ${grade.g + 16}, ${grade.b + 30}, ${visualMood.gradeStrength * 0.2})`;
    ctx.fillRect(0, 0, width, height);

    if (visualMood.factionCueStrength > 0.12 && !state.player.inHouse) {
      ctx.fillStyle = `rgba(122, 188, 255, ${Math.min(0.18, visualMood.factionCueStrength * 0.28)})`;
      ctx.fillRect(width * 0.18, height * 0.1, width * 0.12, height * 0.008);
      ctx.fillStyle = `rgba(255, 158, 122, ${Math.min(0.18, visualMood.factionCueStrength * 0.28)})`;
      ctx.fillRect(width * 0.7, height * 0.12, width * 0.12, height * 0.008);
    }

    const vignetteAlpha = clamp(Math.min(0.62, visualMood.vignetteStrength), 0, 1);
    const vignetteBucket = gradientBucket(vignetteAlpha, 12);
    const vignette = getCachedGradient(
      `vignette|${width}|${height}|${vignetteBucket}`,
      () => {
        const g = ctx.createRadialGradient(width * 0.5, height * 0.5, width * 0.12, width * 0.5, height * 0.5, width * 0.68);
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(1, `rgba(0,0,0,${vignetteBucket})`);
        return g;
      },
      gradientCacheEnabled,
    );
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    const grainAlpha = 0.025 + visualMood.gradeStrength * 0.025;
    ctx.fillStyle = `rgba(255, 244, 218, ${grainAlpha})`;
    const grainStep = width > 900 ? 14 : 18;
    const grainTick = Math.floor(state.time * 8);
    for (let y = 0; y < height; y += grainStep) {
      for (let x = (y + grainTick) % grainStep; x < width; x += grainStep * 2) {
        if (((x * 17 + y * 31 + grainTick * 13) % 7) < 3) ctx.fillRect(x, y, 1, 1);
      }
    }

    if (state.player.hp / state.player.maxHp < 0.32) {
      const danger = 1 - state.player.hp / (state.player.maxHp * 0.32);
      const dangerBucket = gradientBucket(danger, 12);
      const hurt = getCachedGradient(
        `lowhp-hurt|${width}|${height}|${dangerBucket}`,
        () => {
          const g = ctx.createRadialGradient(width * 0.5, height * 0.48, width * 0.25, width * 0.5, height * 0.48, width * 0.72);
          g.addColorStop(0, "rgba(90, 0, 0, 0)");
          g.addColorStop(1, `rgba(143, 24, 18, ${0.22 * dangerBucket})`);
          return g;
        },
        gradientCacheEnabled,
      );
      ctx.fillStyle = hurt;
      ctx.fillRect(0, 0, width, height);
    }
  }

  function drawBar(x, y, w, h, ratio, bg, fg, label) {
    drawHudBar(x, y, w, h, clamp(ratio, 0, 1), bg, fg, label);
  }

  function drawMiniMap() {
    if (!state.showMap || canvas.width < 760) return;

    const map = currentMap();
    const regionProfile = state.player.inHouse ? null : getRegionVisualIdentity(state.regions.activeRegion);
    const presentation = state.player.inHouse ? null : buildRegionWorldPresentation(state.regions.activeRegion, worldPresentationContext());
    const tileRadius = state.player.inHouse ? 5 : 6;
    const cells = tileRadius * 2;
    const mapDiameter = canvas.width < 620 ? 116 : canvas.width < 900 ? 138 : 164;
    const mapRadius = mapDiameter / 2;
    const cell = mapDiameter / cells;
    const mapPad = canvas.width < 620 ? 10 : 16;
    const cx = canvas.width - mapRadius - mapPad;
    const cy = mapRadius + mapPad;

    ctx.save();

    // Outer shadow disc
    ctx.shadowColor = "rgba(0, 0, 0, 0.42)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = "rgba(4, 10, 14, 0.58)";
    ctx.beginPath();
    ctx.arc(cx + 2, cy + 2, mapRadius + 6, 0, TAU);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;

    // Dark background disc
    ctx.fillStyle = state.player.inHouse ? "rgba(8, 18, 20, 0.78)" : hexToRgba(regionProfile?.minimapTint || "#1b2830", 0.12);
    ctx.beginPath();
    ctx.arc(cx, cy, mapRadius + 4, 0, TAU);
    ctx.fill();
    if (!state.player.inHouse && regionProfile?.minimapTint) {
      const tintGlow = ctx.createRadialGradient(cx, cy, mapRadius * 0.24, cx, cy, mapRadius + 6);
      tintGlow.addColorStop(0, hexToRgba(regionProfile.minimapTint, 0.08));
      tintGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = tintGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, mapRadius + 4, 0, TAU);
      ctx.fill();
    }

    // Clip to circle for terrain
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, mapRadius, 0, TAU);
    ctx.clip();

    const px = Math.floor(state.player.x);
    const py = Math.floor(state.player.y);
    const originX = cx - mapRadius;
    const originY = cy - mapRadius;
    const minimapNightStrength = state.player.inHouse ? 0 : resolveWorldNightStrength();

    const regionMiniMapPalette = {
      frontier: {
        0: "#5a915c",
        1: "#8d745a",
        2: "#548eb2",
        3: "#7a5a3a",
        4: "#ada08e",
        5: "#5f6fa3",
      },
      ashfall: {
        0: "#6d4b3a",
        1: "#41342c",
        2: "#597e97",
        3: "#a4653e",
        4: "#d39b67",
        5: "#805a8e",
      },
      ironlantern: {
        0: "#41586b",
        1: "#2d3742",
        2: "#5f7fa8",
        3: "#617793",
        4: "#95b1cd",
        5: "#7a68b2",
      },
    };
    const outdoorPalette = regionMiniMapPalette[regionProfile?.id] || regionMiniMapPalette.frontier;

    for (let my = 0; my < cells; my++) {
      for (let mx = 0; mx < cells; mx++) {
        const wx = px - tileRadius + mx;
        const wy = py - tileRadius + my;
        const tile = map[wy]?.[wx] ?? 1;

        let color = state.player.inHouse ? "#6f6253" : outdoorPalette[0];
        if (tile === 1) color = state.player.inHouse ? "#8f7d64" : outdoorPalette[1];
        if (tile === 2) color = state.player.inHouse ? "#8f7d64" : outdoorPalette[2];
        if (tile === 3) color = state.player.inHouse ? "#7d654e" : outdoorPalette[3];
        if (tile === 4) color = state.player.inHouse ? "#a8957d" : outdoorPalette[4];
        if (tile === 5) color = state.player.inHouse ? "#8a7dc0" : outdoorPalette[5];

        ctx.fillStyle = color;
        ctx.fillRect(originX + mx * cell, originY + my * cell, cell + 0.5, cell + 0.5);

        // Fog of war overlay — dim undiscovered tiles
        if (!state.player.inHouse && state.fog) {
          const fogGrid = state.fog[state.regions?.activeRegion || "frontier"];
          if (fogGrid) {
            const { gx, gy } = (() => {
              const b = { frontier: { minX: 0, minY: 0, maxX: 32, maxY: 32 }, ashfall: { minX: 24, minY: 24, maxX: 56, maxY: 56 }, ironlantern: { minX: 48, minY: 0, maxX: 80, maxY: 32 } }[state.regions?.activeRegion || "frontier"] || { minX: 0, minY: 0, maxX: 32, maxY: 32 };
              const N = FOG_GRID_SIZE;
              return {
                gx: Math.max(0, Math.min(N - 1, Math.floor(((wx - b.minX) / (b.maxX - b.minX)) * N))),
                gy: Math.max(0, Math.min(N - 1, Math.floor(((wy - b.minY) / (b.maxY - b.minY)) * N))),
              };
            })();
            if (!isCellDiscovered(fogGrid, gx, gy)) {
              ctx.fillStyle = "rgba(8, 18, 20, 0.72)";
              ctx.fillRect(originX + mx * cell, originY + my * cell, cell + 0.5, cell + 0.5);
            }
          }
        }
      }
    }

    // Radial fog at edges
    const edgeFog = ctx.createRadialGradient(cx, cy, mapRadius * 0.55, cx, cy, mapRadius);
    edgeFog.addColorStop(0, "rgba(8, 18, 20, 0)");
    edgeFog.addColorStop(1, "rgba(8, 18, 20, 0.6)");
    ctx.fillStyle = edgeFog;
    ctx.fillRect(originX, originY, mapDiameter, mapDiameter);

    // Entity dot helper (draws a small glowing circle)
    function withAlpha(color, alpha) {
      if (color.startsWith("#") && (color.length === 7 || color.length === 4)) {
        const full = color.length === 4
          ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
          : color;
        const r = parseInt(full.slice(1, 3), 16);
        const g = parseInt(full.slice(3, 5), 16);
        const b = parseInt(full.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
      return color.replace(")", `, ${alpha})`).replace("rgb", "rgba");
    }

    function drawDot(wx, wy, color, size) {
      const dx = wx - (px - tileRadius);
      const dy = wy - (py - tileRadius);
      const dotX = originX + dx * cell;
      const dotY = originY + dy * cell;
      const distFromCenter = Math.sqrt((dotX - cx) ** 2 + (dotY - cy) ** 2);
      if (distFromCenter > mapRadius - 2) return;
      const dotStyle = resolveMinimapDotStyle(size, minimapNightStrength);
      // Glow
      ctx.fillStyle = withAlpha(color, dotStyle.glowAlpha);
      ctx.beginPath();
      ctx.arc(dotX, dotY, dotStyle.glowSize, 0, TAU);
      ctx.fill();
      // Core
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(dotX, dotY, dotStyle.coreSize, 0, TAU);
      ctx.fill();
    }

    function worldToMap(wx, wy) {
      const dx = wx - (px - tileRadius);
      const dy = wy - (py - tileRadius);
      return {
        x: originX + dx * cell,
        y: originY + dy * cell,
      };
    }

    function drawMarker(wx, wy, color, size, shape = "diamond") {
      const point = worldToMap(wx, wy);
      const distFromCenter = Math.sqrt((point.x - cx) ** 2 + (point.y - cy) ** 2);
      if (distFromCenter > mapRadius - 2) return;
      const markerStyle = resolveMinimapMarkerStyle(size, minimapNightStrength);
      ctx.fillStyle = withAlpha(color, markerStyle.glowAlpha);
      ctx.beginPath();
      ctx.arc(point.x, point.y, markerStyle.glowSize, 0, TAU);
      ctx.fill();
      if (markerStyle.ringVisible) {
        ctx.strokeStyle = withAlpha(color, markerStyle.ringAlpha);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(point.x, point.y, markerStyle.ringSize, 0, TAU);
        ctx.stroke();
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      if (shape === "triangle") {
        ctx.moveTo(point.x, point.y - size);
        ctx.lineTo(point.x + size * 0.9, point.y + size * 0.75);
        ctx.lineTo(point.x - size * 0.9, point.y + size * 0.75);
      } else if (shape === "square") {
        ctx.rect(point.x - size * 0.72, point.y - size * 0.72, size * 1.44, size * 1.44);
      } else {
        ctx.moveTo(point.x, point.y - size);
        ctx.lineTo(point.x + size, point.y);
        ctx.lineTo(point.x, point.y + size);
        ctx.lineTo(point.x - size, point.y);
      }
      ctx.closePath();
      ctx.fill();
    }

    function drawPolyline(points, color, alpha, lineWidth = 2) {
      const route = points
        .filter((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y))
        .map((point) => worldToMap(point.x, point.y));
      if (route.length < 2) return;
      const routeStyle = resolveMinimapPolylineStyle({ alpha, lineWidth, nightStrength: minimapNightStrength });
      ctx.strokeStyle = withAlpha(color, routeStyle.alpha);
      ctx.lineWidth = routeStyle.lineWidth;
      ctx.shadowColor = withAlpha(color, routeStyle.shadowAlpha);
      ctx.shadowBlur = routeStyle.shadowBlur;
      ctx.beginPath();
      ctx.moveTo(route[0].x, route[0].y);
      for (let i = 1; i < route.length; i++) {
        ctx.lineTo(route[i].x, route[i].y);
      }
      ctx.stroke();
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
    }

    if (!state.player.inHouse) {
      const cbPal = latestColorblindPalette;
      const enemyDot = cbPal ? cbPal.foe : "#98f39b";
      const npcDot = cbPal ? cbPal.friend : "#ffd77b";
      const pigDot = cbPal ? cbPal.neutral : "#f0adb4";
      const routePolyline = buildRegionRoutePolyline(presentation, { startX: state.player.x, startY: state.player.y });
      drawPolyline(routePolyline, regionProfile?.roadColor || "#d8bc6a", 0.42, 2.2);
      for (const enemy of state.enemies) {
        if (!enemy.alive) continue;
        drawDot(enemy.x, enemy.y, enemyDot, 2.5);
      }
      for (const npc of state.npcs) {
        drawDot(npc.x, npc.y, npcDot, 2.5);
      }
      for (const pig of state.pigs) {
        drawDot(pig.x, pig.y, pigDot, 2.5);
      }
      drawDot(state.house.outsideDoor.x, state.house.outsideDoor.y,
        state.house.unlocked ? "#d8bc6a" : "#9b7b56", 3.5);
      const boardProp = getActiveJobBoardProp();
      if (boardProp) {
        drawMarker(boardProp.x, boardProp.y, boardProp.color || "#d8a84f", 4, "square");
      }
      drawMarker(presentation.landmark.x, presentation.landmark.y, presentation.landmark.color || "#ffd77b", 4.2, "diamond");
      for (const vista of presentation.vistas || []) {
        drawDot(vista.x, vista.y, vista.color || "#ffd77b", 2.4);
      }
      for (const road of presentation.roads || []) {
        drawDot(road.x, road.y, road.color || "#d7b06d", 1.7);
      }
      for (const roadSign of presentation.roadSigns || []) {
        drawDot(roadSign.x, roadSign.y, roadSign.color || "#d7b06d", 2.1);
      }
      for (const prop of presentation.props) {
        if (prop.kind === "sign" || prop.kind === "lamp" || prop.kind === "smoke") {
          drawDot(prop.x, prop.y, prop.color || "#d7b06d", 1.8);
        }
      }
      const pressure = resolveFirstMinutePressure({
        mode: state.mode,
        time: state.time,
        inHouse: state.player.inHouse,
        regionId: state.regions.activeRegion,
        player: state.player,
        inventory: state.inventory,
        quests: state.quests,
      });
      if (pressure?.marker) {
        const blink = 0.5 + (Math.sin(state.time * 5) + 1) * 0.5;
        drawMarker(pressure.marker.x, pressure.marker.y, pressure.marker.color || "#ffd77b", 2.8 + blink * 0.6, "triangle");
      }
      const jobMarker = getJobRouteMarker();
      if (jobMarker) {
        const blink = 0.5 + (Math.sin(state.time * 5.5) + 1) * 0.5;
        drawPolyline([
          { x: state.player.x, y: state.player.y },
          { x: jobMarker.x, y: jobMarker.y },
        ], jobMarker.color || "#ffd77b", 0.28, 1.6);
        drawMarker(jobMarker.x, jobMarker.y, jobMarker.color || "#ffd77b", 3 + blink * 0.7, "triangle");
      }
      const roadRoute = getRoadRouteObjective();
      if (roadRoute && Number.isFinite(roadRoute.x) && Number.isFinite(roadRoute.y)) {
        const blink = 0.45 + (Math.sin(state.time * 4.9) + 1) * 0.45;
        drawPolyline([
          { x: state.player.x, y: state.player.y },
          { x: roadRoute.x, y: roadRoute.y },
        ], "#ffde91", 0.22, 1.4);
        drawMarker(roadRoute.x, roadRoute.y, "#ffde91", 2.8 + blink * 0.6, "diamond");
      }
      const roadDiscoveryLead = resolveRoadDiscoveryLead(state.regions, state.regions.activeRegion, state.player.x, state.player.y, { maxDistance: 28 });
      if (roadDiscoveryLead) {
        const blink = 0.5 + (Math.sin(state.time * 4.6) + 1) * 0.5;
        drawPolyline([
          { x: state.player.x, y: state.player.y },
          { x: roadDiscoveryLead.x, y: roadDiscoveryLead.y },
        ], roadDiscoveryLead.color || "#d8bc6a", 0.2, 1.3);
        drawMarker(roadDiscoveryLead.x, roadDiscoveryLead.y, roadDiscoveryLead.color || "#d8bc6a", 2.5 + blink * 0.5, "diamond");
      }
      const roadsideDiscoveries = findNearbyRoadsideDiscoveries(state.regions, state.regions.activeRegion, state.player.x, state.player.y, 12).slice(0, 3);
      const roadsideIds = new Set(roadsideDiscoveries.map((poi) => poi.id));
      for (const discovery of roadsideDiscoveries) {
        const pulse = 0.45 + (Math.sin(state.time * 5.1 + discovery.distance) + 1) * 0.45;
        drawMarker(discovery.x, discovery.y, discovery.color || "#d89f62", 2.2 + pulse * 0.5, "diamond");
      }

      // POI pings: blink nearby undiscovered POIs.
      if (state.regions?.activeRegion) {
        const nearbyPOIs = findNearbyPOIs(state.regions, state.regions.activeRegion, state.player.x, state.player.y, 4);
        const blink = (Math.sin(state.time * 4) + 1) * 0.5;
        for (let i = 0; i < nearbyPOIs.length; i++) {
          const poi = nearbyPOIs[i];
          if (roadsideIds.has(poi.id)) continue;
          const kind = POI_KINDS[poi.kind] || { color: "#fff" };
          drawDot(poi.x, poi.y, kind.color, 2.2 + blink * 1.3);
        }
      }
    } else {
      drawDot(state.house.bed.x, state.house.bed.y, "#d8a7a7", 3);
      drawDot(state.house.stash.x, state.house.stash.y, "#c9b372", 3);
      drawDot(state.house.interiorDoor.x, state.house.interiorDoor.y, "#d3c4a0", 3);
    }

    // Player dot + direction
    const playerX = cx + (state.player.x - px) * cell;
    const playerY = cy + (state.player.y - py) * cell;

    // Player glow
    const playerGlow = ctx.createRadialGradient(playerX, playerY, 0, playerX, playerY, 10);
    playerGlow.addColorStop(0, "rgba(255, 252, 240, 0.4)");
    playerGlow.addColorStop(1, "rgba(255, 252, 240, 0)");
    ctx.fillStyle = playerGlow;
    ctx.beginPath();
    ctx.arc(playerX, playerY, 10, 0, TAU);
    ctx.fill();

    // Direction cone (field of view wedge)
    ctx.fillStyle = "rgba(255, 252, 240, 0.1)";
    ctx.beginPath();
    ctx.moveTo(playerX, playerY);
    ctx.arc(playerX, playerY, 18, state.player.angle - FOV / 2, state.player.angle + FOV / 2);
    ctx.closePath();
    ctx.fill();

    // Player dot
    ctx.fillStyle = "#fffcf0";
    ctx.beginPath();
    ctx.arc(playerX, playerY, 3.5, 0, TAU);
    ctx.fill();

    // Direction line
    ctx.strokeStyle = "#fffcf0";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(playerX, playerY);
    ctx.lineTo(playerX + Math.cos(state.player.angle) * 10, playerY + Math.sin(state.player.angle) * 10);
    ctx.stroke();

    // Daily overlay encounter markers (ambush, wandering trader, etc.)
    if (!state.player.inHouse) {
      const overlays = getTodaysOverlays(state.regions?.activeRegion || "frontier");
      ctx.save();
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const overlay of overlays) {
        const op = worldToMap(overlay.wx, overlay.wy);
        const distFromCenter = Math.sqrt((op.x - cx) ** 2 + (op.y - cy) ** 2);
        if (distFromCenter > mapRadius - 4) continue;
        ctx.fillStyle = overlay.meta?.color || "#ffffff";
        ctx.globalAlpha = 0.8;
        ctx.fillText(overlay.meta?.symbol || "?", op.x, op.y);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    ctx.restore(); // end clip

    // Gradient ring border
    ctx.lineWidth = 2.5;
    const ringGrad = ctx.createLinearGradient(cx - mapRadius, cy - mapRadius, cx + mapRadius, cy + mapRadius);
    ringGrad.addColorStop(0, state.player.inHouse ? "#d8bc6a" : (regionProfile?.roadColor || "#d8bc6a"));
    ringGrad.addColorStop(0.5, state.player.inHouse ? "#8a7448" : (regionProfile?.roadEdgeColor || "#8a7448"));
    ringGrad.addColorStop(1, state.player.inHouse ? "#d8bc6a" : (regionProfile?.minimapTint || "#d8bc6a"));
    ctx.strokeStyle = ringGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, mapRadius + 1, 0, TAU);
    ctx.stroke();

    // Compass cardinal directions (N/S/E/W rotated with player)
    ctx.font = `bold ${mapDiameter < 130 ? 9 : 10}px Georgia`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const compassDist = mapRadius + (mapDiameter < 130 ? 8 : 12);
    const cardinals = [
      { label: "N", angle: -Math.PI / 2 },
      { label: "E", angle: 0 },
      { label: "S", angle: Math.PI / 2 },
      { label: "W", angle: Math.PI },
    ];
    for (const c of cardinals) {
      const a = c.angle;
      const lx = cx + Math.cos(a) * compassDist;
      const ly = cy + Math.sin(a) * compassDist;
      ctx.fillStyle = c.label === "N" ? "#e8c86a" : "rgba(248, 240, 220, 0.6)";
      ctx.fillText(c.label, lx, ly);
    }

    // Tick marks around the ring
    ctx.strokeStyle = "rgba(216, 188, 106, 0.3)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      const inner = mapRadius - 1;
      const outer = mapRadius + 3;
      if (i % 4 === 0) continue; // skip where cardinals are
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawDiscoveryBanner(bottomHudY, margin) {
    if (!discoveryBanner) return;
    const lines = Array.isArray(discoveryBanner.lines) ? discoveryBanner.lines.slice(0, 3) : [];
    const layout = resolveDiscoveryBannerLayout({
      canvasWidth: canvas.width,
      margin,
      bottomHudY,
      lineCount: Math.max(1, lines.length),
    });
    drawDiscoveryBannerPanel(discoveryBanner, layout);
  }

  function drawHudNotice(x, y, w) {
    return drawHudNoticePanel(hudNotice, x, y, w);
  }

  function drawInteractionPrompt(prompt, bottomHudY, margin) {
    if (!prompt || state.mode !== "playing") return;
    const layout = resolveInteractionPromptLayout({
      canvasWidth: canvas.width,
      margin,
      bottomHudY,
    });
    drawInteractionPromptPanel(prompt, layout);
  }

  function drawHud() {
    const activeJob = getActiveJobSummary(state.world.jobs);
    const questLines = buildQuestHudLines({
      quests: state.quests,
      inventory: state.inventory,
      activeJob,
      labels: {
        locked: t("labels.locked"),
        done: t("labels.done"),
        turnIn: t("labels.turnIn"),
      },
    });

    const margin = canvas.width < 620 ? 8 : 12;
    const compact = canvas.width < 560;
    const hudW = Math.min(compact ? canvas.width - margin * 2 : 560, canvas.width - margin * 2);
    const hudH = compact ? 94 : 112;
    const hudX = margin;
    const hudY = canvas.height - hudH - margin;
    drawSoftPanel(hudX, hudY, hudW, hudH);

    const barX = hudX + 12;
    const barW = compact ? hudW - 24 : 176;
    drawBar(barX, hudY + 12, barW, 14, state.player.hp / state.player.maxHp, "rgba(62, 25, 23, 0.9)", "#ef725d", `${t("labels.hp")} ${Math.ceil(state.player.hp)}/${state.player.maxHp}`);
    drawBar(barX, hudY + 32, barW, 12, state.player.stamina / 100, "rgba(26, 43, 38, 0.9)", "#5fe0b5", `${t("labels.stamina")} ${Math.ceil(state.player.stamina)}`);
    drawBar(barX, hudY + 50, barW, 10, state.player.xp / state.player.nextXp, "rgba(28, 38, 58, 0.9)", "#7fa8ff", `${t("labels.xp")} ${state.player.xp}/${state.player.nextXp}`);

    ctx.font = "bold 11px Georgia";
    const statsX = compact ? barX : barX + barW + 16;
    const statsY = compact ? hudY + 76 : hudY + 24;
    const statsW = hudX + hudW - statsX - 12;
    drawClippedText(`${t("labels.lvl")} ${state.player.level}  ${t("labels.gold")} ${state.player.gold}  ${t("labels.potions")} ${state.inventory.Potion}`, statsX, statsY, statsW, "#fff1d0");
    const quick = state.player.quickUtility || { active: "smoke", inventory: { smoke: 0, flare: 0, tonic: 0 } };
    const quickCount = Math.max(0, Math.floor(numberOr(quick.inventory?.[quick.active], 0)));
    if (!compact) {
      ctx.font = "11px Georgia";
      drawClippedText(`${t("labels.crystals")} ${state.inventory["Crystal Shard"]}  ${t("labels.wood")} ${state.inventory.Wood}  ${t("labels.stone")} ${state.inventory.Stone}  ${t("labels.cores")} ${state.inventory["Slime Core"]}`, statsX, hudY + 41, statsW, "#d7c7a7");
      drawClippedText(`${state.player.loadout.weapon} / ${state.player.loadout.stance} / ${state.player.perks.length} perks / ${quick.active}:${quickCount}`, statsX, hudY + 57, statsW, "#d7c7a7");

      ctx.font = "10px Georgia";
      let qy = hudY + 75;
      for (const line of questLines.filter(Boolean).slice(0, 4)) {
        drawClippedText(line, statsX, qy, statsW, "#f1e5c8");
        qy += 12;
      }
    }

    const location = state.player.inHouse ? t("labels.playerHouse") : t("labels.valley");
    const houseStatus = state.house.unlocked ? t("labels.owned") : t("labels.locked");
    const weatherText = state.player.inHouse ? t("labels.sheltered") : weatherLabel(state.weather.kind);
    const regionProfile = getRegionVisualIdentity(state.regions.activeRegion);
    const mapReserve = state.showMap && canvas.width >= 760 ? (canvas.width < 900 ? 176 : 214) : 0;
    const topW = Math.max(240, Math.min(730, canvas.width - margin * 2 - mapReserve));
    const topH = compact ? 78 : 92;
    const topX = margin;
    const topY = margin;
    drawSoftPanel(topX, topY, topW, topH, {
      top: "rgba(16, 25, 29, 0.78)",
      bottom: "rgba(9, 16, 20, 0.66)",
      shadowBlur: 12,
      shadowOffsetY: 5,
    });

    ctx.font = "bold 11px Georgia";
    drawClippedText(`${t("labels.location")}: ${location}   ${t("labels.house")}: ${houseStatus}   ${t("labels.weather")}: ${weatherText}`, topX + 10, topY + 20, topW - 20, "#fff1d0");
    ctx.font = "10px Georgia";
    drawClippedText(
      `Region: ${regionProfile.label}  Chapter: ${state.narrative.chapterTitle}  CVF:${state.narrative.thematicAxes.controlVsFreedom}  TVC:${state.narrative.thematicAxes.truthVsComfort}  SVS:${state.narrative.thematicAxes.solidarityVsStatus}`,
      topX + 10,
      topY + 35,
      topW - 20,
      "#d4c4a4",
    );
    const eventMods = getActiveRegionEventModifiers();
    let msgY = topY + 54;
    if (eventMods.banner) {
      drawClippedText(`Event: ${eventMods.banner}`, topX + 10, topY + 50, topW - 20, "#ffb46d");
      msgY = topY + 66;
    }
    if (hudNotice) {
      msgY += drawHudNotice(topX + 10, msgY - 2, topW - 20);
    }
    const shown = state.msg.slice(0, 2);
    ctx.font = "11px Georgia";
    if (shown.length === 0) {
      drawClippedText(t("labels.explore"), topX + 10, msgY, topW - 20, "#f3e8cf");
    }
    for (const m of shown) {
      drawClippedText(m.text, topX + 10, msgY, topW - 20, "#f3e8cf");
      msgY += 12;
    }
    const openingObjective = resolveOpeningObjective({
      mode: state.mode,
      time: state.time,
      inHouse: state.player.inHouse,
      inventory: state.inventory,
      quests: state.quests,
    });
    const firstPressure = resolveFirstMinutePressure({
      mode: state.mode,
      time: state.time,
      inHouse: state.player.inHouse,
      regionId: state.regions.activeRegion,
      player: state.player,
      inventory: state.inventory,
      quests: state.quests,
    });
    const openingFightCue = resolveOpeningFightCue({
      mode: state.mode,
      time: state.time,
      inHouse: state.player.inHouse,
      regionId: state.regions.activeRegion,
      player: state.player,
      inventory: state.inventory,
      quests: state.quests,
      pressure: firstPressure,
      enemies: state.enemies,
    });
    const explorationLead = !state.player.inHouse && state.regions?.activeRegion
      ? resolvePOILead(state.regions, state.regions.activeRegion, state.player.x, state.player.y, { maxDistance: 32 })
      : null;
    const roadDiscoveryLead = !state.player.inHouse && state.regions?.activeRegion
      ? resolveRoadDiscoveryLead(state.regions, state.regions.activeRegion, state.player.x, state.player.y, { maxDistance: 34 })
      : null;
    const roadSignPrompt = getRoadSignPrompt();
    const roadRouteObjective = getRoadRouteObjective();
    const jobMarker = getJobRouteMarker();
    const boardProp = getActiveJobBoardProp();
    const jobObjective = buildJobObjective({ activeJob, jobMarker });
    const openingRouteGuide = resolveOpeningRouteGuide({
      mode: state.mode,
      time: state.time,
      inHouse: state.player.inHouse,
      regionId: state.regions.activeRegion,
      regionLabel: regionProfile.label,
      player: state.player,
      inventory: state.inventory,
      quests: state.quests,
      pressure: firstPressure,
      fightCue: openingFightCue,
      activeJob,
      jobMarker,
      boardProp,
    });
    const goldenPath = resolveGoldenPathStatus({
      jobState: state.world.jobs,
      inventory: state.inventory,
      house: state.house,
      regionId: state.regions.activeRegion,
    });
    const liveObjective = selectLiveObjective([openingRouteGuide, firstPressure, jobObjective, roadSignPrompt, roadRouteObjective, openingObjective, roadDiscoveryLead, explorationLead]);
    const firstSessionNextStep = resolveFirstSessionNextStep({
      mode: state.mode,
      inHouse: state.player.inHouse,
      regionLabel: regionProfile.label,
      player: state.player,
      inventory: state.inventory,
      house: state.house,
      liveObjective,
      activeJob,
      boardProp,
      goldenPath,
    });
    const displayedObjective = firstSessionNextStep || liveObjective;
    const liveObjectiveLine = firstSessionNextStep?.actionLine || resolveLiveObjectiveLine(liveObjective);
    if (displayedObjective && msgY <= topY + topH - 10) {
      ctx.font = "bold 11px Georgia";
      drawClippedText(`→ ${liveObjectiveLine}`, topX + 10, msgY, topW - 20, displayedObjective.urgency === "high" || displayedObjective.urgency === "urgent" ? "#ffd77b" : "#f3e8cf");
    }
    if (displayedObjective) {
      const strip = resolveObjectiveStripLayout({
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        margin,
        topX,
        topY,
        topW,
        topH,
        bottomHudY: hudY,
        hasSecondaryLine: Boolean(displayedObjective.secondaryLine),
      });
      drawSoftPanel(strip.x, strip.y, strip.w, strip.h, {
        top: displayedObjective.urgency === "high" || displayedObjective.urgency === "urgent" ? "rgba(70, 44, 17, 0.82)" : "rgba(25, 32, 25, 0.76)",
        bottom: displayedObjective.urgency === "high" || displayedObjective.urgency === "urgent" ? "rgba(30, 19, 9, 0.78)" : "rgba(9, 15, 11, 0.7)",
        border: "rgba(255, 215, 123, 0.45)",
        shadowBlur: 8,
        shadowOffsetY: 3,
      });
      ctx.font = "bold 11px Georgia";
      drawClippedText(`${displayedObjective.title}: ${liveObjectiveLine}`, strip.x + 10, strip.primaryY, strip.w - 20, "#ffd77b");
      if (displayedObjective.secondaryLine && strip.secondaryY) {
        ctx.font = "10px Georgia";
        drawClippedText(displayedObjective.secondaryLine, strip.x + 10, strip.secondaryY, strip.w - 20, "#f1e5c8");
      }
    }
    drawInteractionPrompt(getInteractionPrompt(), hudY, margin);
    drawDiscoveryBanner(hudY, margin);

    if (state.mode === "gameover") {
      _modalController.drawGameOverPanel({
        canvasWidth: canvas.width, canvasHeight: canvas.height, margin,
        deaths: state.player.deaths, t,
      });
    }

    if (state.mode === "victory") {
      const ending = state.narrative.ending || resolveNarrativeEnding(state.narrative, state.companion);
      const victoryHouseProgress = resolveHouseProgressDisplay({
        inventory: state.inventory,
        jobState: state.world.jobs,
        house: state.house,
      });
      const victorySummary = buildRunSummary(state.world, state.narrative, state.player, state.companion, state.time, victoryHouseProgress);
      _modalController.drawVictoryPanel({
        summary: victorySummary, ending,
        canvasWidth: canvas.width, canvasHeight: canvas.height, margin,
      });
    }

    if (dialogueOpen && pendingDialogue && state.mode === "playing") {
      _modalController.drawDialoguePanel({
        npcName: pendingDialogue.npcName,
        choices: pendingDialogue.choices,
        selection: dialogueSelection,
        canvasWidth: canvas.width, canvasHeight: canvas.height, margin,
        describeChoiceEffectTags,
      });
    }

    if (questOutcomeOpen && pendingQuestOutcome && state.mode === "playing") {
      _modalController.drawQuestOutcomePanel({
        outcomes: pendingQuestOutcome.outcomes,
        selection: questOutcomeSelection,
        canvasWidth: canvas.width, canvasHeight: canvas.height, margin,
      });
    }

    if (characterSheetOpen && state.mode === "playing") {
      const csIdentity = normalizeCharacterIdentity(state.progression.identity);
      const csSummary = buildCharacterIdentitySummary(csIdentity);
      _modalController.drawCharacterSheetPanel({
        summary: csSummary,
        gearSummary: buildGearSummary(state.progression.equipment, csIdentity),
        inventorySummary: buildGearInventorySummary(state.progression.equipment),
        workstationSummary: describeWorkstationState(state.house.workstation),
        houseProgress: resolveHouseProgressDisplay({ inventory: state.inventory, jobState: state.world.jobs, house: state.house }),
        regionProfile: getRegionVisualIdentity(state.regions.activeRegion),
        explorationRenown: resolveExplorationRenownStatus(state.regions.poisDiscovered?.length || 0),
        factionRep: state.narrative.factionRep,
        companion: state.companion,
        house: state.house,
        playerStance: state.player.loadout.stance,
        canvasWidth: canvas.width, canvasHeight: canvas.height, margin,
      });
    }

    if (skillScreenOpen && state.mode === "playing") {
      _modalController.drawSkillScreenPanel({
        skillTree: state.progression.skillTree,
        upgradePoints: state.progression.upgradePoints,
        selection: skillSelection,
        canvasWidth: canvas.width, canvasHeight: canvas.height, margin,
      });
    }

    if (settingsOpen && state.mode === "playing") {
      _modalController.drawSettingsPanel({
        rows: getCombinedSettingsRows(),
        selection: settingsSelection,
        canvasWidth: canvas.width, canvasHeight: canvas.height, margin,
        readSettingsRowValue,
      });
    }

    if (codexOpen && state.mode === "playing") {
      ensureCodexState(state);
      _modalController.drawCodexPanel({
        codexTabs: CODEX_TABS,
        entries: listEntriesForTab(state, CODEX_TABS[codexTab]),
        progress: totalCodexProgress(state),
        codexTab,
        codexEntrySel,
        canvasWidth: canvas.width, canvasHeight: canvas.height, margin,
      });
    }

    if (shopOpen && state.mode === "playing") {
      _modalController.drawShopPanel({
        items: shopItems,
        selection: shopSelection,
        gold: state.player.gold,
        priceNote: vendorServiceProfile("merchant").priceNote,
        t,
        canvasWidth: canvas.width, canvasHeight: canvas.height, margin,
        resolveShopItemCost,
        shopItemName,
        shopItemDesc,
      });
    }

    if (jobBoardOpen && state.mode === "playing") {
      const jbChoices = getBooneJobChoices();
      if (jobBoardSelection >= jbChoices.length) jobBoardSelection = Math.max(0, jbChoices.length - 1);
      _modalController.drawJobBoardPanel({
        choices: jbChoices,
        selection: jobBoardSelection,
        boardCopy: getJobBoardPresentation({ regionId: state.regions.activeRegion }),
        canvasWidth: canvas.width, canvasHeight: canvas.height, margin,
      });
    }

    if (workbenchOpen && state.mode === "playing") {
      const wbActions = getWorkbenchActions();
      if (workbenchSelection >= wbActions.length) workbenchSelection = Math.max(0, wbActions.length - 1);
      const wbGear = normalizeGearState(state.progression.equipment);
      _modalController.drawWorkbenchPanel({
        actions: wbActions,
        catalog: getWorkbenchActionCatalog(),
        selection: workbenchSelection,
        inventorySummary: buildGearInventorySummary(wbGear),
        workstationSummary: describeWorkstationState(state.house.workstation),
        houseProgress: resolveHouseProgressDisplay({ inventory: state.inventory, jobState: state.world.jobs, house: state.house }),
        craftsCompleted: state.house.workstation?.craftsCompleted,
        preparedUpgrade: state.house.workstation?.preparedUpgrade,
        canvasWidth: canvas.width, canvasHeight: canvas.height, margin,
      });
    }

    const hintSpace = canvas.width - hudW - margin * 3;
    if (!compact && hintSpace > 300) {
      const hx = hudX + hudW + margin;
      const hy = canvas.height - 36;
      drawSoftPanel(hx, hy, hintSpace, 24, {
        top: "rgba(18, 26, 28, 0.64)",
        bottom: "rgba(8, 13, 16, 0.58)",
        shadowBlur: 8,
        shadowOffsetY: 3,
      });
      ctx.font = "10px Georgia";
      drawClippedText(t("labels.controlsHint"), hx + 10, hy + 16, hintSpace - 20, "rgba(255, 245, 220, 0.86)");
    }
  }

  const postProcessor = createPostProcessor(canvas);
  const devMetrics = createDevMetrics();
  let devOverlayEnabled = false;
  let activeReplaySession = null;
  const minimapTileCache = createMinimapCache();
  const combatSubtitles = createCombatSubtitleState();
  const saveManager = createSaveStateManager({ interval: 90 });

  function render() {
    render3D();
    if (state.mode === "menu") {
      if (postProcessor) postProcessor.render(false);
      return;
    }
    drawWeaponOverlay();
    drawWeatherOverlay();
    drawParticles();
    drawMiniMap();
    drawHud();
    tickCombatSubtitles(combatSubtitles, 0.016);
    if (state.graphics.accessibility?.combatSubtitles !== false) {
      drawCombatSubtitles(ctx, combatSubtitles, canvas.width, canvas.height);
    }
    if (postProcessor) {
      postProcessor.render(Boolean(state.graphics.performance?.postFx));
    }
    if (devOverlayEnabled) drawDevOverlay(ctx, devMetrics);
  }

  function resize() {
    const w = Math.max(320, window.innerWidth);
    const h = Math.max(220, window.innerHeight);
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    if (postProcessor) postProcessor.resize(w, h);
    clearGradientCache();
  }

  window.addEventListener("resize", resize);
  resize();
  // Sync best-effort seed from localStorage so the title-screen Continue button
  // is correct immediately. The async path then upgrades the cache to the IDB
  // primary (which may include the most-recent save written this session).
  syncSaveStateFromStorage();
  initSavePersistenceAsync().catch((err) => {
    console.warn("[westward] save persistence init failed:", err);
  });

  try {
    const params = new URLSearchParams(window.location.search || "");
    if (params.get("gradientCache") === "1") {
      state.graphics.performance = state.graphics.performance || { gradientCache: false };
      state.graphics.performance.gradientCache = true;
      clearGradientCache();
    }
    const cb = params.get("colorblind");
    if (cb && ["none","deuteranopia","protanopia","tritanopia"].includes(cb)) {
      state.graphics.accessibility = state.graphics.accessibility || {};
      state.graphics.accessibility.colorblindMode = cb;
    }
  } catch {}

  startBtn.addEventListener("click", () => {
    ensureAudio();
    beginSession();
  });
  continueBtn?.addEventListener("click", () => {
    ensureAudio();
    if (!loadGame({ fromMenu: true })) {
      beginSession();
    }
  });

  document.addEventListener("keydown", (event) => {
    state.keys[event.code] = true;
    if (activeReplaySession && state.mode === "playing") recordInputEvent(activeReplaySession, "keydown", event.code);

    /* Dialogue choice modal controls */
    if (dialogueOpen && pendingDialogue) {
      const len = pendingDialogue.choices.length || 1;
      const control = resolveVerticalMenuKey(event.code, dialogueSelection, len, { blockUnhandled: true });
      dialogueSelection = control.selection;
      if (control.action === "confirm") {
        confirmDialogueChoice();
        event.preventDefault();
        return;
      }
      if (control.action === "close") {
        closeDialogueChoice();
        event.preventDefault();
        return;
      }
      event.preventDefault();
      return;
    }

    /* Quest outcome modal controls */
    if (questOutcomeOpen && pendingQuestOutcome) {
      const len = pendingQuestOutcome.outcomes.length || 1;
      const control = resolveVerticalMenuKey(event.code, questOutcomeSelection, len, {
        blockUnhandled: true,
        confirmCodes: ["Enter", "KeyE", "Space"],
        horizontal: true,
      });
      questOutcomeSelection = control.selection;
      if (control.action === "confirm") {
        confirmQuestOutcomeChoice();
        event.preventDefault();
        return;
      }
      event.preventDefault();
      return;
    }

    /* Job board controls */
    if (jobBoardOpen) {
      const choices = getBooneJobChoices();
      const len = choices.length || 1;
      const control = resolveVerticalMenuKey(event.code, jobBoardSelection, len, {
        blockUnhandled: true,
        confirmCodes: ["Enter", "KeyE", "Space"],
      });
      jobBoardSelection = control.selection;
      if (control.action === "confirm") {
        confirmJobBoardChoice();
        event.preventDefault();
        return;
      }
      if (control.action === "close") {
        jobBoardOpen = false;
        event.preventDefault();
        return;
      }
      event.preventDefault();
      return;
    }

    /* Character sheet controls */
    if (characterSheetOpen) {
      if (event.code === "Escape" || event.code === "KeyI") {
        characterSheetOpen = false;
        event.preventDefault();
        return;
      }
      event.preventDefault();
      return;
    }

    /* Workbench controls */
    if (workbenchOpen) {
      const actions = getWorkbenchActions();
      const len = actions.length || 1;
      const control = resolveVerticalMenuKey(event.code, workbenchSelection, len, {
        blockUnhandled: true,
        confirmCodes: ["Enter", "KeyE", "Space"],
      });
      workbenchSelection = control.selection;
      if (control.action === "confirm") {
        confirmWorkbenchAction();
        event.preventDefault();
        return;
      }
      if (control.action === "close") {
        workbenchOpen = false;
        event.preventDefault();
        return;
      }
      event.preventDefault();
      return;
    }

    /* Codex modal controls */
    if (codexOpen) {
      const tabStep = resolveHorizontalStepKey(event.code);
      if (tabStep !== 0) {
        codexTab = (codexTab + tabStep + CODEX_TABS.length) % CODEX_TABS.length;
        codexEntrySel = 0;
        event.preventDefault(); return;
      }
      const tab = CODEX_TABS[codexTab];
      const len = (listEntriesForTab(state, tab) || []).length || 1;
      const control = resolveVerticalMenuKey(event.code, codexEntrySel, len, {
        closeCodes: ["Escape", "KeyZ"],
        confirmCodes: [],
      });
      codexEntrySel = control.selection;
      if (control.action === "move") {
        event.preventDefault(); return;
      }
      if (control.action === "close") {
        codexOpen = false;
        event.preventDefault(); return;
      }
    }

    /* Settings modal controls */
    if (settingsOpen) {
      const rows = getCombinedSettingsRows();
      const control = resolveVerticalMenuKey(event.code, settingsSelection, rows.length, {
        closeCodes: ["Escape", "KeyO"],
        confirmCodes: [],
      });
      settingsSelection = control.selection;
      if (control.action === "move") {
        event.preventDefault();
        return;
      }
      const settingsStep = resolveHorizontalStepKey(event.code);
      const settingsConfirm = event.code === "Enter" || event.code === "Space";
      if (settingsStep !== 0 || settingsConfirm) {
        const row = rows[settingsSelection];
        if (row.kind !== "action" || settingsConfirm) {
          stepSettingsRow(row, settingsStep || 1);
        }
        event.preventDefault();
        return;
      }
      if (control.action === "close") {
        settingsOpen = false;
        event.preventDefault();
        return;
      }
    }

    /* Skill screen controls */
    if (skillScreenOpen) {
      const control = resolveVerticalMenuKey(event.code, skillSelection, SKILL_BRANCH_LABELS.length, {
        closeCodes: ["Escape", "KeyT"],
        confirmCodes: ["Enter", "KeyE", "Space"],
      });
      skillSelection = control.selection;
      if (control.action === "move") {
        event.preventDefault();
        return;
      }
      if (control.action === "confirm") {
        const branch = SKILL_BRANCH_LABELS[skillSelection].id;
        if (canUnlockSkill(state.progression, branch)) {
          unlockSkill(state.progression, branch);
          logMsg(`Unlocked ${branch} skill rank ${state.progression.skillTree[branch]}.`);
          sfx.shopBuy();
        } else {
          logMsg("Not enough upgrade points or branch maxed.");
        }
        event.preventDefault();
        return;
      }
      if (control.action === "close") {
        skillScreenOpen = false;
        event.preventDefault();
        return;
      }
    }

    /* Shop controls */
    if (shopOpen) {
      const control = resolveVerticalMenuKey(event.code, shopSelection, shopItems.length || 1, {
        confirmCodes: ["Enter", "KeyE", "Space"],
      });
      shopSelection = control.selection;
      if (control.action === "move") {
        event.preventDefault();
        return;
      }
      if (control.action === "confirm") {
        const item = shopItems[shopSelection];
        const adjustedCost = resolveShopItemCost(item);
        if (item.cost < 0) {
          const result = item.action();
          if (result !== false) sfx.shopBuy();
        } else if (state.player.gold >= adjustedCost) {
          state.player.gold -= adjustedCost;
          const result = item.action();
          if (result === false) {
            state.player.gold += adjustedCost;
          } else {
            sfx.shopBuy();
            logMsg(`Bought ${shopItemName(item)} for ${adjustedCost}g! ${choice(["Money well spent!", "Quill nods.", "Ka-ching!", "Quill winks."])}`);
          }
        } else {
          logMsg("Reverend Quill: No gold, no goods. That's business, baby.");
        }
        event.preventDefault();
        return;
      }
      if (control.action === "close") {
        shopOpen = false;
        logMsg("Reverend Quill: Come back anytime! I'm always here. Literally. I live here.");
        event.preventDefault();
        return;
      }
    }

    if (event.code === "KeyE" || event.code === "Enter") {
      interact();
    }

    if (event.code === "Space") {
      attack();
      event.preventDefault();
    }

    if (event.code === "KeyQ") {
      usePotion();
    }

    if (event.code === "KeyK") {
      saveGame();
      event.preventDefault();
    }

    if (event.code === "KeyL") {
      loadGame();
      event.preventDefault();
    }

    if (event.code === "KeyM") {
      state.showMap = !state.showMap;
    }

    if (event.code === "KeyF") {
      toggleFullscreen();
    }

    if (event.code === "KeyN") {
      soundEnabled = !soundEnabled;
      logMsg(soundEnabled ? "Sound ON. Your ears will thank you. Maybe." : "Sound OFF. Blissful silence.");
      if (!soundEnabled && audioBuses) {
        try { stopAmbient(audioBuses); } catch { /* not critical */ }
        try { stopMusic(audioBuses); } catch { /* not critical */ }
        lastAmbientRegion = null;
      } else if (soundEnabled && state.mode === "playing") {
        syncAmbientForRegion(state.regions?.activeRegion || "frontier");
      }
    }

    if (event.code === "KeyM" && event.shiftKey) {
      ambientEnabled = !ambientEnabled;
      logMsg(`Ambient + music: ${ambientEnabled ? "ON" : "OFF"}.`);
      if (!ambientEnabled && audioBuses) {
        try { stopAmbient(audioBuses); } catch { /* not critical */ }
        try { stopMusic(audioBuses); } catch { /* not critical */ }
        lastAmbientRegion = null;
      } else if (ambientEnabled && state.mode === "playing") {
        syncAmbientForRegion(state.regions?.activeRegion || "frontier");
      }
    }

    if (event.code === "KeyV") {
      const order = ["cinematic", "balanced", "performance"];
      const idx = order.indexOf(state.weather.quality);
      state.weather.quality = order[(idx + 1) % order.length];
      logMsg(`Visual quality profile: ${state.weather.quality}.`);
    }

    if (event.code === "BracketLeft" || event.code === "BracketRight") {
      const presetOrder = ["low", "balanced", "high"];
      const dir = event.code === "BracketRight" ? 1 : -1;
      const currentIdx = presetOrder.indexOf(state.graphics.preset);
      const nextIdx = (currentIdx + dir + presetOrder.length) % presetOrder.length;
      state.graphics.preset = presetOrder[nextIdx];
      state.weather.quality = state.graphics.preset === "high" ? "cinematic" : state.graphics.preset === "low" ? "performance" : "balanced";
      logMsg(`Graphics preset: ${state.graphics.preset}.`);
    }

    if (event.code === "KeyY") {
      state.graphics.performance = state.graphics.performance || { gradientCache: false };
      state.graphics.performance.gradientCache = !state.graphics.performance.gradientCache;
      clearGradientCache();
      logMsg(`Gradient cache: ${state.graphics.performance.gradientCache ? "ON" : "OFF"}.`);
    }

    if (event.code === "KeyG") {
      cycleRegion();
    }

    if (event.code === "KeyT" && state.mode === "playing" && !shopOpen && !jobBoardOpen) {
      skillScreenOpen = !skillScreenOpen;
      if (skillScreenOpen) characterSheetOpen = false;
      if (skillScreenOpen) workbenchOpen = false;
      if (skillScreenOpen) logMsg("Skill tree opened.");
    }

    if (event.code === "KeyO" && state.mode === "playing" && !shopOpen && !skillScreenOpen && !jobBoardOpen) {
      settingsOpen = !settingsOpen;
      if (settingsOpen) characterSheetOpen = false;
      if (settingsOpen) workbenchOpen = false;
      if (settingsOpen) logMsg("Settings opened.");
    }

    if (event.code === "Escape" && state.mode === "playing" && !anyModalOpen()) {
      settingsOpen = true;
      characterSheetOpen = false;
      workbenchOpen = false;
      logMsg("Settings opened.");
      event.preventDefault();
    }

    if (event.code === "KeyZ" && state.mode === "playing" && !shopOpen && !skillScreenOpen && !settingsOpen && !jobBoardOpen) {
      codexOpen = !codexOpen;
      if (codexOpen) characterSheetOpen = false;
      if (codexOpen) workbenchOpen = false;
      if (codexOpen) logMsg("Codex opened.");
    }

    if (event.code === "KeyI" && state.mode === "playing" && !shopOpen && !skillScreenOpen && !settingsOpen && !codexOpen && !workbenchOpen && !jobBoardOpen) {
      characterSheetOpen = !characterSheetOpen;
      if (characterSheetOpen) logMsg("Character sheet opened.");
    }

    if (event.code === "KeyJ" && state.mode === "playing") {
      state.graphics.accessibility.motionReduction = !state.graphics.accessibility.motionReduction;
      logMsg(`Motion reduction: ${state.graphics.accessibility.motionReduction ? "ON" : "OFF"}.`);
    }

    if (event.code === "Equal" || event.code === "Minus") {
      const dir = event.code === "Equal" ? 0.1 : -0.1;
      const next = (state.graphics.accessibility.fontScale || 1) + dir;
      state.graphics.accessibility.fontScale = Math.max(0.8, Math.min(1.6, Number(next.toFixed(2))));
      logMsg(`Font scale: ${state.graphics.accessibility.fontScale.toFixed(2)}x.`);
    }

    if (event.code === "KeyX") {
      performDodgeStep();
    }

    if (event.code === "KeyU" && state.mode === "playing") {
      // Fast-forward time of day (testing/manual).
      if (!state.world) state.world = { timeOfDay: 0.25 };
      state.world.timeOfDay = (state.world.timeOfDay + 0.1) % 1;
      logMsg(`Time advanced: ${formatPhaseLabel(state.world.timeOfDay)} (${(state.world.timeOfDay * 100).toFixed(0)}%).`);
    }

    if (event.code === "KeyB") {
      performChargedAttack();
    }

    if (event.code === "KeyP") {
      devOverlayEnabled = !devOverlayEnabled;
      logMsg(`Dev overlay: ${devOverlayEnabled ? "ON" : "OFF"}.`);
    }

    if (event.code === "Digit1") setQuickUtility("smoke");
    if (event.code === "Digit2") setQuickUtility("flare");
    if (event.code === "Digit3") setQuickUtility("tonic");

    if (event.code === "KeyU" && state.mode === "playing" && !anyModalOpen()) {
      useQuickUtility();
    }

    if (event.code === "KeyZ" && state.mode === "playing" && !codexOpen && !shopOpen && !skillScreenOpen && !settingsOpen && !jobBoardOpen) {
      const stances = ["balanced", "aggressive", "defensive"];
      const idx = stances.indexOf(state.player.loadout.stance);
      state.player.loadout.stance = stances[(idx + 1) % stances.length];
      logMsg(`Combat stance: ${state.player.loadout.stance}.`);
    }

    if (event.code === "KeyR" && state.mode === "gameover") {
      resetWorld();
      state.mode = "playing";
      logMsg(choice(["You're back! The slimes look disappointed.", "Respawned. Let's try not dying this time.", "Back from the dead. Again. The valley has a generous return policy."]));
    }
  });

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

  function frame(now) {
    if (!frame.last) frame.last = now;
    const dt = Math.min(0.05, (now - frame.last) / 1000);
    frame.last = now;
    if (devOverlayEnabled) tickDevMetrics(devMetrics, dt);
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);

  window.advanceTime = (ms) => {
    const fixed = 1 / 60;
    const steps = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let i = 0; i < steps; i++) {
      update(fixed);
    }
    render();
  };

  const SMOKE_REGION_STARTS = {
    frontier: { x: 9.5, y: 8.5, angle: 0 },
    ashfall: { x: 39.5, y: 39.5, angle: -0.18 },
    ironlantern: { x: 14.5, y: 39.5, angle: 0.12 },
  };

  function resolveSmokeRegionStart(regionId) {
    const base = SMOKE_REGION_STARTS[regionId] || SMOKE_REGION_STARTS.frontier;
    const angleOptions = [
      base.angle,
      0,
      Math.PI * 0.5,
      -Math.PI * 0.5,
      Math.PI,
    ];
    const viewClearance = (x, y, angle) => {
      for (let d = 0.6; d <= 7; d += 0.45) {
        if (isBlocking(x + Math.cos(angle) * d, y + Math.sin(angle) * d)) return d;
      }
      return 7;
    };
    let best = null;
    for (let ix = -6; ix <= 6; ix++) {
      for (let iy = -6; iy <= 6; iy++) {
        const x = base.x + ix * 0.75;
        const y = base.y + iy * 0.75;
        if (!canOccupy(x, y) || isInHouseLot(x, y)) continue;
        for (const angle of angleOptions) {
          const clearance = viewClearance(x, y, angle);
          const score = clearance - Math.hypot(ix, iy) * 0.08;
          if (!best || score > best.score) {
            best = { x, y, angle, score };
          }
        }
      }
    }
    if (best) {
      return { x: best.x, y: best.y, angle: best.angle };
    }
    const minX = clamp(Math.floor(base.x) - 3, 2, worldMap[0].length - 4);
    const minY = clamp(Math.floor(base.y) - 3, 2, worldMap.length - 4);
    const maxX = clamp(Math.floor(base.x) + 3, minX, worldMap[0].length - 3);
    const maxY = clamp(Math.floor(base.y) + 3, minY, worldMap.length - 3);
    const fallback = findEmptyCell(worldMap, minX, minY, maxX, maxY, (x, y) => !isInHouseLot(x, y));
    return { x: fallback.x, y: fallback.y, angle: base.angle };
  }

  window.__westwardSmoke = {
    unlockHouse() {
      state.house.unlocked = true;
      state.house.built = true;
      return { unlocked: true };
    },
    setRegion(regionId = "frontier") {
      if (!REGIONS[regionId]) return { ok: false, regionId: state.regions.activeRegion };
      state.player.inHouse = false;
      state.player.regionInterior = null;
      state.regionInteriorReturn = null;
      unlockRegion(state.regions, regionId);
      state.regions.activeRegion = regionId;
      const start = resolveSmokeRegionStart(regionId);
      state.player.x = start.x;
      state.player.y = start.y;
      state.player.angle = start.angle;
      ensureRegionMiniBosses(regionId);
      invalidateMinimapCache(minimapTileCache);
      syncAmbientForRegion(regionId);
      return { ok: true, regionId, x: Number(start.x.toFixed(2)), y: Number(start.y.toFixed(2)) };
    },
    acceptStarter() {
      state.world.jobs = normalizeJobBoardState(state.world.jobs);
      const accepted = acceptJob(state.world.jobs, "frontier_slime_bounty", {
        time: state.time,
        inventory: state.inventory,
        narrative: state.narrative,
      });
      return { ok: !!accepted?.ok, jobId: accepted?.job?.id || null };
    },
    simulateStarterKills(count = 3) {
      state.world.jobs = normalizeJobBoardState(state.world.jobs);
      let recorded = 0;
      for (let i = 0; i < Math.max(1, count); i++) {
        const result = recordJobEvent(state.world.jobs, {
          type: "kill",
          enemyType: "slime",
          behavior: "balanced",
          regionId: "frontier",
          time: state.time + i,
        });
        if (result.ok) recorded += 1;
      }
      return { recorded, status: state.world.jobs.progressByJobId?.frontier_slime_bounty?.status || null };
    },
    claimStarter() {
      state.world.jobs = normalizeJobBoardState(state.world.jobs);
      const paid = claimJobReward(state.world.jobs, "frontier_slime_bounty");
      if (paid.ok && !paid.failed) {
        grantJobReward(paid.reward);
        recordJobCompletionMemory(paid.job);
      }
      return { ok: !!paid?.ok, failed: !!paid?.failed, reward: paid?.reward || null };
    },
  };

  window.render_game_to_text = () => {
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
    const runSummary = buildRunSummary(state.world, state.narrative, state.player, state.companion, state.time, houseProgressSummary);
    const explorationRenown = resolveExplorationRenownStatus(state.regions.poisDiscovered?.length || 0);
    const openingObjective = resolveOpeningObjective({
      mode: state.mode,
      time: state.time,
      inHouse: state.player.inHouse,
      inventory: state.inventory,
      quests: state.quests,
    });
    const firstMinutePressure = resolveFirstMinutePressure({
      mode: state.mode,
      time: state.time,
      inHouse: state.player.inHouse,
      regionId: state.regions.activeRegion,
      player: state.player,
      inventory: state.inventory,
      quests: state.quests,
    });
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
    const explorationLead = !state.player.inHouse && state.regions?.activeRegion
      ? resolvePOILead(state.regions, state.regions.activeRegion, state.player.x, state.player.y, { maxDistance: 32 })
      : null;
    const roadDiscoveryLead = !state.player.inHouse && state.regions?.activeRegion
      ? resolveRoadDiscoveryLead(state.regions, state.regions.activeRegion, state.player.x, state.player.y, { maxDistance: 34 })
      : null;
    const nearbyRoadsideDiscoveries = !state.player.inHouse && state.regions?.activeRegion
      ? findNearbyRoadsideDiscoveries(state.regions, state.regions.activeRegion, state.player.x, state.player.y, 14).slice(0, 3)
      : [];
    const regionProfile = getRegionVisualIdentity(state.regions.activeRegion);
    const worldPresentation = buildRegionWorldPresentation(state.regions.activeRegion, worldPresentationContext());
    const regionReadability = resolveRegionReadabilityCues(state.regions.activeRegion);
    const textVisualMoodBase = buildVisualMood({
      weather: state.weather,
      chapterIndex: state.narrative.chapterIndex,
      day: 0.5 + Math.sin(state.time * 0.014) * 0.45,
      qualitySetting: state.weather.quality,
      biome: state.regions.activeRegion,
    });
    textVisualMoodBase.regionProfile = regionProfile;
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
    const roadSignPrompt = !state.player.inHouse && state.regions?.activeRegion
      ? resolveRoadSignPrompt(worldPresentation.roadSigns, state.player.x, state.player.y)
      : null;
    const roadRouteObjective = getRoadRouteObjective();
    const activeJob = getActiveJobSummary(state.world.jobs);
    const jobListings = getJobListings({
      regionId: state.regions.activeRegion,
      playerLevel: state.player.level,
      jobState: state.world.jobs,
      inventory: state.inventory,
      narrative: state.narrative,
    });
    const jobRouteMarker = getJobRouteMarker();
    const boardProp = getActiveJobBoardProp();
    const goldenPath = resolveGoldenPathStatus({
      jobState: state.world.jobs,
      inventory: state.inventory,
      house: state.house,
      regionId: state.regions.activeRegion,
    });
    const openingFightCue = resolveOpeningFightCue({
      mode: state.mode,
      time: state.time,
      inHouse: state.player.inHouse,
      regionId: state.regions.activeRegion,
      player: state.player,
      inventory: state.inventory,
      quests: state.quests,
      pressure: firstMinutePressure,
      enemies: activeEnemies,
    });
    const combatReadability = resolveCombatEncounterReadability({
      enemies: state.player.inHouse ? [] : activeEnemies,
      player: state.player,
      maxDistance: 10,
      recentEvent: combatReadabilityNotice,
      subtitlesEnabled: state.graphics.accessibility?.combatSubtitles !== false,
    });
    const openingRouteGuide = resolveOpeningRouteGuide({
      mode: state.mode,
      time: state.time,
      inHouse: state.player.inHouse,
      regionId: state.regions.activeRegion,
      regionLabel: regionProfile.label,
      player: state.player,
      inventory: state.inventory,
      quests: state.quests,
      pressure: firstMinutePressure,
      fightCue: openingFightCue,
      activeJob,
      jobMarker: jobRouteMarker,
      boardProp,
    });
    const jobObjective = buildJobObjective({ activeJob, jobMarker: jobRouteMarker });
    const liveObjective = selectLiveObjective([
      openingRouteGuide,
      firstMinutePressure,
      jobObjective,
      roadSignPrompt,
      roadRouteObjective,
      openingObjective,
      roadDiscoveryLead,
      explorationLead,
    ]);
    const firstSessionNextStep = resolveFirstSessionNextStep({
      mode: state.mode,
      inHouse: state.player.inHouse,
      regionLabel: regionProfile.label,
      player: state.player,
      inventory: state.inventory,
      house: state.house,
      liveObjective,
      activeJob,
      boardProp,
      goldenPath,
    });
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
      },
      gameplay_feel: {
        next_step: firstSessionNextStep,
        live_objective: liveObjective,
        opening_objective: openingObjective,
        opening_fight_cue: openingFightCue,
        combat_readability: combatReadability,
        opening_route_guide: openingRouteGuide,
        road_discovery_lead: roadDiscoveryLead,
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
      dynamic_lighting: {
        active_count: dynamicLightSnapshot.length,
        max_active: 8,
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

  return JSON.stringify(payload);
};
