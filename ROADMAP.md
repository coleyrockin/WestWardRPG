# Roadmap

This document tracks planned features, improvements, and ideas for WestWardRPG.
Items are loosely prioritized from near-term to longer-term.

---

## Near-Term

### Gameplay
- [ ] Ranged combat: throwable weapons or bow/arrow with aiming arc.
- [ ] Additional enemy types beyond Slimes (bandits, wolves, desert scorpions).
- [ ] More quest chains after house construction (town expansion, faction alliances).
- [ ] Crafting system: forge weapons and tools from harvested resources.

### Visual
- [ ] Sprite art pass — replace abstract colored billboards with hand-drawn pixel characters.
- [ ] Animated door open/close for the player house interior.
- [ ] Improved particle effects for rain, dust storms, and combat hits.

### Audio
- [ ] Background music tracks per environment (town, marsh, valley, house interior).
- [ ] Ambient sound effects: wind, cricket chirps, distant pig oinks.
- [ ] Combat sound cues: sword swings, blocks, enemy hits, death.

---

## Mid-Term

### World
- [ ] Procedurally generated dungeon or cave system below the valley.
- [ ] Day/night-cycle world events (nighttime enemy respawns, bard only at dusk).
- [ ] Multiple biomes: desert, forest, marsh, mountain pass.

### Systems
- [ ] Persistent NPC schedules (merchant opens shop at dawn, inn closes at night).
- [ ] Item equipment slots: weapon, armor, accessory.
- [ ] Save slots — allow multiple save files so players can try different playthroughs.
- [ ] In-game journal tracking quest history and lore entries.

### Automation & Testing
- [ ] Expand `test-actions/` coverage for all `Q`, `M`, `F` key bindings.
- [ ] Automated screenshot regression to catch rendering regressions.
- [ ] Performance profiling pass for frame rate in large open areas.

---

## Long-Term

### Multiplayer (Experimental)
- [ ] WebSocket-based co-op mode for two players in the same session.
- [ ] Shared world state with server-side conflict resolution.

### Platform
- [ ] Progressive Web App (PWA) support for offline play and mobile install.
- [ ] Gamepad API integration for controller support.
- [ ] Mobile touch controls overlay for small screens.

### Content
- [ ] Full dialogue tree editor (JSON-based) so contributors can add quests without editing JS.
- [ ] Additional language packs beyond the current 8 (Arabic, Chinese, Korean, Russian).
- [ ] Modding API: expose a documented `window.WestWardRPG` surface for community plugins.

---

## Known Issues / Tech Debt

- [ ] `game.js` is a single large file — investigate splitting into logical modules (renderer, combat, AI, UI, persistence) once a bundler is introduced.
- [ ] TypeScript adoption is partial (`atmosphere.ts` only) — migrate core modules incrementally.
- [ ] Scripts directory contains optional polyglot tooling (Go, Rust, Ruby, PHP, Perl) that requires separate runtimes; document clearer opt-in instructions.
