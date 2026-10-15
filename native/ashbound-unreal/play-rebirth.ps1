param(
    [string]$EngineRoot = 'C:\Program Files\Epic Games\UE_5.8',
    [string]$WorkRoot
)

$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
if (-not $WorkRoot) { $WorkRoot = Join-Path $repoRoot '.local-qa\ashbound-unreal' }
$project = Join-Path ([IO.Path]::GetFullPath($WorkRoot)) 'ASHBOUNDUE\ASHBOUNDUE.uproject'
$map = Join-Path ([IO.Path]::GetFullPath($WorkRoot)) 'ASHBOUNDUE\Content\ASHBOUND\Maps\RebirthGrove.umap'
$editor = Join-Path $EngineRoot 'Engine\Binaries\Win64\UnrealEditor.exe'
foreach ($required in @($project, $map, $editor)) {
    if (-not (Test-Path -LiteralPath $required)) { throw "Missing native game file: $required" }
}

# Opens the separate Unreal Landscape candidate as a native first-person game.
# The accepted Chapter I default map remains untouched during visual review.
& $editor $project '/Game/ASHBOUND/Maps/RebirthGrove' -game -DX12 -windowed -ResX=2560 -ResY=1440
exit $LASTEXITCODE
