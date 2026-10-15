param(
    [string]$EngineRoot = 'C:\Program Files\Epic Games\UE_5.8',
    [string]$WorkRoot,
    [string]$PythonCommand = 'python'
)

$ErrorActionPreference = 'Stop'
$nativeRoot = $PSScriptRoot
$repoRoot = [IO.Path]::GetFullPath((Join-Path $nativeRoot '..\..'))
if (-not $WorkRoot) { $WorkRoot = Join-Path $repoRoot '.local-qa\ashbound-unreal' }
$WorkRoot = [IO.Path]::GetFullPath($WorkRoot)
$project = Join-Path $WorkRoot 'ASHBOUNDUE'
$uproject = Join-Path $project 'ASHBOUNDUE.uproject'
$template = Join-Path $EngineRoot 'Templates\TP_FirstPersonBP'
$buildTool = Join-Path $EngineRoot 'Engine\Build\BatchFiles\Build.bat'
$editor = Join-Path $EngineRoot 'Engine\Binaries\Win64\UnrealEditor-Cmd.exe'
foreach ($required in @($template, $buildTool, $editor)) {
    if (-not (Test-Path -LiteralPath $required)) { throw "Missing Unreal Engine 5.8 component: $required" }
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js is needed to export the existing ASHBOUND book texts' }
if (Test-Path -LiteralPath $project) { throw "Project already exists; choose an empty WorkRoot: $project" }

& (Join-Path $nativeRoot 'verify-web-assets.ps1')
& (Join-Path $nativeRoot 'fetch-assets.ps1') -WorkRoot $WorkRoot
New-Item -ItemType Directory -Path (Join-Path $project 'Content') -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $template 'Content\FirstPerson') -Destination (Join-Path $project 'Content') -Recurse
Copy-Item -LiteralPath (Join-Path $template 'Config') -Destination $project -Recurse
foreach ($pack in @('Characters', 'LevelPrototyping', 'Input')) {
    $content = Join-Path $EngineRoot "Templates\TemplateResources\High\$pack\Content"
    if (-not (Test-Path -LiteralPath $content)) { throw "Missing first-person content pack: $content" }
    # The template Blueprints reference /Game/Input/... and /Game/Characters/...
    # Keep the pack directory instead of flattening it into /Game.
    $packDestination = Join-Path $project "Content\$pack"
    New-Item -ItemType Directory -Path $packDestination -Force | Out-Null
    Copy-Item -Path (Join-Path $content '*') -Destination $packDestination -Recurse -Force
}
Copy-Item -LiteralPath (Join-Path $nativeRoot 'Source') -Destination $project -Recurse
Copy-Item -LiteralPath (Join-Path $nativeRoot 'ASHBOUNDUE.uproject') -Destination $uproject
Copy-Item -LiteralPath (Join-Path $nativeRoot 'Config\DefaultEngine.ini') -Destination (Join-Path $project 'Config\DefaultEngine.ini') -Force
Copy-Item -LiteralPath (Join-Path $nativeRoot 'Config\DefaultGame.ini') -Destination (Join-Path $project 'Config\DefaultGame.ini') -Force
Copy-Item -LiteralPath (Join-Path $nativeRoot 'Config\DefaultGameUserSettings.ini') -Destination (Join-Path $project 'Config\DefaultGameUserSettings.ini') -Force

$env:ASHBOUND_NATIVE_WORK = $WorkRoot
& node (Join-Path $nativeRoot 'tools\export_books.mjs') (Join-Path $WorkRoot 'book-catalog.json')
if ($LASTEXITCODE -ne 0) { throw 'ASHBOUND book source export failed' }
& $PythonCommand (Join-Path $nativeRoot 'tools\render_book_pages.py') `
    (Join-Path $WorkRoot 'book-catalog.json') (Join-Path $WorkRoot 'book-pages')
if ($LASTEXITCODE -ne 0) { throw 'ASHBOUND book page rendering failed' }
& $PythonCommand (Join-Path $nativeRoot 'tools\generate_terrain.py')
if ($LASTEXITCODE -ne 0 -or
    -not (Test-Path -LiteralPath (Join-Path $WorkRoot 'ASHBOUND_Valley.obj')) -or
    -not (Test-Path -LiteralPath (Join-Path $WorkRoot 'ASHBOUND_WornRoad.obj'))) {
    throw 'Terrain generation failed'
}
& $buildTool ASHBOUNDUEEditor Win64 Development "-Project=$uproject" -WaitMutex -NoHotReload
if ($LASTEXITCODE -ne 0) { throw 'ASHBOUNDUE editor build failed' }

foreach ($scriptName in @('import_world.py', 'import_vault_textures.py', 'import_book_pages.py',
                           'make_magic_material.py', 'make_grove_material.py', 'build_world.py', 'fix_meshes.py',
                           'verify_world_assets.py', 'build_rebirth.py')) {
    $scriptFile = Join-Path $nativeRoot "tools\$scriptName"
    & $editor $uproject -run=pythonscript "-script=$scriptFile" -unattended -nullrhi -nosplash -nop4 -log
    if ($LASTEXITCODE -ne 0) { throw "Unreal authoring step failed: $scriptName" }
}
$worldReceipt = Join-Path $WorkRoot 'build_world.json'
if (-not (Test-Path -LiteralPath $worldReceipt)) { throw 'World receipt missing' }
$assetReceipt = Join-Path $WorkRoot 'world_assets_verified.json'
if (-not (Test-Path -LiteralPath $assetReceipt)) { throw 'Saved world asset check missing' }
$world = Get-Content -LiteralPath $worldReceipt -Raw | ConvertFrom-Json
if ($world.actorCount -lt 100 -or $world.map -ne '/Game/ASHBOUND/Maps/Prologue') {
    throw 'World receipt does not describe the expected 3D prologue'
}
Write-Output "ASHBOUNDUE source project ready: $uproject ($($world.actorCount) world actors)"
