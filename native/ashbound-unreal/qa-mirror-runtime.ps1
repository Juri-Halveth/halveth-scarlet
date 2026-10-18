param(
    [Parameter(Mandatory = $true)][string]$PackageRoot,
    [ValidateRange(5, 300)][int]$Seconds = 30,
    [switch]$StableShadows
)

$ErrorActionPreference = 'Stop'
$package = [IO.Path]::GetFullPath($PackageRoot)
$game = Join-Path $package 'Windows\ASHBOUNDUE\Binaries\Win64\ASHBOUNDUE.exe'
if (-not (Test-Path -LiteralPath $game)) { throw "Missing packaged game binary: $game" }

# The root launcher spawns a second EXE. Track the real game process instead,
# and never stop an existing player session or another QA run.
$running = @(Get-CimInstance Win32_Process -Filter "name='ASHBOUNDUE.exe'" |
    Where-Object { $_.ExecutablePath -eq $game })
if ($running.Count) { throw "Existing ASHBOUND process at this package path; isolated QA refused" }

$arguments = @('ASHBOUNDUE', '/Game/ASHBOUND/Maps/MirrorEncounter', '-DX12',
    '-RenderOffscreen', '-windowed', '-ResX=2560', '-ResY=1440', '-log', '-nosplash')
if ($StableShadows) { $arguments += '-ExecCmds="r.Shadow.Virtual.Enable 0"' }
$process = Start-Process -FilePath $game -ArgumentList $arguments -PassThru -WindowStyle Hidden
Write-Output "QA_GAME_PID=$($process.Id)"
try {
    Start-Sleep -Seconds $Seconds
    $process.Refresh()
    if ($process.HasExited) {
        throw "Packaged game exited before $Seconds seconds (exit code $($process.ExitCode))"
    }
    Write-Output "QA_SURVIVED_SECONDS=$Seconds"
} finally {
    $process.Refresh()
    if (-not $process.HasExited) {
        Stop-Process -Id $process.Id -ErrorAction Stop
        Wait-Process -Id $process.Id -Timeout 5 -ErrorAction SilentlyContinue
    }
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        if (-not (Get-Process -Id $process.Id -ErrorAction SilentlyContinue)) { break }
        Start-Sleep -Milliseconds 100
    }
    Start-Sleep -Seconds 1
    if (Get-Process -Id $process.Id -ErrorAction SilentlyContinue) {
        throw "QA game process did not stop: $($process.Id)"
    }
    Write-Output "QA_GAME_PROCESS_STOPPED=$($process.Id)"
}
