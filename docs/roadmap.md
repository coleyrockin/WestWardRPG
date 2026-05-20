# WestWard Finished Product Roadmap

A compact Elder Scrolls inspired frontier RPG built in the browser.

This roadmap is the single source of truth for what remains before
WestWard feels like a finished product instead of a systems prototype.
Do not create parallel TODO, PLAN, or extra roadmap files. Update this file
when scope changes.

## Creative North Star

WestWard should feel like a dense handcrafted frontier RPG that runs in a
browser and punches above its weight.

The target is not a giant Skyrim clone. The target is a tight 20 to 40 minute
vertical slice where a new player can:

1. Leave a memorable town.
2. Follow a road with clear purpose.
3. Notice a landmark, threat, or mystery along the way.
4. Complete a job or quest loop.
5. Earn loot that changes a build decision.
6. Return home or to town and see the world react.
7. Finish or fail a run and understand what happened.

Every road, job, NPC, item, house upgrade, and ending should help that loop.

## Roadmap Rules

1. Player-visible cohesion beats more scattered systems.
2. The roadmap is not finished until a human tester says the first session
   feels clear, readable, and worth replaying.
3. Do not rewrite the renderer.
4. Do not move to a WebGL world renderer unless the project owner explicitly
   chooses that direction. A post-process layer is allowed; a world rewrite is
   not.
5. New top-level save state requires a migration helper and fixture test.
6. Every gameplay commit must keep verification gates green.
7. Finish one playable slice before starting the next.
8. Keep the game local-first and offline-capable. Optional AI features must
   have handcrafted fallback content and explicit approval.
9. Do not clone Bethesda assets, names, UI, quests, or lore. Chase the feeling,
   not the content.

## Audit Snapshot

Date: 2026-05-19.

Latest local facts:

1. Branch target: `main`, tracking `origin/main`.
2. Test gate: `npm test` reports 979 passing tests across 86 test files.
3. `src/main.js` is over 10.5k lines. This is still the biggest technical drag.
4. `docs/roadmap.md` had stale historical counts and mixed shipped work with
   future scope. This rewrite replaces that clutter with the finish path.
5. The codebase has many real modules and tests: gear, jobs, save persistence,
   NPC memory, weather, road routes, fog of war, combat readability, dynamic
   lights, WFC interiors, run history, replay, and more.
6. The main product risk is not missing systems. The risk is that the systems
   still feel adjacent instead of fused into one unforgettable first session.
7. Latest pushed visual-proof commit: `850e022 Tighten opening visual proof`.

### Code Audit Findings

1. `src/main.js` remains too large.
   - Rendering, HUD, modal controls, input dispatch, save/load, update logic,
     and gameplay wiring still live together.
   - Some extraction modules already exist, including `inputManager`,
     `combatProcessor`, `saveStateManager`, `uiModals`, `hudObjectives`, and
     render helpers.
   - The next architecture work should finish extraction rather than invent
     new managers.

2. UI/modal state has improved but is not fully isolated.
   - Modal selections are mirrored into `state.ui.modals`, which is good.
   - The event handling and modal drawing are still mostly inside `main.js`.
   - Finished-product quality needs a real modal/controller boundary.

3. Visual systems exist, but the world still needs stronger authored identity.
   - Dynamic lights, sprite glow, region overlays, road routes, POIs, and fog of
     war exist.
   - The player still needs bigger visual moments: readable road silhouettes,
     stronger wall treatment, memorable landmarks, clearer town layout, and
     more obvious "there is something over there" pulls.

4. The vertical slice has all the pieces but needs a golden path.
   - Jobs, loot, gear, house, NPC memory, consequences, and run summary are
     present.
   - The missing product layer is a reliable first 20 to 40 minute path where
     those systems pay each other off in sequence.

5. Save resilience is close but not complete.
   - IndexedDB saves, backup rotation, migration, export/import helpers, and
     slot summaries exist.
   - Per-slot import/export/recovery controls, save-state clarity copy, and
     chosen-backup restore UI exist.
   - The player still needs browser proof for corrupt-primary recovery,
     export/import flows, IndexedDB quota handling, and clearer manual
     save/autosave status.

6. Test coverage is broad but still too helper-heavy.
   - Unit/state tests are strong.
   - Human-facing flows need more assertion-heavy browser tests: first job,
     first loot, house upgrade, save/load recovery, and ending summary.

7. Documentation must stay honest.
   - README and roadmap must agree on shipped state, test counts, scripts, and
     remaining work.
   - The old README static-server fallback note was removed because
     `package.json` now intentionally exits for `npm run dev:py`.

## Product Completion Definition

WestWard is 100 percent product-finished when a fresh tester can play
without developer help and say all of the following:

1. I understood where to go in the first minute.
2. I recognized town, roads, danger, shelter, and interactables visually.
3. I completed at least one job or quest.
4. I earned a reward that affected gear, resources, crafting, or the house.
5. I understood one build choice and one spending choice.
6. I met an NPC who reacted to something I did.
7. I saw at least one visible consequence in town, on a road, in a service, or
   at home.
8. I could pause, save, reload, recover, and continue.
9. I finished or failed a run and understood the summary.
10. I would describe one road, one NPC, one item, and one location from memory.

The project is not done just because every system exists. It is done when the
first session feels deliberate, readable, and complete.

## Finish Plan Overview

The remaining roadmap is now organized as seven milestones. They are ordered by
what will most improve the finished-product feel.

1. Product Truth Pass.
2. Golden Path 1: the first complete road loop, now focused on the First Road
   Memory Slice.
3. Hardcore Visual Readability Pass.
4. Core RPG Loop Fusion.
5. Town, NPC, and Consequence Payoff.
6. Playtest Hardening.
7. Architecture and Release Finish.

Optional frontier technology comes after those milestones.

## Milestone 0: Product Truth Pass

Status: active.

Goal: Make the repo tell the truth and make the roadmap actionable.

Required work:

1. Replace stale roadmap structure with this finished-product plan.
2. Keep the README aligned with the current scripts and shipped state.
3. Keep one current verification snapshot in the roadmap.
4. Remove old "future idea" duplication once items are either shipped, cut, or
   moved into the optional post-1.0 section.

Acceptance test:

1. A developer can open the roadmap and know exactly what to build next.
2. README and roadmap do not contradict each other.
3. Verification commands still pass.

## Milestone 1: Golden Path 1 - First Complete Road Loop

Status: active. Marsh Slime Bounty is the canonical Boone starter loop with
route, landmark, threat, crafting reward, NPC reaction, board reaction, house
proof, render-text visibility, and smoke assertions. The **First Road Memory**
slice now continues into Broken Wagon discovery, Map Scrap follow-up, Old Road
Survey availability, Old Road Survey checkpoint progress, Boone/town/house
reaction, run-summary proof, and an explicit `old-road-survey` browser smoke
scenario. The remaining work is to make the loop feel visually bigger and more
human-tested, not to add another unrelated system.

Goal: Build one fully authored, repeatable 20 to 40 minute path that proves the
game works as an RPG.

The player path:

1. Start in Dustward.
2. See Boone, the job board, the road, and a clear first objective.
3. Accept one job.
4. Follow road markers.
5. Notice one optional roadside discovery.
6. Reach a named landmark or interior.
7. Face one readable elite or mini-boss threat.
8. Earn loot that has a story hook.
9. Return to Boone or town.
10. Spend or prepare the reward at home or a vendor.
11. Hear one NPC reaction.
12. See one home, board, service, or town consequence.

Required work:

1. Use existing `frontier_broken_wagon`, `Map Scrap`,
   `frontier_slime_bounty`, and `frontier_map_survey` as the canonical first
   road memory chain.
2. Add a derived first-road memory status to `render_game_to_text`, with no
   save-schema bump.
3. Make Broken Wagon discovery visibly stronger through banner copy, minimap
   marker emphasis, road dressing, and story-reward language.
4. Record Boone and Elder memory when Broken Wagon is discovered.
5. After the bounty, point missed-discovery players back to Broken Wagon and
   map-scrap players toward Old Road Survey.
6. Surface the consequence in Boone dialogue, job board copy, house planning
   proof, and run summary.
7. Keep browser smoke coverage asserting discovery, Map Scrap, bounty
   completion, Old Road Survey availability/completion, Boone memory,
   first-road memory status, house proof, and run-summary line.

Acceptance test:

1. A tester can describe the full loop in order.
2. The tester remembers one visual landmark.
3. The tester knows what to upgrade next.
4. The tester sees a reaction after returning.
5. The tester can explain why Map Scrap matters.

## Milestone 2: Canvas Visual Overhaul: Dustward First 10 Minutes

Status: active. Dustward pass 2 is the current MVP visual rescue: a Canvas-only
art-kit overhaul for the first 5 to 10 minutes, with a haunted western dusk
sky, stronger dusty road, lower marsh/wall treatment, cleaner HUD, smaller
first-frame animal clutter, town silhouettes, lantern/wanted-board dressing,
and distinct Smoke Cache/Broken Wagon/Boone board shape language.
Combat readability pass 1 shipped on `main`: aggro, windup, stagger, boss phase,
death, and reward-drop cues now feed subtitle/audio events, floating combat
text, and `render_game_to_text` combat-readability state.

Goal: Make the opening Dustward loop look beautiful, authored, and readable
while staying on the current canvas raycaster.

Required work:

1. Road composition.
   - Roads need better edges, wagon ruts, turn hints, posts, fences, lamps,
     signs, trees, and destination silhouettes.
   - The player should feel pulled down the road before reading the HUD.

2. Near-wall and collision visuals.
   - Improve harsh wall approach moments.
   - Use region wall materials, edge shading, height hints, decals, trim bands,
     and contact shadows so walls feel placed instead of flat.

3. Landmark identity.
   - Dustward needs a stronger town/watchtower/road image.
   - Ashfall needs plume, mine, slag, and heat-haze identity.
   - Iron Lantern needs gate, signal, surveillance, and cold light identity.

4. Interactable readability.
   - Job board, POIs, house stations, vendors, doors, loot, and route markers
     need clear shape language.
   - Minimap markers and 3D sprites should agree.
   - Dustward interactables should be recognizable before reading text.
   - NPCs should no longer read as plain colored rectangles.

5. Combat readability.
   - Aggro, windup, stagger, parry, block, death, reward drops, and boss phases
     should be visible at a glance.
   - Combat subtitles and audio cues should have an accessibility toggle.

6. Visual regression.
   - Expand visual capture coverage for title, opening town, road, near-wall,
     job board, combat, housing, and run summary.
   - Keep review-mode CI capture active until human-approved baselines are
     committed, then switch strict pixelmatch pass/fail on.

Acceptance test:

1. A tester can look at a screenshot and identify region, road direction,
   interactables, and danger.
2. Walking into or near walls no longer looks broken or harsh.
3. The opening view has sky, road, trees, landmark, and town identity.
4. Visual captures are stable enough to gate changes.

## Milestone 3: Core RPG Loop Fusion

Goal: Jobs, loot, gear, crafting, housing, and economy should feel like one
loop, not five separate systems.

Required work:

1. Gear choice pressure.
   - Weapon families must feel different in stamina, reach, timing, or utility.
   - Armor should affect movement, stamina, protection, stealth, or role.
   - Attributes must visibly affect combat, dialogue, services, or crafting.

2. Loot story.
   - Important loot needs an origin line, use case, and NPC/service reaction.
   - Add more named finds: badge, map scrap, ruined charm, branded weapon,
     miner gear, house trophy, cursed relic, and faction token.

3. Home utility.
   - Make the house the obvious place to prepare, repair, plan, and display.
   - Add one visible trophy slot tied to the golden path.
   - Add clear workbench upgrade previews and station benefits.

4. Economy pressure.
   - Gold needs useful sinks: repairs, upgrade prep, bounty permits, training,
     house upgrades, cosmetics, travel, or rare services.
   - Prices should react to region, faction, Craft, Speech, and quest outcomes.

5. Route rewards.
   - Road discoveries, job completions, mini-bosses, and POIs should all point
     back into gear, house, NPC, or story consequences.

Acceptance test:

1. A tester can name their build.
2. A tester can name one item they want and why.
3. A tester can name one reason to return home.
4. A tester spends gold on purpose, not because the UI has a shop.

## Milestone 4: Town, NPC, and Consequence Payoff

Goal: The world should notice the player offline, with handcrafted reactions.

Required work:

1. NPC memory payoff.
   - NPCs should react to origin, active job, completed job, latest quest
     outcome, faction stance, house state, and notable gear.
   - Reactions should be short, specific, and rare enough to feel authored.

2. Dialogue choices.
   - Major NPCs need compact 2 to 4 choice menus.
   - Choices should be fast, readable, and consequence-driven.
   - Avoid long lore dumps during active play.

3. Visible consequences.
   - At least one choice should change a service note, job board listing, town
     prop, patrol presence, house visitor, vendor price, or regional hazard.
   - Consequences must appear during play, not only in debug or ending text.

4. NPC life.
   - Use existing behavior-tree foundations for simple schedules and movement.
   - Give the town a few visible routine beats: patrol, vendor, worker, visitor,
     or night shelter movement.

5. Region personality.
   - Each region needs a common threat, rare threat, resource identity, faction
     pressure, rumor, landmark, local mystery, unique job, and return reason.

Acceptance test:

1. A tester can name three current-run facts that appeared in the world.
2. A tester remembers at least one NPC by role, line, or problem.
3. A tester sees one consequence without checking a menu.

## Milestone 5: Playtest Hardening

Goal: A non-developer should be able to test the game without anyone standing
over their shoulder.

Status: active. Save slot clarity pass 1 shipped locally: title-screen slots now
show explicit empty, valid, corrupted, invalid, or newer-schema guidance with
recover/import/export language. Backup picker pass 1 also shipped locally:
slots cache backup metadata, show whether valid backups exist, and let a
player choose which valid backup to restore when more than one is available.
Browser smoke now proves corrupt-primary detection, chosen-backup restore, and
per-slot export/import through the `save-recovery` scenario.

Required work:

1. Pause and settings finish.
   - Escape pause, resume, settings, codex, quit to title, new run, difficulty,
     accessibility, audio, graphics, and keybind clarity.

2. Save resilience finish.
   - Keep `save-recovery` smoke green for corrupt primary plus chosen-backup
     restore.
   - Keep per-slot export/import smoke green.
   - IndexedDB quota handling.
   - Manual save confirmation and autosave status clarity.

3. Run history and feedback.
   - Show past runs with ending, origin, build, jobs, choices, time, and best
     stats.
   - Add a local feedback export or post-run notes field for playtesters.
   - Track time to first objective, first job, first kill, first reward, first
     house visit, death cause, and setting changes.

4. Browser E2E tests.
   - Assert first job accept/complete/return.
   - Assert first loot reward and house/vendor follow-up.
   - Assert save, reload, recovery, and run summary.
   - Assert modal pause stops world simulation.

Acceptance test:

1. A tester can start, pause, save, reload, recover, die or finish, and send
   useful feedback from one session.
2. The browser smoke suite proves the golden path with real state assertions.

## Milestone 6: Architecture Finish

Goal: Reduce future-change risk and make the project look professional under
the hood.

Required work:

1. Finish `main.js` extraction.
   - `HudRenderer`: minimap, bars, notices, objective strip, modals.
   - `InputController`: gameplay, title, modal, keybind, pointer lock, gamepad
     scaffold.
   - `ModalStack`: all modal state and transitions in `state.ui`.
   - `CombatRuntime`: attack/block/parry/dodge/status wiring around the pure
     `combatProcessor`.
   - `SaveRuntime`: capture/apply, autosave, slot selection, recovery, export.
   - `WorldRenderer`: sky, ground, road, walls, sprites, overlays, lights.

2. Set size targets.
   - `src/main.js` under 6,000 lines after first extraction pass.
   - `src/main.js` under 3,500 lines before 1.0.
   - No new module above 1,500 lines without a written reason in this roadmap.

3. Type the state boundary.
   - Keep `gameState.d.ts` current.
   - Treat `npm run typecheck:ts` as a hard gate.
   - Add focused types for UI, save payload, world, narrative, jobs, and
     rendering surfaces.

4. Performance and memory.
   - Pre-allocate hot-path depth buffers.
   - Keep particle pools allocation-free during play.
   - Add FPS/dev overlay checks to visual smoke.
   - Measure before adding WebAssembly.

Acceptance test:

1. A new contributor can find input, save, HUD, combat, and renderer logic
   without reading the entire `main.js`.
2. Existing tests stay green after each extraction.
3. Smoke and visual tests prove behavior did not regress.

## Milestone 7: Release Finish

Goal: Package the project as a polished portfolio-ready browser RPG.

Required work:

1. README polish.
   - One strong sentence.
   - Honest current-state summary.
   - Current screenshots or GIF.
   - Correct commands.
   - Controls, systems, tests, architecture, roadmap link, and limitations.

2. Offline and installable release.
   - Itch-style package.
   - PWA manifest and service worker.
   - Offline-after-first-load behavior.
   - Clear update messaging.

3. Visual proof.
   - Title screen screenshot.
   - Opening town screenshot.
   - Road/landmark screenshot.
   - Combat screenshot.
   - Job board screenshot.
   - Housing/workbench screenshot.
   - Run summary screenshot.
   - One short gameplay GIF or video.

4. Final repo audit.
   - No stale docs.
   - No ignored artifacts committed.
   - Scripts match README.
   - Roadmap status matches build.
   - License and contribution docs are clean.
   - CI passes.

Acceptance test:

1. A non-developer can open the repo, play the game, understand the project,
   see proof of quality, and understand why the implementation is impressive.

## Post-1.0 Optional Tracks

These are not required for the game to feel finished. Do not start them until
Milestones 1 through 7 are green unless the project owner explicitly changes
priority.

### B3: WebAssembly Raycaster

Use Rust or another wasm path only after visual/performance needs prove the JS
raycaster is the bottleneck.

Gate:

1. Pixel-identical output against curated JS frames.
2. Faster on every supported graphics preset.
3. Runtime flag falls back to JS.

### B1: WebGL2 Post-Process Layer

Allowed only as a post-process over the existing canvas output. Do not rewrite
the world renderer.

Gate:

1. Post-FX off switch.
2. Stable visual regression baselines.
3. Low preset remains playable.

### C3: Event-Sourced Narrative State

Worth doing only when narrative consequence surfaces are stable enough that a
v4 save schema is justified.

Gate:

1. v3 saves migrate.
2. Replaying events recreates narrative state byte-for-byte.
3. Ending and run-summary logic read from the reduced state.

### Optional AI Boundary

Any LLM, WebLLM, voice, or network feature requires explicit per-item approval.
Major dialogue, quests, named NPC speech, and canon story content stay
handcrafted. Offline fallback is mandatory.

Allowed optional ideas:

1. Non-canon WebLLM ambient flavor with strict filtering.
2. Speech synthesis for accessibility.
3. Local voice commands for companion verbs.
4. File-based async ghost replays.

## Immediate Build Order

Use this order for the next implementation chunks:

1. Finish the Dustward Canvas art-kit visual overhaul and browser-review the
   title, opening road, Smoke Cache, Broken Wagon, first combat, and near-wall
   views.
2. Human-review current visual captures, commit approved baselines, and then
   make strict `npm run test:visual` part of the release gate.
3. Finish IndexedDB quota and manual save/autosave status clarity.
4. Extract HUD and objective rendering from `src/main.js` without changing the
   renderer.
5. Extract modal input and modal drawing from `src/main.js`.
6. Build the release proof package: `npm run build`, `npm run build:itch`,
   README screenshots, known limits, and launch instructions.

## Verification Gates

Run before meaningful commits:

```bash
git diff --check
npm test
npm run typecheck:ts
npm run test:syntax
npm run dev:lint
npm run build
```

Run when UI, canvas, routing, save, or player-flow behavior changes:

```bash
npm run test:smoke
```

Run when visuals change:

```bash
npm run test:visual:capture
npm run test:visual:review
npm run test:visual # strict mode after baselines are committed
```

Latest local verification snapshot:

```bash
git diff --check
# clean

npm test
# 979 passing across 86 test files

npm run typecheck:ts
# clean

npm run test:syntax
# clean

npm run dev:lint
# clean

npm run build
# passed with existing Vite chunk-size warning

env WESTWARD_PORT=5236 WESTWARD_URL=http://127.0.0.1:5236/index.html npm run test:smoke
# clean; includes golden path, first-road memory, old-road-survey, save recovery,
# combat, boss, weather, upgrade/equip, settings, mini-boss, and codex browser proof
# artifacts: output/qa-smoke-20260519-200033

npm run package:itch
# clean; wrote releases/westward-rpg-offline-v1.0.0.zip

node web_game_playwright_client.mjs --url http://127.0.0.1:5228/index.html --screenshot-dir output/visual-rescue/frontier-opening-polished
# clean with escalation; reviewed shot-1.png for the Dustward opening pass

npm run test:visual:review
# clean in review mode; 18 captures skipped because no committed baselines exist
```
