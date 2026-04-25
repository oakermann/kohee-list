param(
  [string]$Workspace = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$BaseUrl = "https://kohee-list.gabefinder.workers.dev",
  [switch]$SkipSyntax,
  [switch]$SkipRemote,
  [switch]$SkipBackup
)

$ErrorActionPreference = "Stop"

$summary = [ordered]@{
  workspace = $Workspace
  base_url = $BaseUrl
  syntax = "skipped"
  remote = "skipped"
  backup = "skipped"
  cafe_count = $null
  backup_path = ""
  ok = $false
}

Push-Location $Workspace
try {
  if (-not $SkipSyntax) {
    Write-Host "[auto-maintenance] running syntax checks"
    & powershell -ExecutionPolicy Bypass -File .\scripts\check-syntax.ps1
    $summary.syntax = "ok"
  }

  if (-not $SkipRemote) {
    Write-Host "[auto-maintenance] checking live worker health"
    $health = Invoke-RestMethod -Uri ($BaseUrl + "/health") -Method GET
    if (-not $health.ok) {
      throw "Remote health check failed"
    }

    Write-Host "[auto-maintenance] checking live cafe data"
    $data = Invoke-RestMethod -Uri ($BaseUrl + "/data") -Method GET
    $summary.remote = "ok"
    $summary.cafe_count = @($data).Count
  }

  if (-not $SkipBackup) {
    Write-Host "[auto-maintenance] exporting CSV backup"
    $backupPath = & powershell -ExecutionPolicy Bypass -File .\scripts\export-csv.ps1 -BaseUrl $BaseUrl
    $summary.backup = "ok"
    $summary.backup_path = @($backupPath)[-1]
  }

  $summary.ok = $true
  $summary | ConvertTo-Json -Compress
} catch {
  $summary.error = $_.Exception.Message
  $summary | ConvertTo-Json -Compress
  exit 1
} finally {
  Pop-Location
}
