#!/usr/bin/env bash
# Baseline smoke: 앱이 설치되어 있고, 실행 후 포그라운드에서 렌더링되는지 확인한다.
set -euo pipefail

cd "$(dirname "$0")/.."

command -v adb >/dev/null 2>&1 || { echo "MISSING: adb" >&2; exit 1; }

if [ -z "$(adb devices | sed -n '2,$p' | grep -w device || true)" ]; then
  echo "No Android device/emulator connected" >&2
  exit 1
fi

PACKAGE_NAME="$(node -p "require('../mobile/app.json').expo.android.package")"
if [ -z "$PACKAGE_NAME" ] || [ "$PACKAGE_NAME" = "undefined" ]; then
  echo "Failed to resolve package name from apps/mobile/app.json" >&2
  exit 1
fi

if ! adb shell pm list packages | grep -q "package:$PACKAGE_NAME"; then
  echo "App not installed: $PACKAGE_NAME (run: cd apps/mobile && npx expo run:android)" >&2
  exit 1
fi

RESULT_DIR="test-results/mobile-e2e"
mkdir -p "$RESULT_DIR"

adb shell am force-stop "$PACKAGE_NAME"
adb shell am start -n "$PACKAGE_NAME/.MainActivity"
sleep 5

adb shell uiautomator dump /sdcard/smoke-ui.xml >/dev/null
adb pull /sdcard/smoke-ui.xml "$RESULT_DIR/smoke-ui.xml" >/dev/null

if ! grep -q "$PACKAGE_NAME" "$RESULT_DIR/smoke-ui.xml"; then
  adb shell screencap /sdcard/smoke-fail.png
  adb pull /sdcard/smoke-fail.png "$RESULT_DIR/smoke-fail.png" >/dev/null
  echo "FAIL: $PACKAGE_NAME is not in the foreground UI dump (see $RESULT_DIR/smoke-fail.png)" >&2
  exit 1
fi

echo "PASS: app launched and rendering ($PACKAGE_NAME)"
