param(
  [string]$BaseUrl = "https://kohee-list.gabefinder.workers.dev",
  [string]$OutputDir = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path "backups"),
  [string]$OutputPath = ""
)

$ErrorActionPreference = "Stop"

function Convert-ToCsvField {
  param(
    $Value
  )

  $text = [string]$Value
  if ($text.Contains('"')) {
    $text = $text.Replace('"', '""')
  }
  if ($text.Contains(",") -or $text.Contains("`n") -or $text.Contains("`r") -or $text.Contains('"')) {
    return '"' + $text + '"'
  }
  return $text
}

function Join-ListValue {
  param(
    $Value
  )

  if ($Value -is [System.Collections.IEnumerable] -and -not ($Value -is [string])) {
    return (@($Value) -join ",")
  }
  return [string]$Value
}

$headers = @(
  "id",
  "name",
  "address",
  "desc",
  "lat",
  "lng",
  "signature",
  "beanShop",
  "instagram",
  "category",
  "oakerman_pick",
  "manager_pick"
)

Write-Host "[export-csv] fetching cafe data"
$data = Invoke-RestMethod -Uri ($BaseUrl + "/data") -Method GET
if (-not $data) {
  throw "No cafe data returned"
}

if (-not $OutputPath) {
  New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
  $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $OutputPath = Join-Path $OutputDir ("cafes-" + $timestamp + ".csv")
}

$lines = @()
$lines += ($headers -join ",")

foreach ($item in $data) {
  $row = @(
    $item.id,
    $item.name,
    $item.address,
    $item.desc,
    $item.lat,
    $item.lng,
    (Join-ListValue $item.signature),
    $item.beanShop,
    $item.instagram,
    (Join-ListValue $item.category),
    $(if ($item.oakerman_pick) { 1 } else { 0 }),
    $(if ($item.manager_pick) { 1 } else { 0 })
  ) | ForEach-Object { Convert-ToCsvField $_ }

  $lines += ($row -join ",")
}

Set-Content -LiteralPath $OutputPath -Value ($lines -join "`r`n") -Encoding UTF8
Write-Host "[export-csv] wrote $($data.Count) cafes"
Write-Output $OutputPath
