# Changelog

## Unreleased — first five-minute 3D opening polish

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
