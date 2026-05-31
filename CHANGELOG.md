# Changelog

## Unreleased — first five-minute 3D opening polish

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
