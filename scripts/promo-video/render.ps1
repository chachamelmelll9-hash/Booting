# render.ps1 - headless Chrome screenshot of a URL at an exact pixel size.
# ASCII ONLY.
param(
  [Parameter(Mandatory = $true)][string]$Url,
  [Parameter(Mandatory = $true)][string]$Out,
  [int]$W = 1080,
  [int]$H = 1920,
  [double]$Scale = 1,
  [int]$DelayMs = 2500
)
$chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$profileDir = Join-Path $PSScriptRoot 'chrome-profile'
New-Item -ItemType Directory -Force -Path $profileDir | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path $Out -Parent) | Out-Null
if (Test-Path $Out) { Remove-Item $Out -Force }

$a = @(
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions',
  "--user-data-dir=$profileDir",
  "--virtual-time-budget=$DelayMs",
  "--force-device-scale-factor=$Scale",
  "--window-size=$W,$H",
  "--screenshot=$Out",
  $Url
)
& $chrome @a 2>$null | Out-Null
Start-Sleep -Milliseconds 400
$f = Get-Item $Out -ErrorAction SilentlyContinue
if ($f) { "RENDER $(Split-Path $Out -Leaf) : $([math]::Round($f.Length/1KB)) KB" } else { "FAIL $Out" }
