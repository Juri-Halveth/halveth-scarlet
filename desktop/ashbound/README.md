# ASHBOUND desktop candidate

This packages the existing ASHBOUND Three.js/Ink world as an offline Windows
application. It keeps the website as the source of the game. The desktop build
serves only the verified static site from its own `ashbound://game` origin;
Node.js is unavailable to the game renderer.

From `desktop/ashbound` on Windows:

```powershell
npm ci
npm run package:win
```

Extract or keep the complete `.local-qa/ashbound-desktop/ASHBOUND-win32-x64`
directory and start `ASHBOUND.exe`. The EXE depends on its sibling files. F11
toggles fullscreen. Local saves use this app's storage and do not automatically
import the browser version's saves; use the game's export/import controls to
transfer a save.

The packaged build is a candidate, not a Steam release. SteamPipe needs a
partner app ID and an accepted build. There is no live AI service in this
package; the present residents and outcomes are local game logic. Game and
third-party source notices are retained in the packaged site.
