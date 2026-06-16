export const meta = {
  name: 'dustwater-audit-fixes',
  description: 'Fix the 9 audit-confirmed defects (mount inaccessible, maxHP resume, discovery payoff, wagon copy, Tonic, save backup recovery, slime resume, db-unavailable) with TDD + spec + quality review each',
  phases: [
    { title: 'Mount access' },
    { title: 'HP resume' },
    { title: 'Discovery payoff' },
    { title: 'Wagon coherence' },
    { title: 'Tonic item' },
    { title: 'Save robustness' },
    { title: 'Final review' },
  ],
}

const CWD = '/Users/boydroberts/Documents/projects/Dustwater RPG'

const CTX = [
  'PROJECT: Dustwater RPG — a Three.js WebGPU cyberpunk-western 3D RPG. cwd "' + CWD + '".',
  'Current git branch: main. Commit each fix on main. Do NOT push (the owner deploys on his word).',
  '',
  'THE GATE (green before you commit, from project root):',
  '  npx vitest run    (797 tests currently pass — your new test passes and you break none)',
  '  npx tsc --noEmit  (0 errors)',
  '  npx vite build    (succeeds; the "chunk-size > 500kB" warning is EXPECTED, not a failure)',
  'Do NOT run the slow SwiftShader visual capture — these are logic/wiring fixes; the dusk golden baseline is safe unless',
  'you change rendering/palette/tone-map/layout (you should not). CI backstops it.',
  '',
  'TDD: write the FAILING test first (in tests/*.test.ts, Vitest), see it fail for the right reason, then the minimal fix,',
  'then green, then the full gate, then commit. tsconfig only includes tests; src JS modules have hand-authored sibling',
  '.d.ts files — if you change an exported signature, update the .d.ts in the same commit.',
  '',
  'GUARDRAILS you must not trip: render3d-frontier-layout.test.ts (firstFrameSlabBlockers stays []),',
  'render3d-phase-state.test.ts (phase sequence). Tests are sacred: adjust a tuned value -> update its expected value in the',
  'same commit; never delete coverage. Commit trailer (last line): Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>',
  '',
  'ALREADY FIXED AND CORRECT (do NOT touch / do NOT re-report): lunge cooldown (encounterSystem LUNGE_COOLDOWN),',
  'loadRun LOAD_TIMEOUT_MS=8000 re-throw + saveLoadFailed guard, saveHealth autosave-failure HUD, hurt-feedback HP-drop gate,',
  'GUST_DURATION constant.',
].join('\n')

const IMPL_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    status: { type: 'string', enum: ['DONE', 'DONE_WITH_CONCERNS', 'BLOCKED', 'NEEDS_CONTEXT'] },
    summary: { type: 'string' },
    commitSha: { type: 'string' },
    filesTouched: { type: 'array', items: { type: 'string' } },
    testsAdded: { type: 'string' },
    gateGreen: { type: 'boolean' },
    gateEvidence: { type: 'string' },
    concerns: { type: 'string' },
  },
  required: ['status', 'summary', 'gateGreen', 'gateEvidence'],
}

const REVIEW_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    verdict: { type: 'string', enum: ['approve', 'changes_requested'] },
    issues: { type: 'array', items: { type: 'object', additionalProperties: false,
      properties: { severity: { type: 'string', enum: ['critical', 'important', 'minor'] }, location: { type: 'string' }, description: { type: 'string' } },
      required: ['severity', 'description'] } },
    notes: { type: 'string' },
  },
  required: ['verdict'],
}

const TASKS = [
  {
    phase: 'Mount access', key: 'mount',
    title: 'CRITICAL: the rideable horse is unmountable in normal play (+ mount prompt does not follow the whistled horse)',
    problem: [
      'BUG A (mount gate): createInteractionSystem is wired isTargetEnabled:(t)=>loopState.isTargetEnabled(t) (spike.js ~3818).',
      'loopState.isTargetEnabled returns Boolean(target.kind===activeTargetKind) (phaseState.js:386). NO phase in PHASE_COPY',
      '(phaseState.js:73-158) ever sets targetKind "mountHorse", so pickNearest() skips the mountHorse object',
      '(interactionSystem.js:47), the "E — Mount Up" prompt NEVER appears, and the registered mount handler',
      '(spike.js ~4274, player.setMounted(true)) can never fire. The whole mounted free-roam slice is reachable only via the',
      '__spike.mount() dev helper. Unit tests pass the DEFAULT isTargetEnabled=()=>true so they are a FALSE GREEN.',
      'BUG B (anchor): mountObjects is built once with a frozen literal {kind:"mountHorse", x:MOUNT_SPOT.x, y:MOUNT_SPOT.y}',
      '(spike.js ~3757). The H-whistle eases the horse mesh to the player (spike.js ~4750-4763) but never updates that',
      'placement object x/y — so after whistling, the mount prompt stays at the empty original spot.',
    ].join('\n'),
    fix: [
      'BUG A: make "mountHorse" always interactable regardless of phase — the horse is a free-roam affordance, not a scripted',
      'beat (design intent: it is waiting, you walk up and mount, agency from the first second). Change the interaction wiring',
      'so isTargetEnabled returns true for kind "mountHorse" OR loopState.isTargetEnabled(t). Keep everything else gated as-is.',
      'BUG B: each frame, sync the mountHorse interactable placement x/y to the live horse mesh position (horseNode.position x,z)',
      'so the "E — Mount Up" prompt follows the actual horse (including after a whistle-recall). Do it where the horse-follow /',
      'whistle update already runs.',
      'Confirm the existing mount handler then fires (player.setMounted(true)) via the real interaction path, not the dev helper.',
    ].join('\n'),
    test: [
      'Add a test that exercises the REAL gate (not the default ()=>true). Build the interaction with isTargetEnabled mirroring',
      'the production wiring (mountHorse always-enabled OR loopState gate), place the player within mount radius of the mountHorse',
      'object, and assert pickNearest returns the mountHorse object (prompt would show) EVEN when the active phase target is',
      'something else (e.g. jobBoard). Add/extend in tests/render3d-interaction*.test.ts. If you make the anchor follow the horse,',
      'also assert the mount point tracks an updated horse position. Reproduce the bug first (with the real gate, nearest is null).',
    ].join('\n'),
  },
  {
    phase: 'HP resume', key: 'hp',
    title: 'HIGH: damaged resume collapses player maxHP to saved current HP (+ slime HP resets but kill ledger persists)',
    problem: [
      'BUG A (maxHP): createEncounterSystem is created with initialPlayerHp = resumeRun?.loopState?.encounterState?.playerHp ?? 40',
      '(spike.js ~3909). Inside, the SAME value seeds let playerHp=initialPlayerHp (encounterSystem.js:122) AND is returned as',
      'playerMaxHp:initialPlayerHp (encounterSystem.js:244) — there is no separate max. So on any wounded resume getState() returns',
      'e.g. {playerHp:26, playerMaxHp:26}; the HUD prints "26 / 26" (full bar, wrong max) and a low-HP mid-fight resume looks',
      'healthy then a single 14-dmg lunge can kill — a real ironman-loss vector. The low HP genuinely persists (currentRunPayload',
      'spike.js ~4543 + onRunMutated per slime hit + autosave on movement).',
      'BUG B (slime resume): createEncounterSystem always starts hitCount at 0 (encounterSystem.js:115); phaseState persists',
      'encounterState.slimeHits/slimeHp (phaseState.js:291-302) but spike never feeds them back, so resuming mid-fight resets the',
      'slime to full 3 HP while the kill ledger already recorded the landed strikes (re-fight + per-strike approval inflation; both',
      'clamped, no softlock).',
    ].join('\n'),
    fix: [
      'BUG A: give createEncounterSystem a fixed maxPlayerHp (default 40) option DISTINCT from the initialPlayerHp current-HP seed;',
      'return playerMaxHp from that constant (not from initialPlayerHp). Wire spike.js to pass the constant max (40) while still',
      'seeding current HP from the resume payload. The HUD pct then reads 26/40 correctly.',
      'BUG B: seed createEncounterSystem with the persisted encounterState.slimeHits (and/or slimeHp) on resume so the slime resumes',
      'at the saved HP matching the ledger. Keep a fresh run starting at full.',
    ].join('\n'),
    test: [
      'tests/render3d-encounter.test.ts: (A) an encounter seeded with current HP 26 and max 40 returns playerHp 26 + playerMaxHp 40',
      '(pct 0.65), NOT 26/26. (B) an encounter seeded with slimeHits=2 resumes with the slime at 1 HP (3 - 2), not full. Update',
      'encounterSystem.d.ts if you add an option. Reproduce both first.',
    ].join('\n'),
  },
  {
    phase: 'Discovery payoff', key: 'discovery',
    title: 'MEDIUM: free-roam POI discovery silently drops loot.items (and buffs) — only gold/renown granted',
    problem: [
      'resolveDiscovery (discoveryRuntime.js:24-34) returns {loot, buff, renown} with loot.items + buff populated from POI_DEFINITIONS',
      '(poiSystem.js — Old Well Potion, Drifter Camp Wood x2/Stone, etc., ~7 POIs with items, 3 with buffs). The discovery handler',
      '(spike.js ~4813-4818) only grants found.loot.gold and the renown branch — it NEVER reads found.loot.items or found.buff. So',
      'the authored item rewards are silently dropped and the "arrival pays off" beat is half-dead. The toast shows only the mystery',
      'line, never the item, so the player is not even told what they did not get.',
    ].join('\n'),
    fix: [
      'In the discovery handler, BANK found.loot.items into the player inventory — reuse the existing canonical pattern',
      '(gameState.js claimBoardReward ~248-250 loops reward.items into state.inventory; use the same grant path / a gameState helper',
      'if one exists). POI items are canonical (Potion/Wood/Stone — verified in inventoryState.js), so no non-canonical-item risk.',
      'Surface the granted item name(s) in the discovery toast so the payoff is FELT (e.g. "Discovered — <label>: <line>  (+1 Potion)").',
      'BUFFS: found.buff (stamina/HP) currently has no destination on game.player (combat HP lives on the encounter system). Do NOT',
      'invent a half-baked buff system here — if there is no clean existing destination, apply what cleanly applies and leave a clear',
      'code comment that buff application is deferred to the progression wiring (note it in concerns). Items are the required win.',
    ].join('\n'),
    test: [
      'Add/extend a test (tests/render3d-discovery-runtime.test.ts or a gameState grant test) proving that when a resolved discovery',
      'carries loot.items, those items are banked into inventory by the grant path you wired. Reproduce first (items not granted).',
    ].join('\n'),
  },
  {
    phase: 'Wagon coherence', key: 'wagon',
    title: 'MEDIUM: wagon salvage toast says "Map Scrap Found / + Map Scrap" but grants 2 Wood and no Map Scrap',
    problem: [
      'handleBrokenWagon (spike.js ~4221-4227) calls lootBeat(game,{source:"wagon"}); LOOT_SOURCES.wagon maps to "poi_camp"',
      '(gameState.js:221) so rollLootDrop yields items={Wood:2} (verified), banked by applyLootDropToState — never a Map Scrap. But',
      'the toast at ~4227 hardcodes "Map Scrap Found" + "+ Map Scrap", and the objective copy (spike.js ~2062) says "Return the Map',
      'Scrap to Boone". The player is told they recovered a Map Scrap they never hold. Map Scrap IS a real item (inventoryState.js:13).',
    ].join('\n'),
    fix: [
      'The objective narratively REQUIRES a Map Scrap ("Return the Map Scrap to Boone"), so GRANT it: explicitly add a Map Scrap to',
      'the player inventory in handleBrokenWagon (alongside whatever lootBeat grants, or replace the source) and keep the toast +',
      'objective copy consistent with what is actually granted. Do not leave contradictory copy.',
    ].join('\n'),
    test: [
      'Add a test (gameState / a small extracted helper) asserting the wagon-salvage path grants a Map Scrap into inventory. If the',
      'grant lives inline in spike.js, extract the minimal grant logic to a testable seam or test via the gameState inventory path.',
      'Reproduce first (no Map Scrap granted).',
    ].join('\n'),
  },
  {
    phase: 'Tonic item', key: 'tonic',
    title: 'MEDIUM: phantom "Tonic" reward on Boone job board — item does not exist',
    problem: [
      'Four jobBoard defs carry reward.items={Tonic:1} (jobBoard.js:136,268,323,418). "Tonic" is NOT a canonical item — absent from',
      'inventoryState.js (only Potion) and shopCatalog.js. Boone board pins render "+1 Tonic" (e.g. frontier_watch_patrol). It is the',
      'first UI the player opens. Display-only today (those jobs are not acceptable in live play) but it is incoherent placeholder text.',
    ].join('\n'),
    fix: [
      'Rename the four jobBoard "Tonic" reward items to the canonical "Potion" (inventoryState.js). (Do not invent a new Tonic item.)',
    ].join('\n'),
    test: [
      'Add a test asserting NO jobBoard reward references a non-canonical item — every reward.items key is in the canonical item set',
      '(import the inventory item list / shopCatalog). This guards against future phantom-item regressions. Reproduce first (Tonic present).',
    ].join('\n'),
  },
  {
    phase: 'Save robustness', key: 'save',
    title: 'MEDIUM/LOW: corrupt primary save discards valid backups; loadRun does not re-throw on db-unavailable',
    problem: [
      'BUG A (backup recovery): on a hash/validation failure readSave returns {ok:false, reason:"hash-mismatch"} WITHOUT throwing',
      '(savePersistence.js:312-314). loadRun maps every non-ok result to null (runSave.js:154) — only a THROWN/timeout re-throws — so',
      'boot starts fresh (saveLoadFailed=false) and autosaves then rotate out + delete the still-valid backups. restoreFromBackup()',
      'and findMostRecentValidBackup() (savePersistence.js:366,673) EXIST but have ZERO callers on the ironman boot path. A single',
      'corrupt primary write permanently destroys a recoverable run.',
      'BUG B (db-unavailable): readSave returns soft {ok:false, reason:"db-unavailable"} (savePersistence.js:303-305) instead of',
      'throwing, so loadRun returns null and the saveLoadFailed overwrite-guard does not engage (contract says a failed read re-throws).',
      'Low real impact (a dead DB also blocks writes) but the invariant is not upheld.',
    ].join('\n'),
    fix: [
      'BUG A: in loadRun, when readSave returns a non-ok result whose reason is CORRUPTION (hash-mismatch / validation), attempt',
      'recovery — consult findMostRecentValidBackup()/restoreFromBackup() and return the recovered payload if found; otherwise set',
      'saveLoadFailed (suppress overwrite) rather than silently returning null and clobbering. Keep reason "missing" -> null (genuine',
      'fresh start).',
      'BUG B: treat readSave results with reason "db-unavailable" (and any other unreadable/unknown failure reason) as a failure that',
      'RE-THROWS (so the boot try/catch sets saveLoadFailed and suppresses writes); keep ONLY reason "missing" mapping to null.',
      'Update runSave.d.ts if signatures change.',
    ].join('\n'),
    test: [
      'tests/render3d-run-save.test.ts: (A) mock readSave -> {ok:false, reason:"hash-mismatch"} with a valid backup available and assert',
      'loadRun recovers the backup (or, if no backup, signals failure rather than a clobbering null). (B) mock readSave ->',
      '{ok:false, reason:"db-unavailable"} and assert loadRun REJECTS (does not resolve null). (C) reason "missing" still resolves null.',
      'Follow the file existing readSave mocking. Reproduce first.',
    ].join('\n'),
  },
]

function implPrompt(t) {
  return [
    'Implement ONE focused fix using strict TDD. Read the relevant files yourself first.', '', CTX, '',
    '=== BUG: ' + t.title + ' ===', '', 'PROBLEM (verified by audit against current code):', t.problem, '',
    'REQUIRED FIX:', t.fix, '', 'TEST (write FIRST, watch it fail):', t.test, '',
    'PROCESS: read files -> failing test -> see it fail -> minimal fix -> green -> FULL gate -> commit on main with the trailer.',
    'If the spec is wrong vs the real code, do the right thing and explain in concerns; if truly blocked, report BLOCKED with',
    'specifics. Your final message is the structured result.',
  ].join('\n')
}
function specReviewPrompt(t) {
  return ['SPEC-COMPLIANCE review. Inspect the committed code (git show HEAD, read changed files + test).', '', CTX, '',
    'INTENDED:', 'BUG: ' + t.title, 'PROBLEM:\n' + t.problem, 'FIX:\n' + t.fix, 'TEST:\n' + t.test, '',
    'Does the fix address the ROOT cause (not a symptom)? Real failing-first test that now passes and exercises the fix? Scope',
    'creep? .d.ts updated if a signature changed? approve only if fully compliant; else changes_requested with specifics.'].join('\n')
}
function qualityReviewPrompt(t) {
  return ['CODE-QUALITY review (correctness, edge cases, conventions). Spec compliance already passed. Inspect committed code.', '',
    CTX, '', 'This fix addresses: ' + t.title, '',
    'Look for real correctness bugs, missed edge cases, brittle tests, magic numbers, divergence from neighbors. Only report',
    'issues that matter. approve if well-built; else changes_requested with actionable file:line issues.'].join('\n')
}
function fixPrompt(t, issues, stage) {
  return ['Fix review issues on a fix you must inspect from git (git show HEAD + read files/test).', '', CTX, '',
    'Fix is for: ' + t.title, '', 'A ' + stage + ' reviewer requested these changes:', JSON.stringify(issues, null, 2), '',
    'Address every issue, keep TDD, re-run the FULL gate, amend/add a commit on main with the trailer. Report the structured result.'].join('\n')
}

async function runTask(t) {
  log('Starting: ' + t.title)
  const impl = await agent(implPrompt(t), { label: 'impl:' + t.key, phase: t.phase, schema: IMPL_SCHEMA })
  if (!impl) return { task: t.key, title: t.title, status: 'AGENT_NULL' }
  if (impl.status === 'BLOCKED' || impl.status === 'NEEDS_CONTEXT') return { task: t.key, title: t.title, status: impl.status, impl }
  let spec = await agent(specReviewPrompt(t), { label: 'spec:' + t.key, phase: t.phase, schema: REVIEW_SCHEMA })
  if (spec && spec.verdict === 'changes_requested' && (spec.issues || []).length) {
    await agent(fixPrompt(t, spec.issues, 'spec-compliance'), { label: 'fix-spec:' + t.key, phase: t.phase, schema: IMPL_SCHEMA })
    spec = await agent(specReviewPrompt(t), { label: 'spec2:' + t.key, phase: t.phase, schema: REVIEW_SCHEMA })
  }
  let qual = await agent(qualityReviewPrompt(t), { label: 'qual:' + t.key, phase: t.phase, schema: REVIEW_SCHEMA })
  if (qual && qual.verdict === 'changes_requested' && (qual.issues || []).length) {
    await agent(fixPrompt(t, qual.issues, 'code-quality'), { label: 'fix-qual:' + t.key, phase: t.phase, schema: IMPL_SCHEMA })
    qual = await agent(qualityReviewPrompt(t), { label: 'qual2:' + t.key, phase: t.phase, schema: REVIEW_SCHEMA })
  }
  return { task: t.key, title: t.title, status: impl.status, gateGreen: impl.gateGreen, spec, qual, impl }
}

const results = []
for (const t of TASKS) {
  results.push(await runTask(t)) // strictly sequential: most fixes touch spike.js
}

phase('Final review')
const finalReview = await agent([
  'FINAL review of a 6-task audit-fix batch on main. Inspect the recent commits (git log --oneline -12, git show each fix).', '',
  CTX, '',
  'Confirm each of these is genuinely fixed at the root with a real test, no regressions, guardrails untouched:',
  '1) mountHorse is interactable in normal play + the prompt follows the whistled horse; 2) playerMaxHp is a fixed 40 distinct',
  'from current HP on resume + slime resumes at saved HP; 3) discovery banks loot.items (+ surfaces them); 4) wagon grants a Map',
  'Scrap matching its copy; 5) no jobBoard reward references a non-canonical item; 6) corrupt-primary recovers from backup and',
  'db-unavailable re-throws. Flag any remaining critical/important issue.',
].join('\n'), { label: 'final-review', phase: 'Final review', schema: REVIEW_SCHEMA })

return { results, finalReview }
