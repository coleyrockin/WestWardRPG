# Rustwater — Westward Vertical Slice (design + build plan)

**Game:** Rustwater · **Town:** Westward (small western, cyber edge). Approved direction
(owner, 2026-06-26): build a *small, dense, alive* town that proves world + gameplay feel — **story
and missions come after.** Companion to [`../SYSTEM_AUDIT.md`](../SYSTEM_AUDIT.md) + the one roadmap
[`roadmap.md`](roadmap.md). Fold + delete this doc once the slice ships (owner's one-doc rule).

## Goal (what we're proving)
Walk one detailed street → enter five buildings → meet five characters with backgrounds → watch NPCs
live → *do* things (drink/gamble/eavesdrop, take a bounty from a person, get patched + your first
augment, trade, sleep/stash) — and it stays **smooth**. If that's alive + fun + not laggy, the
foundation is proven and story/missions layer on top.

**Deferred (do NOT build yet):** the storyline, missions, the Executor arc, the wider open world.

## The one new system: loaded-interior architecture
The lag was never Three.js — it was *one giant always-rendered world*. Fix it AND start draining the
god-file by adding a small **`locationManager`** (new module, NOT in spike.js):
- Each location (street + 5 interiors) is **data**: spawn point, collision, NPCs, interactables.
- **Enter** a door → fade → tear down the street group, build that interior, drop the player in, swap
  collision + interaction targets. **Exit** → reverse, back at the door.
- You only ever render **one street OR one room** → each gets a fresh draw-call budget → detail is
  cheap, lag stays away. Save remembers `{ location, position }`.
- Two layers: `locationState` (pure: current id, enter/exit transitions — unit-tested) +
  `locationView` (the THREE binding: build/teardown groups, fade, reposition). spike.js only wires a
  door interactable → `locationView.enter(id)`.

## The five buildings — character · life · what you do
Names/backstories are PROPOSALS (owner canon — rename freely). Each interaction runs on an existing
engine: `dialogueModal` (built), `shopCatalog`, `jobBoard`, `gearCrafting`, `npcMemory`, `runSave`.

| Building | Character (background) | Ambient NPCs | Interactions |
|---|---|---|---|
| **The Rusty Spur** (saloon) | **Mabel Crane** — ex water-courier, salvaged iron arm, runs the bar on secrets | card players, piano, a drunk, an info-broker | drink · **gamble** (cards) · **eavesdrop** rumors · brawl (later) |
| **The Marshal's Post** (bounty/sheriff) | **Sheriff Boone Vance** — aging lawman, outdated badge-implant | a deputy, a cell occupant | **bounties from a person** · read the board |
| **Okafor's Clinic** (iron-doctor) | **Dr. Okafor** — ex-corp surgeon gone freelance augmetics | a patient on the table | **patch up** · buy your **first augment** |
| **Hale's Provisions** (store) | **Cole Hale** — nervous shopkeeper deep in water-baron debt | stock-boy, haggling customer | **trade** · supplies · money gossip |
| **The Cross house** (home) | *yours* — Ezra Cross's inherited place; Abram's things on the desk | quiet (maybe a caretaker) | **sleep** (save/rest) · **stash** gear · the anchor |

## Performance budget (the "not laggy" promise)
- Exterior: 5 facades + ~6 ambient NPCs + props, batched. Interior: one room + owner + 1–3 NPCs + props.
  **Never both.** Verify draw calls with `__westward3dStats()` at the street + each interior; each must
  sit comfortably under the M0 town ceiling. A heavy room can't drag the street down — it's isolated.

## Success criteria
Walk Westward, enter all five buildings, meet all five characters, do ≥1 real interaction in each, stays
smooth in a foreground browser — **and it makes you want to keep playing.** That's the green light.

## Build order (each = its own gate-green, golden-safe commit)
1. **`locationState` (pure, TDD)** — current id, enter/exit/guard transitions. No rendering. *Foundation.*
2. **`locationView` + the saloon, end-to-end** — door interactable → fade → minimal saloon room +
   Mabel → door-out → back on the street. Save remembers location. *Proves the whole loop.*
3. **The other four interiors** (reuse the pattern; minimal rooms + owners).
4. **The five characters + their interactions** (dialogue give/trade/gamble/augment/sleep on the
   existing engines).
5. **Ambient life** — NPCs doing stuff inside + a few on the street.
6. **Polish + perf pass** — draw-call check at every location, look pass, the alive-feeling tuning.

Golden-safety: interiors are hidden/torn-down in the dusk capture (street-only frame). Door props on
the existing facades are far enough from the dusk hero frame or verified per-commit. New logic is
unit-tested; new UI is `createElement`/`textContent` only.
