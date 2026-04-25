param(
  [string]$BaseUrl = "https://kohee-list.gabefinder.workers.dev",
  [ValidateSet("basic", "full")]
  [string]$Mode = "full",
  [string]$DatabaseName = "kohee-list",
  [string]$Workspace = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"

function Get-CsrfToken {
  param([Microsoft.PowerShell.Commands.WebRequestSession]$Session)
  if (-not $Session) { return "" }
  $cookies = $Session.Cookies.GetCookies([Uri]$BaseUrl)
  $csrf = $cookies | Where-Object { $_.Name -eq "kohee_csrf" } | Select-Object -First 1
  if ($csrf) { return $csrf.Value }
  return ""
}

function New-JsonHeaders {
  param([Microsoft.PowerShell.Commands.WebRequestSession]$Session = $null)
  $headers = @{ "content-type" = "application/json" }
  if ($Session) {
    $csrf = Get-CsrfToken $Session
    if ($csrf) { $headers["x-csrf-token"] = $csrf }
  }
  return $headers
}

function Invoke-Api {
  param(
    [string]$Method,
    [string]$Path,
    $Body = $null,
    [Microsoft.PowerShell.Commands.WebRequestSession]$Session = $null,
    [string]$Token = ""
  )

  $headers = @{}
  if ($Token) { $headers["authorization"] = "Bearer $Token" }
  if ($Session -and @("POST", "PUT", "PATCH", "DELETE") -contains $Method.ToUpper()) {
    $csrf = Get-CsrfToken $Session
    if ($csrf) { $headers["x-csrf-token"] = $csrf }
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

function Invoke-TextApi {
  param(
    [string]$Path,
    [string]$Body,
    [Microsoft.PowerShell.Commands.WebRequestSession]$Session
  )
  $headers = @{ "content-type" = "text/plain; charset=utf-8" }
  $csrf = Get-CsrfToken $Session
  if ($csrf) { $headers["x-csrf-token"] = $csrf }
  return Invoke-RestMethod -Uri ($BaseUrl + $Path) -Method POST -Headers $headers -Body $Body -WebSession $Session
}

function Invoke-CsvApi {
  param(
    [string]$Path,
    [string]$Body,
    [Microsoft.PowerShell.Commands.WebRequestSession]$Session
  )
  $headers = @{ "content-type" = "text/csv; charset=utf-8" }
  $csrf = Get-CsrfToken $Session
  if ($csrf) { $headers["x-csrf-token"] = $csrf }
  return Invoke-RestMethod -Uri ($BaseUrl + $Path) -Method POST -Headers $headers -Body $Body -WebSession $Session
}

function Get-ApiStatus {
  param(
    [string]$Method,
    [string]$Path,
    $Body = $null,
    [Microsoft.PowerShell.Commands.WebRequestSession]$Session = $null
  )
  try {
    Invoke-Api $Method $Path $Body $Session | Out-Null
    return 200
  } catch {
    $response = $_.Exception.Response
    if ($response) { return [int]$response.StatusCode }
    throw
  }
}

function Assert-Status {
  param(
    [string]$Label,
    [int]$Actual,
    [int]$Expected
  )
  if ($Actual -ne $Expected) {
    throw "$Label expected HTTP $Expected but got $Actual"
  }
}

function Invoke-D1 {
  param([string]$Sql)
  npx.cmd wrangler d1 execute $DatabaseName --remote --command $Sql | Out-Null
}

function Get-CafeById {
  param([string]$CafeId)
  $items = Invoke-RestMethod -Uri ($BaseUrl + "/data") -Method GET
  return $items | Where-Object { $_.id -eq $CafeId } | Select-Object -First 1
}

$runId = [Guid]::NewGuid().ToString("N").Substring(0, 8)
$username = "sm$runId"
$targetUsername = "sg$runId"
$password = "Password123!"
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$targetSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$createdCafeIds = New-Object System.Collections.Generic.List[string]
$submissionId = ""
$errorReportId = ""
$originalNotice = $null

Push-Location $Workspace
try {
  Write-Host "[smoke] checking /health"
  $health = Invoke-RestMethod -Uri ($BaseUrl + "/health") -Method GET
  if (-not $health.ok) { throw "health failed" }

  Write-Host "[smoke] checking /data"
  $data = Invoke-RestMethod -Uri ($BaseUrl + "/data") -Method GET
  if (-not $data -or -not $data[0].id) { throw "data failed" }
  $favoriteCafeId = $data[0].id

  Write-Host "[smoke] signup/login/me/csrf"
  Invoke-Api "POST" "/signup" @{ username = $username; password = $password } | Out-Null
  Invoke-Api "POST" "/login" @{ username = $username; password = $password } $session | Out-Null
  if (-not (Get-CsrfToken $session)) { throw "csrf cookie missing after login" }
  $me = Invoke-Api "GET" "/me" $null $session
  if ($me.user.username -ne $username) { throw "me mismatch" }

  Write-Host "[smoke] user forbidden /add"
  Assert-Status "ordinary user /add" (Get-ApiStatus "POST" "/add" @{ name="Smoke Forbidden"; address="Smoke"; desc="Smoke" } $session) 403

  Write-Host "[smoke] login rate limit"
  $fakeUser = "bad$runId"
  for ($i = 1; $i -le 5; $i += 1) {
    Assert-Status "bad login $i" (Get-ApiStatus "POST" "/login" @{ username=$fakeUser; password="wrong-password" }) 401
  }
  Assert-Status "bad login rate limited" (Get-ApiStatus "POST" "/login" @{ username=$fakeUser; password="wrong-password" }) 429

  Write-Host "[smoke] favorites"
  Invoke-Api "POST" "/favorite" @{ cafe_id = $favoriteCafeId; action = "add" } $session | Out-Null
  $favorites = Invoke-Api "GET" "/favorites" $null $session
  if (-not @($favorites.items | Where-Object { $_.cafe.id -eq $favoriteCafeId }).Count) { throw "favorites mismatch" }

  Write-Host "[smoke] submissions"
  $submitRes = Invoke-Api "POST" "/submit" @{ name="Smoke Test Cafe $runId"; address="1 Smoke Street"; desc="Smoke submission"; reason="smoke"; category=@("espresso") } $session
  $submissionId = $submitRes.submission_id
  $mySubmits = Invoke-Api "GET" "/my-submits" $null $session
  if (-not @($mySubmits.items | Where-Object { $_.id -eq $submissionId }).Count) { throw "my-submits mismatch" }

  Write-Host "[smoke] error reports"
  $errorRes = Invoke-Api "POST" "/error-report" @{ title="Smoke error $runId"; page="index"; content="Smoke content" } $session
  $errorReportId = $errorRes.id
  $myErrors = Invoke-Api "GET" "/my-error-reports" $null $session
  if (-not @($myErrors.items | Where-Object { $_.id -eq $errorReportId }).Count) { throw "my-error-reports mismatch" }

  if ($Mode -eq "full") {
    Write-Host "[smoke] promoting temp user to admin"
    Invoke-D1 "UPDATE users SET role = 'admin' WHERE username = '$username';"

    Write-Host "[smoke] admin users and set-role"
    Invoke-Api "POST" "/signup" @{ username = $targetUsername; password = $password } | Out-Null
    Invoke-Api "POST" "/login" @{ username = $targetUsername; password = $password } $targetSession | Out-Null
    $users = Invoke-Api "GET" "/users?q=$targetUsername" $null $session
    if (-not $users.ok) { throw "users route failed" }
    Invoke-Api "POST" "/set-role" @{ username=$targetUsername; role="manager" } $session | Out-Null
    Assert-Status "cannot modify admin role" (Get-ApiStatus "POST" "/set-role" @{ username=$username; role="manager" } $session) 403

    Write-Host "[smoke] manager pick boundary"
    $managerAdd = Invoke-Api "POST" "/add" @{ name="Smoke Manager Cafe $runId"; address="2 Manager Street"; desc="manager smoke"; oakerman_pick=$true; manager_pick=$true; category=@("drip") } $targetSession
    $createdCafeIds.Add($managerAdd.id) | Out-Null
    $managerCafe = Get-CafeById $managerAdd.id
    if ($managerCafe.oakerman_pick -or -not $managerCafe.manager_pick) { throw "manager pick permission failed" }
    Invoke-Api "POST" "/edit" @{ id=$managerAdd.id; name="Smoke Manager Cafe $runId"; address="2 Manager Street"; desc="admin edit smoke"; oakerman_pick=$true; manager_pick=$true; category=@("drip") } $session | Out-Null
    $adminEditedCafe = Get-CafeById $managerAdd.id
    if (-not $adminEditedCafe.oakerman_pick) { throw "admin oakerman_pick edit failed" }

    Write-Host "[smoke] CSV dry-run/import"
    $csvId = "smokecsv$runId"
    $csv = "id,name,address,desc,lat,lng,category`n$csvId,Smoke CSV Cafe $runId,3 CSV Street,CSV smoke,0,0,espresso"
    $dry = Invoke-CsvApi "/import-csv?dryRun=1" $csv $session
    if (-not $dry.dryRun -or [int]$dry.wouldAdd -lt 1) { throw "csv dry-run failed" }
    $imported = Invoke-CsvApi "/import-csv" $csv $session
    if ([int]$imported.added -lt 1) { throw "csv import failed" }
    $createdCafeIds.Add($csvId) | Out-Null

    Write-Host "[smoke] submission update/approve/reject"
    Invoke-Api "POST" "/update-submission" @{ id=$submissionId; name="Smoke Approved Cafe $runId"; address="4 Approved Street"; desc="approved smoke"; category=@("espresso"); oakerman_pick=$true; manager_pick=$true } $session | Out-Null
    $approved = Invoke-Api "POST" "/approve" @{ submissionId=$submissionId } $session
    if (-not $approved.linked_cafe_id) { throw "approve failed" }
    $createdCafeIds.Add($approved.linked_cafe_id) | Out-Null

    $rejectRes = Invoke-Api "POST" "/submit" @{ name="Smoke Reject Cafe $runId"; address="5 Reject Street"; desc="reject smoke"; reason="smoke" } $session
    Invoke-Api "POST" "/reject" @{ submissionId=$rejectRes.submission_id; reject_reason="smoke reject" } $session | Out-Null

    Write-Host "[smoke] error reply/resolve"
    Invoke-Api "POST" "/reply-error-report" @{ id=$errorReportId; message="reply smoke ok" } $session | Out-Null
    Invoke-Api "POST" "/resolve-error-report" @{ id=$errorReportId } $session | Out-Null

    Write-Host "[smoke] notice update/restore"
    $originalNotice = Invoke-RestMethod -Uri ($BaseUrl + "/notice") -Method GET
    Invoke-TextApi "/notice" "Smoke notice $runId" $session | Out-Null
    Invoke-TextApi "/notice" ([string]$originalNotice) $session | Out-Null
  }

  Write-Host "[smoke] favorite cleanup and logout"
  Invoke-Api "POST" "/favorite" @{ cafe_id = $favoriteCafeId; action = "remove" } $session | Out-Null
  Invoke-Api "POST" "/logout" $null $session | Out-Null

  [pscustomobject]@{
    username = $username
    target_username = $targetUsername
    mode = $Mode
    submission = if ($submissionId) { "ok" } else { "missing" }
    error_report = if ($errorReportId) { "ok" } else { "missing" }
    csrf = "ok"
    rate_limit = "ok"
    ok = $true
  } | ConvertTo-Json -Compress
} finally {
  try {
    foreach ($id in $createdCafeIds) {
      if ($id) { Invoke-D1 "DELETE FROM cafes WHERE id = '$id';" }
    }
    Invoke-D1 "DELETE FROM cafes WHERE name LIKE 'Smoke % $runId' OR name LIKE 'Smoke%$runId';"
    Invoke-D1 "DELETE FROM users WHERE username IN ('$username', '$targetUsername');"
    Invoke-D1 "DELETE FROM submissions WHERE name LIKE 'Smoke%$runId';"
    Invoke-D1 "DELETE FROM error_reports WHERE title LIKE 'Smoke%$runId';"
  } catch {}

  Pop-Location
}
