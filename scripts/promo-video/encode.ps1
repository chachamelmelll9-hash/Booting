# encode.ps1 - turn a captured JPEG frame sequence + music into the final mp4.
# ASCII ONLY (PowerShell 5.1 reads a BOM-less UTF-8 .ps1 as ANSI).
param(
  [Parameter(Mandatory = $true)][string]$Frames,
  [Parameter(Mandatory = $true)][string]$Out,
  [string]$Audio = '',
  [int]$Fps = 30,
  [double]$Dur = 60
)
$d = $PSScriptRoot
$ff = Join-Path $d 'node_modules\ffmpeg-static\ffmpeg.exe'

$a = @('-hide_banner', '-loglevel', 'error', '-stats', '-y',
       '-framerate', "$Fps", '-i', (Join-Path $Frames '%05d.jpg'))

if ($Audio) {
  $fadeOut = [math]::Max($Dur - 4, 0.1)
  # build the filter OUTSIDE the array - a line-continued "+" inside @(...)
  # is parsed as two separate elements and the tail becomes an output filename
  $af = "[1:a]atrim=0:$Dur,asetpts=N/SR/TB,loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=in:st=0:d=2,afade=t=out:st=$($fadeOut):d=4[a]"
  $a += @('-i', $Audio, '-filter_complex', $af,
          '-map', '0:v', '-map', '[a]',
          '-c:a', 'aac', '-b:a', '192k')
} else {
  $a += @('-map', '0:v')
}

$a += @('-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
        '-crf', '18', '-preset', 'medium', '-r', "$Fps",
        '-t', "$Dur", '-movflags', '+faststart', $Out)

if ($env:ENCODE_DEBUG) { Write-Host ('ARGS: ' + ($a -join ' | ')) }
& $ff @a
$f = Get-Item $Out -ErrorAction SilentlyContinue
if ($f) { "BUILT $($f.Name) : $([math]::Round($f.Length/1MB,2)) MB" } else { "FAILED $Out" }
