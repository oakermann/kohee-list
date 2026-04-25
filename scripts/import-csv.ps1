param(
  [Parameter(Mandatory = $true)]
  [string]$CsvPath,
  [string]$BaseUrl = "https://kohee-list.gabefinder.workers.dev",
  [string]$Token = "",
  [string]$TokenFile = ""
)

$ErrorActionPreference = "Stop"

if (-not $Token -and $TokenFile) {
  $Token = (Get-Content -LiteralPath $TokenFile -Raw).Trim()
}

if (-not $Token -and $env:KOHEE_AUTH_TOKEN) {
  $Token = $env:KOHEE_AUTH_TOKEN.Trim()
}

if (-not $Token) {
  throw "Missing auth token. Pass -Token, -TokenFile, or KOHEE_AUTH_TOKEN."
}

$resolvedCsv = (Resolve-Path -LiteralPath $CsvPath).Path
$content = Get-Content -LiteralPath $resolvedCsv -Raw

Write-Host "[import-csv] uploading $resolvedCsv"
$result = Invoke-RestMethod -Uri ($BaseUrl + "/import-csv") -Method POST -Headers @{
  authorization = "Bearer $Token"
  "content-type" = "text/csv; charset=utf-8"
} -Body $content

$result | ConvertTo-Json -Depth 10
