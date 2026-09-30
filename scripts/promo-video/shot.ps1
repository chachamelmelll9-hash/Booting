# shot.ps1 - screenshot the emulator into video\shots\<name>.png and print visible texts.
# ASCII ONLY (see rec.ps1 note).
param(
  [Parameter(Mandatory = $true)][string]$Name,
  [string]$Tap = '',
  [int]$WaitMs = 2500,
  [switch]$Dump
)
$S = 'emulator-5554'
$dir = Join-Path $PSScriptRoot 'video\shots'
New-Item -ItemType Directory -Force -Path $dir | Out-Null

if ($Tap) {
  foreach ($t in $Tap.Split(';')) {
    if (-not $t.Trim()) { continue }
    if ($t -like 'swipe:*') {
      $a = ($t -replace '^swipe:', '') -split ','
      adb -s $S shell input swipe $a[0] $a[1] $a[2] $a[3] $a[4] | Out-Null
    } elseif ($t -eq 'back') {
      adb -s $S shell input keyevent 4 | Out-Null
    } else {
      $a = $t -split ','
      adb -s $S shell input tap $a[0] $a[1] | Out-Null
    }
    Start-Sleep -Milliseconds 700
  }
}
Start-Sleep -Milliseconds $WaitMs

adb -s $S shell screencap -p /sdcard/s.png | Out-Null
adb -s $S pull /sdcard/s.png (Join-Path $dir "$Name.png") | Out-Null
$f = Get-Item (Join-Path $dir "$Name.png") -ErrorAction SilentlyContinue
if ($f) { "SHOT $Name ($([math]::Round($f.Length/1KB)) KB)" } else { "FAIL $Name" }

if ($Dump) {
  adb -s $S shell uiautomator dump /sdcard/ui.xml | Out-Null
  adb -s $S pull /sdcard/ui.xml "$env:TEMP\ui.xml" | Out-Null
  $xml = [System.IO.File]::ReadAllText("$env:TEMP\ui.xml", [System.Text.Encoding]::UTF8)
  foreach ($m in [regex]::Matches($xml, '<node[^>]*>')) {
    $n = $m.Value
    $t = [regex]::Match($n, ' text="([^"]*)"').Groups[1].Value
    $dsc = [regex]::Match($n, ' content-desc="([^"]*)"').Groups[1].Value
    $c = [regex]::Match($n, ' clickable="([^"]*)"').Groups[1].Value
    $b = [regex]::Match($n, ' bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"')
    if (-not $b.Success) { continue }
    if (-not $t -and -not $dsc -and $c -ne 'true') { continue }
    $x = [int]((([int]$b.Groups[1].Value) + ([int]$b.Groups[3].Value)) / 2)
    $y = [int]((([int]$b.Groups[2].Value) + ([int]$b.Groups[4].Value)) / 2)
    $label = if ($t) { $t } elseif ($dsc) { "~ $dsc" } else { '(btn)' }
    "{0,-44} {1},{2} click={3}" -f $label, $x, $y, $c
  }
}
