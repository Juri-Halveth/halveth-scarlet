param(
    [string]$WorkRoot
)

$ErrorActionPreference = 'Stop'
$nativeRoot = $PSScriptRoot
$repoRoot = [IO.Path]::GetFullPath((Join-Path $nativeRoot '..\..'))
if (-not $WorkRoot) {
    $WorkRoot = if ($env:ASHBOUND_NATIVE_WORK) { $env:ASHBOUND_NATIVE_WORK } else { Join-Path $repoRoot '.local-qa\ashbound-unreal' }
}
$WorkRoot = [IO.Path]::GetFullPath($WorkRoot)
$manifests = @('asset-manifest.json', 'flora-asset-manifest.json') | ForEach-Object {
    Get-Content -LiteralPath (Join-Path $nativeRoot $_) -Raw | ConvertFrom-Json
}
$files = @($manifests | ForEach-Object { $_.files })

foreach ($item in $files) {
    $uri = [Uri]$item.url
    if ($uri.Scheme -ne 'https' -or $uri.Host -ne 'dl.polyhaven.org') {
        throw "Unexpected source URL: $($item.url)"
    }
    $relative = [string]$item.path
    if ((-not $relative.StartsWith('source-assets/models/') -and
         -not $relative.StartsWith('source-assets/surfaces/')) -or $relative.Contains('..')) {
        throw "Unexpected asset path: $relative"
    }
    $destination = [IO.Path]::GetFullPath((Join-Path $WorkRoot $relative))
    if (-not $destination.StartsWith($WorkRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Asset escapes work root: $relative"
    }
    New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
    if (-not (Test-Path -LiteralPath $destination)) {
        $partial = "$destination.download"
        try {
            Invoke-WebRequest -Uri $uri.AbsoluteUri -OutFile $partial
            if ((Get-Item -LiteralPath $partial).Length -ne [long]$item.bytes) { throw "Size mismatch: $relative" }
            if ((Get-FileHash -LiteralPath $partial -Algorithm SHA256).Hash -ne [string]$item.sha256) { throw "SHA256 mismatch: $relative" }
            Move-Item -LiteralPath $partial -Destination $destination
        }
        finally {
            if (Test-Path -LiteralPath $partial) { Remove-Item -LiteralPath $partial }
        }
    }
    if ((Get-Item -LiteralPath $destination).Length -ne [long]$item.bytes) { throw "Size mismatch: $relative" }
    if ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash -ne [string]$item.sha256) { throw "SHA256 mismatch: $relative" }
}
Write-Output "Verified $($files.Count) Poly Haven CC0 files in $WorkRoot"
