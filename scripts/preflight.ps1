param(
  [string]$Remote = "origin",
  [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"

function Invoke-GitPreflightStep {
  param(
    [string]$Title,
    [string[]]$GitArgs
  )

  Write-Host ""
  Write-Host "[$Title]"
  & git @GitArgs
  if ($LASTEXITCODE -ne 0) {
    throw "git $($GitArgs -join ' ') failed with exit code $LASTEXITCODE"
  }
}

Invoke-GitPreflightStep "git status --short" @("status", "--short")
Invoke-GitPreflightStep "git branch --show-current" @("branch", "--show-current")
Invoke-GitPreflightStep "git fetch $Remote $Branch" @("fetch", $Remote, $Branch)
Invoke-GitPreflightStep "git log --oneline -5" @("log", "--oneline", "-5")
Invoke-GitPreflightStep "git log --oneline $Branch..$Remote/$Branch" @("log", "--oneline", "$Branch..$Remote/$Branch")
Invoke-GitPreflightStep "git log --oneline $Remote/$Branch..$Branch" @("log", "--oneline", "$Remote/$Branch..$Branch")
