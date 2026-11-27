param(
    [string]$EngineRoot = 'C:\Program Files\Epic Games\UE_5.8',
    [string]$WorkRoot,
    [string]$PackageRoot,
    [ValidateSet('Epic', 'Balanced')][string]$Lighting = 'Epic',
    [ValidateRange(640, 16384)][int]$Width = 2560,
    [ValidateRange(480, 16384)][int]$Height = 1440
)

$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
if (-not $WorkRoot) { $WorkRoot = Join-Path $repoRoot '.local-qa\ashbound-unreal' }
$map = '/Game/ASHBOUND/Maps/GenesisWorld'
$arguments = @($map, '-DX12', '-windowed', "-ResX=$Width", "-ResY=$Height")
if ($Lighting -eq 'Balanced') {
    # Offscreen 2560x1440 capture on the reference PC: 32.20 ms Epic versus
    # 23.12 ms Balanced median at the same stationary Genesis camera.
    $arguments += '-ExecCmds="r.DynamicGlobalIlluminationMethod 0"'
}

if ($PackageRoot) {
    $launcher = Join-Path ([IO.Path]::GetFullPath($PackageRoot)) 'Windows\ASHBOUNDUE.exe'
    if (-not (Test-Path -LiteralPath $launcher)) { throw "Missing native package: $launcher" }
    & $launcher @arguments
} else {
    $project = Join-Path ([IO.Path]::GetFullPath($WorkRoot)) 'ASHBOUNDUE\ASHBOUNDUE.uproject'
    $level = Join-Path ([IO.Path]::GetFullPath($WorkRoot)) 'ASHBOUNDUE\Content\ASHBOUND\Maps\GenesisWorld.umap'
    $editor = Join-Path $EngineRoot 'Engine\Binaries\Win64\UnrealEditor.exe'
    foreach ($required in @($project, $level, $editor)) {
        if (-not (Test-Path -LiteralPath $required)) { throw "Missing native game file: $required" }
    }
    & $editor $project @arguments -game
}
exit $LASTEXITCODE
