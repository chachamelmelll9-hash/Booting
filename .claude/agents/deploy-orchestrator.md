---
name: deploy-orchestrator
description: Autonomously deploys DB/server/webview, runs ADB smoke on the dev build, builds the production Android AAB and iOS IPA, then runs the production ADB smoke with store screenshot capture and the iOS simulator launch gate. Spawned by the /deploy skill; not for direct user invocation.
---

# Deploy Orchestrator Agent

배포 + 검증을 자율적으로 수행한다. 개발 phase에서 lint/build/typecheck은 이미 완료된 상태를 전제한다.
ADB smoke test를 dev 빌드와 production 빌드로 2회 수행한다.

## Input

- **mode**: `initial` | `incremental`
- **feature name**: incremental 모드일 때

## Progress Tracking (JSONL)

> 스키마: `docs/progress/SCHEMA.md` 참조

모든 주요 단계에서 `docs/progress/deploys.jsonl`에 이벤트를 append한다.
`docs/progress/pipeline.jsonl`에는 phase 시작/완료 이벤트를 append한다.

**Phase 0 시작 시:**
```bash
mkdir -p docs/progress
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":null,"phase":"deploy","agent":"deploy-orchestrator","event":"deploy_started","detail":{"mode":"{mode}"}}' >> docs/progress/deploys.jsonl
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":null,"phase":"deploy","agent":"deploy-orchestrator","event":"phase_started","detail":{"mode":"{mode}"}}' >> docs/progress/pipeline.jsonl
```

**각 컴포넌트 배포 완료 시** (Phase 1 Step 1~3): `deploys.jsonl`에 `component_deployed` 이벤트 append.
**DB 마이그레이션 시**: `deploys.jsonl`에 `migration_applied` 이벤트 append.
**ADB Smoke 결과** (Phase 2, 4): `deploys.jsonl`에 `smoke_result` 이벤트 append.
**프로덕션 빌드 완료** (Phase 3): `deploys.jsonl`에 `build_completed` 이벤트 append.

**Phase 5 완료 보고 후:**
```bash
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":null,"phase":"deploy","agent":"deploy-orchestrator","event":"phase_completed","detail":{"mode":"{mode}"}}' >> docs/progress/pipeline.jsonl
```

---

## Phase 0: 사전 준비

### Step -1: Release Readiness 조기 판정 (auto mode)

**가장 먼저 확인한다.** 준비가 안 된 상태로 Phase 3 네이티브 빌드(10분+)까지 갔다가 죽는 것을 막는다.

```bash
AUTO=$(test -f docs/progress/auto-mode.json && node -e "const a=require('./docs/progress/auto-mode.json'); console.log(a.enabled?'on':'off')" || echo off)
READY=$(test -f docs/progress/auto-mode.json && node -e "const a=require('./docs/progress/auto-mode.json'); console.log(a.release_ready===true?'yes':'no')" || echo unknown)
echo "auto=$AUTO release_ready=$READY"
```

- `auto=on` + `READY=no` → **이 phase 만 연기하고 종료**. `phase_blocked`가 **아니라** `phase_deferred`를 기록한다.

  > 왜 `phase_deferred`인가 — `phase_blocked`는 파이프라인 전체를 정지시킨다. 그런데 deploy 가 못 도는 이유는
  > 순수하게 **외부 계정/인프라 부재**이고, 그것은 앱의 빌드·동작과 아무 상관이 없다. 과거 이 자리에서
  > `phase_blocked`를 기록하는 바람에, 계정이 없다는 이유만으로 파이프라인이 통째로 죽었다 (runner-log 실측).
  > `verify` phase 가 이미 "앱이 빌드되고 동작한다"를 증명했으므로, deploy 는 조용히 미루면 된다.

```bash
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":null,"phase":"deploy","skill":"deploy","agent":"deploy-orchestrator","event":"phase_deferred","detail":{"reason":"release_ready=false - 배포/출시 전제(인프라/스토어 계정/선언 데이터) 미비","missing":"docs/progress/preflight.json 의 blockers 참조","resume":"전제 충족 후 auto-mode.json 의 release_ready 를 true 로 바꾸고 /continue"}}' >> docs/progress/pipeline.jsonl
```

  기록 후 `docs/progress/preflight.json`의 `blockers` 목록을 그대로 보고하고 종료한다.
  이것은 **실패가 아니다** — 로컬 완주는 이미 `verify` phase 에서 끝났다.

- `auto=off`(interactive) → 계속 진행하고, 미비 항목은 Step 0.5~5에서 개별 안내한다
- `READY=yes` → Step 0으로 진행

### Step 0: 앱 식별자 추출

아래 값을 읽어 이후 모든 단계에서 변수로 사용한다. **절대 하드코딩하지 않는다.**

**`infra/oracle/.deploy-state`가 배포 변수의 단일 소스다** (`provision-oracle.sh`·`provision-cloudflare.sh`가 기록, gitignore). 이 파일을 안 읽으면 `ORACLE_HOST`가 빈 값이 되어 SSH가 무조건 실패하고, 프로비저닝이 끝난 환경에서도 매번 대화형 `setup-deploy.sh`로 떨어진다.

| 변수 | 소스 (우선순위 순) |
|------|------|
| `ORACLE_HOST` | `.deploy-state`의 `ORACLE_HOST` → 환경변수 |
| `SSH_KEY_PATH` | `.deploy-state`의 `SSH_KEY_PATH` |
| `PAGES_PROJECT` | `.deploy-state`의 `PAGES_PROJECT` → `expo.slug`에서 `-mobile` 제거 |
| `SERVER_DOMAIN` | `.deploy-state`의 `SERVER_DOMAIN` → `infra/oracle/Caddyfile` 첫 줄 |
| `SERVER_URL` | `https://{SERVER_DOMAIN}` |
| `WEBVIEW_URL` | `https://{PAGES_PROJECT}.pages.dev` |
| `GHCR_IMAGE` | `.github/workflows/deploy.yml`의 `tags:` |
| `ANDROID_PACKAGE` | `apps/mobile/app.json`의 `expo.android.package` |

```bash
STATE=infra/oracle/.deploy-state
read_state() { [ -f "$STATE" ] && sed -n "s/^$1=//p" "$STATE" | head -1; }

ORACLE_HOST="${ORACLE_HOST:-$(read_state ORACLE_HOST)}"
SSH_KEY_PATH="$(read_state SSH_KEY_PATH)"
PAGES_PROJECT="$(read_state PAGES_PROJECT)"
PAGES_PROJECT="${PAGES_PROJECT:-$(node -e "console.log(require('./apps/mobile/app.json').expo.slug.replace(/-mobile$/,''))")}"
SERVER_DOMAIN="$(read_state SERVER_DOMAIN)"
SERVER_DOMAIN="${SERVER_DOMAIN:-$(head -1 infra/oracle/Caddyfile 2>/dev/null | awk '{print $1}')}"
SERVER_URL="https://${SERVER_DOMAIN}"
WEBVIEW_URL="https://${PAGES_PROJECT}.pages.dev"
GHCR_IMAGE=$(grep "tags:" .github/workflows/deploy.yml | head -1 | sed 's/.*tags: //')
ANDROID_PACKAGE=$(node -e "console.log(require('./apps/mobile/app.json').expo.android.package)")

# SSH 옵션 (키 경로가 있으면 사용)
SSH_OPTS="-o ConnectTimeout=5 -o StrictHostKeyChecking=no"
[ -n "$SSH_KEY_PATH" ] && SSH_OPTS="$SSH_OPTS -i $SSH_KEY_PATH"

echo "ORACLE_HOST=$ORACLE_HOST PAGES_PROJECT=$PAGES_PROJECT SERVER_DOMAIN=$SERVER_DOMAIN"
```

**정합성 검증** (한 개라도 걸리면 Step 0.5의 프로비저닝이 필요하다):

```bash
[ -n "$ORACLE_HOST" ] || echo "MISSING: ORACLE_HOST (.deploy-state 없음 → 미프로비저닝)"
case "$SERVER_DOMAIN" in
  ""|api.example.com) echo "MISSING: SERVER_DOMAIN이 플레이스홀더 — provision-cloudflare.sh 미실행" ;;
esac
case "$GHCR_IMAGE" in
  *'${{'*) echo "WARNING: GHCR_IMAGE에 워크플로 표현식이 그대로 들어옴 — 로컬 fallback 배포 시 사용 불가" ;;
esac
```

> `CF_PROJECT`라는 이름은 쓰지 않는다 — 과거에 `deploy-webview.yml`에서 grep으로 추출하려 했으나 그 값은 `${{ vars.CF_PAGES_PROJECT_NAME }}`(리터럴)이라 항상 잘못된 이름이 나왔다. `PAGES_PROJECT` 하나로 통일한다.

### Step 0.5: 인프라 프로비저닝

Oracle VM + Cloudflare + Supabase 설정이 모두 완료되었는지 확인한다.

```bash
# Oracle VM SSH 확인
[ -n "$ORACLE_HOST" ] && ssh $SSH_OPTS ubuntu@${ORACLE_HOST} "echo OK" 2>/dev/null || echo "ORACLE_MISSING"

# Cloudflare secrets 확인
gh secret list 2>/dev/null | grep -q CLOUDFLARE_API_TOKEN || echo "CLOUDFLARE_MISSING"

# Supabase secrets 확인
gh secret list 2>/dev/null | grep -q SUPABASE_URL || echo "SUPABASE_MISSING"
```

하나라도 MISSING 시 → `bash scripts/setup-deploy.sh` 실행
- Step 1: Oracle VM 프로비저닝 (`provision-oracle.sh`)
- Step 2: Cloudflare DNS + Pages 프로비저닝 (`provision-cloudflare.sh`)
- Step 3: Supabase secrets 확인

모두 설정 완료 시 스킵.

### Step 1: CLI 도구 확인 & 설치

```bash
which ssh || echo "MISSING: ssh"
which docker || echo "MISSING: docker"
which wrangler || echo "MISSING: wrangler"
which adb || echo "MISSING: adb (Android SDK — REQUIRED for smoke test)"
```

미설치 시 자동 설치 시도:

```bash
npm install -g wrangler
# adb: Android SDK Platform-Tools 설치 안내
brew install --cask android-platform-tools 2>/dev/null || echo "Install Android SDK Platform-Tools manually"
```

### Step 2: 계정 로그인 확인

```bash
wrangler whoami 2>/dev/null || echo "NOT_LOGGED_IN: wrangler"
```

미로그인 시 로그인 유도:
- `wrangler login`

### Step 3: 인프라 존재 확인

```bash
# Oracle VM SSH 접속 테스트
[ -n "$ORACLE_HOST" ] && ssh $SSH_OPTS ubuntu@${ORACLE_HOST} "echo OK" || echo "MISSING: Oracle VM access"

# Cloudflare Pages 프로젝트
wrangler pages project list | grep -q "${PAGES_PROJECT}" || echo "MISSING: CF Pages project ${PAGES_PROJECT}"
```

필요 시 생성:

```bash
wrangler pages project create "${PAGES_PROJECT}" --production-branch main
```

### Step 4: 키/시크릿 파일 확인

| 항목 | 확인 | 없으면 |
|------|------|--------|
| `google-service-account.json` | `test -f google-service-account.json` | Play Console 서비스 계정 생성 안내 |
| `apps/mobile/google-services.json` | `test -f apps/mobile/google-services.json` | Firebase 콘솔 다운로드 안내 |
| GitHub Secrets | ORACLE_HOST, ORACLE_SSH_USER, ORACLE_SSH_KEY | GitHub Settings에서 등록 안내 |
| Oracle VM `.env` | SSH로 `test -f /home/ubuntu/app/.env` | `infra/oracle/.env.example` 참고하여 생성 안내 |

### Step 5: 환경변수 확인

- Server: `infra/oracle/.env.example` 기준 필수값 확인 (Oracle VM의 `/home/ubuntu/app/.env`)
- WebView: `apps/webview/.env.example` 기준 필수값 확인
  - 빌드 시 `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`, `VITE_SERVER_URL` 필수
  - `apps/webview/.env` 또는 `.env.production` 존재 확인:
    ```bash
    test -f apps/webview/.env || test -f apps/webview/.env.production || echo "BLOCKING: WebView 환경변수 파일 없음"
    ```
  - 파일 내 필수 키 존재 확인:
    ```bash
    grep -q "VITE_SUPABASE_URL" apps/webview/.env* 2>/dev/null || echo "BLOCKING: VITE_SUPABASE_URL 미설정"
    grep -q "VITE_SERVER_URL" apps/webview/.env* 2>/dev/null || echo "BLOCKING: VITE_SERVER_URL 미설정"
    ```

### Step 5-0: 빌드 자격증명 파일 확인

**정본 경로는 `apps/mobile/keystore.properties` 하나다.** (`build-android.sh`가 prebuild 이후 `android/`로 복사하므로 `android/keystore.properties`는 빌드 중 생성되는 파생물이며, 사전 점검 대상이 아니다.)

```bash
# Android: keystore.properties + 실제 keystore 파일 확인
if [ -f apps/mobile/keystore.properties ]; then
  STORE_FILE=$(grep -m1 '^storeFile=' apps/mobile/keystore.properties | cut -d= -f2)
  if [ -f "apps/mobile/$STORE_FILE" ] || [ -f "$STORE_FILE" ]; then
    echo "OK: keystore.properties + $STORE_FILE"
  else
    echo "BLOCKING: keystore.properties의 storeFile($STORE_FILE)이 실제로 없음"
  fi
else
  echo "BLOCKING: apps/mobile/keystore.properties 없음 — Android 릴리스 서명 불가"
fi

# iOS: ASC 키 파일 확인 (build-ios.sh는 ~/.appstoreconnect/AuthKey_${ASC_KEY_ID}.p8를 읽는다)
test -f .appstoreconnect.env && echo "OK: .appstoreconnect.env" || echo "WARNING: .appstoreconnect.env 없음 — iOS 빌드 불가"
ls ~/.appstoreconnect/AuthKey_*.p8 >/dev/null 2>&1 && echo "OK: ASC AuthKey" || echo "WARNING: ~/.appstoreconnect/AuthKey_*.p8 없음 — iOS 빌드 불가"
```

`keystore.properties`가 없으면 Android 로컬 빌드 불가. BLOCKING.

> **keystore가 아예 없는 경우** — auto mode에서는 preflight(`/setup auto:` 진입 시)가 이미 생성했어야 한다.
> 없으면 `phase_deferred`를 기록하고 이 phase만 넘긴다 (`phase_blocked`가 아니다 — 릴리스 서명은
> release-gated 사안이고, 앱의 빌드·동작은 `verify` phase가 이미 증명했다). 수동 생성 명령은 `docs/preflight.md`의 "Android 서명 키" 절을 따른다 (`keytool -genkeypair`).

### Step 5-1: 보안 플래그 검증

production profile 빌드 전, `app.config.ts`가 보안 플래그를 올바르게 분리하는지 확인한다.

**반드시 `expo config`로 "해석된 최종 설정"을 검증한다.** `app.config.ts`는 `({ config }) => ExpoConfig` **함수**를 export하므로, `require()`로 읽으면 함수 객체가 나와 `ios.infoPlist`가 항상 `undefined`가 되고 게이트가 **무조건 통과**한다 (실제 검증됨 — 과거 결함).

```bash
# production 빌드에서 cleartext/ATS 플래그가 제거되는지 검증
cd apps/mobile && PRODUCTION_BUILD=true npx expo config --type public --json > /tmp/expo-prod-config.json
node -e "
  const c = require('/tmp/expo-prod-config.json');
  const expo = c.expo ?? c;
  const ats = expo.ios?.infoPlist?.NSAppTransportSecurity?.NSAllowsArbitraryLoads;
  const cleartext = expo.android?.usesCleartextTraffic;
  if (ats) { console.error('BLOCKER: NSAllowsArbitraryLoads=true in production'); process.exit(1); }
  if (cleartext) { console.error('BLOCKER: usesCleartextTraffic=true in production'); process.exit(1); }
  console.log('OK: security flags clean for production');
"
```

**자기검증**: 게이트가 실제로 동작하는지 1회 확인한다 — `PRODUCTION_BUILD` 없이 같은 명령을 돌리면 dev 설정이므로 `NSAllowsArbitraryLoads=true`가 **검출되어야** 한다. 검출되지 않으면 게이트 자체가 고장난 것이다.

```bash
cd apps/mobile && npx expo config --type public --json | node -e "
  let s=''; process.stdin.on('data',d=>s+=d).on('end',()=>{
    const e=(JSON.parse(s).expo)??JSON.parse(s);
    const ats=e.ios?.infoPlist?.NSAppTransportSecurity?.NSAllowsArbitraryLoads;
    console.log(ats ? 'OK: 게이트 정상 (dev에서 ATS 검출됨)' : 'FAIL: 게이트가 dev 설정도 못 잡는다 — 검증 로직 점검 필요');
  })"
```

**Android cleartext는 별도로 확인한다.** `app.config.ts`는 `usesCleartextTraffic`을 설정하지 않으므로(확인됨) 위 검사의 `cleartext` 항목은 앱 설정에서 잡히지 않는다. Android는 prebuild가 생성한 매니페스트를 직접 본다 — release 매니페스트에 cleartext가 켜져 있으면 BLOCKING:

```bash
# prebuild 이후에만 존재. Phase 3 빌드 직후 검증한다.
MANIFEST=apps/mobile/android/app/src/main/AndroidManifest.xml
if [ -f "$MANIFEST" ]; then
  grep -q 'usesCleartextTraffic="true"' "$MANIFEST" \
    && echo "BLOCKER: release AndroidManifest에 usesCleartextTraffic=true" \
    || echo "OK: android cleartext clean"
else
  echo "SKIP: 매니페스트 미생성 (prebuild 전) — Phase 3 이후 재확인"
fi
```

실패 시 BLOCKING — 앱스토어/Play 리젝 원인.

### Step 6: Prerequisites Report

BLOCKING 항목 있으면 보고 후 중단.
모두 통과하면 Phase 1 진행.

---

## Phase 1: Deploy

의존성 순서대로 배포. 각 단계 실패 시 즉시 중단.

### 배포 경로 정책

GitHub Actions workflow와 로컬 배포가 공존한다. **충돌 방지를 위해 다음 규칙을 따른다:**

- Server: **GitHub Actions를 trigger**하고 완료를 대기한다 (`gh workflow run` → `gh run watch`)
- WebView: 동일하게 Actions trigger
- GitHub CLI(`gh`)가 없거나 Actions 실행 불가 시: **fallback으로 로컬 배포** 실행

```bash
# gh CLI 사용 가능 여부 확인
which gh && gh auth status 2>/dev/null && GH_AVAILABLE=true || GH_AVAILABLE=false
```

### Step 1: DB Migration

DB 마이그레이션은 **Supabase MCP `apply_migration`**으로 적용한다 (DB는 단일 환경).

**`execute_sql`로 마이그레이션 파일을 실행하지 않는다.** `execute_sql`은 적용 이력을 `supabase_migrations` 테이블에 남기지 않으므로, 재배포마다 전량 재실행되어 `CREATE TABLE` 충돌이나 seed 중복이 발생한다. `apply_migration`은 이름과 함께 이력을 기록하므로 멱등하다. (`CLAUDE.md`의 마이그레이션 단일 정책과도 일치한다.)

```bash
# 로컬 마이그레이션 파일 목록
test -d supabase/migrations && ls supabase/migrations/*.sql 2>/dev/null | xargs -n1 basename
```

적용 절차:

1. MCP `list_migrations`로 **이미 적용된 버전 목록**을 가져온다
2. 로컬 파일명(`{timestamp}_{name}.sql`)의 timestamp와 대조해 **미적용분만** 골라낸다
3. timestamp 오름차순으로 각각 MCP `apply_migration`(`name` = 파일명의 `{name}`, `query` = 파일 내용)을 호출한다
4. 각 적용 후 `deploys.jsonl`에 `migration_applied` 이벤트를 append한다 (`detail.version` = timestamp)

```bash
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":null,"phase":"deploy","agent":"deploy-orchestrator","event":"migration_applied","detail":{"version":"{timestamp}","name":"{name}"}}' >> docs/progress/deploys.jsonl
```

- 미적용분이 없으면 스킵하고 그 사실을 보고한다 (조용히 넘어가지 않는다)
- MCP를 쓸 수 없는 환경이면 `supabase db push` CLI로 대체한다 — 이것도 이력을 관리하므로 안전하다. `execute_sql`은 어느 경우에도 마이그레이션 적용 수단이 아니다
- 디렉토리가 없거나 파일이 없으면: 스킵

### Step 2: Server Deploy

**방법 1 — GitHub Actions (기본)**:

```bash
if [ "$GH_AVAILABLE" = true ]; then
  gh workflow run deploy.yml
  sleep 3
  gh run watch $(gh run list --workflow=deploy.yml --limit=1 --json databaseId -q '.[0].databaseId')
fi
```

**방법 2 — 로컬 fallback** (gh 미설치 또는 Actions 실패 시):

모노레포 루트에서 Docker 이미지 빌드 후 SSH로 Oracle VM에 배포:

```bash
# 1. Docker 이미지 빌드 & GHCR push
docker buildx build --platform linux/amd64 -f apps/server/Dockerfile -t ${GHCR_IMAGE} --push .

# 2. SSH로 Oracle VM에서 pull & restart
ssh $SSH_OPTS ubuntu@${ORACLE_HOST} "
  echo '${GITHUB_TOKEN}' | docker login ghcr.io -u ${GITHUB_ACTOR} --password-stdin
  cd /home/ubuntu/app
  docker compose pull
  docker compose up -d --force-recreate
  docker image prune -f
"
```

Health check (cold start 대비 재시도):

```bash
curl -sf --retry 3 --retry-delay 5 --retry-all-errors ${SERVER_URL}/api || echo "SERVER_HEALTH_FAILED"
```

### Step 3: WebView Deploy

NOTE: 법적문서는 여기서 배포하지 않음. 일반 WebView만 배포. 법적문서는 launch phase에서 처리.

**방법 1 — GitHub Actions (기본)**:

```bash
if [ "$GH_AVAILABLE" = true ]; then
  gh workflow run deploy-webview.yml
  sleep 3
  gh run watch $(gh run list --workflow=deploy-webview.yml --limit=1 --json databaseId -q '.[0].databaseId')
fi
```

**방법 2 — 로컬 fallback** (gh 미설치 또는 Actions 실패 시):

WebView 빌드 시 환경변수가 필수. Vite가 `apps/webview/.env` 파일을 자동으로 읽는다.

```bash
grep "VITE_SUPABASE_URL" apps/webview/.env* 2>/dev/null || echo "BLOCKING: VITE_SUPABASE_URL 누락"
grep "VITE_SERVER_URL" apps/webview/.env* 2>/dev/null || echo "BLOCKING: VITE_SERVER_URL 누락"

cd apps/webview && pnpm build
wrangler pages deploy dist/ --project-name="${PAGES_PROJECT}"
```

Health check:

```bash
curl -sf --retry 3 --retry-delay 5 --retry-all-errors ${WEBVIEW_URL} || echo "WEBVIEW_DEPLOY_FAILED"
```

### Step 4: Deploy Status

컴포넌트별 배포 결과를 테이블로 기록한다.

---

## Phase 2: ADB Smoke Test #1 (Dev 빌드)

### Step 1: Dev 빌드 & 에뮬레이터 설치

에뮬레이터 준비는 **`scripts/ensure-emulator.sh`** 로 한다 (GPU 렌더링·화면 잠듦·AVD 락·포트 리버스 처리 포함).

```bash
bash scripts/ensure-emulator.sh
```

`EMULATOR_FAILED=*` 이면 사유를 그대로 보고하고 중단한다. 특히 이 스크립트를 우회해 직접 `emulator` 를
띄우면 Apple Silicon 기본 GPU 모드에서 **스토어 스크린샷이 통째로 검게 나간다** (실측).

Expo dev 빌드로 에뮬레이터에 앱 설치 및 실행:

```bash
cd apps/mobile && npx expo run:android
```

앱이 에뮬레이터에서 정상 실행되는지 확인.

### Step 2: ADB Smoke 실행

- **`adb-smoke` agent** spawn
- 입력: package name (`ANDROID_PACKAGE`), 테스트 시나리오. incremental 모드는 `docs/features/{feature}-test-scenarios.md`를 우선 사용하고, initial 모드/스냅샷 부재 시 고정명 alias `docs/features/test-scenarios.md`로 fallback한다 (glob `docs/features/*-test-scenarios.md`는 접두 스냅샷만 매칭하므로 고정명을 반드시 포함 — 계약: `docs/features/ARTIFACTS.md`)
- 배포된 서버/WebView를 바라보는 상태에서 전체 시나리오 검증
- 증거 수집: 스크린샷, 로그캣

### Step 3: Handle Failures

- FAIL 시 원인 분석 → 코드 수정 → 재배포(해당 컴포넌트만) → Step 2 재실행
- Max 3 retries. 초과 시 BLOCKED 보고 후 중단.

### Step 4: All Pass → Phase 3

---

## Phase 3: Production 빌드

```bash
cd apps/mobile && pnpm build:android
cd apps/mobile && pnpm build:ios
```

빌드 실패 시 로그 분석 후 수정. 성공 시 Phase 4.

---

## Phase 4: ADB Smoke Test #2 (Production 빌드) + 스토어 캡처 + iOS 스모크

### Step 1: Production 빌드 에뮬레이터 설치

AAB는 에뮬레이터에 직접 설치할 수 없다. **`build-android.sh`가 `bundleRelease`와 함께 `assembleRelease`를 실행해 동일 서명·동일 versionCode의 release APK를 `apps/mobile/build-{ts}.apk`로 남긴다** — 이걸 설치한다 (bundletool 불필요):

```bash
PROD_APK=$(ls -t apps/mobile/build-*.apk 2>/dev/null | head -1)
if [ -z "$PROD_APK" ]; then
  echo "BLOCKING: release APK 없음 — pnpm build:android를 다시 실행해야 한다"
else
  # dev 빌드가 같은 패키지로 설치돼 있으면 서명 충돌이 나므로 먼저 제거
  adb uninstall ${ANDROID_PACKAGE} 2>/dev/null || true
  adb install -r "$PROD_APK"
  echo "installed: $PROD_APK"
fi
```

> AAB와 APK가 같은 Gradle 실행에서 나오므로 versionCode·서명·코드가 동일하다. 즉 이 APK로 통과한 스모크는 제출할 AAB에 대한 검증으로 유효하다.
>
> 폴백(스크립트를 우회해 수동 빌드한 경우): `find apps/mobile/android/app/build/outputs/apk/release -name "*.apk" | head -1`, 그것도 없으면 bundletool로 universal APK 추출 (`bundletool build-apks --bundle={aab} --output=out.apks --mode=universal`).

### Step 2: ADB Smoke 실행 (스토어 캡처 모드)

- **`adb-smoke` agent** spawn — 입력에 `store_capture: true`, `locale: ko` (기본) 포함
- 전체 시나리오 재검증 (production 환경)
- **스토어 캡처 모드**: 이 실행이 스토어 제출용 원본 스크린샷의 유일한 생산 지점이다.
  - adb-smoke가 wireframe 문서(`docs/features/wireframe-*.md`, index: `docs/features/wireframe-index.md`) 기준 주요 화면 4~8장을 `adb screencap`으로 캡처
  - 저장 규칙: `assets/screenshots/android/{locale}/NN-name.png` (예: `01-onboarding.png`, `02-main.png`, `03-detail.png`, `04-settings.png`)
- 캡처 완료 검증:

```bash
COUNT=$(ls assets/screenshots/android/ko/*.png 2>/dev/null | wc -l)
[ "$COUNT" -ge 4 ] || echo "FAIL: 스토어 스크린샷 ${COUNT}장 (최소 4장) — adb-smoke 캡처 모드 재실행"
```

이 산출물은 `/make-aso-images`(ASO 프레임 이미지)와 `scripts/upload-images.mjs`(Play Store 업로드)가 소비한다.

### Step 3: iOS Simulator Smoke (필수 게이트) + iOS 스토어 스크린샷 캡처

iOS 앱을 제출 전 최소 1회 실행 검증한다. 스토어용 IPA(device 서명)는 시뮬레이터에 설치할 수 없으므로, 동일 코드의 Release 시뮬레이터 빌드로 검증한다.

**동시에 iOS 스토어 스크린샷을 여기서 캡처한다.** Android 캡처를 iOS 스크린샷으로 재사용하면 Android 상태바·네비게이션바가 그대로 노출되어 Apple 리젝 사유가 된다 (`Constraints`의 "혼용 금지"와도 모순).

```bash
# 1. 시뮬레이터 부팅 — App Store 규격에 맞는 기종을 고른다
#    6.9" iPhone 16 Pro Max (1320x2868) 또는 6.7" iPhone 16 Plus (1290x2796)
DEVICE_ID=$(xcrun simctl list devices available \
  | grep -E "iPhone 1[6-9] Pro Max|iPhone 1[6-9] Plus" | head -1 | grep -oE '[0-9A-F-]{36}')
# 폴백: 규격 기종이 없으면 아무 iPhone (해상도는 캡처 후 판정)
[ -z "$DEVICE_ID" ] && DEVICE_ID=$(xcrun simctl list devices available | grep -E "iPhone" | head -1 | grep -oE '[0-9A-F-]{36}')
xcrun simctl boot "$DEVICE_ID" 2>/dev/null || true

# 2. Release 구성 시뮬레이터 빌드 (SCHEME은 build-ios.sh와 동일하게 .xcworkspace 이름에서 추출)
cd apps/mobile/ios
xcodebuild -workspace *.xcworkspace -scheme {SCHEME} -configuration Release \
  -sdk iphonesimulator -derivedDataPath build/sim -destination "id=${DEVICE_ID}" build | tail -5
cd ../../..

# 3. 설치 + 기동
APP_PATH=$(find apps/mobile/ios/build/sim -name "*.app" -path "*Release-iphonesimulator*" | head -1)
xcrun simctl install "$DEVICE_ID" "$APP_PATH"
BUNDLE_ID=$(node -e "console.log(require('./apps/mobile/app.json').expo.ios.bundleIdentifier)")
xcrun simctl launch "$DEVICE_ID" "$BUNDLE_ID"
sleep 5

# 4. 기동 후 첫 화면 렌더 확인 (프로세스 생존 + 스크린샷)
xcrun simctl spawn "$DEVICE_ID" launchctl list | grep -q "$BUNDLE_ID" || echo "FAIL: 앱 프로세스 없음 (기동 직후 크래시)"
mkdir -p test-results/ios-smoke
xcrun simctl io "$DEVICE_ID" screenshot test-results/ios-smoke/first-screen.png
```

- `first-screen.png`가 실제 첫 화면(스플래시 이후 온보딩/로그인/메인)을 렌더하는지 Read로 확인한다. 검정/흰 화면·크래시 다이얼로그면 FAIL.
- FAIL 시 `xcrun simctl spawn "$DEVICE_ID" log show --last 2m --predicate 'process == "{app_name}"'`로 크래시 로그 분석 → 수정 → Phase 3 재빌드.
- **이 게이트(기동 후 첫 화면 렌더)를 통과하지 못하면 iOS 스토어 제출 불가** — BLOCKED 보고.
- 결과를 `deploys.jsonl`에 `smoke_result` 이벤트(platform: ios)로 append.

#### Step 3.5: iOS 스토어 스크린샷 캡처 (필수)

스모크가 PASS한 **같은 시뮬레이터 세션에서** 스토어 원본 스크린샷을 캡처한다. 화면 이동은 앱의 deep link scheme(`apps/mobile/app.json`의 `expo.scheme`)으로 한다 — Android처럼 uiautomator로 조작할 수 없으므로 라우트 직접 진입이 가장 결정론적이다.

```bash
LOCALE=ko
SCHEME=$(node -e "console.log(require('./apps/mobile/app.json').expo.scheme)")
mkdir -p assets/screenshots/ios/${LOCALE}

# 캡처 대상 라우트는 docs/features/page-map.md의 주요 화면 4~8개
# (Android 캡처와 동일한 화면 세트를 쓴다 — 순번·슬러그도 맞춘다)
capture() {  # capture <NN-name> <route|"">
  [ -n "$2" ] && { xcrun simctl openurl "$DEVICE_ID" "${SCHEME}://$2"; sleep 3; }
  xcrun simctl io "$DEVICE_ID" screenshot "assets/screenshots/ios/${LOCALE}/$1.png"
}

capture 01-onboarding ""            # 기동 직후 첫 화면
capture 02-main "(tabs)"            # 실제 라우트는 page-map 기준으로 치환
capture 03-detail "..."
capture 04-settings "..."
```

**검증** (하나라도 실패하면 재캡처):

```bash
COUNT=$(ls assets/screenshots/ios/${LOCALE}/*.png 2>/dev/null | wc -l)
[ "$COUNT" -ge 4 ] || echo "FAIL: iOS 스토어 스크린샷 ${COUNT}장 (최소 4장)"

# 해상도 확인 — App Store는 6.7"(1290x2796) 또는 6.9"(1320x2868)를 받는다
sips -g pixelWidth -g pixelHeight assets/screenshots/ios/${LOCALE}/*.png
```

- 각 이미지를 Read로 확인한다. 스플래시·빈 화면·에러 토스트가 잡혔으면 해당 화면만 재캡처한다 (deep link 직후 렌더가 늦으면 `sleep`을 늘린다).
- 해상도가 위 두 규격이 아니면 규격 기종 시뮬레이터로 다시 캡처한다. 업로드 시 display type은 `app-store.mjs screenshots <dir> auto`가 해상도로 자동 판정한다.
- 결과를 `deploys.jsonl`에 `smoke_result`(platform: ios)의 `detail.ios_screenshots`로 함께 기록한다.

### Step 4: Handle Failures

- Production에서 FAIL(Android smoke / iOS simulator smoke) → 심각한 문제. 수정 → Phase 3 재빌드 → Phase 4 재검증
- 스토어 스크린샷 4장 미만 → adb-smoke를 캡처 모드로 재실행 (재빌드 불필요)
- Max 2 retries. 초과 시 BLOCKED 보고 후 중단.

### Step 5: All Pass → Phase 5

---

## Phase 5: 완료 보고

```text
## Deploy Complete: {mode}
Date: {timestamp}

### Deploy Summary
| Component | Status | URL |
|-----------|--------|-----|
| Server | ✅ | ${SERVER_URL} |
| WebView | ✅ | ${WEBVIEW_URL} |
| DB | ✅ | {n} migrations applied |

### Build Summary
| Platform | Status | Output |
|----------|--------|--------|
| Android (AAB) | ✅ | apps/mobile/build-{ts}.aab |
| iOS (IPA) | ✅ | apps/mobile/build/ipa/app.ipa |

### Smoke Test
| Phase | Build | Result |
|-------|-------|--------|
| #1 Dev (ADB) | expo run:android | ✅ PASS |
| #2 Production (ADB) | pnpm build:android | ✅ PASS |
| #3 iOS Simulator | Release iphonesimulator | ✅ PASS |

### Store Screenshots (raw)
| Platform | Path | Count | 캡처 지점 |
|---|---|---|---|
| Android | assets/screenshots/android/ko/*.png | {n}장 | Phase 4 Step 2 (production ADB smoke) |
| iOS | assets/screenshots/ios/ko/*.png | {n}장 | Phase 4 Step 3.5 (Release 시뮬레이터) |

두 플랫폼 모두 최소 4장이어야 한다. `/make-aso-images`와 `upload-images.mjs`·`app-store.mjs screenshots`의 입력이다.

### Next Steps
- /setup-icons → /setup-landing → /make-aso-images (build phase 3개 subphase)
- /launch 로 스토어 출시 진행
```

---

## Error Handling

| Situation | Action |
|-----------|--------|
| CLI 미설치 | 자동 설치 시도 |
| Oracle VM SSH 실패 | 호스트/키 확인 안내 |
| 빌드/Wrangler 배포 실패 | 로그 분석 후 재시도 |
| keystore.properties 없음 | auto mode: `phase_deferred` 기록 후 이 phase만 종료 / interactive: `docs/preflight.md` 안내 |
| release APK 없음 (Phase 4) | `pnpm build:android` 재실행 (bundleRelease+assembleRelease 동시 산출) |
| ASC AuthKey 없음 | 준비 안내 |
| Gradle 빌드 실패 | 로그 분석, keystore 확인 |
| xcodebuild 실패 | Xcode/Provisioning 확인 |
| ADB smoke 실패 (dev) | 수정 → 재배포 → 재검증 (최대 3회) |
| ADB smoke 실패 (production) | 수정 → 재빌드 → 재검증 (최대 2회) |
| iOS 시뮬레이터 스모크 실패 | 크래시 로그 분석 → 수정 → Phase 3 재빌드 (최대 2회) |
| 스토어 스크린샷 4장 미만 | adb-smoke 캡처 모드 재실행 |
| 에뮬레이터 없음 | 설치 안내 후 중단 |
| 키 파일 미존재 | 생성 안내 |

## Constraints

- main 브랜치 기준 배포 원칙
- 코드 수정은 Phase 2 Fix Loop에서만
- 배포 완료 보고 전 ADB smoke 생략 금지
- 배포 완료 보고 전 iOS 시뮬레이터 스모크(기동 후 첫 화면 렌더) 생략 금지
- DB는 단일 환경
- 법적문서는 deploy에서 처리하지 않음 (launch 책임)
- **스토어 원본 스크린샷의 유일한 생산 지점은 deploy Phase 4다** — Android는 Step 2(스토어 캡처 모드), **iOS는 Step 3.5(Release 시뮬레이터 캡처)**. `/make-aso-images`는 이 원본을 프레임 처리만 하며 캡처 능력이 없다. 둘 중 하나라도 없이 완료 보고하지 않는다
- **iOS 스크린샷에 Android 캡처를 재사용하지 않는다** — Android 상태바·네비게이션바가 노출되어 Apple 리젝 사유다
