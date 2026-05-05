# WestWardRPG Roadmap

A compact Elder Scrolls inspired frontier RPG built in the browser.

WestWardRPG is a story first browser RPG built on a custom Canvas raycasting engine. The goal is to turn the current systems heavy prototype into a dense, readable, memorable RPG that feels handcrafted, playable offline, and impressive as a portfolio project.

This roadmap is the single source of truth. Do not create parallel TODO, PLAN, or extra roadmap files. Update this file when scope changes.

## Creative North Star

WestWardRPG should chase the feeling of a compact Elder Scrolls style RPG built for the browser.

The game should not try to compete with Skyrim or Oblivion in size, budget, graphics, or content volume. It should compete in atmosphere, player freedom, world readability, meaningful choices, and the feeling that every road might lead to a story.

The dream version is simple:

The player leaves town, follows a road, finds danger, takes jobs, builds a character, earns gear, returns home, hears NPCs react to what happened, and slowly shapes the region through choices.

The game should feel like:

1. Skyrim's road wandering
2. Oblivion's strange NPC charm
3. Morrowind's handcrafted weirdness
4. A western frontier survival RPG
5. A lightweight browser game that punches above its weight

The goal is not massive scale.

The goal is density.

Every town, road, job board, cave, ruin, faction, NPC, and reward should feel intentional.

## Product Vision

WestWardRPG should feel like a small frontier RPG with Skyrim and Oblivion energy, built with simple web technology instead of a heavy engine.

The finished version should prove that a browser game can have:

1. A clear first minute
2. A readable 3D world
3. Combat with timing and feedback
4. Character builds that matter
5. Loot, gear, jobs, and housing loops
6. NPCs that react to what the player has done
7. Story choices that show visible consequences
8. Save, pause, reload, and recovery paths that are safe for playtesting

The game must remain local first. Optional AI, network, or LLM features may come later, but the full game must work offline with handcrafted fallback content.

## Roadmap Rules

1. Player visible progress beats hidden complexity.
2. Do not rewrite the renderer.
3. Do not move to WebGL unless the project owner explicitly chooses that direction.
4. New top level save state requires a migration helper and fixture test.
5. Every gameplay change must keep the verification gates green.
6. Finish one playable slice before starting the next.
7. The roadmap should make the project easier to ship, not harder to understand.
8. Do not clone Skyrim, Oblivion, Bethesda assets, names, UI, quests, or lore. Chase the feeling only.

## Main Design Goal

The first public version should not try to be a huge RPG.

It should be a dense vertical slice of a huge RPG.

The player should be able to play for 20 to 40 minutes and feel like they touched a larger world.

The slice should include:

1. One memorable town
2. Three roads
3. Three region flavored danger zones
4. One cave, mine, ruin, or hideout
5. One faction conflict
6. One real quest choice
7. One boss or elite enemy
8. One home upgrade loop
9. One NPC who remembers the player
10. One ending or run summary that reflects what happened

If this slice feels good, the whole project becomes expandable.

## The Elder Scrolls Feeling Checklist

### 1. The Road Is the Game

The player should always have a reason to follow a road.

Roads should lead to:

1. Towns
2. Camps
3. Mines
4. Ruins
5. Bandit hideouts
6. Shrines
7. Strange NPCs
8. Resource spots
9. Regional events
10. Optional danger

The player should feel like they can say, "I was heading to a job, but then I saw something."

### 2. Every Region Has a Personality

Each region should have its own visual identity, danger profile, jobs, enemy types, resources, rumors, and faction pressure.

Dustward should not feel like Ashfall.
Ashfall should not feel like Iron Lantern.
Iron Lantern should not feel like a reskinned version of the first area.

Each region needs:

1. A visual palette
2. A common threat
3. A rare threat
4. A resource identity
5. A faction presence
6. A town rumor
7. A unique job type
8. A memorable landmark
9. A small local mystery
10. A reason to return later

### 3. NPCs Should Feel Weird, Useful, and Memorable

The game does not need hundreds of NPCs. It needs a small cast that players remember.

Each important NPC should have:

1. A job
2. A personality hook
3. A useful service
4. A personal problem
5. A reaction to player origin
6. A reaction to player reputation
7. A reaction to one major quest outcome
8. A short memorable line
9. A reason to revisit them
10. A small secret, rumor, or agenda

The target is not AI chatbot NPCs.

The target is handcrafted NPCs that feel alive because they remember enough.

### 4. The Player Build Should Matter

The player should be able to become a recognizable type of character.

Examples:

1. Outlaw gunslinger
2. Heavy armored bounty hunter
3. Survivalist scout
4. Silver tongued trader
5. Relic hunter
6. Alchemist drifter
7. Faction loyalist
8. Cursed wanderer
9. Local hero
10. Greedy opportunist

Stats, gear, jobs, faction reactions, and dialogue should reinforce the chosen identity.

### 5. Loot Should Tell a Story

Loot should not only be numbers.

Good loot should feel like it came from somewhere.

Examples:

1. A rusted pistol from a dead outlaw
2. A branded rifle from a faction patrol
3. A strange charm found in a ruined shrine
4. A miner's helmet from an abandoned shaft
5. A map scrap from a bounty target
6. A house trophy from a boss
7. A rare crafting part from a regional beast
8. A cursed item with a tradeoff
9. A faction badge that changes dialogue
10. A letter that unlocks a job

Every important reward should answer:

1. Where did this come from?
2. Why does it matter?
3. What can I do with it?
4. Does anyone notice I have it?

### 6. Small Consequences Matter

The game does not need huge branching campaigns at first.

It needs visible consequences.

Examples:

1. A shopkeeper changes prices
2. A job board updates
3. A town guard says something new
4. A faction patrol appears
5. A house visitor arrives
6. A road becomes safer
7. A region becomes more dangerous
8. A rumor changes
9. An NPC refuses service
10. A new ending flag is unlocked

The player should feel like the world noticed them.

### 7. The Home Base Should Feel Like Your Place

The player's house should become the emotional anchor.

It should support:

1. Storage
2. Crafting
3. Resting
4. Trophies
5. Workbench upgrades
6. Companion visits
7. Job planning
8. Map planning
9. Letters or rumors
10. Visual proof of progress

The house should slowly change from shelter into identity.

### 8. The World Should Have Mystery

WestWardRPG should include strange, slightly unsettling, memorable discoveries.

Examples:

1. A locked shrine in the desert
2. A ghost town rumor
3. A mine where workers disappeared
4. A faction symbol carved into stone
5. A cursed relic
6. A talking prisoner
7. A repeating dream
8. A bounty that was not human
9. A house visitor who knows too much
10. A final region secret tied to the ending

This is where the game can feel more Oblivion and less generic western.

## Current Build Summary

The current build already includes the Shattered Frontier v3 foundation, story progression, thematic axes, quest outcomes, ending and run summary logic, combat depth, region events, POIs, faction reputation, character origins, attributes, gear, armor, loot tables, housing, workbench upgrades, Boone job boards, deterministic NPC memory, visual identity work, and early open world pressure.

The next goal is polish, readability, and payoff.

The project does not need more scattered systems yet.

It needs the existing systems to feel connected in the player's first short session.

## Definition of Done

WestWardRPG is roadmap finished when a new player can:

1. Start the game and understand where to go within 60 seconds.
2. Fight an enemy and clearly read danger, timing, damage, stagger, death, and reward feedback.
3. Complete at least one job or quest loop.
4. Earn loot or resources that lead to a real upgrade decision.
5. Visit the house and understand why it matters.
6. Talk to NPCs who react to current run facts.
7. See at least one visible consequence from a story choice.
8. Pause, save, reload, recover, and continue without developer help.
9. Finish or fail a run and understand the summary.
10. Launch the game from a clean local or packaged build.

## Phase 1: First 10 Minutes Must Feel Finished

Goal: The opening session should feel intentional, readable, and rewarding.

### Required Work

1. Opening direction
   1. Add a clear first route marker.
   2. Show the nearest useful objective.
   3. Show distance, reward, threat level, and reason to care.
   4. Make Boone's board visible and understandable early.

2. Starting town readability
   1. Improve roads, signs, fences, props, crates, camp silhouettes, and landmarks.
   2. Make Dustward Frontier feel like a place, not an empty test map.
   3. Make the player understand town, danger, shelter, and road direction at a glance.

3. First combat clarity
   1. Enemy aggro must be obvious.
   2. Windup, stagger, hit, block, parry, death, and reward drops must be visible.
   3. Combat feedback should feel punchy even with simple visuals.

4. First reward loop
   1. Within 10 minutes, the player should earn one useful reward.
   2. That reward should connect to gear, crafting, jobs, or the house.
   3. The game should explain why the reward matters.

### Acceptance Test

A tester can play for 10 minutes and explain:

1. Where they went
2. What was dangerous
3. What they earned
4. What they want to upgrade next
5. One thing they remember visually

## Phase 2: Make the Core RPG Loop Real

Goal: Jobs, loot, gear, crafting, housing, and economy should connect into one repeatable loop.

### Required Work

1. Gear choice pressure
   1. Weapon families should feel different.
   2. Armor should affect movement, stamina, protection, or role identity.
   3. Attribute choices should change how the player approaches combat, prices, crafting, or dialogue.

2. Earned upgrades
   1. POIs, mini bosses, region rewards, and jobs should drop useful materials.
   2. Some upgrades should be earned outside shops.
   3. Loot should help the player tell a story about their build.

3. Workbench depth
   1. Workbench levels should have visible benefits.
   2. Add clearer previews for forge, alchemy, map table, repairs, refining, and station projects.
   3. The player should understand why upgrading the house matters.

4. Gold sinks
   1. Add useful spending choices such as repairs, housing upgrades, pet care, trainers, cosmetics, travel, bounty permits, or rare crafting services.
   2. Gold should feel helpful, not decorative.

### Acceptance Test

After one short session, a tester can name:

1. Their build direction
2. Their best weapon or armor choice
3. One resource they want more of
4. One reason to return home
5. One thing worth spending gold on

## Phase 3: Make the World Feel Alive Offline

Goal: NPCs and services should react to the player without needing AI or network calls.

### Required Work

1. Dialogue UI
   1. Add a compact 2 to 4 choice dialogue modal for major NPCs.
   2. Keep responses short and handcrafted.
   3. Dialogue should be fast, readable, and game like.

2. NPC memory reactions
   1. NPCs should reference origin, current region, house state, recent quest outcome, active job, faction stance, and notable gear.
   2. Reactions should be deterministic and save safe.

3. Visible consequences
   1. At least one quest outcome should change a service, shop note, town line, patrol presence, job board listing, house visitor, or regional dressing.
   2. Consequences should show during play, not only in debug or end screens.

4. Regional identity
   1. Dustward, Ashfall, and Iron Lantern should each have distinct jobs, props, language, hazards, resources, and reward flavor.

### Acceptance Test

A tester can identify at least three current run facts that appear in NPC dialogue, service text, job board copy, or world state.

## Phase 4: Complete the Story Loop

Goal: The player should be able to finish a run and understand why the ending happened.

### Required Work

1. Quest outcome coverage
   1. Major quest choices should write to narrative state.
   2. Save and reload must preserve outcomes.
   3. Tests should cover at least one full quest choice path.

2. Companion barks
   1. Add short lines for low health, first kill, boss phase, region entry, house unlock, and key quest outcomes.
   2. Keep lines short and rare enough that they feel special.

3. Ending variants
   1. Endings should reflect thematic axes, factions, quest outcomes, companion state, gear identity, and key flags.
   2. Avoid too many endings until the core ones are clear.

4. Run summary
   1. Show kills, jobs completed, jobs failed, resources found, bosses defeated, origin, gear highlights, quest outcomes, ending cause, and time played.

### Acceptance Test

After a completed run, a tester can explain:

1. What ending they got
2. Why they got it
3. Which choices mattered
4. What they would do differently next time

## Phase 5: Playtest Readiness

Goal: The game should be stable enough for someone else to test without you standing over their shoulder.

### Required Work

1. Pause and settings
   1. Escape pause
   2. Resume
   3. Settings
   4. Codex
   5. Quit to title
   6. New run
   7. Difficulty selection

2. Save resilience
   1. Multiple save slots
   2. Backup rotation
   3. Corruption recovery screen
   4. Export and import
   5. Clear future schema messaging

3. Local run history
   1. Track past runs locally.
   2. Show ending, build identity, major choices, and best stats.

4. Playtest feedback
   1. Add a simple post run feedback prompt or local notes export.
   2. Track local metrics such as time to first kill, first job accepted, first reward, death cause, chapter reached, and setting changes.

### Acceptance Test

A tester can start, pause, save, reload, recover from a bad save, finish or die, and send useful feedback from one session.

## Phase 6: Portfolio Ready Release

Goal: Package the project so it looks serious to employers, recruiters, and other developers.

### Required Work

1. README polish
   1. Keep the README honest and impressive.
   2. Explain the game in one strong sentence.
   3. Include screenshots or GIFs.
   4. Show controls, quick start, systems, tests, architecture, and roadmap link.

2. Visual proof
   1. Add a short gameplay GIF or video.
   2. Add screenshots for title screen, combat, job board, housing, region identity, and run summary.

3. Release package
   1. Create an offline itch style package.
   2. Include clear launch instructions.
   3. Include known limitations.
   4. Do not require Codex, local agents, or repo knowledge to play.

4. Final audit
   1. Remove stale docs.
   2. Confirm ignored output artifacts are not committed.
   3. Confirm scripts match the README.
   4. Confirm roadmap status matches the actual build.
   5. Confirm license and contribution docs are clean.

### Acceptance Test

A non developer can open the repo, understand the project, run the game, see proof of quality, and understand why the project is technically impressive.

## Verification Gates

Run these before meaningful commits:

```bash
npm test
npm run typecheck:ts
npm run test:syntax
npm run dev:lint
npm run test:smoke
npm run qa
```
