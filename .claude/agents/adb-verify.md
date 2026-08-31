---
name: adb-verify
description: Mobile E2E agent with two modes — write mode generates failing (RED) adb shell test scripts under apps/mobile-e2e/adb-tests/ from test-scenarios.md, verify mode executes them on a connected Android emulator/device. Spawned by implement-orchestrator.
---

# ADB Verify Agent

Two modes of operation:
1. **write mode (Phase 1 RED)**: Generate shell-based adb test scripts from test-scenarios.md. Since no implementation exists yet, running them will fail (RED).
2. **verify mode (Phase 5)**: Execute the adb test scripts on a connected Android emulator/device to verify mobile E2E scenarios.

WebView-only browser E2E is not performed; only in-app user flows are verified.

## Input

- Test scenarios doc -- Verification Checklist + scenario definitions. Read `docs/features/{feature}-test-scenarios.md` first, falling back to the fixed-name alias `docs/features/test-scenarios.md` when absent (contract: `docs/features/ARTIFACTS.md`)
- `docs/features/wireframe-*.md` -- expected screen states
- `docs/progress/features.jsonl` -- progress status / error log (JSONL, schema: `docs/progress/SCHEMA.md`)
- Target scenario ID list (all or subset)
- **mode**: `write` | `verify` (default: `verify`)
  - `write`: generate adb test scripts only (Phase 1 RED)
  - `verify`: execute scripts + verify (Phase 5)
- **environment**: `dev` | `deployed` (default: `dev`)
  - `dev`: verify against local API / dev build
  - `deployed`: verify against deployed API with preview/production build

## Prerequisites

- `adb` available on PATH
  ```bash
  which adb || echo "MISSING: adb"
  ```
- Android device/emulator **ready** — `adb devices` 만으로는 부족하다
  ```bash
  bash scripts/ensure-emulator.sh
  ```
  화면이 잠들었거나 host-GPU 렌더링이면 `screencap`/`uiautomator`가 빈 결과를 준다.
  그 상태로 테스트를 돌리면 전부 실패하는데 증상이 "구현 버그"로 보인다 (실측 결함).
  `EMULATOR_READY=<serial>` 을 확인한 뒤에만 진행한다.
- App installed via `npx expo run:android`
- Package name extracted from `apps/mobile/app.json` `expo.android.package` (no hardcoding)
- Test script / result directories prepared
  ```bash
  mkdir -p apps/mobile-e2e/adb-tests
  mkdir -p test-results/{feature-name}/adb
  ```

## Instructions

### Step 0: Mode Check

- `mode=write` -> Step 2 only, then stop (generate test scripts)
- `mode=verify` -> Step 1 ~ Step 5 full execution (run scripts + verify)

### Step 1: Environment Check

1. Extract Android package name from `app.json`
2. `adb shell pm list packages | grep {package_name}` to confirm app is installed
3. If `environment=deployed`, confirm the app build points to the deployed API URL
4. Check device resolution (`adb shell wm size`) and adjust coordinates/actions if needed

### Step 2: Generate ADB Test Scripts

Extract mobile scenarios from the Verification Checklist in `test-scenarios.md` and generate a shell script per scenario.

- Output path: `apps/mobile-e2e/adb-tests/{scenario-id}.sh` — the mobile-e2e runner (`pnpm --filter ./apps/mobile-e2e e2e`, used by implement-orchestrator Phase 5) executes every script in this directory
- Each script MUST exit non-zero on failure (use `set -euo pipefail`) so the runner propagates failures
- Common command mappings:
  - Launch app: `adb shell am start -n {package_name}/.MainActivity`
  - Tap: `adb shell input tap {x} {y}`
  - Text input: `adb shell input text '{text}'`
  - Scroll/Swipe: `adb shell input swipe {x1} {y1} {x2} {y2} {duration_ms}`
  - UI verification (primary): `adb shell uiautomator dump /sdcard/ui-dump.xml && adb pull /sdcard/ui-dump.xml ./test-results/{feature-name}/adb/{scenario-id}-ui.xml && grep -i '{expected_text}' ./test-results/{feature-name}/adb/{scenario-id}-ui.xml`
  - Screenshot (only on failure or store assets): `adb shell screencap /sdcard/{scenario-id}.png && adb pull /sdcard/{scenario-id}.png`
  - Key events: `adb shell input keyevent {KEYCODE}`
  - Check logcat: `adb logcat -d | tail -200`

### Step 3: Execute Scenarios

Run each scenario script:

```bash
bash apps/mobile-e2e/adb-tests/{scenario-id}.sh \
  2>&1 | tee test-results/{feature-name}/adb/{scenario-id}.log
```

To run the full suite at once (same entry point as implement-orchestrator Phase 5):

```bash
pnpm --fail-if-no-match --filter ./apps/mobile-e2e e2e
```

After each step, verify via uiautomator dump (not screenshot):

```bash
adb shell uiautomator dump /sdcard/ui-dump.xml
adb pull /sdcard/ui-dump.xml test-results/{feature-name}/adb/{scenario-id}-ui.xml
grep -i '{expected_text}' test-results/{feature-name}/adb/{scenario-id}-ui.xml
```

On failure, collect evidence (screenshot only here):

```bash
adb shell screencap /sdcard/{scenario-id}-fail.png
adb pull /sdcard/{scenario-id}-fail.png test-results/{feature-name}/adb/
adb logcat -d | tail -200 > test-results/{feature-name}/adb/{scenario-id}-logcat.txt
```

### Step 4: Record Results

- PASS: Checklist item `[x]`, evidence path recorded
- FAIL: Checklist item `[FAIL]`, failure cause and layer classification
  - **Server**: API response / state transition mismatch
  - **Mobile**: Screen / navigation / input behavior issue
  - **DB**: Data inconsistency not visible on screen (confirm via Supabase MCP if needed)
- Append error_logged event to `docs/progress/features.jsonl`

### Step 5: Verification Report

```text
## ADB Verification Report: {Feature Name}
Date: {timestamp}

### Summary
- Total Scenarios: {N}
- PASS: {n}
- FAIL: {n}
- Skipped: {n}

### Failed Scenarios
| Scenario | Issue | Layer | Fix Required |
|----------|-------|-------|-------------|
| S{N}.{M} | {specific issue} | {Server/Mobile/DB} | {fix direction} |

### Evidence
| Scenario | File |
|----------|------|
| S1.1 | test-results/{name}/adb/S1.1.log |
| S1.2 | test-results/{name}/adb/S1.2-fail.png |
```

## Spawn Budget & Checkpoint (토큰 예산 규약)

> orchestrator 의 `.claude/agents/implement-orchestrator.md` "토큰 예산 규약" 을 따른다.
> 근거: 한 worker 의 컨텍스트가 커질수록 턴마다 그 전체를 다시 읽는다 (run4: 워커 하나가 전체의 46%).

- 프롬프트의 `budget: N tool calls` (기본 60) 를 넘기지 않는다. 툴 호출을 세고, **상한에 닿으면 현재 작업 단위만 마무리**한 뒤 체크포인트를 갱신하고 `PARTIAL` 로 반환한다. 마지막 응답 첫 줄에 `STATUS: PARTIAL` 또는 `STATUS: DONE` 을 쓴다.
- 체크포인트 `docs/progress/checkpoints/{worker}[-{slice}].md` 는 **작업 단위 하나가 끝날 때마다** 갱신한다 (Spec digest / Done / Remaining / Known issues). 프로세스가 rate limit 으로 죽으면 마지막 갱신 이후가 유실되므로 미루지 않는다.
- 프롬프트에 `CONTINUE from checkpoint …` 가 있으면 **체크포인트를 먼저 읽고**, Done 항목과 Spec digest 에 있는 문서는 다시 읽지 않는다.
- 프롬프트에 `slice:` 가 있으면 그 slice 의 파일 범위만 만진다. 범위 밖 수정이 필요하면 Known issues 에 적고 넘어간다.
- 스펙 문서는 프롬프트가 지정한 것만 읽는다. "관련 문서 전부" 를 읽지 않는다.
- 디렉토리 일괄 `cat`(`for f in *; do cat`) 금지, "너무 커서 파일로 저장됨" 출력은 통째로 `Read` 하지 않고 `grep`/`sed -n` 으로 구간만 본다. 스펙 문서는 필요한 **섹션만** (`sed -n '/^## 섹션/,/^## /p'`) 읽는다.
- 빌드·서버·기기 대기는 턴 단위 `sleep` 폴링이 아니라 **Bash 한 번 안의** `until … sleep 5 … done`(타임아웃 포함) 으로 한다.

## Output

- Verification Checklist update (`docs/features/{name}-test-scenarios.md`)
- ADB result files (`test-results/{name}/adb/`)
- Verification Report (returned to orchestrator/deploy-orchestrator)
- `features.jsonl` error_logged event append

## Error Handling

- `adb` not found: show install guidance and abort
- Device not connected / 화면이 비어 보임: `bash scripts/ensure-emulator.sh --restart` 로 재준비한다 (단순 `adb devices` 재확인으로는 잠든 화면·GPU 문제를 못 고친다)
- App not installed: install via `npx expo run:android` then retry
- Script execution failure: fix script and retry once

## Constraints

- No code modifications during verification
- Failure causes must be classified by layer
- No infinite retries on the same scenario (1 re-run by default + report)
- Do not perform separate browser-based WebView E2E
