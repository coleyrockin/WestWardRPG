export const meta = {
  name: 'dustwater-game-breaker-fixes',
  description: 'TDD-fix the 3 confirmed game-breakers (lunge instakill, save-loss-on-slow-load, silent autosave failure) with spec + quality review each',
  phases: [
    { title: 'Lunge instakill' },
    { title: 'Save-load failure' },
    { title: 'Autosave failure' },
    { title: 'Final review' },
  ],
}

// ---- shared repo context every agent needs ----
const CTX = [
  'PROJECT: Dustwater RPG (cyberpunk-western 3D RPG), cwd "/Users/boydroberts/Documents/projects/Dustwater RPG".',
  'Current git branch: slice/open-range-first-ride. Commit your work on THIS branch. Do NOT merge or push.',
  '',
  'THE GATE (must be green before you commit, run from the project root):',
  '  npx vitest run    (782 tests on this branch — your new test must pass and you must not break any)',
  '  npx tsc --noEmit  (must be 0 errors)',
  '  npx vite build    (must succeed; the "chunk-size > 500kB" warning is EXPECTED and is NOT a failure)',
  'Do NOT run the slow SwiftShader visual-capture gate — these are pure-logic fixes that do not touch',
  'rendering, palette, tone-mapping, or layout, so the golden-image baseline is safe by construction; CI backstops it.',
  '',
  'TDD discipline (required): write the FAILING test first, run it and SEE it fail for the right reason,',
  'then write the minimal fix, then run it and see it pass, then run the full gate, then commit.',
  '',
  'CODEBASE CONVENTIONS:',
  '- Tests live in tests/*.test.ts and run under Vitest. tsconfig ONLY includes tests/**/*.ts (no allowJs),',
  '  so any src module a test imports needs a hand-authored sibling .d.ts. encounterSystem.d.ts and',
  '  runSave.d.ts already exist — if you change an exported signature, UPDATE the .d.ts in the same commit.',
  '- If you create a NEW pure src module, add its sibling .d.ts (match the style of existing .d.ts files).',
  '- Match neighboring code: small focused modules, createElement/textContent only for any DOM (no innerHTML).',
  '- Tests are sacred: if you change a tuned value, update that test\'s expected value in the same commit; never delete coverage.',
  '- GUARDRAILS you must not trip: render3d-frontier-layout.test.ts (firstFrameSlabBlockers stays []),',
  '  render3d-phase-state.test.ts (phase sequence). Your fixes should not touch these areas at all.',
  '- Commit message trailer (last line of every commit body): Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>',
].join('\n')

const IMPL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { type: 'string', enum: ['DONE', 'DONE_WITH_CONCERNS', 'BLOCKED', 'NEEDS_CONTEXT'] },
    summary: { type: 'string', description: 'What you changed and why, 2-4 sentences' },
    commitSha: { type: 'string', description: 'The short git SHA you committed' },
    filesTouched: { type: 'array', items: { type: 'string' } },
    testsAdded: { type: 'string', description: 'Name(s) of the test(s) you added and what they assert' },
    gateGreen: { type: 'boolean', description: 'true only if vitest + tsc --noEmit + vite build all passed' },
    gateEvidence: { type: 'string', description: 'The key lines: vitest pass count, tsc result, build result' },
    concerns: { type: 'string', description: 'Anything you are unsure about, or empty string' },
  },
  required: ['status', 'summary', 'gateGreen', 'gateEvidence'],
}

const REVIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    verdict: { type: 'string', enum: ['approve', 'changes_requested'] },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          severity: { type: 'string', enum: ['critical', 'important', 'minor'] },
          location: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['severity', 'description'],
      },
    },
    notes: { type: 'string' },
  },
  required: ['verdict'],
}

// ---- the three confirmed game-breakers, each fully specified ----
const LUNGE_TASK = {
  phase: 'Lunge instakill',
  key: 'lunge',
  title: 'CRITICAL: slime lunge applies damage every frame (instakill)',
  problem: [
    'In src/render3d/spike.js around line 4772, inside the per-frame update, when slimeAI.contact is true the code calls',
    'encounter.applyLungeContact() EVERY FRAME. In src/render3d/encounterSystem.js, applyLungeContact() (around line 201)',
    'only refuses to apply damage when canDamagePlayer() is false or playerInvulnerable() is true. playerInvulnerable is the',
    'player DODGE i-frame check (spike passes () => player.isInvulnerable). If the player is simply standing in the slime',
    'contact zone without dodging, applyLungeContact() subtracts lungeDamage (default 14) on every single frame. ~7 frames of',
    'contact (about 0.1s) drains a full-HP player to 0 — a single lunge is an instant kill. Combat feels broken and unfair.',
  ].join('\n'),
  fix: [
    'Add an internal "lunge damage cooldown" to the encounter system so a connected lunge can only deal damage once per window,',
    'NOT once per frame. Recommended design (match existing patterns like flashTimer/FLASH_TIME in encounterSystem.js):',
    '- Add a module-local timer, e.g. let lungeCooldown = 0; and a named constant LUNGE_COOLDOWN (about 0.8 seconds — tune for a',
    '  fair but threatening cadence).',
    '- In applyLungeContact(): keep the existing disposed / playerHp<=0 / canDamagePlayer() / playerInvulnerable() guards, AND',
    '  add: if (lungeCooldown > 0) return getState(); When a hit DOES land, set lungeCooldown = LUNGE_COOLDOWN.',
    '- Decrement lungeCooldown by dt in the encounter system per-frame tick (it already has an internal update/animate path that',
    '  receives dt — find it), clamped at 0, so the cooldown expires over time.',
    '- Keep the change confined to encounterSystem.js. Do NOT change the caller in spike.js — fixing it at the source makes the',
    '  every-frame call safe automatically. If the encounter genuinely has no dt-driven internal tick to decrement the cooldown,',
    '  the cleanest alternative is to decrement inside the existing update(playerPos, dt) entry point; choose the path that keeps',
    '  the public surface stable, and update encounterSystem.d.ts if any exported signature changes.',
  ].join('\n'),
  test: [
    'Add a test to tests/render3d-encounter.test.ts (follow the existing harness in that file for constructing an encounter).',
    'Assert: calling applyLungeContact() repeatedly within one cooldown window deducts lungeDamage exactly ONCE (player HP drops',
    'by one lungeDamage, not by N*lungeDamage). Then advance the encounter clock past the cooldown (call its update/tick with',
    'enough dt) and assert a subsequent applyLungeContact() deducts again. Also confirm the existing playerInvulnerable() and',
    'playerHp<=0 guards still short-circuit. Reproduce the bug first (test fails: HP hits 0 after several rapid calls), then fix.',
  ].join('\n'),
}

const SAVELOAD_TASK = {
  phase: 'Save-load failure',
  key: 'saveload',
  title: 'HIGH: slow/failed loadRun silently destroys the real save',
  problem: [
    'In src/render3d/runSave.js, loadRun() (around line 124) races readSave against a 1000ms timeout and returns null on timeout',
    'OR any thrown error. In src/render3d/spike.js line 2606, the boot does: const loadedRun = await loadRun().catch(()=>null).',
    'A null result is treated as "no save exists" -> the game boots a FRESH run -> runMode becomes "playing" -> the first autosave',
    '(persistRun -> writeRun) OVERWRITES the existing ironman save slot. So a single slow IndexedDB read (device under load) or a',
    'transient read error PERMANENTLY destroys the player run. A genuinely-absent save and a failed read are indistinguishable.',
  ].join('\n'),
  fix: [
    'Make a failed/timed-out load DISTINGUISHABLE from a genuinely-empty slot, and make a failed load NEVER lead to overwriting an',
    'existing save. Two coordinated changes:',
    '1) runSave.js: raise the timeout to a safe value (use 8000ms — IndexedDB reads complete well under that except under severe',
    '   load; 1000ms is far too aggressive). AND change loadRun so a TIMEOUT or a thrown readSave error is reported distinctly from',
    '   "clean empty / corrupt-but-safe-to-start-fresh". Recommended: loadRun resolves to null ONLY when readSave cleanly resolves',
    '   with no/!ok result or the payload is unmigratable (safe to start fresh); on timeout or a thrown readSave error it should',
    '   RE-THROW so the caller can tell load FAILED vs returned empty. Keep the existing migrate-throw behavior (corrupt payload ->',
    '   null -> fresh, already correct and commented).',
    '2) spike.js boot (line ~2606): replace the blanket .catch(()=>null) so a thrown failure sets a session guard, e.g.',
    '   let saveLoadFailed = false; try { loadedRun = await loadRun(); } catch { saveLoadFailed = true; loadedRun = null; }',
    '   Then, when saveLoadFailed is true, SUPPRESS overwriting: guard persistRun() (and onRunMutated / the saveMgr autosave path)',
    '   so they no-op while saveLoadFailed (an existing-but-unread save must not be clobbered by a fresh session). A clean null (no',
    '   save) must still autosave normally. Add a concise comment explaining why. This must not block boot (resume can never block boot).',
    'Pick the minimal seam that keeps the public contract clean; update runSave.d.ts if loadRun declared signature changes.',
  ].join('\n'),
  test: [
    'Add tests to tests/render3d-run-save.test.ts (follow its existing mocking of readSave and any fake-timer usage — inspect the file first).',
    'Assert: (a) a genuinely-empty/no-save read still resolves to null (start-fresh path preserved);',
    '(b) a TIMED-OUT or REJECTED readSave is reported as a FAILURE distinct from null (e.g. loadRun rejects/throws) — NOT a silent null;',
    '(c) the timeout constant is the new safe value, not 1000ms. Reproduce the danger first (failure currently swallowed as null), then fix.',
  ].join('\n'),
}

const AUTOSAVE_TASK = {
  phase: 'Autosave failure',
  key: 'autosave',
  title: 'HIGH: autosave write failures are silent in production',
  problem: [
    'In src/render3d/spike.js, persistRun() (around line 4512) does writeRun(...).then(onSaveSuccess).catch(err => { if',
    '(import.meta.env?.DEV) console.warn(...) }). In a production build import.meta.env.DEV is false, so a failing write is',
    'COMPLETELY silent — the player keeps playing believing the ironman run is saved when it is not. There is no signal at all.',
  ].join('\n'),
  fix: [
    'Surface persistent save failures to the player without spamming on a single transient miss. Recommended, testable design:',
    '1) Create a small PURE module src/render3d/saveHealth.js (+ sibling saveHealth.d.ts) that tracks save reliability:',
    '   a factory createSaveHealth() returning { recordSuccess(), recordFailure(), get status } (or similar) where status reflects',
    '   consecutive failures — e.g. "ok" until N consecutive failures (use 2 or 3), then "failing". recordSuccess() resets the count.',
    '   Keep it dependency-free and fully unit-testable.',
    '2) Wire it into spike.js: call recordSuccess() where saveMgr.onSaveSuccess() is called, and recordFailure() in the persistRun',
    '   catch (REGARDLESS of DEV). When status becomes "failing", show a SUBTLE, persistent non-blocking on-screen indicator',
    '   (a small "Save failing" HUD note built with createElement/textContent, default hidden, shown/hidden by status). Hide it on',
    '   the next success. Keep the DEV console.warn too. Do not introduce a blocking dialog.',
    'Follow the project HUD/DOM conventions (createElement + textContent only; the security test scans for innerHTML/parser sinks).',
  ].join('\n'),
  test: [
    'Add tests/render3d-save-health.test.ts for the pure saveHealth module. Assert: status starts "ok"; consecutive failures flip it',
    'to "failing" at exactly the threshold you implement (assert that threshold); a success resets back to "ok". Write the failing',
    'test first, then implement the module, then wire spike.js. The spike.js wiring is integration glue (no unit test required) but',
    'must pass tsc + build; keep the testable logic in the pure module.',
  ].join('\n'),
}

const TASKS = [LUNGE_TASK, SAVELOAD_TASK, AUTOSAVE_TASK]

// ---- prompt builders ----
function implPrompt(t) {
  return [
    'You are implementing ONE focused bug fix in an existing codebase using strict TDD. Read the relevant files yourself before editing.',
    '',
    CTX,
    '',
    '=== BUG: ' + t.title + ' ===',
    '',
    'PROBLEM (verified against current code):',
    t.problem,
    '',
    'REQUIRED FIX:',
    t.fix,
    '',
    'TEST (write this FIRST and watch it fail):',
    t.test,
    '',
    'PROCESS: (1) read the files, (2) write the failing test, (3) run just that test and confirm it fails for the right reason,',
    '(4) implement the minimal fix, (5) run that test green, (6) run the FULL gate (vitest + tsc --noEmit + vite build),',
    '(7) commit on the current branch with a clear message + the Co-Authored-By trailer. Then report.',
    'If something in the spec is wrong or impossible against the real code, do the right thing and explain it in concerns;',
    'if you are truly blocked, report BLOCKED with specifics. Your final message is the structured result, not prose.',
  ].join('\n')
}

function specReviewPrompt(t) {
  return [
    'You are a SPEC-COMPLIANCE reviewer. A subagent just implemented a bug fix. Verify it matches the spec EXACTLY — nothing',
    'missing, nothing extra/out-of-scope. Inspect the actual committed code (git show HEAD, read the changed files and the test).',
    '',
    CTX,
    '',
    '=== INTENDED FIX SPEC ===',
    'BUG: ' + t.title,
    'PROBLEM:\n' + t.problem,
    'REQUIRED FIX:\n' + t.fix,
    'REQUIRED TEST:\n' + t.test,
    '',
    'Check: Does the fix actually address the every-frame/overwrite/silent-failure root cause (not just a symptom)? Is there a real',
    'failing-first test that now passes and genuinely exercises the fix? Any scope creep (unrelated changes)? Did it update the',
    'matching .d.ts if a signature changed? Reply approve only if fully spec-compliant; otherwise changes_requested with specific issues.',
  ].join('\n')
}

function qualityReviewPrompt(t) {
  return [
    'You are a CODE-QUALITY reviewer (correctness, edge cases, clarity, conventions). Spec-compliance already passed. Inspect the',
    'committed code (git show HEAD, read the changed files + test).',
    '',
    CTX,
    '',
    'Context — this fix addresses: ' + t.title,
    '',
    'Look for: real correctness bugs in the fix, missed edge cases (cooldown not resetting, timeout still racy, a guard that also',
    'blocks legitimate saves), off-by-one/clamping issues, brittle tests, naming/structure that diverges from neighbors, magic',
    'numbers that should be named constants. Only report issues that genuinely matter. Reply approve if it is well-built; otherwise',
    'changes_requested with specific, actionable issues (cite file:line).',
  ].join('\n')
}

function fixPrompt(t, issues, stage) {
  return [
    'You are fixing review issues on a bug fix you must inspect from git (git show HEAD + read the changed files/test).',
    '',
    CTX,
    '',
    'The fix is for: ' + t.title,
    '',
    'A ' + stage + ' reviewer requested these changes:',
    JSON.stringify(issues, null, 2),
    '',
    'Address every issue. Keep TDD discipline (add/adjust tests as needed). Re-run the FULL gate. AMEND or add a follow-up commit on',
    'the current branch (with the Co-Authored-By trailer). Report the structured result.',
  ].join('\n')
}

// ---- per-task orchestration: implement -> spec review (1 fix) -> quality review (1 fix) ----
async function runTask(t) {
  log('Starting: ' + t.title)
  const impl = await agent(implPrompt(t), { label: 'impl:' + t.key, phase: t.phase, schema: IMPL_SCHEMA })
  if (!impl) return { task: t.key, title: t.title, status: 'AGENT_NULL', impl: null }
  if (impl.status === 'BLOCKED' || impl.status === 'NEEDS_CONTEXT') {
    return { task: t.key, title: t.title, status: impl.status, impl }
  }

  // spec compliance (one fix loop)
  let spec = await agent(specReviewPrompt(t), { label: 'spec:' + t.key, phase: t.phase, schema: REVIEW_SCHEMA })
  if (spec && spec.verdict === 'changes_requested' && (spec.issues || []).length) {
    await agent(fixPrompt(t, spec.issues, 'spec-compliance'), { label: 'fix-spec:' + t.key, phase: t.phase, schema: IMPL_SCHEMA })
    spec = await agent(specReviewPrompt(t), { label: 'spec2:' + t.key, phase: t.phase, schema: REVIEW_SCHEMA })
  }

  // code quality (one fix loop)
  let qual = await agent(qualityReviewPrompt(t), { label: 'qual:' + t.key, phase: t.phase, schema: REVIEW_SCHEMA })
  if (qual && qual.verdict === 'changes_requested' && (qual.issues || []).length) {
    await agent(fixPrompt(t, qual.issues, 'code-quality'), { label: 'fix-qual:' + t.key, phase: t.phase, schema: IMPL_SCHEMA })
    qual = await agent(qualityReviewPrompt(t), { label: 'qual2:' + t.key, phase: t.phase, schema: REVIEW_SCHEMA })
  }

  return { task: t.key, title: t.title, status: impl.status, gateGreen: impl.gateGreen, spec, qual, impl }
}

const results = []
for (const t of TASKS) {
  // strictly sequential: tasks 2 & 3 both touch spike.js; never run implementers in parallel
  results.push(await runTask(t))
}

// ---- final review across all three commits ----
phase('Final review')
const finalReview = await agent([
  'You are the FINAL reviewer for a three-fix bug-fix batch on branch slice/open-range-first-ride. Inspect the last several',
  'commits (git log --oneline -8, git show for each fix commit) and confirm the three game-breakers are genuinely fixed and the',
  'batch is coherent, with no regressions introduced and the guardrail areas untouched.',
  '',
  CTX,
  '',
  'The three fixes: (1) slime lunge no longer applies damage every frame (per-hit cooldown); (2) a slow/failed loadRun can no',
  'longer silently overwrite the real ironman save; (3) autosave write failures now surface to the player via a pure saveHealth',
  'module + subtle HUD note. For each, confirm root-cause fix + a real test. Flag any remaining critical/important issue.',
].join('\n'), { label: 'final-review', phase: 'Final review', schema: REVIEW_SCHEMA })

return { results, finalReview }
