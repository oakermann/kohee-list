param(
  [string]$Workspace = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$ProjectName = "kohee",
  [string]$Branch = "main",
  [string]$SourceDir = ".pages-deploy"
)

$ErrorActionPreference = "Stop"

$workerConfig = Join-Path $Workspace "wrangler.toml"
$pagesConfig = Join-Path $Workspace "wrangler.pages.toml"
$backupConfig = Join-Path $Workspace "wrangler.worker.backup.toml"

Push-Location $Workspace
try {
  Copy-Item -LiteralPath $workerConfig -Destination $backupConfig -Force
  Copy-Item -LiteralPath $pagesConfig -Destination $workerConfig -Force

  Write-Host "[deploy-pages] starting wrangler pages deploy"
  npx.cmd wrangler pages deploy $SourceDir --project-name $ProjectName --branch $Branch
  Write-Host "[deploy-pages] done"
} finally {
  if (Test-Path -LiteralPath $backupConfig) {
    Copy-Item -LiteralPath $backupConfig -Destination $workerConfig -Force
    Remove-Item -LiteralPath $backupConfig -Force
  }
  Pop-Location
}
