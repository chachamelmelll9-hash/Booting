# 개발 스택을 **독립 프로세스**로 띄운다.
#
# 왜 필요한가: 에이전트 세션의 백그라운드 작업으로 띄우면 세션이 정리될 때 같이
# 죽는다. 테스트 도중 서버가 사라져 앱이 "프로필을 볼 수 없습니다" 를 띄웠고,
# 원인을 앱에서 찾느라 시간을 버렸다. 개발 서버는 사람이 끄기 전까지 살아 있어야 한다.
#
# 사용:
#   powershell -ExecutionPolicy Bypass -File scripts\dev-up.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\dev-down.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$logs = Join-Path $root 'logs'
New-Item -ItemType Directory -Force -Path $logs | Out-Null

function Test-Port([int]$Port) {
  $null -ne (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Start-Detached([string]$Name, [string]$WorkDir, [string]$Command) {
  $out = Join-Path $logs "$Name.log"
  $err = Join-Path $logs "$Name.err.log"
  Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', $Command `
    -WorkingDirectory $WorkDir -WindowStyle Hidden `
    -RedirectStandardOutput $out -RedirectStandardError $err | Out-Null
  Write-Host "$Name 시작 (로그: logs\$Name.log)"
}

# --- API 서버 -----------------------------------------------------------------
if (Test-Port 3000) {
  Write-Host 'API 서버 이미 실행 중 (3000)'
} else {
  Start-Detached 'server' (Join-Path $root 'apps\server') 'pnpm dev'
}

# --- Metro --------------------------------------------------------------------
if (Test-Port 8081) {
  Write-Host 'Metro 이미 실행 중 (8081)'
} else {
  Start-Detached 'metro' (Join-Path $root 'apps\mobile') 'npx expo start --port 8081'
}

# --- cloudflared 터널 ----------------------------------------------------------
# 부모님 동의 링크와 카카오 서버 콜백이 바깥에서 닿으려면 필요하다.
if (Get-Process cloudflared -ErrorAction SilentlyContinue) {
  Write-Host 'cloudflared 이미 실행 중'
} else {
  Start-Detached 'tunnel' $root 'C:\proj\cloudflared.exe tunnel --url http://localhost:3000'
}

Write-Host ''
Write-Host '기동 확인 중...'
foreach ($i in 1..30) {
  Start-Sleep -Seconds 2
  if ((Test-Port 3000) -and (Test-Port 8081)) { break }
}
Write-Host ("API 서버 (3000) : " + $(if (Test-Port 3000) { 'UP' } else { 'DOWN' }))
Write-Host ("Metro   (8081) : " + $(if (Test-Port 8081) { 'UP' } else { 'DOWN' }))

# 터널 주소는 매번 바뀐다 — 서버가 동의 링크에 쓸 주소를 여기서 맞춰 준다
$tunnelLog = Join-Path $logs 'tunnel.log'
$tunnelErr = Join-Path $logs 'tunnel.err.log'
$url = $null
foreach ($i in 1..20) {
  foreach ($f in @($tunnelErr, $tunnelLog)) {
    if (Test-Path $f) {
      $m = [regex]::Match((Get-Content $f -Raw -ErrorAction SilentlyContinue), 'https://[a-z0-9-]+\.trycloudflare\.com')
      if ($m.Success) { $url = $m.Value; break }
    }
  }
  if ($url) { break }
  Start-Sleep -Seconds 2
}
if ($url) {
  Write-Host "터널          : $url"
  Write-Host ''
  Write-Host '.env.development 의 PUBLIC_BASE_URL 을 이 주소로 맞추려면:'
  Write-Host "  카카오 콘솔 서버 콜백도 $url/api/kakao/share-callback 로 바꿔야 한다"
} else {
  Write-Host '터널          : 주소를 아직 못 읽었다 (logs\tunnel.err.log 확인)'
}

# 에뮬레이터가 붙어 있으면 포트 포워딩까지 걸어 준다
if ((adb devices 2>$null) -match 'emulator') {
  adb reverse tcp:8081 tcp:8081 2>$null | Out-Null
  adb reverse tcp:3000 tcp:3000 2>$null | Out-Null
  Write-Host 'adb reverse   : 설정 완료'
}
