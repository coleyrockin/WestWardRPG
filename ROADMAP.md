# Roadmap

This document outlines planned improvements and future direction for WestWardRPG.
Items are loosely prioritized — contributions toward any of these are welcome.

---

## Near-Term (Polish & Completeness)

- [ ] **Sprite art pass** — Replace abstract billboard placeholders with hand-crafted pixel art for NPCs, enemies, and items
- [ ] **Sound design** — Add ambient SFX for combat, weather, footsteps, and NPC interaction
- [ ] **Mobile / touch controls** — Virtual joystick and tap-to-interact overlay for mobile browsers
- [ ] **Minimap improvements** — Show NPC/enemy positions dynamically; add legend

---

## Gameplay Depth

- [ ] **Expanded quest arc** — Add post-house quests (e.g., defend the settlement, find the missing elder)
- [ ] **Inventory screen** — Full item management UI beyond the shop interaction
- [ ] **Equipment system** — Equippable weapons and armor with visible stat changes
- [ ] **Enemy variety** — Additional enemy types beyond slimes (bandits, desert creatures)
- [ ] **Dialogue trees** — Branch NPC conversations with reputation-based outcomes
- [ ] **Day/night gameplay effects** — Different enemy spawns, NPC schedules, and ambient events at night

---

## Technical Improvements

- [ ] **Bundler / build pipeline** — Optional Vite or esbuild integration for faster local iteration
- [ ] **TypeScript migration** — Gradually type `game.js` for better IDE support and refactoring safety
- [ ] **Test coverage** — Expand JSON action scenarios to cover potion use, map toggle, and house entry
- [ ] **Error telemetry** — Structured in-game error reporting for easier debugging in automated runs
- [ ] **Performance profiling** — Canvas draw call batching and render loop optimizations

---

## Presentation & Distribution

- [ ] **GitHub Pages deployment** — Host a live playable demo directly from the repo
- [ ] **Release tagging** — Create versioned releases with compiled artifacts and changelogs
- [ ] **Game icon and banner** — A polished banner image for the repo and potential itch.io listing

---

## Long-Term / Experimental

- [ ] **Procedural map generation** — Randomized valley layouts with seeded terrain
- [ ] **Multiplayer exploration mode** — Lightweight WebSocket co-op for shared world traversal
- [ ] **Modding API** — Expose hooks for community quest and NPC definitions via JSON manifests
- [ ] **Steam / itch.io packaging** — Electron or Tauri wrapper for standalone desktop distribution
