# Security Best Practices Report

## Executive Summary

WestWardRPG is a static browser game built with vanilla JavaScript/TypeScript, HTML, Canvas, and local developer tooling. No backend framework, authentication layer, payment flow, or server-side data store is present in the current app scope. This review used the vanilla frontend JavaScript/TypeScript guidance from the `security-best-practices` skill.

No critical or high-risk best-practice failures were found. The app does not use `eval`, `new Function`, string timers, `document.write`, `postMessage`, unsafe redirects, or secret-bearing storage. The main work is defense-in-depth hardening before future distribution, imported saves/mods, analytics, or optional dialogue providers add more trust boundaries.

## Scope And Stack Evidence

- Primary app: `index.html`, `atmosphere.js`, and `src/main.js`.
- Core language/framework: vanilla browser JavaScript/TypeScript, Canvas rendering, ES modules.
- Test/tooling: Vitest, TypeScript, Playwright client, local static server.
- Deployment helper: `scripts/config_generator.php` emits Nginx, Apache, and Caddy static-server snippets.

## Critical Findings

None.

## High Findings

None.

## Medium Findings

### SBP-001: CSP and Trusted Types are not visible in the app or generated deploy configs

- Rule ID: JS-CSP-001 / JS-CSP-002 / JS-TT-001
- Severity: Medium
- Status: Partially fixed for deploy configs.
- Location:
  - `index.html:4-21`
  - `index.html:730-755`
  - `scripts/config_generator.php:79-83`
  - `scripts/config_generator.php:116-120`
  - `scripts/config_generator.php:139-143`
- Evidence:
  - `index.html` loads remote Google Fonts and local scripts without an in-repo CSP.
  - `index.html:730-752` contains inline JavaScript for the controls disclosure.
  - Generated Nginx, Apache, Caddy, and Vercel configs now emit a practical CSP, `Referrer-Policy`, and `Permissions-Policy`, and no longer rely on legacy `X-XSS-Protection`.
- Impact: A future DOM XSS bug, compromised same-origin script, or accidental HTML sink would have fewer browser-level containment controls. This matters more as the roadmap adds imported saves/mods, optional dialogue providers, or distribution packaging.
- Remaining fix: Move the inline controls disclosure script into a same-origin module, then remove `'unsafe-inline'` from `script-src`. Keep Google Fonts explicitly allowed until fonts are self-hosted.
- Mitigation: If static hosting cannot set headers, place an early `<meta http-equiv="Content-Security-Policy">` before scripts/resources and document its limits. Do not rely on meta CSP for `frame-ancestors`, `sandbox`, or reporting.
- False positive notes: Production hosting might add CSP outside this repo. Verify the deployed headers before treating this as an externally exploitable gap.

## Low Findings

### SBP-002: `renderOriginPicker` used `innerHTML` for a static template

- Rule ID: JS-XSS-001
- Severity: Low
- Status: Fixed in the current working tree.
- Location: `src/main.js:892-908`
- Evidence: `renderOriginPicker()` now builds the origin-card name and summary spans with `document.createElement`, assigns text with `textContent`, and appends the nodes explicitly.
- Impact before fix: This was not attacker-controlled, so it was not an active XSS finding. It was still a parser sink that blocked clean Trusted Types adoption and could become risky if the template later interpolated origin data or mod-provided content.
- Validation: `tests/security-best-practices.test.ts` asserts that `src/main.js` does not contain `.innerHTML`, `insertAdjacentHTML`, or `document.write`.

### SBP-003: Third-party Google Fonts are loaded without pinning or SRI

- Rule ID: JS-SUPPLY-001 / JS-SRI-001
- Severity: Low
- Location: `index.html:15-19`
- Evidence: `index.html` preconnects to `fonts.googleapis.com` and `fonts.gstatic.com`, then loads a Google Fonts stylesheet.
- Impact: Third-party stylesheets/fonts add an external dependency to an otherwise local-first game. A provider outage, privacy policy change, blocked network, or compromised stylesheet path could affect load behavior or widen the app's external trust surface.
- Fix: For distribution builds, self-host the selected font files and CSS, or document the Google Fonts dependency and include it explicitly in the CSP `style-src`/`font-src`.
- Mitigation: Keep fallback font stacks, avoid third-party scripts, and treat external styles as the only approved remote asset class.
- False positive notes: SRI is awkward for Google Fonts because the stylesheet can vary by user agent. Self-hosting is the cleaner fix if the project wants stronger supply-chain control.

### SBP-004: Production runtime exposes test/debug globals on `window`

- Rule ID: FS-DOMC-001 hardening / secure surface minimization
- Severity: Low
- Location:
  - `src/main.js:7265-7272`
  - `src/main.js:7274-7292`
- Evidence: `window.advanceTime` mutates the simulation clock, and `window.render_game_to_text` exposes detailed state for smoke testing.
- Impact: In the current single-player static game, this is mostly a cheating/debug surface. If future analytics, achievements, cloud saves, competitions, or shared run exports trust browser state, same-origin script or browser-console access could manipulate or inspect state more easily.
- Fix: Gate these globals behind an explicit development/test flag, such as `?debug=1`, `localStorage` dev opt-in, or a build-time constant. Keep Playwright smoke support by enabling the flag in test launches.
- Mitigation: Document that browser state is never authoritative for future online or shared systems.
- False positive notes: These globals are useful for the current automation flow and do not cross a server trust boundary today.

### SBP-005: Legacy save migration copies raw localStorage data before normalized migration

- Rule ID: JS-STORAGE-001
- Severity: Low
- Location:
  - `src/main.js:2095-2102`
  - `src/main.js:2219-2223`
  - `src/saveMigration.js:150-161`
- Evidence: `readSaveData()` parses a localStorage value, checks only the top-level version, and immediately copies the raw legacy string into the v3 key with `migrateStorageValue()`. Normalized migration is applied later in `applySaveData()`.
- Impact: Browser storage is attacker-influenced. Current load code normalizes many values before use, so this is not a direct exploit. The risk is that malformed but version-valid storage can be preserved under the new key before the safer normalized shape exists, which makes future imported-save/mod work harder to reason about.
- Fix: Move legacy-key migration until after `migrateSaveToV3()` succeeds, then write the normalized v3 payload to `SAVE_KEY` instead of copying the raw legacy value.
- Mitigation: Keep save contents non-secret, reject malformed payloads, cap collection sizes during migration, and add corruption-recovery UI before save export/import ships.
- False positive notes: Current saves are local-only and non-secret; no auth token or session storage was found.

## Positive Controls Observed

- No `eval`, `new Function`, string-based timers, `innerHTML`, `document.write`, `postMessage`, or dynamic remote script loading were found in app runtime code.
- Query-string handling in `src/main.js:6813-6825` uses fixed allowlists for graphics toggles.
- User-visible text in the origin picker is written with `textContent` after the static template is created.
- Saves are local non-secret game state, and many loaded fields are clamped or normalized before use.
- Existing generated deploy configs include `X-Content-Type-Options: nosniff` and same-origin framing policy.

## Suggested Fix Order

1. Move or hash the inline disclosure script so the deployed CSP can avoid `unsafe-inline` for scripts.
2. Gate `window.advanceTime` and `window.render_game_to_text` behind an explicit debug/test flag and update smoke tooling.
3. Change legacy save-key migration to write normalized v3 payloads only after `migrateSaveToV3()` succeeds.
4. Decide whether to self-host fonts for distribution builds or document Google Fonts as an intentional external dependency.
