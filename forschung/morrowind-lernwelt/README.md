# ASHBOUND Morrowind Learning World

Version 1.0.0 is an interactive, independent fan chronicle inside the existing
Scarlet website. It is not an OpenMW patch and does not alter installed games,
saved games, external websites, casino probabilities or operating-system state.

## Included

- Six original procedural Three.js locations, orbit/zoom and keyboard controls.
- Six Ink chapters, 108 complete decision paths and three possible endings.
- German and English UI, story and six original books.
- All 69 existing public Scarlet profiles, search and up to three companions.
  Companions expose their documented perspectives; they are not live AI agents.
- FREEZE teaching models for paused simulation time, braking and restoring speed.
  Newtonian constant gravity, no drag, downward initial velocity; not a full
  collision model or physical energy transfer.
- FORTUNA probability simulation with explicit p, count and deterministic seed.
  The xorshift generator is educational and is not a gambling RNG or a guarantee.
- Local save, step-back, language-preserving decisions, import and export.
- Reduced motion, capped rendering, no autoplay sound, no keys or analytics.

The fan chronicle changes motives and choices in an explicitly alternate story.
It is not presented as recovered Morrowind canon. Original books and game assets
are not redistributed. Real-world research and private attachments are excluded.

## Rebuild from PowerShell

```powershell
powershell -NoProfile -File .\tools\ashbound\BUILD.ps1
node --test tests/ashbound.test.cjs
node tools/build_site.mjs
node --test tests/*.test.cjs
python -m unittest discover -s tests -p 'test_*.py'
```

The pinned vendor bundle and compiled Ink stories are checked in, so normal
Pages deployment does not need npm. `tools/ashbound/package-lock.json` binds
build dependencies. `BUILD.ps1` uses npm ci with lifecycle scripts disabled.
The existing GitHub Pages workflow publishes the allowlisted site build.

## State and privacy

Local storage key `ashbound-save-v1` contains choice indices, selected location,
companion IDs and read-book indices. Language uses `ashbound-language`.
Neither field contains identity or account data. Save import is size-bounded,
schema-checked and replayed through Ink before replacing the current state.
Malformed imports leave the current state intact. A rejected local save is
retained under a unique `ashbound-recovery-<time>` key and remains downloadable
as its exact original text. If that backup cannot be written and read back,
automatic saving is suspended so the original is not overwritten. Clearing
browser data removes local saves and recovery copies; export before clearing.

Story load failures expose a retry action and keep undo disabled. Both compiled
languages are checked before play. WebGL loss leaves the story usable and
restoration resumes the renderer without reloading the page or losing choices.

## Verification boundaries

Unit tests exhaust both language branches and check model and state contracts.
Headless Chromium screenshots and canvas checks cover declared desktop/mobile
viewports, not every GPU, browser, screen or assistive technology. The existing
uninstalled OpenMW graphics candidate remains a separate native QA task.

`tools/ashbound/qa.cjs` covers layouts and main journeys;
`tools/ashbound/failure-qa.cjs` covers unavailable/malformed stories, pending
controls, rejected saves, failed backups, unavailable storage, absent/lost
WebGL and rapid animation restarts. Both use `CODEX_NODE_PACKAGES` for an
existing Playwright runtime and optional `ASHBOUND_CHROME` / `ASHBOUND_LIVE_BASE`.

## Sources and licences

- Renderer: https://threejs.org/ ; story runtime: https://github.com/y-lohse/inkjs
- Icons: https://lucide.dev/ ; individual notices in `vendor/`.
- Antimatter: https://home.cern/science/physics/antimatter/
- ALPHA-g: https://doi.org/10.1038/s41586-023-06527-1
- Existing profiles: ../../assets/universe-data.js
- New original contributions follow ../../LICENSE-HALVETH-PIRL-2.0.md.
  This is source-available code; third-party licences remain separate.
