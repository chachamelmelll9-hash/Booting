# 개발 스택을 내린다 (dev-up.ps1 로 띄운 것들).
#
# 포트로 찾아 죽인다 — 독립 프로세스라 세션에 매여 있지 않기 때문에,
# 사람이 명시적으로 내려야 한다.

function Stop-Port([int]$Port, [string]$Name) {
  $c = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if ($c) {
    $c | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
    Write-Host "$Name 종료 ($Port)"
  } else {
    Write-Host "$Name 실행 중 아님 ($Port)"
  }
}

Stop-Port 3000 'API 서버'
Stop-Port 8081 'Metro'

$t = Get-Process cloudflared -ErrorAction SilentlyContinue
if ($t) { $t | Stop-Process -Force; Write-Host 'cloudflared 종료' } else { Write-Host 'cloudflared 실행 중 아님' }
