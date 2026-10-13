# ASHBOUND native 3D technical demo

ASHBOUND is an independent first-person fantasy-world prototype built with Unreal Engine 5.8. The Windows technical demo opens inside a walkable, sculpted ash valley with a stone fort, animated ambient wisps, dynamic lighting and three castable visual spell schools. It is a native executable, separate from the browser-based ASHBOUND research page. The intended full game is still in development.

![ASHBOUND native valley](art/prologue-preview.png)

**Controls:** WASD to move, mouse to look, Space to jump, Q for Resonance, E for Ember, R for Reweave, Esc to leave the game. Spell orbs travel toward the player's aim point and change their light, colour and orbit by school. Resonance leaves a temporary echo beacon, Ember lights the destination, and Reweave grows a fern there. These are small, time-limited world effects, not a complete magic system. This preview does not yet contain NPC AI, quests, books, combat progression, a market, saves or a full open world. It is not an Elder Scrolls or Morrowind modification, and contains none of those games' assets.

## Build from source

Requirements: Windows x64, Unreal Engine 5.8 installed with its first-person Blueprint template and high-content template resources, Visual Studio C++ toolchain, Python 3, and network access to Poly Haven for the listed CC0 assets. The build needs substantial temporary disk space. The source tree intentionally excludes downloaded art, generated Unreal `.uasset` files, cooked content and binaries.

From the repository root in PowerShell:

```powershell
& .\native\ashbound-unreal\bootstrap.ps1 -EngineRoot 'C:\Program Files\Epic Games\UE_5.8'
& .\native\ashbound-unreal\package.ps1 -EngineRoot 'C:\Program Files\Epic Games\UE_5.8'
& .\native\ashbound-unreal\verify-package.ps1
```

`bootstrap.ps1` verifies the public asset manifest, checks and downloads 39 additional Poly Haven files against `asset-manifest.json`, copies Epic's installed first-person template content, compiles the native module and authors the 3D map in Unreal. It writes generated files below `.local-qa/ashbound-unreal` and refuses to overwrite an existing project. `package.ps1` cooks a Development Windows build to a fresh output folder and requires `-skipzenstore` on this tested UE 5.8 configuration. Both scripts accept an alternate `-WorkRoot`; `package.ps1` also accepts `-OutputRoot`.

The bootstrap now reopens the saved level and checks the terrain collision and surface-texture settings, writing `world_assets_verified.json` beside the other local receipts. The imported valley uses its triangles for simple collision because its default coarse box blocks empty canyon air. The two OpenGL normal maps flip their green channel for Unreal, and roughness maps are imported as linear masks. These settings are checked on the saved assets; their visual result and collision behavior still require a packaged runtime check.

`verify-package.ps1` launches the packaged Development game with a null renderer, waits for its collision and spell probes, then stops only that test process. It fails if the terrain visibility traces, Pawn capsule sweeps, spell material or three world-effect receipts are missing. The uniquely named runtime log stays in the local work folder. This probe does not render an image or measure FPS.

The scripted map, terrain and three living spell actors are in `tools/` and `Source/`. The 39 downloaded art files are bound by SHA-256, size and URL in `asset-manifest.json`; six other visual sources already in this repository are checked against the public web asset manifest. The additional art is [Poly Haven CC0](https://polyhaven.com/license). Epic's first-person template content is supplied by the local engine installation, not committed here.

## Verified preview scope

- Unreal editor C++ build succeeded on Windows with UE 5.8.
- The map authoring receipt recorded 567 world actors. A packaged Windows Development build completed successfully and launched locally.
- Saved-asset verification counted 41,472 triangles in terrain LOD0 and checked its complex-as-simple collision, enabled `BlockAll` terrain actor, and six terrain/stone textures. A packaged Development run with `-ashboundqacollision` passed four visibility traces and player-sized `ECC_Pawn` capsule sweeps against both outer slopes. The flag is compiled out of Shipping builds.
- A timed native capture showed the first-person 3D fort scene and a grown plant. The packaged runtime log showed a possessed first-person pawn, all three spell casts and each school's world effect. The screenshot above is from the native runtime, not a mock-up.
- The current packaged run also loaded `M_LivingSpell` and produced a fresh GPU screenshot after the texture-setting change. Keyboard Q/E/R input is bound in code. Manual end-to-end interaction for every school, continuous traversal across the full valley, frame-rate performance, longer play sessions, installer behaviour and accessibility have not yet been established.

The next game-development pass should deepen the consequences of each spell, add meaningful exploration and readable in-world lore. This preview establishes the native 3D renderer, controllable first-person traversal and an authored world that can be iterated without falling back to a flat arena.
