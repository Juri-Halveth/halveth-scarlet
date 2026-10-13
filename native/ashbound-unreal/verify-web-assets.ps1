$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$assetsRoot = Join-Path $repoRoot 'forschung\ashbound\play\assets'
$manifest = Get-Content -LiteralPath (Join-Path $assetsRoot 'manifest.json') -Raw | ConvertFrom-Json
$modelIds = @('boulder_01', 'dead_tree_trunk', 'gothic_statue', 'ornate_medieval_dagger')
$selected = @($manifest.files | Where-Object {
    $relative = [string]$_.path
    $model = @($modelIds | Where-Object { $relative.StartsWith("models/$_/", [StringComparison]::Ordinal) }).Count -gt 0
    $surface = $relative -in @(
        'surfaces/rocky_terrain_03_diffuse.jpg',
        'surfaces/rocky_terrain_03_nor_gl.jpg',
        'surfaces/rocky_terrain_03_rough.jpg',
        'surfaces/old_stone_wall_02_diffuse.jpg',
        'surfaces/old_stone_wall_02_nor_gl.jpg',
        'surfaces/old_stone_wall_02_rough.jpg'
    )
    $model -or $surface
})
if ($selected.Count -lt 20) { throw "Incomplete public asset manifest: $($selected.Count) required files" }
foreach ($item in $selected) {
    $relative = [string]$item.path
    if ($relative.Contains('..')) { throw "Invalid manifest path: $relative" }
    $file = [IO.Path]::GetFullPath((Join-Path $assetsRoot $relative))
    if (-not $file.StartsWith($assetsRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Manifest path escapes assets: $relative"
    }
    if (-not (Test-Path -LiteralPath $file)) { throw "Missing public source asset: $relative" }
    if ((Get-Item -LiteralPath $file).Length -ne [long]$item.bytes) { throw "Size mismatch: $relative" }
    if ((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash -ne [string]$item.sha256) { throw "SHA256 mismatch: $relative" }
}
Write-Output "Verified $($selected.Count) public CC0 source files"
