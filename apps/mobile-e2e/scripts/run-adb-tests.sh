#!/usr/bin/env bash
set -uo pipefail

cd "$(dirname "$0")/.."
REPO_ROOT="$(cd ../.. && pwd)"

# 에뮬레이터를 먼저 "쓸 수 있는 상태"로 만든다.
# adb devices 로 device 가 보여도, 화면이 잠들었거나(mWakefulness=Asleep)
# host-GPU 렌더링이면 screencap/uiautomator 가 빈 결과를 준다. 그 상태로 테스트를 돌리면
# 전부 실패하는데 증상이 "구현 버그"로 보여 디버깅이 통째로 헛돈다 (실측 결함).
if [ -x "$REPO_ROOT/scripts/ensure-emulator.sh" ]; then
  bash "$REPO_ROOT/scripts/ensure-emulator.sh" | tail -4
else
  echo "WARNING: scripts/ensure-emulator.sh 없음 — 에뮬레이터 상태를 보장할 수 없다" >&2
fi

shopt -s nullglob
scripts=(adb-tests/*.sh)
if [ ${#scripts[@]} -eq 0 ]; then
  echo "No adb test scripts found in adb-tests/" >&2
  exit 1
fi

LOG_DIR="test-results/mobile-e2e/logs"
mkdir -p "$LOG_DIR"

fail=0
for f in "${scripts[@]}"; do
  name="$(basename "$f" .sh)"
  echo "=== RUN $f"
  if [ "${DEBUG:-0}" = "1" ]; then
    bash -x "$f" 2>&1 | tee "$LOG_DIR/$name.log"
  else
    bash "$f" 2>&1 | tee "$LOG_DIR/$name.log"
  fi
  status=${PIPESTATUS[0]}
  if [ "$status" -ne 0 ]; then
    echo "=== FAIL $f (exit $status)"
    fail=$((fail + 1))
  else
    echo "=== PASS $f"
  fi
done

if [ "$fail" -gt 0 ]; then
  echo "$fail of ${#scripts[@]} adb test(s) failed" >&2
  exit 1
fi
echo "All ${#scripts[@]} adb test(s) passed"
