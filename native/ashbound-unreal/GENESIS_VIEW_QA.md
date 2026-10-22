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
./qa-genesis-view.ps1 -PackageRoot C:\path\to\package -TraverseX 80000 -TraverseY -40000 -TraverseSeconds 30 -ShotDelaySeconds 40
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

The optional traversal witness moved a pawn in 120 ground-following steps
from the entry to `(80000, -40000)` over 30 seconds. Six progress records
showed active detail/near/macro cell counts while moving. Its final screenshot
was actually 2560 x 1440. Five-second runtime samples during that route
ranged from 47.2 to 63.0 FPS; these averages do not measure frame pacing or
human-controlled play. The end view still has bare, smooth ridges.
After adding an explicit success check for each pawn move, a second fresh
package completed 40 steps to `(20000, -10000)` in 10 seconds, recorded two
progress samples and captured a real 2560 x 1440 frame. This confirms the
final QA code path rather than relying on the earlier package alone.

The entry and remote frames still show sparse distant ridges, repeated plant
shapes and smooth ground. Visual acceptance therefore remains open. The next
art candidate should be compared at the same position and resolution and
retain acceptable frame pacing before integration. The optional stepwise
traversal exercises streamed cells under a moving pawn, but it bypasses player
input and does not establish normal play feel. Long-session stability and
wider world views remain separate checks.
