# ASHBOUND — eigene Spielwelt

ASHBOUND is a standalone browser game world inside the Scarlet website. The
six-place expedition has its own residents, decisions, routes, persistent
world state and three possible island outcomes. The Ink chronicle now follows
the same six original residents; the equality quest remains separately playable.
This build does not alter an installed game or its saves.

## Included

- Six original procedural Three.js locations, orbit/zoom and keyboard controls.
- A travelling player figure follows connected routes; local decisions light
  beacons and roads, change the gate and colour the completed world.
- Six residents offer two revisitable choices each. The gate choice becomes
  available after the other five places have been shaped. The resulting world
  is wandering, sheltering or woven, depending on the six choices.
- Six Ink chapters, 108 complete decision paths and three possible endings.
- German and English UI, story and six original books.
- All currently listed Scarlet profiles from the source registry, search and up to three companions.
  Those optional archive guests are separate from the original ASHBOUND cast.
  Companions expose their documented perspectives; they are not live AI agents.
- FREEZE teaching models for paused simulation time, braking and restoring speed.
  Newtonian constant gravity, no drag, downward initial velocity; not a full
  collision model or physical energy transfer.
- FORTUNA probability simulation with explicit p, count and deterministic seed.
  The xorshift generator is educational and is not a gambling RNG or a guarantee.
- Local save, step-back, language-preserving decisions, import and export.
- A journal view keeps unresolved places visible, lists saved decisions and
  shows roads whose two endpoint places have both been shaped. This applies
  the user-supplied conceptual Brain Patch 001 (SHA-256
  `f2a089492c86385c687dbf1342448bf9be576089e5fb6bfd3cf40b38b736ecc7`)
  to local game state; it makes no external research or autonomous-brain claim.
- Reduced motion, capped rendering, no autoplay sound, no keys or analytics.

The original chronicle and books use ASHBOUND residents, places and events.
Legacy franchise names have been removed from that narrative; archive guest
profiles remain separately labelled. Assets from other games are not
redistributed. Real-world research and private attachments are excluded.

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
companion IDs, read-book indices, quest progress and expedition decisions.
Older valid saves receive a fresh expedition without losing their earlier
choices. Language uses `ashbound-language`.
Neither field contains identity or account data. Save import is size-bounded,
schema-checked and replayed through Ink before replacing the current state.
Malformed imports leave the current state intact. A rejected local save is
retained under a unique `ashbound-recovery-<time>` key and remains downloadable
as its exact original text. If that backup cannot be written and read back,
automatic saving is suspended so the original is not overwritten. Clearing
browser data removes local saves and recovery copies; export before clearing.

Story load failures expose a retry action and keep undo disabled. The six-place
expedition can still be played and saved if the Ink chronicle fails to load.
Both compiled languages are checked before chronicle play. WebGL loss leaves
the text interactions usable and restoration resumes the renderer without
reloading the page or losing choices.

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
