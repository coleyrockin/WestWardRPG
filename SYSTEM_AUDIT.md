# Dustwater — System Audit (2026-06-18)

Senior-architect / production-lead audit. Blunt on purpose. Companion to
[`docs/roadmap.md`](docs/roadmap.md) (the one roadmap) + [`docs/NEXT-AGENT.md`](docs/NEXT-AGENT.md)
(the one handoff). Dustwater = the world's identity (Western frontier crossed with neon cyberpunk
decay — Red Dead meets Blade Runner in a broken desert settlement).

## TL;DR
**The engines are clean. The integration is a 5,300-line god-file. The "game" is a hardcoded
tutorial state-machine, not an authored mission — and no character ever actually talks to you.**
The first 5 minutes already has a full arc (funeral → town → bounty → slime → return), but it reads
as a guided loop, not an RPG, because (a) the job comes from a *bulletin board*, not a person, and
(b) the arc ends on a fizzle (a future job "teased"), not a payoff. The fix is small and does **not**
require rebuilding the world or the renderer.

---

## 1. Project structure

**Organized well**
- **Renderer-agnostic engines in `src/`** — jobBoard, lootSystem, npcMemory, progressionSystem,
  poiSystem, shopCatalog, economyServices, inventoryState, savePersistence. Pure logic, well-isolated,
  unit-tested. This is genuinely good and reusable.
- **World/sim systems** (`src/game/world/`: ground/biome, water, weather, flora, scatter, townsfolk)
  — modular, no render-loop dependency.
- **View seams that ARE clean**: `interactionSystem` (generic proximity+E, zero special-casing),
  the `boardModal`/`boardDom` modal pattern (secure, testable, cloneable), `playerController`,
  `encounterSystem`, `audioView` (full procedural ambience).
- **72 test files / ~896 tests**, tsc, vite build, and a dusk golden-image gate.

**Messy / fragile / blocking**
- **`spike.js` = 5,300 lines (24% of all src).** It owns ~114 `build*()` prop builders + scene
  assembly + the entire render loop + game-state mutations + camera + HUD sync + save integration +
  every gameplay handler + dev tooling. It imports 53 modules. **This is the #1 blocker** — every new
  feature has to be wired through it, so work is scary and serializes here.
- **Gameplay is a hardcoded FSM.** `phaseState.js` hardcodes the first-road beats
  (funeral→implant→spawn→board_choice→…→slime_fight→…→survey_teaser); each phase is wired 1:1 to a
  handler in spike.js. **A designer cannot author a new mission as data** — it takes editing the FSM +
  spike.js + interaction handlers. jobBoard's jobs ARE data, but their *mechanics* are hardcoded in
  the FSM, so jobs are flat vignettes with no narrative flow.
- **Coordinate lockstep.** `FIRST_FIVE_ROUTE` / `HERO_OBJECTS` / `GRAVESIDE_SPAWN` are read by 8+
  files; move a waypoint and the board zone, sign, field-map line, saved spawn, and golden frame can
  silently desync. No tooling — grep-and-pray.
- **Golden-image fragility.** Every animated system must explicitly gate on `visualCapture`
  (40+ references). One missed gate breaks the baseline. It works, but it taxes every change.
- **Tests are broad but shallow** — most modules have unit tests; the actual *loop/interaction
  integration* is exercised by a dev harness (`__westward3dTest`), not CI.

## 2. Core RPG systems — scorecard

| System | State | Verdict |
|---|---|---|
| Player controller | `playerController.js` (776 LOC) | **Clean.** Shoulder cam + movement, tested. |
| Third-person camera | in playerController + spike intro/beat cams | **Good.** Intro push-in, beat focus, funeral cam. |
| World/scene loading | `frontierLayout.js` + spike builders | **Rigid.** Whole world built once at boot; no streaming (fine for the slice). Content data ✓, but rendering is scattered across spike builders. |
| NPCs | `townsfolk.js` + `npcMemory.js` | **Solid.** Named cast, waypoints, day/night schedules, memory. |
| Interaction | `interactionSystem.js` | **Excellent.** Generic, testable, no special-casing. |
| **Dialogue** | barks only | **MISSING.** One-shot lines (greetings, Executor barks, reactive lines). No branching, no conversation, no quest-give-via-talk. |
| Quest flow | `jobBoard` + `questRuntime` + `phaseState` | **Split + hardcoded.** Jobs are data; the opening is an FSM; they don't share a mission model. |
| UI / HUD | board modal + `index.html` panels | **Excellent + reusable.** Secure (createElement/textContent), cloneable for dialogue. |
| Save / state | `savePersistence` + `runSave` + `gameState` | **Strong.** Ironman, resume, mid-fight overlay. Best-covered area. |
| Combat / encounter | `encounterSystem.js` | **Good, small.** Slime FSM + hit feedback. One enemy. |
| Audio / atmosphere | `audioView.js` (909 LOC) | **Solid.** Procedural beds, biome pockets, day/night, weather. |
| Content / data org | frontierLayout + poiSystem + storyContent + jobBoard | **Mixed.** Coordinates/jobs are data; mission *flow* and prop *rendering* are code. |

## 3. The main reason it doesn't feel like an RPG
**Nobody gives you a reason to care, and nothing pays off.** You walk to a *sign* and read UI text;
the beats are a guided tutorial; the arc ends by "teasing" a future job instead of resolving. RPG
feel = *a character hands you purpose, a clear objective pulls you forward, and a payoff closes the
loop.* Every system to deliver that already exists and is clean — the only genuinely missing primitive
is **a minimal dialogue/quest-give conversation + a real completion beat.**

## 4. The biggest leap (not what you'd guess)
**Not a bigger map. Not the god-file refactor (yet).** The largest leap toward RPG feel is to make
the *existing* opening read as one **named, character-given, completable mission**: a person gives it,
a single clear objective thread carries it, and a "BOUNTY COMPLETE" beat with reward + a hook closes
it. Built by **cloning the proven board-modal pattern into a tiny dialogue primitive** — no new huge
system, no world changes, no renderer work.

## 5. Architecture recommendation (build the slice, keep it scalable)
Keep the clean engine/view split. Add ONE thin new concept and stop entombing things in spike.js:
- **`mission` as data** (giver, objective steps, marker, reward, completion) driven by a small generic
  runner — the opening becomes the first instance. The phaseState FSM keeps driving the *beats* for
  now; the mission layer *frames + names + completes* them. (Lets future missions be authored as data
  without touching the FSM.)
- **`dialogue` as data + a modal** — clone `boardModal`/`boardDom` into `dialogueModal`/`dialogueDom`;
  conversations are small node lists. This is the missing primitive.
- **Stop adding to spike.js.** New systems live in their own modules; spike.js only *wires* them. The
  full god-file decomposition is a later milestone (extract builders → `build/`, loop → `loopDriver`),
  done incrementally and verified with a broad capture sweep — NOT a big-bang rewrite.
- Prefer simple/maintainable over clever. No new deps. Data files for content, modules for systems.

## 6. Milestone roadmap (small, safe, parallel-agent-sized)
Each: clear goal · limited files · no unrelated refactors · verification (vitest+tsc+build, dusk
golden PASS, manual play) · update docs · stop when done.

- **M-Slice-1 — "A Voice, a Job, a Payoff" (FIRST, see §below).** The opening bounty is given by a
  character via a short conversation and ends with a real completion beat. New dialogue primitive +
  opening conversation data + completion beat. *Largest visible RPG-feel leap; small + reversible.*
- **M-Slice-2 — mission-as-data seed.** Lift the opening's name/objective/reward/completion into a
  small `mission` data object + a thin runner that frames the existing FSM beats. No FSM rewrite.
- **M-Slice-3 — one more talkable NPC.** A second named NPC with a real (data) conversation that
  hands a *second* short objective — proves the dialogue/mission pattern scales.
- **M-Struct-1 — god-file decomposition, increment 1.** Extract the `build*` prop builders →
  `src/render3d/build/` modules (pure move, byte-stable; verify town+open_range+marsh+Calico capture
  sweep, not just dusk). Then loop/handlers in later increments.
- **M-Struct-2 — layout data extraction.** Pull waypoints/POIs into one data source so designers stop
  editing 8 files to move a beat.

## 7. The first milestone — committed
See [`docs/roadmap.md`](docs/roadmap.md) → "▶ NEXT — Playable Slice" for the live plan. M-Slice-1 is
chosen because it is the single highest-impact, lowest-risk, foundation-respecting move toward real
RPG feel, and it's exactly the "one NPC gives one mission + clear end moment" the owner named.
