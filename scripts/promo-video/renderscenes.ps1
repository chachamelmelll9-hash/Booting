# renderscenes.ps1 - render every scene of scene.html to video\scenes\<id>.png
# ASCII ONLY.
param([string]$Only = '')
$d = $PSScriptRoot
$base = 'file:///' + ($d -replace '\\', '/') + '/video/scene.html'

# scene id -> optional extra query (glow / off)
$scenes = [ordered]@{
  s1  = ''
  s2  = ''
  s3  = ''
  s4  = '&glow=26,262,622,555'
  s5  = ''
  s6  = ''
  s7  = '&glow=38,126,600,140'
  s8  = '&glow=525,200,112,62'
  s9  = '&glow=36,1010,612,98'
  s10 = '&glow=34,902,620,280'
  s11 = ''
}

foreach ($k in $scenes.Keys) {
  if ($Only -and $k -ne $Only) { continue }
  $url = "$base`?s=$k$($scenes[$k])"
  & (Join-Path $d 'render.ps1') -Url $url -Out (Join-Path $d "video\scenes\$k.png") -W 1080 -H 1920 -Scale 1 -DelayMs 3500
}
