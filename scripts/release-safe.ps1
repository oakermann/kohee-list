param(
  [string]$Workspace = "",
  [string]$BaseUrl = "https://kohee-list.gabefinder.workers.dev",
  [string]$DatabaseName = "kohee-list",
  [switch]$SkipBackup,
  [switch]$CommitAndPush,
  [string]$CommitMessage = ""
)

$ErrorActionPreference = "Stop"

if (-not $Workspace) {
  $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
  $Workspace = (Resolve-Path (Join-Path $scriptDir "..")).Path
}

$reportDir = Join-Path $Workspace "reports"
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$reportPath = Join-Path $reportDir ("release-safe-" + $timestamp + ".json")

$summary = [ordered]@{
  workspace = $Workspace
  base_url = $BaseUrl
  timestamp = (Get-Date).ToString("s")
  sync = "pending"
  syntax = "pending"
  backup = if ($SkipBackup) { "skipped" } else { "pending" }
  deploy = "pending"
  smoke = "pending"
  git = if ($CommitAndPush) { "pending" } else { "skipped" }
  backup_path = ""
  smoke_summary = $null
  git_summary = $null
  ok = $false
}

function Save-Report {
  $summary | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $reportPath -Encoding UTF8
}

Push-Location $Workspace
try {
  Write-Host "[release-safe] syncing local page mirrors"
  & powershell -ExecutionPolicy Bypass -File .\sync-pages.ps1
  $summary.sync = "ok"
  Save-Report

  Write-Host "[release-safe] running syntax checks"
  & powershell -ExecutionPolicy Bypass -File .\scripts\check-syntax.ps1
  $summary.syntax = "ok"
  Save-Report

  if (-not $SkipBackup) {
    Write-Host "[release-safe] exporting CSV backup"
    $backupOutput = & powershell -ExecutionPolicy Bypass -File .\scripts\export-csv.ps1 -BaseUrl $BaseUrl
    $summary.backup = "ok"
    $summary.backup_path = @($backupOutput)[-1]
    Save-Report
  }

  Write-Host "[release-safe] deploying worker and pages"
  & powershell -ExecutionPolicy Bypass -File .\scripts\deploy-all.ps1 -SkipSync
  $summary.deploy = "ok"
  Save-Report

  Write-Host "[release-safe] running full smoke test"
  $smokeOutput = & powershell -ExecutionPolicy Bypass -File .\scripts\smoke-test.ps1 -Mode full -BaseUrl $BaseUrl -DatabaseName $DatabaseName
  $summary.smoke = "ok"
  $summary.smoke_summary = @($smokeOutput)[-1]
  Save-Report

  if ($CommitAndPush) {
    if (-not $CommitMessage) {
      $CommitMessage = "Run safe release pipeline"
    }
    Write-Host "[release-safe] syncing git state"
    $gitOutput = & powershell -ExecutionPolicy Bypass -File .\scripts\git-sync.ps1 -Workspace $Workspace -CommitMessage $CommitMessage
    $summary.git = "ok"
    $summary.git_summary = @($gitOutput)[-1]
    Save-Report
  }

  $summary.ok = $true
  Save-Report
  $summary | ConvertTo-Json -Depth 10 -Compress
} catch {
  $summary.ok = $false
  $summary.error = $_.Exception.Message
  Save-Report
  $summary | ConvertTo-Json -Depth 10 -Compress
  exit 1
} finally {
  Pop-Location
}
