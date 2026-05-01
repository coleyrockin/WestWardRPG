# WestWardRPG

![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=flat&logo=javascript&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-Atmosphere-3178C6?style=flat&logo=typescript&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-Canvas-E34F26?style=flat&logo=html5&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-Tests-6E9F18?style=flat&logo=vitest&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-E2E-2EAD33?style=flat&logo=playwright&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat)

Story-first frontier RPG built on a custom Canvas raycasting stack.  
No engine. No framework lock-in. Just readable systems code and a surprisingly deep game loop.

The flagship update adds chapter-driven narrative consequences, faction/NPC reactivity, enemy archetypes, visual mood profiles, and satirical world design inspired by *Animal Farm* power critique and cyberpunk systemic pressure.

## Preview

![Flagship Story Overview](docs/flagship-story-overview.svg)
![Flagship Systems Overview](docs/flagship-systems-overview.svg)
![Flagship NPC Cast](docs/flagship-npc-cast.svg)

## Table of Contents

- [Why This Project](#why-this-project)
- [What's New in Flagship Update](#whats-new-in-flagship-update)
- [Quick Start](#quick-start)
- [Controls](#controls)
- [Architecture](#architecture)
- [Developer Commands](#developer-commands)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Why This Project

- Demonstrates a complete game loop from first principles (rendering, combat, AI, quests, persistence).
- Keeps complexity transparent by using modular plain JavaScript files.
- Treats narrative as gameplay logic, not only dialogue flavor.
- Uses automated tests for core systems and progression logic.

## What's New in Flagship Update

- **Three-act story progression** (`act1` -> `act3`) persisted in runtime and save data.
- **Decision consequence engine** with thematic axes:
  - `controlVsFreedom`
  - `truthVsComfort`
  - `solidarityVsStatus`
- **Reactive cast system** where key NPC relationships and faction alignment shift from player actions.
- **Combat depth expansion** with archetypes (`slime`, `charger`, `spitter`, `brute`) and doctrine-based loadout/perk behavior.
- **Glass Gulch biome content** plus multi-step archive branch quest progression.
- **Visual profile pipeline** (chapter/weather-aware fog, shimmer, vignette) with runtime quality toggle.
- **Save migration to v2** with backward compatibility for v1 payloads.
- **Expanded test coverage** for decisions, combat loadouts, archetype behavior, and quest definitions.

## Quick Start

```bash
git clone https://github.com/coleyrockin/WestWardRPG.git
cd WestWardRPG
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

If port `5173` is already used on your machine:

```bash
python3 -m http.server 5183
```

Then open [http://localhost:5183](http://localhost:5183).

## Controls

- Move: `W` `A` `S` `D` or arrow keys
- Look: mouse (pointer lock) or `ArrowLeft` / `ArrowRight`
- Attack: left mouse or `Space`
- Block: right mouse or `C`
- Interact: `E` or `Enter`
- Use potion: `Q`
- Toggle map: `M`
- Toggle sound: `N`
- Toggle fullscreen: `F`
- Save / Load: `K` / `L`
- Recover after defeat: `R`
- Cycle visual quality: `V`
- Cycle combat stance: `Z`

## Architecture

```text
WestWardRPG/
├── index.html
├── src/
│   ├── main.js              # orchestration loop + rendering + input
│   ├── constants.js         # tuning constants and static system values
│   ├── math.js              # shared math utilities
│   ├── decisionEngine.js    # chapters, axes, choices, ending resolution
│   ├── combatLoadout.js     # combat doctrines, perks, stance effects
│   ├── enemyArchetypes.js   # enemy families and combat profiles
│   ├── questDefinitions.js  # data-driven quest metadata/state helpers
│   ├── visualProfile.js     # atmosphere/quality blending
│   └── storyContent.js      # flagship dialogue and narrative flavor text
├── atmosphere.ts            # typed atmosphere model source
├── atmosphere.js            # browser-consumable atmosphere build
├── tests/                   # vitest system tests
├── test-actions/            # deterministic scripted behavior checks
├── docs/                    # flagship diagrams/screenshots
└── package.json
```

## Developer Commands

```bash
# Local run
npm run dev

# Verification
npm test
npm run test:syntax
npm run typecheck:ts
npm run test:coverage
npm run test:smoke
npm run qa
```

## Troubleshooting

- **Wrong app appears on localhost**: another process is using `5173`; run on `5183`.
- **No audio at start**: click canvas first to unlock browser audio context.
- **`npm run dev:lint` failure mentioning `game.js`**: this script references older repo layout; use `npm test` + `node --check src/main.js` + `npm run typecheck:ts` for current validation.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

MIT License — see [`LICENSE`](LICENSE).
