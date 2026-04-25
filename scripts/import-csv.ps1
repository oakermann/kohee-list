param(
  [Parameter(Mandatory = $true)]
  [string]$CsvPath,
  [string]$BaseUrl = "https://kohee-list.gabefinder.workers.dev",
  [string]$Token = "",
  [string]$TokenFile = "",
  [string]$Username = "",
  [string]$Password = "",
  [switch]$DryRun
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
$importPath = "/import-csv"
if ($DryRun) {
  $importPath = "/import-csv?dryRun=1"
}

if ($Token) {
  $result = Invoke-RestMethod -Uri ($BaseUrl + $importPath) -Method POST -Headers @{
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

  $csrfCookie = $session.Cookies.GetCookies([Uri]$BaseUrl) |
    Where-Object { $_.Name -eq "kohee_csrf" } |
    Select-Object -First 1
  if (-not $csrfCookie) {
    throw "Login succeeded, but CSRF cookie was not returned."
  }

  $result = Invoke-RestMethod -Uri ($BaseUrl + $importPath) -Method POST -WebSession $session -Headers @{
    "content-type" = "text/csv; charset=utf-8"
    "x-csrf-token" = $csrfCookie.Value
  } -Body $content
} else {
  throw "Missing auth credentials. Pass -Username/-Password or legacy -Token/-TokenFile/KOHEE_AUTH_TOKEN."
}

$result | ConvertTo-Json -Depth 10
