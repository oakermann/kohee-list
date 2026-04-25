param(
  [Parameter(Mandatory = $true)]
  [string]$CsvPath,
  [string]$BaseUrl = "https://kohee-list.gabefinder.workers.dev",
  [string]$Token = "",
  [string]$TokenFile = "",
  [string]$Username = "",
  [string]$Password = ""
)

$ErrorActionPreference = "Stop"

if (-not $Token -and $TokenFile) {
  $Token = (Get-Content -LiteralPath $TokenFile -Raw).Trim()
}

if (-not $Token -and $env:KOHEE_AUTH_TOKEN) {
  $Token = $env:KOHEE_AUTH_TOKEN.Trim()
}

$resolvedCsv = (Resolve-Path -LiteralPath $CsvPath).Path
$content = Get-Content -LiteralPath $resolvedCsv -Raw

Write-Host "[import-csv] uploading $resolvedCsv"

if ($Token) {
  $result = Invoke-RestMethod -Uri ($BaseUrl + "/import-csv") -Method POST -Headers @{
    authorization = "Bearer $Token"
    "content-type" = "text/csv; charset=utf-8"
  } -Body $content
} elseif ($Username -and $Password) {
  $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $loginBody = @{
    username = $Username.Trim().ToLower()
    password = $Password
  } | ConvertTo-Json -Compress

  Invoke-RestMethod -Uri ($BaseUrl + "/login") -Method POST -WebSession $session -Headers @{
    "content-type" = "application/json"
  } -Body $loginBody | Out-Null

  $result = Invoke-RestMethod -Uri ($BaseUrl + "/import-csv") -Method POST -WebSession $session -Headers @{
    "content-type" = "text/csv; charset=utf-8"
  } -Body $content
} else {
  throw "Missing auth credentials. Pass -Username/-Password or legacy -Token/-TokenFile/KOHEE_AUTH_TOKEN."
}

$result | ConvertTo-Json -Depth 10
