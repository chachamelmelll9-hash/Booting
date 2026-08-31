# ADB Testing Commands Reference

## App Launch & Activity Management

```bash
# Launch app main activity
adb shell am start -n {package_name}/.MainActivity

# Force stop app
adb shell am force-stop {package_name}

# Clear app data
adb shell pm clear {package_name}

# Check if app is installed
adb shell pm list packages | grep {package_name}
```

## Input Commands

```bash
# Tap at coordinates
adb shell input tap {x} {y}

# Text input (ASCII)
adb shell input text '{text}'

# Text input (Korean / Unicode via broadcast)
adb shell am broadcast -a ADB_INPUT_TEXT --es msg '{text}'

# Swipe / Scroll
adb shell input swipe {x1} {y1} {x2} {y2} {duration_ms}

# Key events
adb shell input keyevent KEYCODE_BACK
adb shell input keyevent KEYCODE_HOME
adb shell input keyevent KEYCODE_ENTER
adb shell input keyevent KEYCODE_DEL
```

## UI Verification (uiautomator) — Primary

UI 검증은 스크린샷 대신 uiautomator dump를 기본으로 사용한다. XML 텍스트 기반이라 context 소모가 적고 정확한 텍스트 매칭이 가능하다.

```bash
# Dump current UI hierarchy to XML
adb shell uiautomator dump /sdcard/ui-dump.xml
adb pull /sdcard/ui-dump.xml ./test-results/{feature-name}/{scenario-id}-ui.xml

# Search for text in UI dump
grep -i '{expected_text}' ./test-results/{feature-name}/{scenario-id}-ui.xml
```

## Screenshot — Failure & Store Assets Only

스크린샷은 (1) 실패 시 시각적 증거 수집 또는 (2) 스토어 제출용 캡처에만 사용한다.

```bash
# Failure evidence only
adb shell screencap /sdcard/{scenario-id}-fail.png
adb pull /sdcard/{scenario-id}-fail.png ./test-results/{feature-name}/

# Store asset capture (deploy/launch phase only)
adb shell screencap /sdcard/{step-id}.png
adb pull /sdcard/{step-id}.png ./test-results/{feature-name}/
```

## Logcat

```bash
# Dump recent logs
adb logcat -d | tail -200 > ./test-results/{feature-name}/{scenario-id}-logcat.txt

# Filter by tag
adb logcat -d -s ReactNativeJS:* > ./test-results/{feature-name}/{scenario-id}-rn.txt

# Detect crashes
grep -Ei "FATAL EXCEPTION|AndroidRuntime" ./test-results/{feature-name}/{scenario-id}-logcat.txt || true
```

## Environment Setup

```bash
# List connected devices
adb devices

# Check device screen size
adb shell wm size

# Test results directory
mkdir -p test-results/{feature-name}/adb
```

## Supabase Verification (for data not visible on screen)

Use Supabase MCP to query directly:

```sql
-- S{N}.4 scenario
SELECT {columns} FROM {table_name}
WHERE {condition}
ORDER BY created_at DESC LIMIT 5;
```
