# ASHBOUND desktop — first-person prologue

The Windows application opens the first-person ASHBOUND prologue directly. Walk
through the rocky sanctuary, cast three spatial spells, read three in-world books, find a
hidden relic and open the gate. The earlier six-place world and Ink chronicle
remain accessible from the game's menu. The desktop build serves the static
game from its own `ashbound://game` origin; Node.js is unavailable to the game
renderer.

From `desktop/ashbound` on Windows:

```powershell
npm ci
npm run package:win
```

Extract or keep the complete `.local-qa/ashbound-desktop/ASHBOUND-win32-x64`
directory and start `ASHBOUND.exe`. The EXE depends on its sibling files. F11
toggles fullscreen. Use WASD to move, mouse or J/L/I/K to look, Shift to run,
Space to jump, E to read or collect, 1/2/3 to cast, B for the inventory and
Escape to pause. The prologue saves locally under `ashbound-first-person-v1`;
it does not import the older expedition save or the browser's local save.

This is a playable prologue, not a complete open world or a Steam release.
The book pages and their reactions are authored game content, not live AI
generation. Game and third-party source notices are retained in the package.
Version 0.3.0 adds CC0 photogrammetry and PBR surfaces; its asset manifest is
bundled under `site/forschung/ashbound/play/assets/manifest.json`.
