param(
  [string]$Source = ".pages-deploy",
  [string[]]$Targets = @(".")
)

$ErrorActionPreference = "Stop"

function Copy-PagesBundle {
  param(
    [string]$SourceDir,
    [string]$TargetDir
  )

  $htmlFiles = @("index.html", "login.html", "submit.html", "mypage.html", "admin.html")

  foreach ($file in $htmlFiles) {
    $src = Join-Path $SourceDir $file
    if (Test-Path -LiteralPath $src) {
      Copy-Item -LiteralPath $src -Destination (Join-Path $TargetDir $file) -Force
    }
  }

  $srcAssets = Join-Path $SourceDir "assets"
  if (Test-Path -LiteralPath $srcAssets) {
    $targetAssets = Join-Path $TargetDir "assets"
    New-Item -ItemType Directory -Force -Path $targetAssets | Out-Null
    Get-ChildItem -LiteralPath $srcAssets -File | ForEach-Object {
      Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $targetAssets $_.Name) -Force
    }
  }
}

$sourcePath = Resolve-Path -LiteralPath $Source
foreach ($target in $Targets) {
  $targetPath = Resolve-Path -LiteralPath $target
  Copy-PagesBundle -SourceDir $sourcePath -TargetDir $targetPath
  Write-Output "Synced pages -> $targetPath"
}
