param(
  [string]$Workspace = "",
  [Parameter(Mandatory = $true)]
  [string]$CommitMessage
)

$ErrorActionPreference = "Stop"

if (-not $Workspace) {
  $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
  $Workspace = (Resolve-Path (Join-Path $scriptDir "..")).Path
}

Push-Location $Workspace
try {
  git rev-parse --is-inside-work-tree | Out-Null

  $status = git status --short
  if (-not $status) {
    [pscustomobject]@{
      ok = $true
      changed = $false
      committed = $false
      pushed = $false
      message = "No changes to commit"
    } | ConvertTo-Json -Compress
    return
  }

  Write-Host "[git-sync] staging changes"
  git add -A

  Write-Host "[git-sync] creating commit"
  git commit -m $CommitMessage | Out-Null

  Write-Host "[git-sync] pushing to origin"
  git push | Out-Null

  $commit = git rev-parse --short HEAD
  $branch = git rev-parse --abbrev-ref HEAD

  [pscustomobject]@{
    ok = $true
    changed = $true
    committed = $true
    pushed = $true
    branch = $branch
    commit = $commit
    message = $CommitMessage
  } | ConvertTo-Json -Compress
} finally {
  Pop-Location
}
