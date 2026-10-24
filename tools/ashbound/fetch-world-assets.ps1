$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\forschung\ashbound\play\assets'))
$models = @('boulder_01', 'dead_tree_trunk', 'gothic_statue', 'ornate_medieval_dagger')
$surfaces = @('rocky_terrain_03', 'old_stone_wall_02')
$receipts = [Collections.Generic.List[object]]::new()
$rootPrefix = $root.TrimEnd([char[]]'\/') + [IO.Path]::DirectorySeparatorChar
$pathComparison = if ([IO.Path]::DirectorySeparatorChar -eq '\') { [StringComparison]::OrdinalIgnoreCase } else { [StringComparison]::Ordinal }

function Resolve-AssetDestination([string]$destination) {
    if (-not $destination.StartsWith($rootPrefix, $pathComparison)) { throw "Asset escapes asset root: $destination" }
    $relative = $destination.Substring($rootPrefix.Length)
    foreach ($part in ($relative -split '[\\/]')) {
        if (-not $part -or $part -in @('.', '..') -or $part -match '[<>:"|?*\x00-\x1f]' -or $part.EndsWith('.') -or $part.EndsWith(' ') -or
            $part -match '^(?i:CON|PRN|AUX|NUL|CONIN\$|CONOUT\$|COM[1-9\u00b9\u00b2\u00b3]|LPT[1-9\u00b9\u00b2\u00b3])(?:\.|$)') {
            throw "Unexpected asset path: $relative"
        }
    }
    $destination = [IO.Path]::GetFullPath($destination)
    if (-not $destination.StartsWith($rootPrefix, $pathComparison)) { throw "Asset escapes asset root: $relative" }
    # Refuse existing links, including the destination itself. Recheck before file effects;
    # this is not isolation from another local process concurrently replacing directories.
    for ($cursor = $destination; $cursor; $cursor = [IO.Path]::GetDirectoryName($cursor)) {
        try {
            $attributes = [IO.File]::GetAttributes($cursor)
            if (($attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw "Reparse point in asset path: $cursor" }
        }
        catch [IO.FileNotFoundException] { }
        catch [IO.DirectoryNotFoundException] { }
    }
    return $destination
}

function Get-VerifiedAsset([string]$destination, [string]$md5) {
    $destination = Resolve-AssetDestination $destination
    $item = Get-Item -LiteralPath $destination -Force
    if ($item.PSIsContainer) { throw "Asset is not a file: $destination" }
    $actual = (Get-FileHash -LiteralPath $destination -Algorithm MD5).Hash.ToLowerInvariant()
    if ($actual -ne $md5.ToLowerInvariant()) { throw "Asset checksum mismatch: $destination" }
    return [pscustomobject]@{
        md5 = $actual
        sha256 = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant()
        bytes = $item.Length
    }
}

function Save-Asset([string]$url, [string]$destination, [string]$md5) {
    $uri = $null
    if (-not [Uri]::TryCreate($url, [UriKind]::Absolute, [ref]$uri) -or $uri.Scheme -ne 'https' -or $uri.Host -ne 'dl.polyhaven.org') {
        throw "Unexpected asset source URL: $url"
    }
    if ($md5 -notmatch '^[a-fA-F0-9]{32}$') { throw "Invalid asset MD5: $destination" }
    $destination = Resolve-AssetDestination $destination
    $directory = Split-Path -Parent $destination
    if (-not (Test-Path -LiteralPath $destination)) {
        [IO.Directory]::CreateDirectory($directory) | Out-Null
        $destination = Resolve-AssetDestination $destination
        $partial = Resolve-AssetDestination (Join-Path $directory ('.asset-' + [Guid]::NewGuid().ToString('N') + '.download'))
        $reservation = [IO.File]::Open($partial, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
        $reservation.Dispose()
        try {
            $partial = Resolve-AssetDestination $partial
            Invoke-WebRequest -Uri $uri.AbsoluteUri -OutFile $partial -UseBasicParsing
            $null = Get-VerifiedAsset $partial $md5
            $destination = Resolve-AssetDestination $destination
            # Same-directory promotion fails if a destination appeared during the download.
            [IO.File]::Move($partial, $destination)
        }
        finally {
            $partial = Resolve-AssetDestination $partial
            if (Test-Path -LiteralPath $partial) { [IO.File]::Delete($partial) }
        }
    }
    $verified = Get-VerifiedAsset $destination $md5
    $receipts.Add([pscustomobject]@{
        path = $destination.Substring($rootPrefix.Length).Replace('\', '/')
        url = $url
        md5 = $verified.md5
        sha256 = $verified.sha256
        bytes = $verified.bytes
    })
}

foreach ($id in $models) {
    $files = Invoke-RestMethod -Uri "https://api.polyhaven.com/files/$id"
    $main = $files.gltf.'1k'.gltf
    Save-Asset $main.url (Join-Path $root "models\$id\$id`_1k.gltf") $main.md5
    foreach ($included in $main.include.PSObject.Properties) {
        Save-Asset $included.Value.url (Join-Path $root "models\$id\$($included.Name)") $included.Value.md5
    }
}
foreach ($id in $surfaces) {
    $files = Invoke-RestMethod -Uri "https://api.polyhaven.com/files/$id"
    foreach ($resolution in @('1k', '2k')) {
        foreach ($kind in @('Diffuse', 'nor_gl', 'Rough')) {
            $item = $files.$kind.$resolution.jpg
            if (-not $item) { throw "Missing $resolution JPG $kind for $id" }
            $suffix = if ($resolution -eq '1k') { '_mobile' } else { '' }
            $name = "${id}_$($kind.ToLowerInvariant())$suffix.jpg"
            Save-Asset $item.url (Join-Path $root "surfaces\$name") $item.md5
        }
    }
}
$manifest = [ordered]@{
    schema = 'ashbound.world-assets.v1'
    origin = 'https://polyhaven.com/'
    license = 'CC0'
    licenseSource = 'https://polyhaven.com/license'
    models = $models
    surfaces = $surfaces
    files = @($receipts)
}
$manifestPath = Resolve-AssetDestination (Join-Path $root 'manifest.json')
$manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $manifestPath -Encoding utf8
Write-Output "Saved and verified $($receipts.Count) CC0 asset files in $root"
