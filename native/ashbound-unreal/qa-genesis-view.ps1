param(
    [Parameter(Mandatory = $true)][string]$PackageRoot,
    [string]$EvidenceRoot,
    [ValidateRange(3, 120)][int]$ShotDelaySeconds = 18,
    [double]$ShotX,
    [double]$ShotY
)

$ErrorActionPreference = 'Stop'
$package = [IO.Path]::GetFullPath($PackageRoot)
$game = Join-Path $package 'Windows\ASHBOUNDUE\Binaries\Win64\ASHBOUNDUE.exe'
if (-not (Test-Path -LiteralPath $game)) { throw "Missing packaged game: $game" }
$remote = $PSBoundParameters.ContainsKey('ShotX') -or $PSBoundParameters.ContainsKey('ShotY')
if ($remote -and -not ($PSBoundParameters.ContainsKey('ShotX') -and $PSBoundParameters.ContainsKey('ShotY'))) {
    throw 'Remote view needs both ShotX and ShotY.'
}

if (-not $EvidenceRoot) { $EvidenceRoot = Join-Path $package 'qa-evidence' }
$evidence = [IO.Path]::GetFullPath($EvidenceRoot)
New-Item -ItemType Directory -Path $evidence -Force | Out-Null
$tag = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
$stem = if ($remote) { "genesis-remote-$tag" } else { "genesis-entry-$tag" }
$log = Join-Path $evidence "$stem.log"
$savedShot = Join-Path $package 'Windows\ASHBOUNDUE\Saved\Screenshots\Genesis.png'
$copyShot = Join-Path $evidence "$stem.png"

# The root launcher spawns a child, so track the real binary and never stop a
# different play session at this package path.
$running = @(Get-CimInstance Win32_Process -Filter "name='ASHBOUNDUE.exe'" |
    Where-Object { $_.ExecutablePath -eq $game })
if ($running.Count) { throw "A game process is already using this package: $game" }

$started = Get-Date
$args = @('/Game/ASHBOUND/Maps/GenesisWorld', '-DX12', '-RenderOffscreen',
    '-forceres', '-ResX=2560', '-ResY=1440',
    '-ExecCmds="r.SetRes 2560x1440w"', '-ashboundshot',
    "-ashboundshotdelay=$ShotDelaySeconds", "-abslog=`"$log`"")
if ($remote) {
    $args += "-ashboundshotx=$ShotX"
    $args += "-ashboundshoty=$ShotY"
}
$process = Start-Process -FilePath $game -ArgumentList $args -PassThru -WindowStyle Hidden
try {
    $deadline = $started.AddSeconds([Math]::Max(75, $ShotDelaySeconds + 45))
    do {
        Start-Sleep -Milliseconds 500
        $process.Refresh()
        if ($process.HasExited) { throw "Game exited before screenshot; exit=$($process.ExitCode)" }
        $shot = Get-Item -LiteralPath $savedShot -ErrorAction SilentlyContinue
    } until ($shot -and $shot.LastWriteTime -gt $started.AddSeconds(1) -or (Get-Date) -gt $deadline)
    if (-not $shot -or $shot.LastWriteTime -le $started.AddSeconds(1)) {
        throw "No fresh Genesis screenshot by $deadline; see $log"
    }
    Start-Sleep -Seconds 2
    Add-Type -AssemblyName System.Drawing
    $image = [System.Drawing.Image]::FromFile($savedShot)
    try {
        if ($image.Width -ne 2560 -or $image.Height -ne 1440) {
            throw "Screenshot is $($image.Width)x$($image.Height), expected 2560x1440. See $log"
        }
    } finally { $image.Dispose() }
    Copy-Item -LiteralPath $savedShot -Destination $copyShot -Force
    $lines = @(Select-String -LiteralPath $log -Pattern 'ASHBOUND_GENESIS_RUNTIME')
    if (-not $lines.Count) { throw "Runtime sample missing; see $log" }
    if ($remote) {
        $probe = @(Select-String -LiteralPath $log -Pattern 'ASHBOUND_GENESIS_REMOTE_GROUND' |
            Where-Object { $_.Line -match 'hit=1 moved=1' })
        if (-not $probe.Count) { throw "Remote terrain/pawn probe failed; see $log" }
        Write-Output $probe[-1].Line
    }
    Write-Output "VIEW_SCREENSHOT=$copyShot"
    Write-Output 'VIEW_RESOLUTION=2560x1440'
    Write-Output "VIEW_LOG=$log"
    Write-Output $lines[-1].Line
} finally {
    $process.Refresh()
    if (-not $process.HasExited) {
        Stop-Process -Id $process.Id -ErrorAction Stop
        Wait-Process -Id $process.Id -Timeout 5 -ErrorAction SilentlyContinue
    }
    Write-Output "QA_PROCESS_STOPPED=$($process.Id)"
}
