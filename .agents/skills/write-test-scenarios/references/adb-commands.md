# ADB Testing Commands Reference

## App Launch And Activity Management

```bash
# Launch app main activity
adb shell am start -n {package_name}/.MainActivity

# Force stop app
adb shell am force-stop {package_name}

# Clear app data
adb shell pm clear {package_name}

# Check whether the app is installed
adb shell pm list packages | grep {package_name}
```

## Input Commands

```bash
# Tap at coordinates
adb shell input tap {x} {y}

# Text input (ASCII)
adb shell input text '{text}'

# Text input (Korean or Unicode via broadcast helper)
adb shell am broadcast -a ADB_INPUT_TEXT --es msg '{text}'

# Swipe or scroll
adb shell input swipe {x1} {y1} {x2} {y2} {duration_ms}

# Key events
adb shell input keyevent KEYCODE_BACK
adb shell input keyevent KEYCODE_HOME
adb shell input keyevent KEYCODE_ENTER
adb shell input keyevent KEYCODE_DEL
```

## UI Verification (uiautomator) -- Primary

Use `uiautomator dump` as the default mobile UI verification path instead of screenshots. XML text evidence is cheaper to inspect and supports direct text matching.

```bash
# Dump current UI hierarchy to XML
adb shell uiautomator dump /sdcard/ui-dump.xml
adb pull /sdcard/ui-dump.xml ./test-results/{feature-name}/adb/{scenario-id}-ui.xml

# Search for expected text in the dump
grep -i '{expected_text}' ./test-results/{feature-name}/adb/{scenario-id}-ui.xml
```

## Screenshot -- Failure And Store Assets Only

Use screenshots only for failure evidence or release/store asset capture.

```bash
# Failure evidence only
adb shell screencap /sdcard/{scenario-id}-fail.png
adb pull /sdcard/{scenario-id}-fail.png ./test-results/{feature-name}/adb/

# Store asset capture only
adb shell screencap /sdcard/{step-id}.png
adb pull /sdcard/{step-id}.png ./test-results/{feature-name}/adb/
```

## Logcat And Failure Evidence

```bash
# Dump recent logs
adb logcat -d | tail -200 > ./test-results/{feature-name}/adb/{scenario-id}-logcat.txt

# Filter React Native logs
adb logcat -d -s ReactNativeJS:* > ./test-results/{feature-name}/adb/{scenario-id}-rn.txt

# Detect crashes
grep -Ei "FATAL EXCEPTION|AndroidRuntime" ./test-results/{feature-name}/adb/{scenario-id}-logcat.txt || true
```

## Environment Setup

```bash
# List connected devices
adb devices

# Check device screen size
adb shell wm size

# Ensure result directories exist
mkdir -p apps/mobile-e2e/adb-tests
mkdir -p test-results/{feature-name}/adb
```

## Repository Conventions

- Store executable ADB scenario scripts in `apps/mobile-e2e/adb-tests/`
- Keep stable feature-prefixed filenames such as `{feature-name}--S1.1.sh`
- Store execution logs, UI dumps, and other text evidence in `test-results/{feature-name}/adb/`
- Prefer visible UI checks first, then UI dump text matching, then logs or DB confirmation only when needed
- Resolve the Android package name from `apps/mobile/app.json`
