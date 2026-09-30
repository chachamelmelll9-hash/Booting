# crop.ps1 - normalise every phone image to 1080x2230 (the phone-screen aspect used in scene.html)
# ASCII ONLY.
$d = $PSScriptRoot
$ff = Join-Path $d 'video\node_modules\ffmpeg-static\ffmpeg.exe'
$src = Join-Path $d 'video\shots'
$dst = Join-Path $d 'video\screens'
New-Item -ItemType Directory -Force -Path $dst | Out-Null

# app screenshots are 1080x2400 -> drop the status bar, keep the tab bar
$app = @(
  '01_home_gems', '02_expanded', '03_profile_top', '04_profile_mid',
  '07_matched', '08_chat', '09_connections', '10_hearts', '11_hearts_expanded'
)
foreach ($n in $app) {
  $in = Join-Path $src "$n.png"
  if (-not (Test-Path $in)) { "MISS $n"; continue }
  & $ff -v error -y -i $in -vf "crop=1080:2230:0:170" (Join-Path $dst "$n.png")
  "OK $n"
}

# parent pages: crop the region that ends just after the decision / contact block
& $ff -v error -y -i (Join-Path $src '13_tall.png') -vf "crop=1080:2230:0:2240" (Join-Path $dst 'p_decide.png')
"OK p_decide"
& $ff -v error -y -i (Join-Path $src '14_tall.png') -vf "crop=1080:2230:0:2250" (Join-Path $dst 'p_matched.png')
"OK p_matched"
