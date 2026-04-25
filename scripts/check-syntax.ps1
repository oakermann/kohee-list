param(
  [string]$Workspace = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"

function Test-JavaScriptModule {
  param(
    [string]$Path
  )

  Write-Host "[check-js] $Path"
  & node --experimental-vm-modules (Join-Path $Workspace "scripts\check-js-module.mjs") $Path
  if ($LASTEXITCODE -ne 0) {
    throw "JavaScript syntax check failed: $Path"
  }
}

function Test-PowerShellFile {
  param(
    [string]$Path
  )

  Write-Host "[check-ps1] $Path"
  $tokens = $null
  $errors = $null
  [System.Management.Automation.Language.Parser]::ParseFile($Path, [ref]$tokens, [ref]$errors) | Out-Null
  if ($errors.Count) {
    $errors | ForEach-Object { throw $_.Message }
  }
}

Push-Location $Workspace
try {
  $jsFiles = @(
    (Join-Path $Workspace "worker.js"),
    (Join-Path $Workspace "scripts\check-js-module.mjs")
  )
  $jsFiles += Get-ChildItem -LiteralPath (Join-Path $Workspace "server") -Filter *.js | ForEach-Object { $_.FullName }
  $jsFiles += Get-ChildItem -LiteralPath (Join-Path $Workspace ".pages-deploy\assets") -Filter *.js | ForEach-Object { $_.FullName }

  foreach ($file in $jsFiles) {
    Test-JavaScriptModule -Path $file
  }

  $psFiles = @(
    (Join-Path $Workspace "sync-pages.ps1")
  )
  $psFiles += Get-ChildItem -LiteralPath (Join-Path $Workspace "scripts") -Filter *.ps1 | ForEach-Object { $_.FullName }

  foreach ($file in $psFiles) {
    Test-PowerShellFile -Path $file
  }

  Write-Host "[check] all syntax checks passed"
} finally {
  Pop-Location
}
