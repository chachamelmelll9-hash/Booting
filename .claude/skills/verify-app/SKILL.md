---
name: verify-app
description: Build the app locally and prove it actually runs — dev build on the Android emulator, ADB smoke against the local server, evidence screenshots, and a signed release APK when a local keystore exists. Requires no cloud accounts, no store credentials, no deploy infrastructure.
argument-hint: "[feature-name]"
allowed-tools: Read, Write, Edit, Glob, Grep, Agent, Bash(pnpm *), Bash(cd apps/*), Bash(adb *), Bash(curl *), Bash(npx *), Bash(node *), Bash(mkdir *), Bash(git *), Bash(test *), Bash(sleep *), Bash(grep *), Bash(cat *), Bash(ls *), Bash(echo *), Bash(lsof *), Bash(kill *), Bash(bash scripts/*), Bash(find *), Bash(jq *), Bash(sed *), Bash(pkill *), Bash(seq *), Bash(head *), Bash(tail *), Bash(wc *)
---

## 이 phase의 존재 이유

`implement` 가 끝나면 코드는 있지만 **"앱이 실제로 켜지고 동작하는가"** 는 아직 증명되지 않았다.
이 phase가 그 증명을 만든다. 그리고 이 증명은 **외부 계정이 하나도 없어도** 100% 자동으로 만들 수 있다.

> **절대 규칙**: 이 phase는 Oracle Cloud·Cloudflare·Play Console·App Store Connect·wrangler 로그인
> 그 어떤 것도 필요로 하지 않는다. 그런 것이 없다는 이유로 `phase_blocked` 를 기록하면 **결함이다**.
> 그것들은 `deploy`/`build`/`launch` phase의 관심사이고, `release_ready=false` 면 라우터가 알아서 건너뛴다.

## Auto Mode

`docs/progress/auto-mode.json` 이 존재하고 `enabled=true` 이면:

- AskUserQuestion 을 쓰지 않는다
- 실패 시 스스로 원인 분석 → 수정 → 재시도 (Step 6)
- 이 phase만 끝내고 다음 스킬을 직접 호출하지 않는다 (Stop 훅 라우터가 다음을 지정한다)

---

## Step 0: phase_started 기록

```bash
mkdir -p docs/progress test-results/verify
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":null,"phase":"verify","skill":"verify-app","event":"phase_started","detail":{}}' >> docs/progress/pipeline.jsonl
```

## Step 1: 변수 추출 (하드코딩 금지)

```bash
PKG=$(node -e "console.log(require('./apps/mobile/app.json').expo.android.package)")
APP_NAME=$(node -e "console.log(require('./apps/mobile/app.json').expo.name)")
echo "PKG=$PKG APP_NAME=$APP_NAME"
```

### 네이티브 정합성 확인 (엉뚱한 앱을 검증하지 않기 위해)

`apps/mobile/android/` 는 gitignore 생성물이라 브랜딩이 반영 안 돼도 diff 에 안 보인다.
어긋난 채로 검증하면 **템플릿 기본 앱(`com.myorg.myapp`)을 띄워 놓고 "동작 확인 완료"로 보고**하게 된다
(실측 결함).

```bash
PKG_NATIVE=$(grep -m1 'applicationId' apps/mobile/android/app/build.gradle 2>/dev/null \
             | sed -E "s/.*applicationId[[:space:]]*['\"]([^'\"]+)['\"].*/\1/")
echo "app.json=$PKG  native=${PKG_NATIVE:-<none>}"
if [ -n "$PKG_NATIVE" ] && [ "$PKG" != "$PKG_NATIVE" ]; then
  echo "NATIVE_STALE: 재생성이 필요하다"
  adb uninstall "$PKG_NATIVE" >/dev/null 2>&1 || true
  cd apps/mobile && npx expo prebuild --platform android --clean && cd ../..
fi
```

Step 3의 빌드가 끝난 뒤에도 **설치된 패키지가 `$PKG` 인지** 다시 확인한다. 아니면 FAIL이다.

## Step 2: 로컬 런타임 기동 확인

### 2-1: 서버 + 웹뷰

```bash
# 루트(`/`)는 서버가 정상이어도 404다 — main.ts 가 setGlobalPrefix('api') 를 한다.
# 게이트는 외부 의존이 없는 /api(liveness)로 건다. /api/health 는 Supabase까지 보므로 정보용.
if curl -sf --max-time 5 http://localhost:3000/api >/dev/null 2>&1; then echo SERVER_OK; else echo SERVER_DOWN; fi
if curl -sf --max-time 5 http://localhost:4200 >/dev/null 2>&1; then echo WEBVIEW_OK; else echo WEBVIEW_DOWN; fi
```

`SERVER_DOWN` 또는 `WEBVIEW_DOWN` 이면 `pnpm dev` 를 백그라운드로 띄우고 최대 3분 대기한다
(setup phase에서 띄운 프로세스가 죽었을 수 있다 — 재기동은 이 phase의 정상 작업이지 blocker가 아니다).

> **내려간 것만 골라서 띄운다.** `pnpm dev` 는 `turbo run dev` 이고, 이미 떠 있는 서비스를
> 다시 띄우면 포트 충돌로 그 태스크가 죽으면서 **turbo 가 나머지 태스크까지 통째로 중단한다**
> (실측: 서버가 이미 3000 을 점유한 상태에서 `pnpm dev` → `server#dev` 실패 → 웹뷰도 기동 안 됨).

> 인자를 변수에 모아 `$VAR` 로 펼치지 않는다. **이 런타임의 셸은 zsh 이고, zsh 는 bash 와 달리
> 비따옴표 변수를 단어분리하지 않는다** — `turbo run dev $FILTERS` 는 `" --filter=..."` 를
> 통째로 태스크 이름으로 넘겨 `Could not find task` 로 실패한다 (실측). 서비스별로 따로 띄운다.

```bash
mkdir -p test-results/verify
SERVER_PKG=$(node -e "console.log(require('./apps/server/package.json').name)")
WEBVIEW_PKG=$(node -e "console.log(require('./apps/webview/package.json').name)")

# nohup 로 분리한다. setsid 는 macOS 에 없다.
curl -sf --max-time 5 http://localhost:3000/api >/dev/null 2>&1 \
  || nohup pnpm --filter "$SERVER_PKG" dev > test-results/verify/server.log 2>&1 < /dev/null &
curl -sf --max-time 5 http://localhost:4200 >/dev/null 2>&1 \
  || nohup pnpm --filter "$WEBVIEW_PKG" dev > test-results/verify/webview.log 2>&1 < /dev/null &

for i in $(seq 1 36); do
  curl -sf --max-time 5 http://localhost:3000/api >/dev/null 2>&1 \
    && curl -sf --max-time 5 http://localhost:4200 >/dev/null 2>&1 && break
  sleep 5
done
if curl -sf --max-time 5 http://localhost:3000/api >/dev/null 2>&1; then echo SERVER_OK; else echo SERVER_DOWN; fi
if curl -sf --max-time 5 http://localhost:4200 >/dev/null 2>&1; then echo WEBVIEW_OK; else echo WEBVIEW_DOWN; fi
```

여전히 DOWN 이면 `test-results/verify/server.log` · `webview.log` 를 읽어 원인을 고치고 재시도한다 (최대 2회).

### 2-2: 에뮬레이터

에뮬레이터 준비는 **`scripts/ensure-emulator.sh` 하나로 한다.** 직접 `emulator` 를 띄우지 않는다.

```bash
bash scripts/ensure-emulator.sh
```

이 스크립트가 실측 결함 5가지를 전부 흡수한다 (스크립트 상단 주석에 근거가 있다):

| 흡수하는 결함 | 증상 |
|---|---|
| Apple Silicon host-GPU 렌더링 | `screencap`이 매번 동일한 ~10KB 검은 PNG (실측: 10,195바이트) |
| 화면 잠듦 (`mWakefulness=Asleep`) | 위와 같은 증상 — 스토어 스크린샷까지 검게 나간다 |
| AVD 락 미해제 상태에서 재기동 | `Running multiple emulators with the same AVD` 로 조용히 실패 |
| 툴 호출 종료 시 자식 프로세스 동반 종료 | 에뮬레이터가 떴다가 사라진다 |
| Metro(8081) 미연결 | dev 빌드가 빈 화면만 뜨고 원인이 앱 버그처럼 보인다 |

마지막 줄로 결과를 판정한다:

- `EMULATOR_READY=<serial>` → Step 3 진행
- `EMULATOR_FAILED=<사유>` → `--restart` 로 1회 재시도. 그래도 실패하면
  **사유를 그대로** `phase_blocked` 의 `detail.reason` 에 넣는다 (`no-avd` / `boot-timeout` / `avd-locked` 등).

> `EMULATOR_FAILED=no-avd` 인 경우에도 **빌드 자체는 수행한다** — Step 3에서 `expo run:android` 대신
> `cd apps/mobile/android && ./gradlew assembleDebug` 로 컴파일을 검증하고, 기동 확인만 blocked 로 남긴다.
> "아무것도 증명 못 함"과 "빌드는 되고 기동 확인만 못 함"은 다른 결과다.

## Step 3: 앱 빌드 + 설치 (dev 빌드)

`10.0.2.2` 는 에뮬레이터에서 호스트를 가리킨다 — 로컬 서버를 그대로 쓴다.

```bash
# 에뮬레이터에서 127.0.0.1/localhost 는 "에뮬레이터 자신"을 가리킨다 — 호스트는 10.0.2.2 다.
# (ensure-emulator.sh 가 adb reverse 도 걸어 두므로 localhost 도 동작하지만, env 는 10.0.2.2 로 둔다)
grep -E "^EXPO_PUBLIC_(SERVER|WEBVIEW|SUPABASE)_URL=" apps/mobile/.env.development \
  | grep -E "127\.0\.0\.1|localhost" \
  && echo "CHECK: 위 값들이 에뮬레이터 안에서 호스트를 못 본다 — 10.0.2.2 로 바꿔야 한다" \
  || echo "ENV_HOST_OK"

( cd apps/mobile && npx expo run:android --variant debug 2>&1 | tail -30 )
```

설치 확인:

```bash
adb shell pm list packages | grep -q "$PKG" && echo APP_INSTALLED || echo APP_MISSING
adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
sleep 8
# `dumpsys activity top` 으로 판정하지 않는다. 여러 TASK 를 순회 덤프하면서 대상 앱 항목을
# 누락하고, 개별 activity 덤프가 `Failure while dumping the activity: java.io.IOException: Timeout`
# 으로 실패하기도 한다 (실측: 앱이 topResumedActivity 인데도 grep 이 0건).
if adb shell pidof "$PKG" >/dev/null 2>&1; then echo APP_RUNNING; else echo APP_NOT_RUNNING; fi
adb shell dumpsys activity activities | grep -q "topResumedActivity=.*$PKG" \
  && echo APP_FOREGROUND || echo APP_BACKGROUND
```

### 크래시 판정 (필수)

기동 직후 죽는 앱을 "설치됐으니 OK"로 넘기지 않는다.

```bash
adb logcat -d -t 400 | grep -E "FATAL EXCEPTION|AndroidRuntime|ReactNativeJS.*Error" | head -20
adb exec-out screencap -p > test-results/verify/01-launch.png
```

`01-launch.png` 를 **Read 도구로 실제로 확인한다.** 검정/흰 화면, 빨간 에러 박스, ANR 다이얼로그면 FAIL 이다.

**빈 화면 자동 탐지** (Read 로 보기 전 1차 걸러내기) — 화면이 꺼져 있거나 앱이 아무것도
그리지 않으면 PNG 가 비정상적으로 작고 UI 트리가 비어 있다.
**UI 노드 수가 1차 신호**다 (화면 복잡도와 무관하게 렌더 여부를 직접 반영한다).
스크린샷 크기는 보조 신호다 — 실측: 검은 화면 10,195B / 단순한 실화면 78,732B(37노드) /
복잡한 실화면 1,391,081B. 화면이 단순하면 정상이어도 작을 수 있으므로 임계값을 낮게 잡는다.

```bash
SHOT=test-results/verify/01-launch.png
SIZE=$(wc -c < "$SHOT" | tr -d ' ')
adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
UI=$(adb shell cat /sdcard/ui.xml 2>/dev/null | wc -c | tr -d ' ')
NODES=$(adb shell cat /sdcard/ui.xml 2>/dev/null | grep -o '<node' | wc -l | tr -d ' ')
echo "screenshot=${SIZE}B  ui_xml=${UI}B  nodes=${NODES}"

[ "$NODES" -lt 3 ]    && echo "SUSPECT_BLANK: UI 노드가 ${NODES}개뿐이다 (1차 신호)"
[ "$UI" -lt 500 ]     && echo "SUSPECT_BLANK: uiautomator 덤프가 비어 있다"
[ "$SIZE" -lt 20000 ] && echo "SUSPECT_BLANK: 스크린샷이 ${SIZE}바이트 — 검은 화면(약 10KB) 수준이다"
```

`SUSPECT_BLANK` 이 하나라도 뜨면 `bash scripts/ensure-emulator.sh --restart` 로 에뮬레이터를
다시 준비하고 앱을 재기동한 뒤 다시 찍는다 (화면 잠듦·GPU 렌더링이 원인인 경우가 대부분이다).
그래도 비어 있으면 그때는 **앱 자체의 렌더 실패**이므로 Step 6의 원인 분석으로 넘어간다.

## Step 4: ADB 스모크 — 핵심 동선 검증

시나리오 원본: `docs/features/test-scenarios.md` (없으면 `docs/features/*-test-scenarios.md`).

`adb-smoke` 에이전트를 spawn 한다:

```
Agent(
  subagent_type: "adb-smoke",
  name: "verify-smoke",
  run_in_background: false,
  description: "Local verify smoke",
  prompt: "package: {PKG}. server: http://10.0.2.2:3000/api (로컬 dev 서버). webview: http://10.0.2.2:4200.
           scenarios: docs/features/test-scenarios.md 의 핵심 동선 5개.
           results_root: test-results/verify/adb-smoke. store_capture: false.
           이미 설치·기동된 dev 빌드를 대상으로 한다 — 재설치하지 말 것.
           각 체크마다 uiautomator dump + screencap 증거를 남긴다."
)
```

## dev 빌드로 ADB 스모크를 돌릴 때의 함정

생성된 스모크 스크립트는 시나리오 격리를 위해 `pm clear <PKG>` 로 세션을 초기화한다.
**dev client 빌드에서는 이게 저장된 Metro URL 과 JS 번들 캐시까지 지운다.** 재기동하면
앱은 번들을 Metro 에서 다시 받아야 하고, 이 최초 로드가 스크립트의 대기 한도(기본 45초)를
넘겨 `resource-id=... 가 45초 안에 나타나지 않았다` 로 실패한다.

**앱 결함이 아니다.** 실측: 같은 화면이 대기 후에는 `login-email-input` 을 포함해 정상 렌더됐다.

판별법 — 실패했을 때 화면을 직접 확인한다:

```bash
adb shell uiautomator dump /sdcard/now.xml >/dev/null 2>&1
adb pull /sdcard/now.xml /tmp/now.xml >/dev/null 2>&1
grep -o 'resource-id="[^"]*"' /tmp/now.xml | head
```

찾던 resource-id 가 **거기 있으면 타이밍 문제**이지 구현 결함이 아니다. 대응:

- `pm clear` 직후 첫 시나리오는 대기 한도를 넉넉히(120초+) 준다
- 또는 스모크를 release APK(Step 5)로 돌린다 — 번들이 APK 에 박혀 있어 재다운로드가 없다

`phase_blocked` 로 기록하지 않는다. 이건 검증 하네스의 전제 문제다.

## Step 5: 릴리스 빌드 (로컬 키스토어가 있을 때만)

keystore 는 preflight 가 로컬에서 생성한다 — **계정이 필요 없다.** 있으면 실제 서명 빌드까지 만든다.

```bash
if [ -f apps/mobile/keystore.properties ]; then
  # 서브셸로 격리한다 — cd 한 뒤 저장소 루트 기준 경로를 다시 쓰면 어긋난다
  ( cd apps/mobile && pnpm build:android 2>&1 | tail -20 )
  ls -la apps/mobile/build-*.aab apps/mobile/build-*.apk 2>/dev/null || echo "산출물 없음"
else
  echo "SKIP: keystore 없음 — dev 빌드 검증만으로 이 phase 를 완료한다"
fi
```

릴리스 APK 가 나왔으면 그것으로 한 번 더 기동 확인한다:

```bash
PROD_APK=$(ls -t apps/mobile/build-*.apk 2>/dev/null | head -1)
if [ -n "$PROD_APK" ]; then
  adb uninstall "$PKG" 2>/dev/null || true
  adb install -r "$PROD_APK"
  adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
  sleep 8
  adb shell dumpsys activity top | grep -q "$PKG" && echo RELEASE_APP_RUNNING || echo RELEASE_APP_FAILED
  adb exec-out screencap -p > test-results/verify/02-release-launch.png
fi
```

> 릴리스 빌드가 실패해도 이 phase 는 **blocked 가 아니다** — dev 빌드 검증이 통과했으면
> `phase_completed` 에 `release_build: "failed"` 를 기록하고 진행한다. 릴리스 서명 문제는
> `deploy` phase의 관심사다.

## Step 5.5: 중간 진행 기록 (긴 phase 보호)

이 phase 는 네이티브 빌드 때문에 여러 턴에 걸칠 수 있다. **각 관문을 통과할 때마다
`docs/progress/deploys.jsonl` 에 진행을 남긴다.** 라우터의 정체 감지는 진행 지문으로
판정하는데, 아무 것도 안 남기면 정상 작업 중인데도 "진행 없음"으로 보여 파이프라인이
조기 중단된다.

```bash
# dev 빌드 + 기동 확인 직후
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":null,"phase":"verify","agent":"verify-app","event":"build_completed","detail":{"variant":"debug","launch":"ok"}}' >> docs/progress/deploys.jsonl

# ADB 스모크 직후
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":null,"phase":"verify","agent":"verify-app","event":"smoke_result","detail":{"phase":"local","pass":{n},"fail":{m}}}' >> docs/progress/deploys.jsonl

# 릴리스 빌드 직후 (수행한 경우)
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":null,"phase":"verify","agent":"verify-app","event":"build_completed","detail":{"variant":"release","artifact":"{경로}"}}' >> docs/progress/deploys.jsonl
```

## Step 6: 실패 처리 — 스스로 고친다

FAIL 이 나오면 사용자에게 넘기지 않는다:

1. 로그캣 + Metro 로그 + 서버 로그에서 근본 원인을 찾는다
2. 코드를 고친다 (앱 코드 — 스킬/에이전트가 아니다)
3. Step 3 부터 재실행

**최대 3회.** 3회 후에도 실패하면 `phase_blocked` 를 기록하되, `detail.reason` 에
**실제 스택트레이스/에러 메시지**를 넣는다 ("빌드 실패" 같은 요약 금지).

## Step 7: 완료 기록

```bash
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":null,"phase":"verify","skill":"verify-app","event":"phase_completed","detail":{"dev_build":"ok","app_launch":"ok","smoke":"{n}/{m} passed","release_build":"{ok|skipped|failed}","evidence":"test-results/verify/"}}' >> docs/progress/pipeline.jsonl
```

`detail` 에는 **실측값만** 넣는다. 스모크를 안 돌렸으면 안 돌렸다고 적는다.

## Step 8: 보고

```text
## Verify Complete — {APP_NAME}

| 항목 | 결과 | 증거 |
|---|---|---|
| Dev 빌드 | ✅ | expo run:android |
| 앱 기동 | ✅ | test-results/verify/01-launch.png |
| ADB 스모크 | ✅ {n}/{m} | test-results/verify/adb-smoke/ |
| 릴리스 APK | {✅ 경로 / ⏭ keystore 없음} | apps/mobile/build-*.apk |

앱이 빌드되고 에뮬레이터에서 동작함을 확인했습니다.
```

다음 phase 는 호출하지 않는다 — Stop 훅 라우터가 지정한다.
