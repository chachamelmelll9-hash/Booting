#!/bin/bash
# auto mode supervisor — `claude -p` 를 감싸 rate limit 창을 넘겨 파이프라인을 완주시킨다.
#
#   bash scripts/run-auto.sh "문제 설명"     # 새 파이프라인 (/setup auto: ...)
#   bash scripts/run-auto.sh --resume        # 중단 지점에서 재개 (/continue)
#
# run4(pace-share, 2026-08-26) 실측: 5시간 창이 시작 시 14% 였고 146분 만에 100% 로 rejected.
# 파이프라인은 한 창에 끝나지 않는다 (planning 48분 + implement 97분+ + verify 45분).
# 이 스크립트는 stream-json 의 rate_limit_event.utilization 을 감시해
#   - AUTO_PAUSE_UTIL(0.85) 에서 pause 플래그 → 훅이 새 phase/worker 를 시작하지 않음
#   - AUTO_KILL_UTIL(0.97) 또는 rejected 에서 프로세스 종료
#   - resetsAt 까지 대기 후 /continue 로 재기동 (라우터가 pipeline.jsonl 에서 재개 지점을 고른다)
# 를 반복한다. 진행 기록은 docs/progress/*.jsonl 에 남으므로 재기동 시 잃는 것은
# 마지막 turn 의 미기록분뿐이다 — 워커 체크포인트 규약이 그 손실을 줄인다.
#
# 환경변수: AUTO_PAUSE_UTIL AUTO_KILL_UTIL AUTO_MAX_RELAUNCH(12) AUTO_LOG_DIR(docs/progress/runs)
#           AUTO_CLAUDE_ARGS(추가 인자) AUTO_DRY_RUN(1 이면 claude 대신 $AUTO_FAKE_CLAUDE 실행 — 테스트용)
set -uo pipefail
cd "$(dirname "$0")/.."
ROOT=$(pwd)

PROMPT=""
case "${1:-}" in
  --resume) PROMPT="/continue" ;;
  "") echo "usage: $0 \"문제 설명\" | --resume" >&2; exit 2 ;;
  *) PROMPT="/setup auto: $1" ;;
esac

MAX_RELAUNCH=${AUTO_MAX_RELAUNCH:-40}   # phase 마다 재기동하므로 phase 수(12) + 재시도 여유
LOG_DIR=${AUTO_LOG_DIR:-docs/progress/runs}
mkdir -p "$LOG_DIR"
RL_FILE=docs/progress/rate-limit.json
MONITOR="$ROOT/scripts/lib/rate_limit_monitor.py"
CLAUDE_BIN=${AUTO_FAKE_CLAUDE:-claude}

SUP_FILE=docs/progress/supervisor.json
# supervisor 모드 표식 — 살아 있는 동안 Stop 훅은 phase 를 같은 세션에 주입하지 않는다 (phase 마다 새 컨텍스트).
write_sup() { python3 -c "
import sys; sys.path.insert(0,'.codex/hooks')
from lib.ratelimit import write_supervisor
from pathlib import Path
write_supervisor(Path('.'), pid=$$, stalled=None)"; }
trap 'rm -f "$SUP_FILE"' EXIT
write_sup

# 라우터 판정: 첫 줄 action, 둘째 줄부터 다음 phase 프롬프트 (continue 일 때)
route_json() {
  python3 - <<'PY'
import sys, json
from pathlib import Path
sys.path.insert(0, ".codex/hooks")
from lib.progress import load_snapshot, auto_mode_enabled
from lib.router import determine_route
root = Path(".")
snap = load_snapshot(root)
if not auto_mode_enabled(snap):
    print(json.dumps({"action": "disabled"})); sys.exit(0)
r = determine_route(root, snap)
print(json.dumps({"action": r.action, "phase": getattr(r, "phase", None), "prompt": getattr(r, "prompt", None) or ""}))
PY
}
sup_field() { python3 -c "import json,os; d=json.load(open('$SUP_FILE')) if os.path.exists('$SUP_FILE') else {}; v=d.get('$1'); print('' if v is None else v)"; }

rl_field() { python3 -c "import json,sys; d=json.load(open('$RL_FILE')) if __import__('os').path.exists('$RL_FILE') else {}; v=d.get('$1'); print('' if v is None else v)"; }

clear_pause() { python3 -c "
import json,os
p='$RL_FILE'
if os.path.exists(p):
    d=json.load(open(p)); d['paused']=False; d['reason']='cleared by supervisor'
    json.dump(d,open(p,'w'),indent=2)"; }

wait_for_reset() {
  local resets; resets=$(rl_field resets_at)
  local now; now=$(date +%s)
  if [ -z "$resets" ] || [ "$resets" -le "$now" ] 2>/dev/null; then
    echo "[supervisor] resets_at 없음/경과 — 5분 후 재시도"; sleep 300; return
  fi
  local wait=$(( resets - now + 60 ))
  echo "[supervisor] rate limit 창 리셋 대기 ${wait}s (until $(date -r "$resets" '+%H:%M %Z'))"
  sleep "$wait"
}

run=0
while :; do
  run=$((run+1))
  if [ "$run" -gt "$MAX_RELAUNCH" ]; then echo "[supervisor] 재기동 상한 ${MAX_RELAUNCH} 도달 — 중단"; exit 1; fi
  clear_pause
  LOG="$LOG_DIR/run-$(date +%Y%m%d-%H%M%S).jsonl"
  echo "[supervisor] run #$run → $PROMPT  (log: $LOG)"

  # claude 를 백그라운드로 띄우고 stdout 을 모니터에 연결한다. 모니터가 pid 로 SIGTERM 을 보낸다.
  FIFO=$(mktemp -u "${TMPDIR:-/tmp}/run-auto.XXXXXX"); mkfifo "$FIFO"
  # shellcheck disable=SC2086
  "$CLAUDE_BIN" -p "$PROMPT" --output-format stream-json --verbose --dangerously-skip-permissions ${AUTO_CLAUDE_ARGS:-} > "$FIFO" 2>>"$LOG_DIR/stderr.log" &
  CPID=$!
  python3 "$MONITOR" --log "$LOG" --pid "$CPID" --root "$ROOT" < "$FIFO"
  MRC=$?
  wait "$CPID"; CRC=$?
  rm -f "$FIFO"
  echo "[supervisor] claude exit=$CRC monitor exit=$MRC"

  RJ=$(route_json)
  action=$(printf '%s' "$RJ" | python3 -c "import json,sys; print(json.load(sys.stdin)['action'])")
  echo "[supervisor] router action: $action $(printf '%s' "$RJ" | python3 -c "import json,sys; print(json.load(sys.stdin).get('phase') or '')")"
  case "$action" in
    done)     echo "[supervisor] 파이프라인 완료"; exit 0 ;;
    blocked)  echo "[supervisor] 파이프라인 차단 — pipeline.jsonl 의 phase_blocked 확인"; exit 1 ;;
    disabled) echo "[supervisor] auto mode 비활성 — 종료"; exit 0 ;;
  esac
  stalled=$(sup_field stalled)
  if [ -n "$stalled" ] && [ "$stalled" != "None" ]; then echo "[supervisor] 정체 감지 — $stalled"; exit 1; fi

  if [ "$MRC" -eq 75 ] || [ "$MRC" -eq 76 ] || [ "$(rl_field paused)" = "True" ]; then
    wait_for_reset
  else
    sleep 5
  fi
  # 다음 phase 는 라우터 프롬프트로 직접 띄운다 — /continue 나 스킬 체이닝을 거치지 않으므로
  # 각 phase 가 새 MAIN 컨텍스트에서 시작한다. (프롬프트가 비면 /continue 폴백)
  PROMPT=$(printf '%s' "$RJ" | python3 -c "import json,sys; print(json.load(sys.stdin).get('prompt') or '/continue')")
  write_sup
done
