# Changelog

## Unreleased — first five-minute 3D opening polish

- Started the max-mode polish branch from `6826ce2` on `codex/first-five-minutes-v2` as `codex/first-five-minutes-max-mode`.
- Generated and registered a second focused Blender mini-kit: awning Boone board, road rut strips, broken fence scrap, marsh slime trail cluster, hero wagon wreck, town facade variants, and mesa skyline pieces.
- Re-art-directed the opening frame around player/board, a wider road, cleaner town-edge silhouettes, distant mesa skyline, and a visible marsh-threat lane.
- Upgraded the max-mode art pass with richer facade rooflines/porches, stepped mesa silhouettes, warmer dusty road material, route dust ribbons, and local light pools so the opening frame reads less like a prototype strip.
- Added a route-progress rail, transient beat feedback, slime combat cue/splash, and stricter road/light-pool material tuning so the opening plays with clearer rewards and less chalky debug-road wash.
- Added a compact 3D-route field map to the new Three.js slice so Boone's board, Smoke Cache, slime threat, wagon salvage, return path, and Old Road Survey upgrade read in the current art direction.
- Warmed and reduced GLB prop rim lighting in the shared asset loader so authored models keep ink edges without turning fence, plank, and facade surfaces into pale slabs.
- Added visual micro-payoffs for the first-road beats: Pearl's down-road cue, pulsing slime tell before aggro, Map Scrap reveal, and a changed Boone board state after return.
- Extended the 3D debug API with composition, lighting, beat-visibility, and route-frame capture probes.
- Hardened `spike_compare` against giant foreground blockers, overcooked dusk lighting, premature encounter visibility, and missing staged beat frames.
- Expanded the Three.js first-road slice into a paced Dustward route: spawn, Boone board choice, marshal road sign, town-edge bark, Smoke Cache clue, slime tell, slime fight, wagon salvage, return to Boone, and Old Road Survey teaser.
- Added a local board-choice model with three options and follow-up objective copy.
- Generated and registered a Blender recovery kit: upgraded Boone board, road planks, lamp variants, saloon facade, wagon salvage, mesa silhouettes, and slime-tell props.
- Reworked the opening route layout into a longer S-road with wider road planes, marsh reveal, route lamps, authored plank dressing, and route metrics enforcing a 4-6 minute target.
- Changed the 3D controller toward click-focus pointer-lock, Escape release, one-button camera reset, and camera wall avoidance against major world proxies.
- Hardened the render3d smoke/comparison gates for route metrics, player visibility, HUD footprint, road readability, and overbright highlights.
- Added named 3D camera presets for exploration, town, inspection, and objective focus.
- Tuned the default exploration camera to a third-person RPG range so the road, player, and Boone's board fit in the same playable frame.
- Smoothed third-person follow motion with deterministic camera-pose helpers covered by Vitest.
- Added a subtle player ring and overhead marker to keep the character readable against town geometry.
- Added in-world Boone board guidance: target ring, floating pointer, and road beads from spawn to the objective.
- Added conservative foreground fading for props that sit between the camera and player.
- Preserved existing walk/run speeds and input math to avoid widening the gameplay blast radius.

Validation target:

```bash
npm test
npm run typecheck:ts
npm run test:syntax
npm run dev:lint
npm run build
WESTWARD_URL=http://127.0.0.1:5180 npm run test:render3d
WESTWARD_URL=http://127.0.0.1:5180 node scripts/spike_compare.mjs
```
