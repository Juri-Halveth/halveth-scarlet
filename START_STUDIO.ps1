param([ValidateRange(1024, 65535)][int]$Port = 8842)
$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
$Node = (Get-Command node -ErrorAction Stop).Source
if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
    throw "Port $Port is already occupied. Choose another with -Port."
}
Push-Location -LiteralPath $Root
try {
    & $Node (Join-Path $Root 'tools\build_site.mjs')
    if ($LASTEXITCODE -ne 0) { throw 'Site build failed.' }
    & $Node (Join-Path $Root 'tools\live-studio-server.mjs') $Port
    if ($LASTEXITCODE -ne 0) { throw 'Studio stopped with an error.' }
}
finally { Pop-Location }
