param(
    [string]$PackageRoot,
    [string]$WorkRoot,
    [int]$TimeoutSeconds = 30
)

$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
if (-not $WorkRoot) { $WorkRoot = Join-Path $repoRoot '.local-qa\ashbound-unreal' }
$WorkRoot = [IO.Path]::GetFullPath($WorkRoot)
if (-not $PackageRoot) { $PackageRoot = Join-Path $WorkRoot 'package' }
$PackageRoot = [IO.Path]::GetFullPath($PackageRoot)
if ($TimeoutSeconds -lt 8 -or $TimeoutSeconds -gt 300) {
    throw 'TimeoutSeconds must be between 8 and 300'
}

$windowsRoot = Join-Path $PackageRoot 'Windows'
$exe = Join-Path $windowsRoot 'ASHBOUNDUE\Binaries\Win64\ASHBOUNDUE.exe'
if (-not (Test-Path -LiteralPath $exe)) { throw "Packaged game missing: $exe" }
New-Item -ItemType Directory -Path $WorkRoot -Force | Out-Null
$log = Join-Path $WorkRoot ("runtime-qa-{0}.log" -f [Guid]::NewGuid().ToString('N'))
$game = $null
try {
    $game = Start-Process -FilePath $exe -WorkingDirectory $windowsRoot -PassThru `
        -WindowStyle Hidden -ArgumentList @('-nullrhi', '-unattended', '-nosplash',
            '-ashboundqacollision', '-ashboundqacastall', '-ashboundqagenesis', "-abslog=`"$log`"")
    $clock = [Diagnostics.Stopwatch]::StartNew()
    while ($clock.Elapsed.TotalSeconds -lt $TimeoutSeconds) {
        if (Test-Path -LiteralPath $log) {
            $current = Get-Content -LiteralPath $log -Raw
            if ($current -and ($current.Contains('ASHBOUND_COLLISION_QA FAIL') -or
                $current.Contains('ASHBOUND_SPELL_MATERIAL MISSING') -or
                $current.Contains('ASHBOUND world effect: Reweave growth'))) { break }
        }
        if ($game.HasExited) { break }
        Start-Sleep -Milliseconds 250
    }
}
finally {
    if ($game -and -not $game.HasExited) { Stop-Process -Id $game.Id }
}

if (-not (Test-Path -LiteralPath $log)) { throw "Packaged game wrote no log: $log" }
$content = Get-Content -LiteralPath $log -Raw
if (-not $content) { throw "Packaged game wrote an empty log: $log" }
$required = @(
    'ASHBOUND_COLLISION_SAMPLE name=central_road hit=1 .* pass=1',
    'ASHBOUND_COLLISION_SAMPLE name=north_slope hit=1 mesh=ASHBOUND_Valley .* pass=1',
    'ASHBOUND_COLLISION_SAMPLE name=south_slope hit=1 mesh=ASHBOUND_Valley .* pass=1',
    'ASHBOUND_COLLISION_SAMPLE name=outside_valley hit=0 .* pass=1',
    'ASHBOUND_PAWN_COLLISION_SAMPLE y=7600\.0 hit=1 mesh=ASHBOUND_Valley .* pass=1',
    'ASHBOUND_PAWN_COLLISION_SAMPLE y=-7600\.0 hit=1 mesh=ASHBOUND_Valley .* pass=1',
    'ASHBOUND_PORTAL_PAWN_SAMPLE y=-340 hit=1 mesh=modular_fort_01_wall_thin_gate_01 .* pass=1',
    'ASHBOUND_PORTAL_PAWN_SAMPLE y=-280 hit=1 mesh=modular_fort_01_wall_thin_gate_01 .* pass=1',
    'ASHBOUND_PORTAL_PAWN_SAMPLE y=-220 hit=1 mesh=modular_fort_01_wall_thin_gate_01 .* pass=1',
    'ASHBOUND_PORTAL_PAWN_SAMPLE y=0 hit=0 mesh=NONE .* pass=1',
    'ASHBOUND_PORTAL_PAWN_SAMPLE y=220 hit=1 mesh=modular_fort_01_wall_thin_gate_01 .* pass=1',
    'ASHBOUND_PORTAL_PAWN_SAMPLE y=280 hit=1 mesh=modular_fort_01_wall_thin_gate_01 .* pass=1',
    'ASHBOUND_PORTAL_PAWN_SAMPLE y=340 hit=1 mesh=modular_fort_01_wall_thin_gate_01 .* pass=1',
    'ASHBOUND_COLLISION_QA PASS',
    'ASHBOUND_SPELL_MATERIAL bound=/Game/ASHBOUND/Materials/M_LivingSpellSoft',
    'ASHBOUND_GENESIS ready at ',
    'ASHBOUND_GENESIS_BIRTH generation=1 born=3 living=3',
    'ASHBOUND_GENESIS_GROWTH grown=2 living=2',
    'ASHBOUND world effect: Resonance echo',
    'ASHBOUND world effect: Ember light',
    'ASHBOUND_GROVE_MATERIAL bound=/Game/ASHBOUND/Materials/M_GroveFern',
    'ASHBOUND_GROVE spawned fronds=9',
    'ASHBOUND world effect: Reweave growth'
)
foreach ($pattern in $required) {
    if ($content -notmatch $pattern) { throw "Package QA missing '$pattern' in $log" }
}
if ($content -match 'ASHBOUND_COLLISION_QA FAIL|ASHBOUND_SPELL_MATERIAL MISSING|ASHBOUND_GROVE_MATERIAL MISSING|missing usage flag InstancedStaticMeshes|Failed to compile Material|Can.t compile M_GroveFern|invalid ShaderMap') {
    throw "Package QA reported a failure in $log"
}
Write-Output "ASHBOUND packaged runtime QA passed (collision, pawn sweeps, material and 3 effects): $log"
