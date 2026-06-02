# Slime Fight → Real-Time Melee Combat + Juice (Vertical Slice 1)

**Status:** Approved (design). **Branch:** `claude/slime-combat-juice`. **Date:** 2026-06-01.

## Context
The 3D game is now beautiful and persistent (ironman save/death shipped). To make it *feel* like
a great game, the core encounter must feel great. Today the 3D slime fight is shallow: walk up,
press E three times (instant, can't miss), and the slime bleeds your HP by proximity. No swing,
no dodge, no enemy movement, no shake, no particles, no sound.

A full combat/juice/audio stack already EXISTS but only in the legacy 2D Canvas path and is 100%
disconnected from the 3D renderer: `enemyArchetypes.js` (7 enemy types + windup/dash/kite AI),
`audio.js` (Web Audio synth music + combat tension), `gameFeel.js` (hit-stop), `particlePool.js`,
`combatAccessibility.js` (SFX cues), plus screen shake / camera kick / hit-stop / animated damage
numbers in `main.js`. The 3D `animationHelpers.js` already has `hitFlash`, `stagger` (knockback),
`deathCollapse`.

**This slice** = build real-time action melee + the visual/kinetic juice layer on the ONE slime
fight, reusing the pure logic that exists where it helps. **Audio is the next slice** (decided).
Enemy variety is a later slice. The work establishes reusable combat primitives (attack state
machine, dodge, slime AI, hit-fx) that later slices build on.

## Goal / non-goals
**Goal:** the slime fight becomes a real-time action encounter that feels incredible — aim + swing
(whiffable), dodge-roll with i-frames, a slime that moves/telegraphs/lunges, and full juice
(hit-stop, shake, knockback, flash, particles, damage numbers, HP bar).

**Non-goals (deferred):** audio (next slice); enemy variety / multiple enemies (later); mouse-aim
reticle beyond facing; combat for any encounter other than the road slime; reworking the 2D Canvas
combat.

## Control scheme
- **WASD** move, **mouse** look/aim (existing) — you aim the swing with your facing (`player.yaw`).
- **Left-click (or E)** = swing. E keeps the existing "Strike" prompt meaningful; left-click is the
  action feel. (First click may be consumed acquiring pointer lock — acceptable.)
- **Space** = dodge-roll (new).
- E still = interact (board/NPCs) outside `slime_fight`. Hotbar 1/2/3 stay decorative for now.

## Components (isolation-first)

### `src/render3d/combat/playerCombat.js` (NEW, pure, tested) + `.d.ts`
Attack state machine: `ready → windup(~0.12s) → active(~0.10s, hitbox LIVE) → recovery(~0.18s) →
ready`. Whiffable: if the forward hitbox (a ~2.2u cone from `player.yaw`) doesn't overlap the slime
during *active*, no damage and you eat recovery. One hit registers per swing (no multi-hit).
API: `createPlayerCombat(opts)` → `{ tryAttack(), update(dt), get phase, get isHitboxLive,
get isAttacking }`. Pure (no Three.js). Hitbox overlap test is a pure helper
`hitboxHitsTarget(playerPos, yaw, targetPos, {range, halfAngle})`.

### `playerController.js` (EXTEND) — dodge-roll + i-frames
**Space** → ~0.35s roll: locked-direction burst at dodge speed, collision-aware via the existing
proxy movement; i-frames for the first ~0.22s. Add `dodge` to the input state + Space to the keymap;
add a dodge timer to `stepPlayer` that overrides normal movement while rolling. Expose getters
`isDodging`, `isInvulnerable`, `dodgeProgress`. Procedural tuck (scale/lean) if no roll clip.

### `src/render3d/combat/slimeBehavior.js` (NEW, pure, tested) + `.d.ts`
Slime becomes a real enemy. Cycle: `idle → chase(move toward player) → telegraph(~0.5s windup:
squash+glow+color tell) → lunge(dash at player; contact = burst damage) → recover → chase`. The
telegraph is the player's dodge window; the lunge replaces the passive DoT as the lethal threat.
Pure step: `stepSlime({pos, state, timer}, playerPos, dt, tuning) → {pos, state, timer, contact,
telegraphT}`. Reuses `enemyArchetypes.js` slime windup/dash *tuning values*; AI loop written fresh
for 3D (x,z). Deterministic (no RNG, or seeded if needed).

### `encounterSystem.js` (EXTEND)
Consume `slimeBehavior.stepSlime` to drive `slimeMesh.position` each frame. Replace the proximity
DoT with **lunge-contact** damage (gated by `canDamagePlayer()` AND `!player.isInvulnerable`). Add
`registerHit()` — called by spike when a swing connects in the active window — applying the existing
3-hit damage + stagger/knockback + flash + death. Player still dies → `onPlayerDeath` → seal run
(unchanged). Keep `getState()` shape (adds nothing breaking; player HP fields already present).

### `src/render3d/combat/hitFx.js` (NEW; math pure+tested, Three.js bits thin)
- **Hit-stop:** a `createHitStop()` returning `{ punch(seconds), scale(dt) }`; spike multiplies loop
  `dt` by `scale()` (≈0.05 for ~0.07s, then restore).
- **Camera shake:** trauma model `{ addTrauma(t), sample(dt) → {x,y,z,yaw}}` (trauma² offset, decays);
  applied to the follow-cam after positioning. Pure math, tested.
- **Hit-flash decay:** fix the no-decay `hitFlash` so emissive pulses then lerps back over ~0.18s.
- **Particle burst:** bounded pool of ~24 **regular meshes with own materials** (NOT `THREE.Points`/
  Instanced — they don't render on the WebGL2 fallback, per project memory). `burst(pos, count,
  color, speed)` + `update(dt)`; recycled. Goo on hit, bigger on kill.
- **Post pulse (kill only):** brief `exposure`/`vignette` bump via the existing post uniforms.

### HUD — `spikes/render3d.html` (EXTEND) + spike wiring
- **Player HP bar** bound to `encounter.getState().playerHp / playerMaxHp` (reuse a Codex HUD HP
  element if present; else add `#player-hp`).
- **Floating damage numbers:** pooled DOM spans positioned by projecting the slime world pos via
  `camera.project` (backend-safe); "−1 / HIT / SLAIN" with ease-up + fade.
- **Combo counter** (consecutive connects, light) + brief **hitmarker** center-flash on connect.

## Wiring (`spike.js`)
Create `playerCombat`, `hitFx`; wire **Left-click/E → playerCombat.tryAttack()**, **Space → dodge**
(via controller). Each frame: `playerCombat.update(dt)`; during the active window test the hitbox vs
the slime → `encounter.registerHit()` + juice (hit-stop, shake, knockback, flash, particles, damage
number, combo, hitmarker). Drive slime AI via `encounter.update(player.position, visualCapture ? 0 :
dt)`. Apply `hitStop.scale(dt)` to the loop dt; apply camera shake to the follow-cam; update HP bar /
damage numbers / combo. Kill → post pulse.

## Determinism (golden-safe — non-negotiable)
ALL combat + juice gated behind the existing `visualCapture` switch. Key: `encounter.update(...,
visualCapture ? 0 : dt)` freezes the slime at placement in the golden frame; hit-stop, shake,
particles, post-pulse, and combat input all bypass under `?visual`. The golden capture is a fresh
spawn-phase scene with the slime at rest → **0.01% gate stays green, no re-baseline**.

## Testing
- Unit: `playerCombat` (windup/active/recovery timings, whiff vs connect, one-hit-per-swing,
  `hitboxHitsTarget` geometry); `slimeBehavior` (chase→telegraph→lunge cycle, contact detection,
  determinism); `hitFx` shake/hit-stop math; dodge i-frame window.
- Integration: swing damages only during the active window; dodge i-frames negate a lunge; slime dies
  in 3 hits; player death still seals the run.
- Gates: golden gate + render3d loop smoke stay green; ~15–20 new tests; typecheck/build clean.

## Untouched
Beauty render path (post/timeOfDay/ground/townsfolk/water), the persistence layer, the golden frame.
The slime fight transforms; everything else is invariant.

## Open implementation checks (resolve in the plan, not blocking design)
- Does `character.glb` expose an `attack`/`draw` clip? If yes, use it for the swing; else procedural.
- Is there an existing HUD HP-bar element (Codex)? Reuse it; else add one.
- Exact `enemyArchetypes.js` slime tuning values to seed windup/dash.
