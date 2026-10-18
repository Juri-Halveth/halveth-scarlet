param(
    [string]$EngineRoot = 'C:\Program Files\Epic Games\UE_5.8',
    [string]$WorkRoot,
    [string]$OutputRoot,
    [ValidateSet('Development', 'Shipping')]
    [string]$Configuration = 'Development'
)

$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
if (-not $WorkRoot) { $WorkRoot = Join-Path $repoRoot '.local-qa\ashbound-unreal' }
$WorkRoot = [IO.Path]::GetFullPath($WorkRoot)
if (-not $OutputRoot) { $OutputRoot = Join-Path $WorkRoot 'package' }
$OutputRoot = [IO.Path]::GetFullPath($OutputRoot)
$uproject = Join-Path $WorkRoot 'ASHBOUNDUE\ASHBOUNDUE.uproject'
$uat = Join-Path $EngineRoot 'Engine\Build\BatchFiles\RunUAT.bat'
if (-not (Test-Path -LiteralPath $uproject)) { throw "Missing source project: $uproject" }
if (-not (Test-Path -LiteralPath $uat)) { throw "Missing Unreal Automation Tool: $uat" }
if (Test-Path -LiteralPath $OutputRoot) { throw "Output exists; choose a fresh OutputRoot: $OutputRoot" }

& $uat BuildCookRun "-project=$uproject" -noP4 -platform=Win64 "-clientconfig=$Configuration" `
    -build -cook -stage -pak -iostore -archive "-archivedirectory=$OutputRoot" `
    -skipzenstore -unattended -utf8output
if ($LASTEXITCODE -ne 0) { throw "Unreal package failed with exit code $LASTEXITCODE" }
$launcher = Join-Path $OutputRoot 'Windows\ASHBOUNDUE.exe'
if (-not (Test-Path -LiteralPath $launcher)) { throw "Package launcher missing: $launcher" }
$groveLauncher = Join-Path $OutputRoot 'Windows\Start-RebirthGrove.cmd'
@'
@echo off
cd /d "%~dp0"
start "" "%~dp0ASHBOUNDUE.exe" "/Game/ASHBOUND/Maps/RebirthGrove" -DX12 -windowed -ResX=2560 -ResY=1440 %*
'@ | Set-Content -LiteralPath $groveLauncher -Encoding Ascii
$genesisLauncher = Join-Path $OutputRoot 'Windows\Start-GenesisWorld.cmd'
@'
@echo off
cd /d "%~dp0"
start "" "%~dp0ASHBOUNDUE.exe" "/Game/ASHBOUND/Maps/GenesisWorld" -DX12 -windowed -ResX=2560 -ResY=1440 %*
'@ | Set-Content -LiteralPath $genesisLauncher -Encoding Ascii
$mirrorLauncher = Join-Path $OutputRoot 'Windows\Start-MirrorEncounter.cmd'
@'
@echo off
cd /d "%~dp0"
start "" "%~dp0ASHBOUNDUE.exe" "/Game/ASHBOUND/Maps/MirrorEncounter" -DX12 -windowed -ResX=2560 -ResY=1440 %*
'@ | Set-Content -LiteralPath $mirrorLauncher -Encoding Ascii
Write-Output "ASHBOUND native Windows package ready: $launcher"
Write-Output "Rebirth Grove one-click start: $groveLauncher"
Write-Output "Genesis Ground 5 km test start: $genesisLauncher"
Write-Output "Mirror Encounter native test start: $mirrorLauncher"
