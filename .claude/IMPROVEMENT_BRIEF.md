# Roadmap Improvement Brief — WestWardRPG

The existing `docs/roadmap.md` already covers 14 Pillars (4 shipped, 10 planned) with file paths and acceptance signals. **Do not duplicate that work.** Append only what's genuinely missing.

## Sections to add (append after Pillar 14, before Verification Gates)

### Pillar 15 — Code Findings (from source)
Read `src/main.js`, `src/companion.js`, `src/decisionEngine.js`, `src/saveMigration.js`. List up to 10:
- Concrete bugs (file:line)
- Perf hotspots not already in pillars
- Dead code / unreferenced exports
- TODO/FIXME/HACK not in roadmap
- Save schema fields written but never read

### Pillar 16 — Onboarding & First-Run
Currently no first-run plan. Define:
- First 90 seconds: what splash → tutorial → first-fight loop should feel like
- Skip-to-content for returning players
- Demo mode for embed/share scenarios
- Acceptance: a non-RPG player reaches their first kill in ≤2 minutes

### Pillar 17 — Save Resilience
- Corruption recovery: when JSON parse fails, what fallback?
- Auto-backup rotation (last 3 saves, named by timestamp)
- Save export/import for cloud-less portability
- Schema version mismatch UI (don't silently drop fields)

### Pillar 18 — Telemetry & Playtest Data
Currently zero analytics. Define:
- 5 events: `run_start`, `chapter_advance`, `boss_kill`, `run_end (cause)`, `setting_changed`
- Privacy-respecting destination (Vercel Analytics / self-hosted)
- "Successful run" defined numerically (chapter reached × time-to-completion)

### Pillar 19 — Distribution
- Itch.io build target (zip with offline `index.html`)
- Steam-Web wrapper feasibility
- Embed mode (`?embed=1` strips chrome for partner sites)
- Discoverability: itch tags, Steam page draft, devlog cadence

### Pillar 20 — Mod / UGC Hooks (stretch)
- Quest definition JSON schema (already data-driven — formalize and document)
- Custom region pack format
- Skin pack format (palette + sprite overrides)
- No code execution; data-only mods

## Constraints
- Append-only. No rewrites of existing pillars.
- Each new pillar 5–15 lines. Total <200 lines.
- Don't bump save schema (Pillar 11 owns v4).
- Keep `npm test` and `npm run test:smoke` green; docs-only.
- Single commit: `docs(roadmap): add Pillars 15-20 (code findings, onboarding, save resilience, telemetry, distribution, mods)`. Push.
