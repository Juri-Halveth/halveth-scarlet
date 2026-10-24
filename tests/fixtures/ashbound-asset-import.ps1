param(
    [Parameter(Mandatory = $true)][string]$SourceScript,
    [Parameter(Mandatory = $true)][string]$WorkRoot
)
$ErrorActionPreference = 'Stop'
# Load the real hashing cmdlet before defining the two network mocks.
Import-Module Microsoft.PowerShell.Utility
$WorkRoot = [IO.Path]::GetFullPath($WorkRoot)
$script:fixtureBytes = [Text.Encoding]::UTF8.GetBytes('Synthetic asset fixture. No upstream data.')
$hasher = [Security.Cryptography.MD5]::Create()
try { $script:fixtureMd5 = ([BitConverter]::ToString($hasher.ComputeHash($script:fixtureBytes))).Replace('-', '').ToLowerInvariant() }
finally { $hasher.Dispose() }
$script:raceBytes = [Text.Encoding]::UTF8.GetBytes('Concurrent local fixture file; preserve these bytes.')

function Assert-Fixture($condition, [string]$message) {
    if (-not $condition) { throw $message }
}
function New-MockAsset([string]$name) {
    return [pscustomobject]@{ url = 'https://dl.polyhaven.org/fixture/' + $name; md5 = $fixtureMd5 }
}
# Both remote commands are replaced in the calling scope. No network is used.
function Invoke-RestMethod([string]$Uri) {
    $id = ([Uri]$Uri).Segments[-1]
    $include = [ordered]@{}
    if ($activeCase.path) {
        $include[$activeCase.path] = New-MockAsset 'invalid-include'
    }
    else {
        $include[$id + '.bin'] = New-MockAsset ($id + '/buffer')
        $include['textures/' + $id + '_arm_1k.jpg'] = New-MockAsset ($id + '/arm')
        $include['textures\' + $id + '_diff_1k.jpg'] = New-MockAsset ($id + '/diff')
        $include['textures/' + $id + '_nor_gl_1k.jpg'] = New-MockAsset ($id + '/normal')
    }
    $main = New-MockAsset ($id + '/main')
    $main | Add-Member -NotePropertyName include -NotePropertyValue ([pscustomobject]$include)
    if ($activeCase.url) { $main.url = $activeCase.url }
    if ($activeCase.badMd5) { $main.md5 = 'invalid-md5' }
    $surface = [pscustomobject]@{ '1k' = [pscustomobject]@{ jpg = (New-MockAsset 'surface-1k') }; '2k' = [pscustomobject]@{ jpg = (New-MockAsset 'surface-2k') } }
    return [pscustomobject]@{ gltf = [pscustomobject]@{ '1k' = [pscustomobject]@{ gltf = $main } }; Diffuse = $surface; nor_gl = $surface; Rough = $surface }
}
function Invoke-WebRequest([string]$Uri, [string]$OutFile, [switch]$UseBasicParsing) {
    $downloads.Add([pscustomobject]@{ url = $Uri; destination = $OutFile })
    if ($activeCase.corruptDownload) { [IO.File]::WriteAllBytes($OutFile, [byte[]]@(0, 1, 2)) }
    else { [IO.File]::WriteAllBytes($OutFile, $fixtureBytes) }
    if ($activeCase.transportFailure) { throw 'Synthetic interrupted download' }
    if ($activeCase.concurrentDestination) {
        Assert-Fixture ($OutFile -ne $mainPath) 'Download must not target the final destination.'
        $stream = [IO.File]::Open($mainPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
        try { $stream.Write($raceBytes, 0, $raceBytes.Length) }
        finally { $stream.Dispose() }
    }
}

$cases = @(
    @{ name = 'nested-model-bin-textures-and-surfaces'; success = $true },
    @{ name = 'existing-correct-file'; success = $true; existingCorrect = $true },
    @{ name = 'parent-traversal-forward'; path = '../../../outside.bin' },
    @{ name = 'parent-traversal-backward'; path = '..\..\..\outside.bin' },
    @{ name = 'root-prefix-sibling'; path = '../../../assets-other/outside.bin' },
    @{ name = 'alternate-data-stream'; path = 'textures/ordinary.txt:stream' },
    @{ name = 'drive-qualified-name'; path = 'C:\outside.bin' },
    @{ name = 'unc-name'; path = '\\server\share\outside.bin' },
    @{ name = 'reserved-device'; path = 'textures/CON.bin' },
    @{ name = 'reserved-device-extension'; path = 'textures/LPT1.jpg' },
    @{ name = 'trailing-dot'; path = 'textures/ordinary.jpg.' },
    @{ name = 'trailing-space'; path = 'textures/ordinary.jpg ' },
    @{ name = 'wrong-scheme'; url = 'http://dl.polyhaven.org/fixture/main' },
    @{ name = 'host-suffix'; url = 'https://dl.polyhaven.org.invalid/fixture/main' },
    @{ name = 'other-host'; url = 'https://example.invalid/fixture/main' },
    @{ name = 'invalid-md5'; badMd5 = $true },
    @{ name = 'reparse-ancestor'; reparse = 'nested' },
    @{ name = 'reparse-asset-root'; reparse = 'root' },
    @{ name = 'corrupt-download'; corruptDownload = $true },
    @{ name = 'interrupted-download'; transportFailure = $true },
    @{ name = 'corrupt-existing-file'; existingCorrupt = $true },
    @{ name = 'concurrent-destination'; concurrentDestination = $true }
)
$results = [Collections.Generic.List[object]]::new()
foreach ($case in $cases) {
    $script:activeCase = $case
    $fixture = Join-Path $WorkRoot $case.name
    $scriptDirectory = Join-Path $fixture 'tools/ashbound'
    [IO.Directory]::CreateDirectory($scriptDirectory) | Out-Null
    $copy = Join-Path $scriptDirectory 'fetch-world-assets.ps1'
    Copy-Item -LiteralPath $SourceScript -Destination $copy
    $assets = Join-Path $fixture 'forschung/ashbound/play/assets'
    $script:mainPath = Join-Path $assets 'models/boulder_01/boulder_01_1k.gltf'
    $script:downloads = [Collections.Generic.List[object]]::new()
    $outside = Join-Path $fixture 'reparse-outside'
    [IO.Directory]::CreateDirectory($outside) | Out-Null
    if ($case.existingCorrect -or $case.existingCorrupt) {
        [IO.Directory]::CreateDirectory((Split-Path -Parent $script:mainPath)) | Out-Null
        $bytes = if ($case.existingCorrect) { $script:fixtureBytes } else { $script:raceBytes }
        [IO.File]::WriteAllBytes($script:mainPath, $bytes)
    }
    if ($case.reparse) {
        $link = if ($case.reparse -eq 'root') { $assets } else { Join-Path $assets 'models/boulder_01/textures' }
        [IO.Directory]::CreateDirectory((Split-Path -Parent $link)) | Out-Null
        $linkType = if ([IO.Path]::DirectorySeparatorChar -eq '\') { 'Junction' } else { 'SymbolicLink' }
        New-Item -ItemType $linkType -Path $link -Target $outside | Out-Null
    }
    $failure = $null
    try { & $copy | Out-Null }
    catch { $failure = $_.Exception.Message }
    if ($case.success) {
        Assert-Fixture (-not $failure) ($case.name + ': ' + $failure)
        $manifest = Get-Content -LiteralPath (Join-Path $assets 'manifest.json') -Raw | ConvertFrom-Json
        Assert-Fixture ($manifest.files.Count -eq 32) 'Every model, buffer, nested texture and surface needs a receipt.'
        Assert-Fixture ($script:downloads.Count -eq $(if ($case.existingCorrect) { 31 } else { 32 })) 'Existing correct files must be reused.'
        foreach ($record in $manifest.files) {
            Assert-Fixture ($record.path -notmatch '\\|(^|/)\.\.(/|$)') 'Receipts must contain normalized relative slash paths.'
            Assert-Fixture ($record.md5 -eq $script:fixtureMd5 -and $record.bytes -eq $script:fixtureBytes.Length) 'Receipt must describe verified bytes.'
            Assert-Fixture ($record.sha256 -match '^[a-f0-9]{64}$') 'Receipt must retain SHA256.'
        }
    }
    else {
        Assert-Fixture ([bool]$failure) ($case.name + ': unsafe or failed import must be rejected.')
        if ($case.path) {
            Assert-Fixture ($script:downloads.Count -eq 1) ($case.name + ': reject include before any download for that include.')
        }
        if ($case.url -or $case.badMd5 -or $case.existingCorrupt -or $case.reparse -eq 'root') {
            Assert-Fixture ($script:downloads.Count -eq 0) ($case.name + ': reject before download.')
        }
        if ($case.url -or $case.badMd5) {
            Assert-Fixture (-not (Test-Path -LiteralPath $assets)) ($case.name + ': reject before directory creation.')
        }
        if ($case.reparse) {
            Assert-Fixture ($failure -match 'Reparse point') ($case.name + ': link rejection must be explicit.')
            Assert-Fixture (@(Get-ChildItem -LiteralPath $outside -Force).Count -eq 0) 'Reparse target must remain empty.'
        }
        if ($case.corruptDownload -or $case.transportFailure) {
            Assert-Fixture (-not (Test-Path -LiteralPath $script:mainPath)) 'Failed download must never become the final asset.'
        }
        if ($case.existingCorrupt -or $case.concurrentDestination) {
            Assert-Fixture ([Convert]::ToBase64String([IO.File]::ReadAllBytes($script:mainPath)) -eq [Convert]::ToBase64String($script:raceBytes)) 'Existing or concurrent bytes must remain unchanged.'
        }
    }
    Assert-Fixture (-not (Test-Path -LiteralPath (Join-Path $fixture 'forschung/ashbound/play/outside.bin'))) 'No parent escape may be materialized.'
    Assert-Fixture (-not (Test-Path -LiteralPath (Join-Path $fixture 'forschung/ashbound/play/assets-other'))) 'No prefix sibling may be materialized.'
    if (Test-Path -LiteralPath $assets) {
        Assert-Fixture (@(Get-ChildItem -LiteralPath $assets -Filter '*.download' -Recurse -Force).Count -eq 0) 'Temporary download files must be cleaned.'
    }
    $results.Add([pscustomobject]@{ name = $case.name; passed = $true; downloads = $script:downloads.Count })
}
[pscustomobject]@{ runtime = $PSVersionTable.PSVersion.ToString(); cases = @($results) } | ConvertTo-Json -Depth 4 -Compress
