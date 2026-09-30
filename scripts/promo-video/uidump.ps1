param([string]$Serial = 'emulator-5554')
adb -s $Serial shell uiautomator dump /sdcard/ui.xml | Out-Null
adb -s $Serial pull /sdcard/ui.xml "$env:TEMP\ui.xml" | Out-Null
$xml = [System.IO.File]::ReadAllText("$env:TEMP\ui.xml", [System.Text.Encoding]::UTF8)
foreach ($m in [regex]::Matches($xml, '<node[^>]*>')) {
  $n = $m.Value
  $t = [regex]::Match($n, ' text="([^"]*)"').Groups[1].Value
  $d = [regex]::Match($n, ' content-desc="([^"]*)"').Groups[1].Value
  $c = [regex]::Match($n, ' clickable="([^"]*)"').Groups[1].Value
  $b = [regex]::Match($n, ' bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"')
  if (-not $b.Success) { continue }
  $x = [int]((([int]$b.Groups[1].Value) + ([int]$b.Groups[3].Value)) / 2)
  $y = [int]((([int]$b.Groups[2].Value) + ([int]$b.Groups[4].Value)) / 2)
  $w = ([int]$b.Groups[3].Value) - ([int]$b.Groups[1].Value)
  $h = ([int]$b.Groups[4].Value) - ([int]$b.Groups[2].Value)
  if (-not $t -and -not $d -and $c -ne 'true') { continue }
  $label = if ($t) { $t } elseif ($d) { "[desc] $d" } else { '(no text)' }
  "{0,-46} tap={1},{2}  size={3}x{4}  click={5}" -f $label, $x, $y, $w, $h, $c
}
