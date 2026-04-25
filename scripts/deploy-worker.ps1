param(
  [string]$Workspace = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"

Push-Location $Workspace
try {
  Write-Host "[deploy-worker] starting wrangler deploy"
  npx.cmd wrangler deploy
  Write-Host "[deploy-worker] done"
} finally {
  Pop-Location
}
