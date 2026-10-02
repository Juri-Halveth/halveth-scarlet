$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    npm.cmd ci --ignore-scripts
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
    node build.mjs
    if ($LASTEXITCODE -ne 0) { throw 'ASHBOUND build failed.' }
} finally { Pop-Location }
