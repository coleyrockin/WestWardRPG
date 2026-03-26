# WestWardRPG

![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=flat&logo=javascript&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-Atmosphere-3178C6?style=flat&logo=typescript&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-Canvas-E34F26?style=flat&logo=html5&logoColor=white)
![Python](https://img.shields.io/badge/Python-Tools-3776AB?style=flat&logo=python&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-Tests-6E9F18?style=flat&logo=vitest&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-E2E-2EAD33?style=flat&logo=playwright&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat)

A chaotic first-person western RPG in the browser with raycast rendering, sword duels, quest progression, dynamic weather, and a pig outlaw posse running the town. Built with plain web tech — no frameworks, no engine, just transparent game logic.

---

## Features

- **Raycast 3D renderer** — framework-free first-person view with textured walls and sprites
- **Melee combat system** — combo swings, block timing, stamina pressure, and enemy AI
- **Full quest loop** — gather, fight, craft, and build your house
- **Dynamic atmosphere** — day/night cycle with weather states (rain, fog, clear)
- **Pig chaos** — eight named outlaw pigs with boid-flocking AI, stampede triggers, and pickpocketing
- **Save/load + autosave** — persistent progress for longer play sessions
- **Multi-language support** — English, Español, Português, Français, Deutsch, Italiano, 日本語, Türkçe
- **Deterministic test automation** — JSON-driven action scripts for CI validation

## Tech Stack

| Category | Technologies |
|----------|-------------|
| **Core Engine** | JavaScript ES6+, HTML5 Canvas |
| **Typed Modules** | TypeScript (atmosphere math) |
| **Scripting** | Python (balance tuning, test harness) |
| **Build Tools** | Shell, Ruby (bundler), Perl (log analysis), PHP (config generator) |
| **Testing** | Vitest, Playwright E2E, JSON action scripts |
| **Deployment** | Static HTML — no server required |

## Getting Started

```bash
# Clone the repository
git clone https://github.com/coleyrockin/WestWardRPG.git

# Navigate to the project
cd WestWardRPG

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open the printed local URL to play. No build step required for the base game — just open `index.html` in a browser.

## Controls

| Action | Key |
|--------|-----|
| Move | `W` `A` `S` `D` |
| Look | Mouse |
| Attack | Left click |
| Block | Right click / `Shift` |
| Interact | `E` |
| Inventory | `I` |
| Quest log | `Q` |
| Save | `F5` |
| Load | `F9` |

## Project Structure

```
WestWardRPG/
├── src/               # Core game modules (rendering, combat, AI, quests)
├── scripts/           # Dev tools (Shell, Python, Perl, PHP, Ruby)
├── test-actions/      # Deterministic JSON test scripts
├── tests/             # Vitest and Playwright test suites
├── docs/              # Technical documentation
├── index.html         # Game entry point and HUD
├── atmosphere.ts      # Typed atmosphere math module
└── package.json       # Dependencies and scripts
```

## Code Language Variety

| Language | Purpose |
|----------|--------|
| **JavaScript** | Core game loop, rendering, combat, AI, save/load |
| **TypeScript** | Typed atmosphere math module |
| **Python** | Balance tuning and test harness |
| **HTML5 / CSS** | Canvas shell, HUD, responsive overlays |
| **Shell** | Dev automation and build tooling |
| **Ruby** | Asset bundler |
| **Perl** | Log analysis and statistics |
| **PHP** | Web server config generator |
| **JSON** | Deterministic test-action scripts |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT License — see [LICENSE](LICENSE).

---

*Built with vanilla JavaScript, HTML5 Canvas, and a whole lot of pig chaos.*
