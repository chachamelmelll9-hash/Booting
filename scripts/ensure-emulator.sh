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
#   ANDROID_SERIAL=emulator-5556 bash scripts/ensure-emulator.sh
#     여러 대를 띄워 놓고 그중 하나만 준비할 때. 지정하지 않으면 붙어 있는
#     첫 기기를 맡는다. **여러 대일 때는 지정하는 편이 안전하다** —
#     지정하지 않으면 `adb shell` 이 "more than one device" 로 실패한다.
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

# --- 대상 기기 ---------------------------------------------------------------
# 에뮬레이터를 여러 대 띄워 쓰는 경우가 있다 (자녀 앱 / 부모님 웹을 따로 본다).
# 그때 "어느 기기를 준비하는가"를 `ANDROID_SERIAL` 로 지정한다 — adb 자체가 그
# 변수를 따르므로 shell/reverse 는 알아서 맞는 기기로 가지만, `adb devices` 는
# 붙어 있는 **전부**를 찍기 때문에 목록에서 하나를 고르는 자리마다 이걸 거쳐야 한다.
attached() { "$ADB" devices | awk '$2 == "device" { print $1 }'; }

target_serial() {
  # ANDROID_SERIAL 이 실제로 붙어 있을 때만 그걸 쓴다. 오타나 이미 꺼진 기기를
  # 그대로 되돌려 주면 준비는 됐는데 없는 기기 이름을 알려 주는 꼴이 된다.
  if [ -n "${ANDROID_SERIAL:-}" ] && attached | grep -qx "${ANDROID_SERIAL}"; then
    echo "$ANDROID_SERIAL"
    return
  fi
  attached | head -1
}

booted() { [ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; }

wake_up() {
  "$ADB" shell input keyevent KEYCODE_WAKEUP >/dev/null 2>&1
  "$ADB" shell wm dismiss-keyguard >/dev/null 2>&1 || "$ADB" shell input keyevent 82 >/dev/null 2>&1

  # 화면이 잠들면 screencap 이 통째로 검은 PNG 가 된다 (결함 2).
  # 30분으로 뒀더니 검증 도중에 한 번씩 잠들었다 — 사실상 안 꺼지는 값으로 둔다
  # (2147483647ms ≈ 24일).
  "$ADB" shell settings put system screen_off_timeout 2147483647 >/dev/null 2>&1
  "$ADB" shell svc power stayon true >/dev/null 2>&1

  # `svc power stayon true` 는 **충전 중일 때만** 듣는다. 에뮬레이터는 배터리가
  # 방전 상태로 잡혀 있는 경우가 있어 그때는 아무 효과가 없다 — 충전 중으로 고정한다.
  #
  # 에뮬레이터에만 한다. 실기기에 붙었을 때 배터리 상태를 조작하면 화면이 계속
  # 켜진 채로 남아 배터리를 태운다. (되돌리려면 `adb shell dumpsys battery reset`)
  case "$(target_serial)" in
    emulator-*)
      "$ADB" shell dumpsys battery set ac 1 >/dev/null 2>&1
      "$ADB" shell dumpsys battery set status 2 >/dev/null 2>&1
      ;;
  esac
}

set_reverse() { for p in $REVERSE_PORTS; do "$ADB" reverse "tcp:$p" "tcp:$p" >/dev/null 2>&1; done; }

finish_ok() {
  wake_up
  set_reverse
  local state; state=$("$ADB" shell dumpsys power 2>/dev/null | grep -m1 mWakefulness | tr -d '\r ')
  # `adb devices` 첫 줄을 집으면 두 대일 때 준비한 것과 **다른 기기**를 알려 준다
  local serial; serial=$(target_serial)
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
# **내가 맡은 기기만** 끈다. 두 대를 띄워 놓고 쓰는 경우가 있어서, 종료를
# 프로세스 이름으로 싸잡아 하면 남의 에뮬레이터가 함께 꺼진다.
TARGET="$(target_serial)"
if [ -n "$TARGET" ]; then
  echo "stopping $TARGET..."
  ANDROID_SERIAL="$TARGET" "$ADB" emu kill >/dev/null 2>&1
  for _ in $(seq 1 20); do
    attached | grep -qx "$TARGET" || break
    sleep 1
  done
fi

# 프로세스 "이름"으로만 매칭한다. -f 로 전체 명령줄을 매칭하면 같은 문자열을 담은
# 셸(예: 이 스크립트를 호출한 에이전트의 셸)까지 잡혀 엉뚱한 프로세스를 죽인다.
emu_running() { pgrep -x qemu-system-aarch64 >/dev/null 2>&1 || pgrep -x qemu-system-x86_64 >/dev/null 2>&1; }
# 강제 종료는 **남아 있는 기기가 하나도 없을 때만** 한다. 붙어 있는 기기가
# 있다는 건 내가 안 끈 남의 에뮬레이터라는 뜻이고, pkill 은 그것까지 죽인다.
if [ -z "$(attached)" ] && emu_running; then
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
