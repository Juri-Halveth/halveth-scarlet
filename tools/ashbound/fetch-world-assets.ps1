$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\forschung\ashbound\play\assets'))
$models = @('boulder_01', 'dead_tree_trunk', 'gothic_statue', 'ornate_medieval_dagger')
$surfaces = @('rocky_terrain_03', 'old_stone_wall_02')
$receipts = [Collections.Generic.List[object]]::new()

function Save-Asset([string]$url, [string]$destination, [string]$md5) {
    $directory = Split-Path -Parent $destination
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
    if (-not (Test-Path -LiteralPath $destination)) {
        Invoke-WebRequest -Uri $url -OutFile $destination
    }
    $actual = (Get-FileHash -LiteralPath $destination -Algorithm MD5).Hash.ToLowerInvariant()
    if ($actual -ne $md5.ToLowerInvariant()) { throw "Asset checksum mismatch: $destination" }
    $receipts.Add([pscustomobject]@{
        path = $destination.Substring($root.Length).TrimStart('\').Replace('\', '/')
        url = $url
        md5 = $actual
        sha256 = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant()
        bytes = (Get-Item -LiteralPath $destination).Length
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
$manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $root 'manifest.json') -Encoding utf8
Write-Output "Saved and verified $($receipts.Count) CC0 asset files in $root"
