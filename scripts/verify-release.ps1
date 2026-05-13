param(
  [string]$Workspace = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"

function Invoke-VerifyStep {
  param(
    [string]$Name,
    [scriptblock]$Command
  )

  Write-Host ""
  Write-Host "[verify] $Name"
  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "[verify] Failed: $Name (exit code $LASTEXITCODE)"
  }
}

Push-Location $Workspace
try {
  Invoke-VerifyStep "deploy source sync" { npm run check:deploy-sync }
  Invoke-VerifyStep "queue docs consistency" { npm run check:queue-docs }
  Invoke-VerifyStep "unit tests" { npm run test:unit }
  Invoke-VerifyStep "syntax checks" {
    powershell -ExecutionPolicy Bypass -File .\scripts\check-syntax.ps1
  }
  Invoke-VerifyStep "repo safety" { npm run check:repo-safety }

  Write-Host ""
  Write-Host "[verify] release verification passed"
} finally {
  Pop-Location
}
