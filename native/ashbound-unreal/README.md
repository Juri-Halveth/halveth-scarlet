# ASHBOUND — native Windows game candidate

## Mirror Encounter: one scene, several views

The native `MirrorEncounter` map is a small, synthetic perspective lab. One
room contains three coloured objects, an occluding partition, a living luminous
butterfly with four flapping wings, and a swivel mirror. The same butterfly
follows a bounded 3D path and appears directly and in the mirror; its glow
changes over time. Walk with WASD and mouse; hold **Q** or **E** to turn the mirror up to
45 degrees in either direction. Observe which object is visible directly,
through the mirror, or hidden by the partition. This tests camera-relative
visibility and reflection without duplicating the underlying object. It is a
separate game map, not a change to the accepted Chapter I story.

After a fresh build, open it with
`& .\native\ashbound-unreal\play-mirror.ps1 -PackageRoot '<local package directory>'`.
The package also contains `Start-MirrorEncounter.cmd`. The authoring step in
`bootstrap.ps1` creates this map after the Genesis landscape. The optional
Development-only `-ashboundmirrorqa` switch writes two synthetic screenshots
at zero and 30 degrees to the project's `Saved/Screenshots` directory.
Planar reflection needs the global clip-plane renderer setting included in
this project. The mirror captures an additional scene view at 50% screen
percentage, so its frame-time cost must be measured in the packaged game.
`Start-ASHBOUND-Stabil.cmd` is an optional whole-game fallback that starts
the default Prologue and keeps the same shadow setting for the session. It
does not replace the normal game launcher or reduce rendering across every
map by default. Short 1440p runs of Prologue and GenesisWorld without the
fallback stayed alive for 25 and 30 seconds respectively; longer play still
needs checking.
`package.ps1` checks for the first-person Enhanced Input configuration before
building. Without the template's `DefaultInput.ini`, the room can render while
WASD and mouse input fail, as happened in the first QA package.
The first 2560 × 1440 interactive test of the butterfly build ended in a DX12
`DXGI_ERROR_DEVICE_HUNG` GPU crash after about seven seconds. A previous
offscreen QA process was still running at the time; its contribution to the
crash is unknown. After stopping all QA processes, the normal mirror settings
ran for 30 seconds offscreen and 30 seconds windowed without a GPU crash.
Earlier shadow-disabled tests also retained the planar reflection. The normal
launcher therefore keeps the visual settings; `Start-MirrorEncounter-Stabil.cmd`
and `-StableShadows` on `play-mirror.ps1` are optional fallbacks. One short
survival test does not establish long-session stability or driver root cause.
`qa-mirror-runtime.ps1` runs the actual packaged game binary for a bounded
offscreen interval, refuses to overlap an existing process from that package,
and stops only the process it started. This avoids testing only the root
launcher while a child game keeps rendering.

This lab uses no original video frame, face, voice, transcript, or licensed TV
image. A reflected view is an observation of the room, not a second actor or
independent witness. It does not yet implement a phone view, multi-observer
replay, relationship history, or a user-authored encounter; those require
their own state and interaction design.

The separate **GenesisWorld** landscape candidate can be opened with
`& .\native\ashbound-unreal\play-genesis.ps1 -PackageRoot '<local package directory>'`.
`-Width` and `-Height` select the display resolution. The native default is
**Very High**: 100% internal resolution, Epic view distance, textures, foliage,
shading and landscape, with High shadows, global illumination, reflections and
effects. `-Quality Epic` restores those four groups to Epic for this session;
the packaged `Start-GenesisWorld-Epic.cmd` does the same. The ordinary
`Start-GenesisWorld.cmd` uses the default. The older `-Lighting Balanced`
experiment disabled dynamic global illumination and measured *slower* than
Epic in its 2026-10-16 test, so it is no longer offered as a quality preset.
In a new stationary offscreen 2560 × 1440 comparison on 2026-10-19, the
foliage-fade candidate measured about 37 FPS with the previous all-Epic
settings and about 40 FPS with the four-group Very High selection. This short
sample does not establish a moving-world average. The current render is greener
but still falls short of a dense wildflower meadow: flowers, canopy and
near-ground variation remain sparse, and plant silhouettes repeat visibly.
The Genesis landscape now crossfades from the close meadow photo to a
kilometre-scale aerial ground photo as camera distance increases, leaving
connected moss and exposed-earth regions visible on remote hills. A fresh
Development package passed shader-cook and packaged runtime QA on 2026-10-19;
the fixed 1440p entry view stayed near 40 FPS in six five-second samples.
This improves ground colour breakup, but the far tree line and hill silhouettes
still need dedicated distant geometry and moving-camera evaluation.

ASHBOUND is an independent first-person Unreal Engine 5.8 game in development. This local Windows build has a walkable ash valley, a ruined archive, three spell schools, three readable 3D books and a three-seal passage into the fort. Chapter I now starts with an in-world witness: speak to her, read Ilyra's book, awaken the three seals, cross the gate and reach the fort. A small HUD and **J** journal show the current goal without hiding the world. The witness conversation, charged seals and chapter completion are saved and reconstructed when the game starts again. Reaching the fort closes this opening chapter. It runs as a native EXE with DX12/SM6, Lumen and virtual shadow maps. The browser research pages are separate from this game.
The local reference profile starts at the Very High mix described above and 100% internal render resolution. **2560 × 1440 is the current visual performance target, not a resolution cap.** Higher display resolutions remain selectable through launch arguments and game-user settings. Their frame rates and image quality need separate measurements on the target hardware.
On the reference PC (Ryzen 7 9700X, RTX 4070 SUPER, 61.6 GiB RAM), an earlier packaged Development candidate rendered the archive gate view offscreen at 2560 × 1440, Epic quality and 100% internal resolution: 540 sampled frames after warm-up had a 10.90 ms median and 12.36 ms 95th-percentile frame time. That historical Chapter I sample is separate from the Genesis measurements above; neither stationary sample guarantees moving-world frame rate.

![The in-world ASHBOUND grimoire in the native EXE](art/grimoire-preview.png)

The central passage follows a sculpted and rutted collision mesh rather than a flat cube. The valley is carved beneath the playable lane, so its collision surface no longer covers the ruts. Portal bases, seals and large stones sample that same triangulated ground reference; large props use a footprint rather than only their centre. Low rubble and wind-displaced ferns break up the road shoulder. The genesis light sits on a stone source, and pressing **B** produces short-lived light traces on nearby ground and two fern islands. The remaining visual ground-contact and progression observations are recorded in [WORLD_CONTACT.md](WORLD_CONTACT.md). These visual effects are session-bound; arbitrary world-state persistence and gradual material weathering are still future work.

Move with WASD and mouse; Space jumps. The witness stands left of the road before the western archive portal; face her and press **F** to speak. Press **J** to show or hide the journal. Cast Resonance with **Q**, Ember with **E**, and Reweave with **R**. Press **B** near the entrance to pulse the genesis core: three coloured traces emerge briefly from the grounded source. Face an archive book and press **F** to read or turn its page; **Escape** leaves the reading view. Aim at the loose metal dagger beside *Kaels Uhrschrift* and press **M** to draw it toward your view; press **M** again to release it to gravity. Books and desks are not magnetizable. The three volumes use the existing ASHBOUND texts from `forschung/ashbound/play/books.mjs`. Each has a distinct learned effect: Ilyra extends Ember light from 24 to 60 seconds, Neral extends the Resonance echo from 18 to 45 seconds, and Kael lets Reweave growth persist for the current session. Learned volumes are saved locally and restored when the game starts again. Reweave grows a nine-frond grove over 2.2 seconds; the oldest grove is recycled after 24 casts so growth stays responsive. Match the three coloured archive seals to the three spells to raise the east gate. Flying spells resolve at their first blocking impact and produce light, echoes or growth in the 3D world.

After meeting the witness, face her nearby and press **T** for one optional locally generated line. This sends only the current chapter stage, number of studied books, archive decision and fungal-home vitality to a locally running Ollama `qwen2.5:14b` at `127.0.0.1:11434`; no model or service is bundled with the EXE. The request is asynchronous, and an authored line appears if Ollama is unavailable or returns an invalid response. Generated lines are transient dialogue, not saved game facts or new quests. The first fungal home near the archive path changes its shape and light with vitality; Reweave nurtures it when cast nearby.

Continue east beyond the fort to enter the expanding wilderness. The native runtime creates and unloads deterministic 128-metre terrain cells with grounded rocks, trees, ferns and grass while keeping nearby cells active. This is a traversable terrain foundation, not a populated open-world campaign: the wilderness has no settlements, NPC schedules, authored quests or saved player position yet.

## World rebuild

The separate FoundationLab experiment was rejected after visual review: coarse
generated terrain and near-uniform ground texturing read as a flat painted
surface despite 3D collision. Its code and active build entry have been removed.
`/Game/ASHBOUND/Maps/RebirthGrove` is a separate Unreal Landscape and World
Partition candidate, authored from the engine's Open World template. It uses a
world-space 2K ground material and ground-traced instanced habitat. It is included
for native visual QA, but the default playable Chapter I map remains Prologue.
The RebirthGrove screenshot is a development observation, not approval of the
art direction, 5 × 5 km coverage, a finished open world or target performance.
Its current vegetation, terrain composition and object materials still need
substantial art work before it can replace the Chapter I scene.
After bootstrapping, run `& .\native\ashbound-unreal\play-rebirth.ps1 -WorkRoot '<your empty build directory>'`
to enter this landscape directly in the native first-person runtime. The current
packaged Development EXE can be opened with the same script using
`-PackageRoot '<your package directory>'` instead of `-WorkRoot`.
The current
scene has ground collision and a short, grounded habitat near the spawn; it does
not yet carry the Chapter I quest, a 5 × 5 km authored world, digging, or saved
world state. The visual QA screenshot is generated locally by the optional
`-ashboundshot` Development argument.

`GenesisWorld` has an experimental soil and daylight model. Its 5.04 km
Landscape is sampled for height and slope; a deterministic profile estimates
organic cover, mineral depth, bedrock depth, moisture, annual noon exposure
and root capacity. Regional rainfall, altitude and aspect affect where rocks,
grass, ferns, shrubs, flowers and trees can grow. A year/day/24-hour clock
rotates the map sun; one game hour lasts one real minute. The sparse HUD shows
date/time and the profile under the player. Development runs can choose a
start with `-ashboundyear=2 -ashboundday=355 -ashboundhour=12`.
The ground material sketches the surface transition between cover, soil and
exposed rock. These are modeled strata beneath a Landscape heightfield, not
diggable 3D geology. Existing vegetation does not yet regrow when a season
changes, and the climate values are a fictional art model, not weather data.
The current meadow pass adds a bundled generated ground albedo, a 10-metre
streamed foreground grass/flower tier and a noon starting light. Plant
placement remains grounded in soil, moisture and slope; the former absolute
world-Z density penalty was removed because map height is not a biome.
The generated `source-art/meadow_carpet_v1.png` is project-specific art, not
one of the hash-verified Poly Haven downloads. The photographed meadow used
as a visual reference is not distributed with the game.

## Build locally

Windows x64 needs Unreal Engine 5.8 with its first-person Blueprint template and high-content template resources, a Visual Studio C++ toolchain, Node.js, Python 3 with Pillow, and space for the generated project. From the repository root in PowerShell:

```powershell
& .\native\ashbound-unreal\bootstrap.ps1 -EngineRoot 'C:\Program Files\Epic Games\UE_5.8'
& .\native\ashbound-unreal\package.ps1 -EngineRoot 'C:\Program Files\Epic Games\UE_5.8'
& .\native\ashbound-unreal\verify-package.ps1
```

`bootstrap.ps1` creates a fresh, isolated Unreal project; `package.ps1` cooks a Windows Development build into a fresh output directory. They accept `-WorkRoot`, and the packaging script accepts `-OutputRoot`. Existing project or output paths are refused. The build verifies 61 downloaded Poly Haven source files against SHA-256, size and URL entries in `asset-manifest.json`; the sources are [CC0](https://polyhaven.com/license). The book's paper and leather images in `art/materials/` were generated specifically for this project. Page art is typeset from the project's existing stories using Libre Baskerville (`art/fonts/OFL.txt`). Epic template assets come from the local engine installation. Generated `.uasset` files and executable packages stay outside Git.
Pass `-Configuration Shipping` to `package.ps1` for a player-facing package without the Development QA switches.

The native source lives in `Source/`, world authoring and asset import in `tools/`, and renderer settings in `Config/`. The current play area is a vertical slice: it saves acquired book knowledge and Chapter I facts, but does not yet persist arbitrary world changes, character position or inventory. NPC AI, a full open world and final character animation are still missing. The witness is a scripted stone character for the opening; future characters need behavior, animation and authored dialogue. Frame measurements for one scene and this PC do not establish a stable frame rate for a completed game; the current run record is kept with the local build, not presented as a universal hardware requirement.

The bootstrap reopens the saved level and checks terrain, portal collision and surface-texture settings in `world_assets_verified.json`. OpenGL normal maps flip their green channel for Unreal; roughness maps use linear mask compression. `verify-package.ps1` runs a packaged Development build with a null renderer and checks terrain traces, player-sized Pawn sweeps through the archive doorway and against its stone sides, spell material and three world-effect receipts. That probe does not measure FPS or replace a visual play test.
