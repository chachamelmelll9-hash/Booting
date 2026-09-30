# build.ps1 - compose the 60s Booting promo from the rendered scene PNGs.
# ASCII ONLY.
param([string]$Audio = '', [string]$Out = '')

$d = $PSScriptRoot
$ff = Join-Path $d 'video\node_modules\ffmpeg-static\ffmpeg.exe'
$sc = Join-Path $d 'video\scenes'
if (-not $Out) { $Out = Join-Path $d 'video\booting-promo-60s.mp4' }

# scene, seconds, zoom direction (1 = in, -1 = out)
$plan = @(
  @('s1', 5.5, 1), @('s2', 6.5, -1), @('s3', 5.0, 1), @('s4', 6.5, -1),
  @('s5', 6.0, 1), @('s6', 6.0, -1), @('s7', 6.5, 1), @('s8', 6.5, -1),
  @('s9', 6.5, 1), @('s10', 5.5, -1), @('s11', 3.5, 1)
)
$XF = 0.4
$FPS = 30
$ZMAX = 1.07

$inputs = @()
$filters = @()
for ($i = 0; $i -lt $plan.Count; $i++) {
  $name = $plan[$i][0]; $dur = [double]$plan[$i][1]; $dir = [int]$plan[$i][2]
  # single still frame in: zoompan generates exactly $frames frames from it.
  # (with -loop 1 it multiplies d by every input frame and the clip explodes)
  $inputs += @('-i', (Join-Path $sc "$name.png"))
  $frames = [int]($dur * $FPS)
  $step = ($ZMAX - 1.0) / $frames
  if ($dir -eq 1) { $z = "min(1+$step*on,$ZMAX)" } else { $z = "max($ZMAX-$step*on,1.0)" }
  $filters += "[$i`:v]scale=2160:3840:flags=lanczos,zoompan=z='$z':d=$frames" +
              ":x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=$FPS,setsar=1[v$i]"
}

# chain the crossfades
$offset = 0.0
$prev = 'v0'
for ($i = 1; $i -lt $plan.Count; $i++) {
  $offset += [double]$plan[$i - 1][1] - $XF
  $label = if ($i -eq $plan.Count - 1) { 'vout' } else { "x$i" }
  $filters += "[$prev][v$i]xfade=transition=fade:duration=$($XF):offset=$([math]::Round($offset,3))[$label]"
  $prev = $label
}

$fc = ($filters -join ';')
$fcFile = Join-Path $d 'video\filter.txt'
Set-Content -Path $fcFile -Value $fc -Encoding ascii

$args = @()
$args += $inputs
if ($Audio) { $args += @('-i', $Audio) }
$args += @('-filter_complex_script', $fcFile, '-map', '[vout]')
if ($Audio) {
  $n = $plan.Count
  $args += @('-map', "$n`:a", '-c:a', 'aac', '-b:a', '192k', '-shortest',
             '-af', 'afade=t=in:st=0:d=1.5,afade=t=out:st=57.5:d=2.5,volume=0.85')
}
$args += @('-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
           '-r', "$FPS", '-crf', '18', '-preset', 'medium', '-movflags', '+faststart', '-y', $Out)

& $ff -hide_banner -loglevel error -stats @args
$f = Get-Item $Out -ErrorAction SilentlyContinue
if ($f) { "BUILT $($f.Name) : $([math]::Round($f.Length/1MB,2)) MB" } else { "BUILD FAILED" }
