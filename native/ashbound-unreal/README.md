# ASHBOUND — native Windows game candidate

ASHBOUND is an independent first-person Unreal Engine 5.8 game in development. This local Windows build has a walkable ash valley, a ruined archive, three living spell schools, a readable 3D book and a three-seal passage into the fort. It runs as a native EXE with DX12/SM6, Lumen and virtual shadow maps. The browser research pages are separate from this game.
The local reference profile starts at Epic scalability and 100% internal render resolution. Its display resolution follows the monitor; game-user settings can still be changed after first launch.
On the reference PC (Ryzen 7 9700X, RTX 4070 SUPER, 61.6 GiB RAM), a packaged Development build rendered the archive scene offscreen at 2560 × 1440, Epic quality and 100% internal resolution: 540 sampled frames after warm-up had a 12.67 ms median and 13.69 ms 95th-percentile frame time. This measures one stationary scene, not a moving foreground play session or a guaranteed frame rate throughout a larger game.

![The in-world ASHBOUND grimoire in the native EXE](art/grimoire-preview.png)

Move with WASD and mouse; Space jumps. Cast Resonance with **Q**, Ember with **E**, and Reweave with **R**. Face the book and press **F** to read or turn a page; **Escape** leaves the reading view. Studying it extends Resonance's echo from 18 to 45 seconds and lets Reweave growth persist for the current play session. Match the three coloured archive seals to the three spells to raise the east gate. The spells travel through the 3D world and produce light, echoes and growth at their destinations.

## Build locally

Windows x64 needs Unreal Engine 5.8 with its first-person Blueprint template and high-content template resources, a Visual Studio C++ toolchain, Python 3 and space for the generated project. From the repository root in PowerShell:

```powershell
& .\native\ashbound-unreal\bootstrap.ps1 -EngineRoot 'C:\Program Files\Epic Games\UE_5.8'
& .\native\ashbound-unreal\package.ps1 -EngineRoot 'C:\Program Files\Epic Games\UE_5.8'
```

`bootstrap.ps1` creates a fresh, isolated Unreal project; `package.ps1` cooks a Windows Development build into a fresh output directory. They accept `-WorkRoot`, and the packaging script accepts `-OutputRoot`. Existing project or output paths are refused. The build verifies 47 downloaded Poly Haven source files against SHA-256, size and URL entries in `asset-manifest.json`; the sources are [CC0](https://polyhaven.com/license). The book's paper and leather images in `art/materials/` were generated specifically for this project. Epic template assets come from the local engine installation. Generated `.uasset` files and executable packages stay outside Git.
Pass `-Configuration Shipping` to `package.ps1` for a player-facing package without the Development QA switches.

The native source lives in `Source/`, world authoring and asset import in `tools/`, and renderer settings in `Config/`. The current play area is a vertical slice: it has no NPC AI, save system, full open world or final character animation. Frame measurements for one scene and this PC do not establish a stable frame rate for a completed game; the current run record is kept with the local build, not presented as a universal hardware requirement.
