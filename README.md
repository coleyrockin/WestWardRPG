# WestWardRPG

![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=flat&logo=javascript&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-Atmosphere-3178C6?style=flat&logo=typescript&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-Canvas-E34F26?style=flat&logo=html5&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-Tests-6E9F18?style=flat&logo=vitest&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-E2E-2EAD33?style=flat&logo=playwright&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat)

Story-first western RPG in a single-page Canvas app. The flagship update adds chapter-driven narrative systems, major choice consequences, enemy archetypes, richer atmosphere profiles, and a satirical tone inspired by *Animal Farm* power critique and cyberpunk social pressure.

![Flagship Story Overview](docs/flagship-story-overview.svg)
![Flagship Systems Overview](docs/flagship-systems-overview.svg)
![Flagship NPC Cast](docs/flagship-npc-cast.svg)

## What's New in Flagship Update

- **Story-first structure**: three-act campaign state (`act1` to `act3`) tracked in runtime and saves.
- **Decision consequence engine**: major choices modify thematic axes, faction reputation, NPC affinity, and ending resolution.
- **Expanded NPC framing**: core cast now has layered motivations and reactive alignment shifts.
- **Combat depth bump**: enemy archetypes (`slime`, `charger`, `spitter`, `brute`) with behavior-specific profiles.
- **Visual mood tuning**: chapter/weather-aware fog, shimmer, and vignette profiles plus runtime quality cycling (`V`).
- **Data-driven quest scaffolding**: quest definitions moved into reusable registry with Glass Gulch archive nodes for multi-step branch completion.
- **Save migration**: save payload upgraded to version `2` with backward-compatible loading for version `1`.
- **Test expansion**: new Vitest coverage for decision logic, combat doctrine behavior, enemy archetype scaling, and quest registry progression.

## Feature Overview

- **Narrative Systems**
  - chapter progression and chapter HUD visibility
  - thematic axes (`controlVsFreedom`, `truthVsComfort`, `solidarityVsStatus`)
  - endings resolved from ideology outcomes, not only combat success
- **World and Quest Systems**
  - data-driven quest definitions
  - branching-style archive quest progression
  - faction/NPC consequence persistence in save data
- **Combat and AI Systems**
  - archetype-based enemy spawning and stats scaling
  - behavior-aware pursuit/attack profiles
  - weather-adjusted combat pressure
- **Visual and Atmosphere Systems**
  - atmosphere blend from typed weather model + mood profile
  - quality presets for cinematic vs performance
  - enhanced weather readability in HUD and overlays

## Getting Started

```bash
git clone https://github.com/coleyrockin/WestWardRPG.git
cd WestWardRPG
npm install
npm run dev
```

Open <http://localhost:5173/> and play.

## Run and Verification Commands

```bash
npm run dev
npm run test
npm run test:smoke
npm run test:coverage
npm run typecheck:ts
npm run dev:lint
npm run qa
```

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

## Project Structure

```text
WestWardRPG/
├── index.html
├── src/
│   ├── main.js
│   ├── constants.js
│   ├── math.js
│   ├── decisionEngine.js
│   ├── combatLoadout.js
│   ├── enemyArchetypes.js
│   ├── questDefinitions.js
│   ├── visualProfile.js
│   └── storyContent.js
├── atmosphere.ts
├── atmosphere.js
├── tests/
├── test-actions/
├── docs/
└── package.json
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT License — see [LICENSE](LICENSE).
