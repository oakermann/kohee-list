param(
  [string]$BaseUrl = "https://kohee-list.gabefinder.workers.dev",
  [ValidateSet("basic", "full")]
  [string]$Mode = "full",
  [string]$DatabaseName = "kohee-list",
  [string]$Workspace = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"

function Invoke-Api {
  param(
    [string]$Method,
    [string]$Path,
    $Body = $null,
    [Microsoft.PowerShell.Commands.WebRequestSession]$Session = $null,
    [string]$Token = ""
  )

  $headers = @{}
  if ($Token) {
    $headers["authorization"] = "Bearer $Token"
  }

  if ($null -ne $Body) {
    $headers["content-type"] = "application/json"
    $json = $Body | ConvertTo-Json -Compress -Depth 10
    if ($Session) {
      return Invoke-RestMethod -Uri ($BaseUrl + $Path) -Method $Method -Headers $headers -Body $json -WebSession $Session
    }
    return Invoke-RestMethod -Uri ($BaseUrl + $Path) -Method $Method -Headers $headers -Body $json
  }

  if ($Session) {
    return Invoke-RestMethod -Uri ($BaseUrl + $Path) -Method $Method -Headers $headers -WebSession $Session
  }
  return Invoke-RestMethod -Uri ($BaseUrl + $Path) -Method $Method -Headers $headers
}

$username = "sm" + [Guid]::NewGuid().ToString("N").Substring(0, 8)
$password = "Password123!"
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$favoriteCafeId = ""
$createdCafeId = ""
$submissionId = ""
$errorReportId = ""

Push-Location $Workspace
try {
  Write-Host "[smoke] checking /health"
  $health = Invoke-RestMethod -Uri ($BaseUrl + "/health") -Method GET
  if (-not $health.ok) {
    throw "health failed"
  }

  Write-Host "[smoke] checking /data"
  $data = Invoke-RestMethod -Uri ($BaseUrl + "/data") -Method GET
  if (-not $data -or -not $data[0].id) {
    throw "data failed"
  }
  $favoriteCafeId = $data[0].id

  Write-Host "[smoke] signup/login/me"
  $null = Invoke-Api "POST" "/signup" @{
    username = $username
    password = $password
  }
  $login = Invoke-Api "POST" "/login" @{
    username = $username
    password = $password
  } $session
  $me = Invoke-Api "GET" "/me" $null $session
  if ($me.user.username -ne $username) {
    throw "me mismatch"
  }

  Write-Host "[smoke] favorites"
  $null = Invoke-Api "POST" "/favorite" @{
    cafe_id = $favoriteCafeId
    action = "add"
  } $session
  $favorites = Invoke-Api "GET" "/favorites" $null $session
  if (-not @($favorites.items | Where-Object { $_.cafe.id -eq $favoriteCafeId }).Count) {
    throw "favorites mismatch"
  }

  Write-Host "[smoke] submissions"
  $submitRes = Invoke-Api "POST" "/submit" @{
    name = "Smoke Test Cafe"
    address = "1 Smoke Street"
    desc = "Smoke submission"
    reason = "smoke"
    category = @("espresso")
  } $session
  $submissionId = $submitRes.submission_id
  $mySubmits = Invoke-Api "GET" "/my-submits" $null $session
  if (-not @($mySubmits.items | Where-Object { $_.id -eq $submissionId }).Count) {
    throw "my-submits mismatch"
  }

  Write-Host "[smoke] error reports"
  $errorRes = Invoke-Api "POST" "/error-report" @{
    title = "Smoke error"
    page = "index"
    content = "Smoke content"
  } $session
  $errorReportId = $errorRes.id
  $myErrors = Invoke-Api "GET" "/my-error-reports" $null $session
  if (-not @($myErrors.items | Where-Object { $_.id -eq $errorReportId }).Count) {
    throw "my-error-reports mismatch"
  }

  if ($Mode -eq "full") {
    Write-Host "[smoke] promoting temp user to admin"
    npx.cmd wrangler d1 execute $DatabaseName --remote --command "UPDATE users SET role = 'admin' WHERE username = '$username';" | Out-Null

    Write-Host "[smoke] admin routes"
    $users = Invoke-Api "GET" "/users?q=" $null $session
    if (-not $users.ok) {
      throw "users route failed"
    }

    $null = Invoke-Api "POST" "/reply-error-report" @{
      id = $errorReportId
      message = "reply smoke ok"
    } $session
    $null = Invoke-Api "POST" "/resolve-error-report" @{
      id = $errorReportId
    } $session

    $addCafeRes = Invoke-Api "POST" "/add" @{
      name = "Smoke Admin Cafe"
      address = "2 Admin Street"
      desc = "Smoke admin cafe"
      category = @("drip")
    } $session
    $createdCafeId = $addCafeRes.id
    $null = Invoke-Api "POST" "/delete" @{
      id = $createdCafeId
    } $session
    $createdCafeId = ""
  }

  Write-Host "[smoke] favorite cleanup"
  $null = Invoke-Api "POST" "/favorite" @{
    cafe_id = $favoriteCafeId
    action = "remove"
  } $session

  [pscustomobject]@{
    username = $username
    mode = $Mode
    submission = if ($submissionId) { "ok" } else { "missing" }
    error_report = if ($errorReportId) { "ok" } else { "missing" }
    ok = $true
  } | ConvertTo-Json -Compress
} finally {
  try {
    if ($createdCafeId -and $session) {
      Invoke-Api "POST" "/delete" @{ id = $createdCafeId } $session | Out-Null
    }
  } catch {}

  try {
    npx.cmd wrangler d1 execute $DatabaseName --remote --command "DELETE FROM users WHERE username = '$username';" | Out-Null
  } catch {}

  Pop-Location
}
