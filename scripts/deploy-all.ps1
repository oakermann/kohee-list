param(
  [string]$Workspace = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"

$deployWorkerScript = Join-Path $Workspace "scripts\deploy-worker.ps1"
$deployPagesScript = Join-Path $Workspace "scripts\deploy-pages.ps1"

Push-Location $Workspace
try {
  Write-Host "[deploy-all] deploying worker"
  & powershell -ExecutionPolicy Bypass -File $deployWorkerScript -Workspace $Workspace

  Write-Host "[deploy-all] deploying pages"
  & powershell -ExecutionPolicy Bypass -File $deployPagesScript -Workspace $Workspace

  Write-Host "[deploy-all] finished"
} finally {
  Pop-Location
}
