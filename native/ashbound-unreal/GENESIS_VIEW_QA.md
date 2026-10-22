# Genesis visual acceptance: bounded evidence

The default game remains Prologue. `GenesisWorld` is a separate prototype map.
Build and package it with the scripts in this directory, then inspect the
packaged game rather than an editor preview.

`qa-genesis-view.ps1` runs the real packaged EXE directly. It requests a
2560 x 1440 offscreen frame, checks the *actual screenshot dimensions*, saves
the frame and runtime log under `EvidenceRoot`, and stops only its own process.
For a second view, pass both `ShotX` and `ShotY`; the script also requires a
successful terrain hit and pawn move. A remote teleport is a view and collision
probe, not continuous traversal or a moving-frame-rate measurement.

```powershell
./qa-genesis-view.ps1 -PackageRoot C:\path\to\package
./qa-genesis-view.ps1 -PackageRoot C:\path\to\package -ShotX 180000 -ShotY -120000
```

## 2026-10-22 comparison on the reference PC

The same freshly packaged source head (`69a4bea`) at the stationary entry
view produced an actual 2560 x 1440 screenshot and two post-load five-second
samples at 45.3 and 45.6 FPS. At `(180000, -120000)` the terrain probe hit,
the pawn moved to Z=4373 cm, and a second actual 2560 x 1440 screenshot was
captured; later stationary samples there were 45.5, 45.6 and 42.9 FPS.

A local candidate loaded 25 instead of 9 macro cells and extended macro-tree
culling from 350 to 550 m. It added only scattered distant trees in the same
entry frame while its post-load 1440p samples fell to 31.4 and 29.2 FPS.
That candidate was **rejected and is not in this branch**. The comparison is
scene- and hardware-bound, not a benchmark of continuous player movement.

The entry and remote frames still show sparse distant ridges, repeated plant
shapes and smooth ground. Visual acceptance therefore remains open. The next
art candidate should be compared at the same position and resolution and
retain acceptable frame pacing before integration. Normal player traversal,
long-session stability and wider world views remain separate checks.
