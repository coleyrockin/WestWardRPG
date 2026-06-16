export const meta = {
  name: 'dustwater-reaudit',
  description: 'Fresh correctness + runtime audit of the whole game before the owner plays: 6 parallel finders (each self-verifies) then a synthesis that dedupes + prioritizes by real player impact',
  phases: [
    { title: 'Audit' },
    { title: 'Synthesize' },
  ],
}

const CWD = '/Users/boydroberts/Documents/projects/Dustwater RPG'

const CTX = [
  'PROJECT: Dustwater RPG — a Three.js WebGPU cyberpunk-western 3D open-world RPG. cwd "' + CWD + '".',
  'You are AUDITING for real, player-affecting defects. READ-ONLY: do not edit any file, do not commit.',
  '',
  'WHERE THINGS LIVE:',
  '- src/render3d/spike.js — scene assembly + render loop + all prop builders (the big integration file).',
  '- src/render3d/ — gameState, phaseState (first-road loop FSM), questRuntime, playerController (shoulder cam),',
  '  encounterSystem (slime combat), interactionSystem, audioView, atmosphere, timeOfDay, worldProxies (collision),',
  '  frontierLayout (the world map: coordinate arrays), runSave (ironman save), saveHealth, mountController (horse),',
  '  discoveryRuntime (POI discovery), combat/.',
  '- src/ (top level) — renderer-agnostic engines: jobBoard, shopCatalog, economyServices, lootSystem,',
  '  progressionSystem, npcMemory, poiSystem, storyContent, savePersistence (IndexedDB), inventoryState.',
  '- tests/*.test.ts — Vitest unit tests (797 currently pass). tsconfig only includes tests; src JS modules have',
  '  hand-authored sibling .d.ts files.',
  '',
  'RECENTLY FIXED (verify these HOLD and were not regressed — do NOT re-report them as new unless genuinely still broken):',
  '- Slime lunge instakill — applyLungeContact() now gated by a per-window LUNGE_COOLDOWN (encounterSystem.js).',
  '- Save loss — loadRun() now uses LOAD_TIMEOUT_MS=8000 and RE-THROWS on timeout/error (distinct from a null "no save");',
  '  boot sets saveLoadFailed to suppress overwriting an unread save (runSave.js + spike.js).',
  '- Silent autosave failure — saveHealth.js tracks failures + a HUD note (spike.js).',
  '- Combat hurt feedback gated on a real HP drop (spike.js).',
  '- GUST_DURATION was undefined in audioView.js fireGustBurst (runtime ReferenceError every wind gust) — now defined.',
  '',
  'WHAT COUNTS AS A FINDING: a defect that affects the player — a crash/ReferenceError thrown at runtime, a softlock or',
  'progression dead-end, save/progress loss, an instakill or unfair combat state, an interaction that never resolves, a',
  'visibly broken/placeholder reward, a phase-machine dead-end. NOT findings: style nits, naming, "could be cleaner",',
  'speculative "this might theoretically", or the intentionally-unwired leave-behind systems (NG+, job-board time limits,',
  'faction meters, progression trees) — those are deliberately dormant, note them only if they actively BREAK play.',
  '',
  'RIGOR: only report a finding you have VERIFIED by reading the actual code path. Give a concrete repro and cite file:line.',
  'State a confidence 0-1. If you cannot confirm it is real, do not report it. Prefer 5 real bugs over 25 maybes.',
].join('\n')

const FINDINGS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          file: { type: 'string' },
          lines: { type: 'string' },
          symptom: { type: 'string', description: 'What the player experiences' },
          playerImpact: { type: 'string' },
          repro: { type: 'string', description: 'Concrete steps / the code path that triggers it' },
          suspectedCause: { type: 'string' },
          confidence: { type: 'number' },
        },
        required: ['title', 'severity', 'file', 'symptom', 'repro', 'confidence'],
      },
    },
    coverageNote: { type: 'string', description: 'What you examined and any area you could not fully cover' },
  },
  required: ['findings'],
}

const DIMENSIONS = [
  {
    key: 'runtime-errors',
    prompt: [
      'DIMENSION: Runtime errors the unit/build gate cannot catch — undefined identifiers, references to undeclared',
      'names/constants, missing imports, calling methods that do not exist, typos in property access that throw at runtime.',
      'This is the GUST_DURATION class of bug (it shipped for months; tsc/build/vitest all passed). Scan src/render3d/*.js',
      'and src/*.js: for each module, look for identifiers used but never declared/imported in scope, especially constants',
      'referenced in functions, event handlers, and the render loop. Trace spike.js update()/loop() callees. Use grep to find',
      'suspicious bare identifiers and confirm by reading. Report each confirmed undefined-reference / would-throw site.',
    ].join('\n'),
  },
  {
    key: 'progression-softlock',
    prompt: [
      'DIMENSION: Softlocks, progression dead-ends, and stuck states. Trace the opening (funeral/implant cold-open ->',
      'graveside -> "follow the road") through the first-road loop FSM (phaseState.js) and the new mounted free-roam slice.',
      'Look for: phases that can never advance, objectives that point at something unreachable, interaction prompts that never',
      'resolve, a mounted/dismounted state the player can get wedged in, the whistle/rideTo path stranding the horse or player,',
      'discovery state that double-fires or never fires. Report any state from which the player cannot progress or recover.',
    ].join('\n'),
  },
  {
    key: 'save-integrity',
    prompt: [
      'DIMENSION: Save/load/progress integrity (beyond the already-fixed loadRun timeout). Audit runSave.js, savePersistence.js,',
      'gameState save slice, and the migration/seal paths for OTHER data-loss or corruption vectors: backup rotation, quota',
      'handling, partial writes, migration throwing, the startNewRun clear-then-write race, sealRun, and whether autosave can',
      'persist an inconsistent mid-transition state. Report anything that can lose, corrupt, or resurrect-stale a run.',
    ].join('\n'),
  },
  {
    key: 'combat-encounter',
    prompt: [
      'DIMENSION: Combat & encounter correctness (beyond the fixed instakill). Audit encounterSystem.js, the slime AI/stepSlime,',
      'playerCombat, hitbox/strike resolution, i-frames, death/defeat handling, and the spike.js combat wiring. Look for: other',
      'unfair one-shots, damage applied in the wrong frame/phase, hits that do not register, the player or slime stuck in a state,',
      'death not triggering the run-summary, HP/維 desync, playerDamagePerSecond (declared but unused — does anything depend on it?).',
    ].join('\n'),
  },
  {
    key: 'slice-newcode',
    prompt: [
      'DIMENSION: Correctness of the NEW slice code specifically — mountController.js (stepMount/MOUNT_GAITS), discoveryRuntime.js',
      '(resolveDiscovery), playerController.js mounted mode + saddle preset, interactionSystem.js mountHorse prompt, and the',
      'spike.js wiring (horse instancing, E mount / F dismount / H whistle, per-frame discovery off snapshot.regions, golden-hour',
      'hold). Look for: edge cases (mount while in combat, dismount onto a blocker, discovery firing during capture, NaN positions,',
      'listeners not torn down, the saddle camera clipping). Report real defects, not style.',
    ].join('\n'),
  },
  {
    key: 'reward-economy',
    prompt: [
      'DIMENSION: Rewards, loot, economy, and visible placeholder/incoherent content the player will actually see. Audit the',
      'discovery payoff (grantGold/grantXp), poiSystem rewards, lootSystem, any non-canonical reward (the audit once flagged a',
      '"Tonic" reward bug — confirm it is gone or still present), HUD text that shows raw ids/undefined/NaN, prompts that read',
      'wrong, and any reward path that grants nothing or grants the wrong thing. Report what looks broken or unfinished IN FRONT',
      'OF THE PLAYER.',
    ].join('\n'),
  },
]

phase('Audit')
const raw = await parallel(DIMENSIONS.map((d) => () =>
  agent([CTX, '', d.prompt, '', 'Return your VERIFIED findings only, each with a concrete repro and confidence.'].join('\n'),
    { label: 'audit:' + d.key, phase: 'Audit', schema: FINDINGS_SCHEMA })
))

const all = []
raw.filter(Boolean).forEach((r, i) => {
  (r.findings || []).forEach((f) => all.push({ ...f, dimension: DIMENSIONS[i].key }))
})

phase('Synthesize')
const SYNTH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    verified: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          file: { type: 'string' },
          lines: { type: 'string' },
          playerImpact: { type: 'string' },
          repro: { type: 'string' },
          fixSketch: { type: 'string' },
          confidence: { type: 'number' },
          shaky: { type: 'boolean', description: 'true if you could not fully confirm and the main agent should double-check' },
        },
        required: ['title', 'severity', 'file', 'playerImpact', 'confidence'],
      },
    },
    dropped: { type: 'array', items: { type: 'string' }, description: 'Findings you judged false-positive/out-of-scope and why' },
    summary: { type: 'string' },
  },
  required: ['verified', 'summary'],
}

const synthesis = await agent([
  CTX,
  '',
  'You are the SYNTHESIS + adversarial filter for a re-audit. Below are raw findings from 6 parallel finders. For each:',
  'read the actual code at the cited location, decide if it is a REAL player-affecting defect (default to skeptical — drop',
  'speculative/style/duplicate/leave-behind-system items), dedupe overlapping reports, adjust severity to true player impact,',
  'and add a one-line fixSketch. Mark shaky=true for any you could not fully confirm. Prioritize the output: critical/high first.',
  '',
  'RAW FINDINGS (JSON):',
  JSON.stringify(all, null, 2),
].join('\n'), { label: 'synthesize', phase: 'Synthesize', schema: SYNTH_SCHEMA })

return { rawCount: all.length, synthesis }
