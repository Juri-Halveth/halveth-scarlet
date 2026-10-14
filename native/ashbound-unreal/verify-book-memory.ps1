param(
    [string]$PackageRoot,
    [string]$WorkRoot
)

$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
if (-not $WorkRoot) { $WorkRoot = Join-Path $repoRoot '.local-qa\ashbound-unreal' }
if (-not $PackageRoot) { $PackageRoot = Join-Path $WorkRoot 'package' }
$WorkRoot = [IO.Path]::GetFullPath($WorkRoot)
$PackageRoot = [IO.Path]::GetFullPath($PackageRoot)
$windowsRoot = Join-Path $PackageRoot 'Windows'
$exe = Join-Path $windowsRoot 'ASHBOUNDUE\Binaries\Win64\ASHBOUNDUE.exe'
if (-not (Test-Path -LiteralPath $exe)) { throw "Missing game: $exe" }

# A fresh Development-only slot keeps this repeatable and separate from the player.
$runId = [Guid]::NewGuid().ToString('N')
$qaSave = Join-Path $env:LOCALAPPDATA "ASHBOUNDUE\Saved\SaveGames\ASHBOUND_BookMemory_QA_$runId.sav"

function Invoke-MemoryRun([string]$Suffix, [string[]]$ExtraArgs, [string]$Expected) {
    $log = Join-Path $WorkRoot "book-memory-$runId-$Suffix.log"
    $launchArgs = @('-nullrhi', '-unattended', '-nosplash', '-ashboundqabookmemory',
        "-ashboundqabookmemoryid=$runId") +
        $ExtraArgs + @("-abslog=`"$log`"")
    $game = $null
    try {
        $game = Start-Process -FilePath $exe -WorkingDirectory $windowsRoot -PassThru `
            -WindowStyle Hidden -ArgumentList $launchArgs
        $clock = [Diagnostics.Stopwatch]::StartNew()
        while ($clock.Elapsed.TotalSeconds -lt 25) {
            if (Test-Path -LiteralPath $log) {
                $content = Get-Content -LiteralPath $log -Raw
                if ($content -match $Expected) { return $content }
            }
            if ($game.HasExited) { break }
            Start-Sleep -Milliseconds 250
        }
    }
    finally {
        if ($game -and -not $game.HasExited) { Stop-Process -Id $game.Id }
    }
    throw "Book-memory $Suffix check failed; inspect $log"
}

$write = Invoke-MemoryRun 'write' @('-ashboundqareadbook') 'ASHBOUND_BOOK_MEMORY volume=([0-2]) saved=1'
$volume = [regex]::Match($write, 'ASHBOUND_BOOK_MEMORY volume=([0-2]) saved=1').Groups[1].Value
$read = Invoke-MemoryRun 'read' @() "ASHBOUND_BOOK_MEMORY volume=$volume restored=1"
if ($read -notmatch "ASHBOUND_BOOK_MEMORY volume=$volume restored=1") {
    throw 'The studied volume was not restored in the second process'
}
Write-Output "ASHBOUND book memory passed across two EXE processes (volume $volume); QA save: $qaSave"
