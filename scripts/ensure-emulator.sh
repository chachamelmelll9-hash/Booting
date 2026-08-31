#!/bin/bash
# =============================================================================
# ensure-emulator.sh — ADB 검증에 쓸 Android 에뮬레이터를 "확실히" 준비한다.
#
# 파이프라인의 verify/deploy phase 는 에뮬레이터 위에서 앱 기동과 스크린샷으로
# 동작을 증명한다. 그 준비 과정에서 실측된 결함들을 이 스크립트가 전부 흡수한다:
#
#   1. Apple Silicon 기본 host-GPU 모드에서 `adb screencap` 이 검은 이미지를 준다
#      → -gpu swiftshader_indirect (소프트웨어 렌더링)로 기동
#   2. 화면이 잠들면(mWakefulness=Asleep) 모든 캡처가 동일한 검은 PNG 가 된다
#      → 부팅 후 wake + keyguard 해제 + screen_off_timeout 연장
#   3. 이전 인스턴스가 AVD 락을 놓기 전에 재기동하면
#      "Running multiple emulators with the same AVD" 로 조용히 실패한다
#      → 종료를 확인한 뒤에만 기동
#   4. 툴 호출이 끝나면 자식 프로세스가 함께 죽는 환경이 있다
#      → setsid/nohup 로 세션에서 분리해 기동
#   5. Metro(8081)에 못 붙으면 dev 빌드는 빈 화면만 뜬다
#      → 부팅 후 adb reverse 로 8081/3000/4200/54321 매핑
#
# 사용:
#   bash scripts/ensure-emulator.sh            # 준비 (이미 떠 있으면 재사용)
#   bash scripts/ensure-emulator.sh --restart  # 강제 재기동
#   bash scripts/ensure-emulator.sh --avd NAME
#
# 성공 시 마지막 줄에 EMULATOR_READY=<serial>, 실패 시 EMULATOR_FAILED=<사유>
# =============================================================================
set -uo pipefail

SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
EMU="$SDK/emulator/emulator"
ADB="$(command -v adb || echo "$SDK/platform-tools/adb")"
RESTART=false
AVD=""
REVERSE_PORTS="8081 3000 4200 54321"

while [ $# -gt 0 ]; do
  case "$1" in
    --restart) RESTART=true; shift ;;
    --avd) AVD="${2:?--avd requires a name}"; shift 2 ;;
    *) shift ;;
  esac
done

[ -x "$EMU" ] || { echo "EMULATOR_FAILED=no-emulator-binary ($EMU)"; exit 1; }
[ -x "$ADB" ] || { echo "EMULATOR_FAILED=no-adb"; exit 1; }

booted() { [ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; }

wake_up() {
  "$ADB" shell input keyevent KEYCODE_WAKEUP >/dev/null 2>&1
  "$ADB" shell wm dismiss-keyguard >/dev/null 2>&1 || "$ADB" shell input keyevent 82 >/dev/null 2>&1
  "$ADB" shell settings put system screen_off_timeout 1800000 >/dev/null 2>&1
  "$ADB" shell svc power stayon true >/dev/null 2>&1
}

set_reverse() { for p in $REVERSE_PORTS; do "$ADB" reverse "tcp:$p" "tcp:$p" >/dev/null 2>&1; done; }

finish_ok() {
  wake_up
  set_reverse
  local state; state=$("$ADB" shell dumpsys power 2>/dev/null | grep -m1 mWakefulness | tr -d '\r ')
  local serial; serial=$("$ADB" devices | awk '/device$/{print $1; exit}')
  echo "wakefulness: ${state:-unknown}"
  echo "reverse: $("$ADB" reverse --list 2>/dev/null | wc -l | tr -d ' ') mappings"
  echo "EMULATOR_READY=${serial:-emulator}"
  exit 0
}

# --- 이미 준비돼 있으면 재사용 ---
if [ "$RESTART" = false ] && booted; then
  echo "reusing running emulator"
  finish_ok
fi

# --- 기존 인스턴스 종료 + 락 해제 대기 (결함 3) ---
if "$ADB" devices | grep -q "device$"; then
  echo "stopping existing emulator..."
  "$ADB" emu kill >/dev/null 2>&1
fi
# 프로세스 "이름"으로만 매칭한다. -f 로 전체 명령줄을 매칭하면 같은 문자열을 담은
# 셸(예: 이 스크립트를 호출한 에이전트의 셸)까지 잡혀 엉뚱한 프로세스를 죽인다.
emu_running() { pgrep -x qemu-system-aarch64 >/dev/null 2>&1 || pgrep -x qemu-system-x86_64 >/dev/null 2>&1; }
for _ in $(seq 1 20); do
  emu_running || break
  sleep 1
done
if emu_running; then
  pkill -x qemu-system-aarch64 >/dev/null 2>&1
  pkill -x qemu-system-x86_64  >/dev/null 2>&1
  sleep 5
fi

# --- AVD 선택 ---
[ -z "$AVD" ] && AVD=$("$EMU" -list-avds 2>/dev/null | head -1)
[ -z "$AVD" ] && { echo "EMULATOR_FAILED=no-avd (Android Studio > Device Manager 에서 AVD 생성 필요)"; exit 1; }
echo "avd: $AVD"

# --- 기동 (결함 1, 4) ---
LOG="${TMPDIR:-/tmp}/ensure-emulator-$$.log"
LAUNCH=("$EMU" -avd "$AVD" -gpu swiftshader_indirect -no-boot-anim -no-snapshot-load -no-audio)
if command -v setsid >/dev/null 2>&1; then
  setsid "${LAUNCH[@]}" > "$LOG" 2>&1 < /dev/null &
else
  nohup "${LAUNCH[@]}" > "$LOG" 2>&1 < /dev/null &
fi
disown 2>/dev/null || true
echo "launching (swiftshader), log: $LOG"

# --- 부팅 대기 (소프트웨어 렌더링은 느리다) ---
for i in $(seq 1 60); do
  sleep 5
  if booted; then
    echo "booted after $((i*5))s"
    sleep 3
    finish_ok
  fi
  if [ "$i" = "6" ] && ! "$ADB" devices | grep -q "device$"; then
    "$ADB" kill-server >/dev/null 2>&1; "$ADB" start-server >/dev/null 2>&1
  fi
  if grep -q "Running multiple emulators with the same AVD" "$LOG" 2>/dev/null; then
    echo "EMULATOR_FAILED=avd-locked (이전 인스턴스가 아직 락을 쥐고 있다 — --restart 로 재시도)"
    exit 1
  fi
done

echo "--- launch log tail ---"; tail -15 "$LOG" 2>/dev/null
echo "EMULATOR_FAILED=boot-timeout (300s)"
exit 1
