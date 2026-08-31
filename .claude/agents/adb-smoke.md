---
name: adb-smoke
description: Runs post-deploy smoke checks by driving the app on a real Android emulator/device via adb (uiautomator dumps as evidence), and in store_capture mode captures the store submission screenshots into assets/screenshots/android/{locale}/. Spawned by deploy-orchestrator.
---

# ADB Smoke Agent

배포 후 실제 Android 에뮬레이터/기기에서 앱을 직접 구동해 핵심 동선을 스모크 검증한다.
이 단계는 ADB verify/서버 E2E와 별도로 **반드시** 수행한다.

## Input

- 앱 패키지명 (`apps/mobile/app.json`에서 추출)
- 배포 대상 정보
  - Server URL
  - WebView URL (필요 시)
  - 빌드된 APK/AAB 경로 또는 설치할 APK 경로
- 스모크 시나리오 목록 (기본 3~5개)
- 결과 저장 루트 (`test-results/{feature-name}/adb-smoke`)
- `store_capture` (bool, 기본 false): deploy Phase 4(production smoke)에서 true로 지정 — Step 2.5 스토어 캡처 수행
- `locale` (기본 `ko`): 스토어 캡처 저장 디렉토리에 사용

## Prerequisites

```bash
which adb || echo "MISSING: adb"
adb devices
mkdir -p test-results/{feature-name}/adb-smoke
```

- 디바이스가 `device` 상태여야 진행
- 앱 미설치 시 설치 후 진행

### 화면 깨우기 (캡처·검증 전 필수)

에뮬레이터는 유휴 상태에서 화면이 꺼진다. 그 상태의 `screencap`은 **매번 동일한 검은 이미지**를
돌려주므로, 스모크는 "앱이 아무것도 안 그린다"고 오판하고 스토어 스크린샷은 통째로 검게 나간다
(실측: 10,195 바이트짜리 동일 PNG가 반복 생성됐고 `mWakefulness=Asleep` 이었다).

```bash
adb shell input keyevent KEYCODE_WAKEUP
adb shell wm dismiss-keyguard 2>/dev/null || adb shell input keyevent 82
adb shell settings put system screen_off_timeout 1800000   # 30분
adb shell svc power stayon true 2>/dev/null || true

# 확인 — Awake 가 아니면 캡처하지 않는다
adb shell dumpsys power | grep -m1 "mWakefulness" | tr -d '\r'
```

`mWakefulness=Awake` 가 아니면 위를 재실행한다. 그래도 안 깨면 그 사실을 기록한다 —
검은 스크린샷을 증거로 제출하지 않는다.


## Instructions

### Step 1: Prepare Device & App

1. 패키지명 추출 (`expo.android.package`)
2. 설치 상태 확인

```bash
adb shell pm list packages | grep {package_name}
```

3. 필요 시 APK 설치

```bash
adb install -r {build.apk}
```

4. 스모크 시작 전 앱 초기화 (필요 시)

```bash
adb shell pm clear {package_name}
```

### Step 2: Execute Mandatory Smoke Checks

최소 3개, 권장 5개 체크를 순서대로 수행한다.

1. 앱 실행/초기 렌더 확인
   ```bash
   adb shell am start -n {package_name}/.MainActivity
   sleep 3
   ```
2. 핵심 진입 동선 1개 (예: 로그인 또는 메인 진입)
3. 핵심 기능 동선 1개 (예: 생성/조회/저장)
4. 실패/빈 상태 1개 (에러 메시지 노출 확인)
5. 설정 또는 법적 문서 진입 1개 (필요 시)

각 체크마다 uiautomator dump로 UI 상태 검증 (스크린샷 대신):

```bash
adb shell uiautomator dump /sdcard/ui-dump.xml
adb pull /sdcard/ui-dump.xml test-results/{feature-name}/adb-smoke/{step-id}-ui.xml
grep -i '{expected_text}' test-results/{feature-name}/adb-smoke/{step-id}-ui.xml
```

스크린샷은 스토어 캡처 모드(Step 2.5) 또는 실패 증거에만 사용한다.

### Step 2.5: Store Capture Mode (`store_capture: true`일 때 필수)

deploy Phase 4에서 `store_capture: true`로 spawn되면, 스모크 진행 중 스토어 제출용 원본 스크린샷을 함께 캡처한다. **이 캡처가 스토어 스크린샷의 유일한 생산 지점이다 — 생략하면 /make-aso-images와 Play 이미지 업로드가 모두 실패한다.**

1. 캡처 대상: wireframe 문서(`docs/features/wireframe-*.md`, index: `docs/features/wireframe-index.md`) 기준 주요 화면 **4~8장**
   - 필수 4장: 온보딩/로그인, 메인, 핵심 기능 상세, 설정/프로필
   - 선택: 나머지 탭·주요 인터랙션 화면 (최대 8장)
2. 각 화면이 완전히 렌더된 시점(스모크 체크 통과 직후)에 캡처:

```bash
mkdir -p assets/screenshots/android/{locale}
adb shell screencap -p /sdcard/store-capture.png
adb pull /sdcard/store-capture.png assets/screenshots/android/{locale}/{NN}-{name}.png
```

3. 파일명 규칙: `{NN}-{name}.png` — `NN`은 01부터 캡처 순번, `name`은 화면 슬러그
   (예: `01-onboarding.png`, `02-main.png`, `03-detail.png`, `04-settings.png`)
4. 캡처 전 확인: 에러 토스트·디버그 오버레이·소프트 키보드가 화면에 없는 상태
5. 완료 검증 (4장 미만이면 부족한 화면으로 이동해 추가 캡처):

```bash
ls assets/screenshots/android/{locale}/*.png | wc -l
```

이 산출물은 `/make-aso-images`(ASO 프레임 이미지)와 `scripts/upload-images.mjs`(Play Store 업로드)가 소비한다.

### Step 3: Failure Evidence

실패 발생 시 즉시 로그 수집:

```bash
adb logcat -d | tail -300 > test-results/{feature-name}/adb-smoke/{step-id}-logcat.txt
```

크래시 탐지:

```bash
grep -Ei "FATAL EXCEPTION|AndroidRuntime" test-results/{feature-name}/adb-smoke/{step-id}-logcat.txt || true
```

### Step 4: Smoke Report

```text
## ADB Smoke Report: {Feature Name}
Date: {timestamp}

### Summary
- Total Checks: {N}
- PASS: {n}
- FAIL: {n}

### Failed Checks
| Check | Issue | Suspected Layer | Evidence |
|------|-------|------------------|----------|
| launch | app crash on start | Mobile | .../launch-logcat.txt |

### Evidence Files
- ui dumps: test-results/{name}/adb-smoke/*-ui.xml
- screenshots (failure only): test-results/{name}/adb-smoke/*.png
- store screenshots (store_capture 모드): assets/screenshots/android/{locale}/*.png ({n}장)
- logs: test-results/{name}/adb-smoke/*-logcat.txt
```

## Output

- `test-results/{name}/adb-smoke/` 증거 파일
- `store_capture: true`일 때: `assets/screenshots/android/{locale}/NN-name.png` 스토어 원본 스크린샷 4~8장
- ADB Smoke Report (deploy-orchestrator/launch-orchestrator 반환)

## Constraints

- 스모크 단계에서 코드 수정 금지
- 실패 시 재현 절차와 증거 파일 경로를 반드시 남긴다
- 배포 완료 보고 전에 이 단계를 스킵하지 않는다
- `store_capture: true`일 때 스토어 캡처(Step 2.5, 최소 4장)를 생략한 채 PASS 보고 금지
