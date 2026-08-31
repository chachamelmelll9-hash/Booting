---
name: setup
description: Set up complete development environment. Extracts org from git, runs initial-setup.sh (org-only), provisions Supabase, starts all dev servers (server + Metro + vite) via pnpm dev. Chains to /start.
argument-hint: '[auto: problem-description]'
allowed-tools: Read, Write, Edit, Glob, Grep, AskUserQuestion, Bash(./scripts/initial-setup.sh *), Bash(./scripts/provision-supabase.sh), Bash(bash scripts/*), Bash(chmod *), Bash(pnpm *), Bash(curl *), Bash(sleep *), Bash(grep *), Bash(cat *), Bash(echo *), Bash(git *), Bash(mkdir *), Bash(adb *), Bash(lsof *), Bash(kill *), Bash(node *), Skill(preflight), Skill(start)
---

## Phase 0: Auto Mode Initialization

`$ARGUMENTS`가 `auto:`로 시작하면 auto mode를 활성화한다.

```
$ARGUMENTS = "auto: 반려동물 건강관리가 너무 흩어져 있어서..."
```

1. `auto:` 뒤의 텍스트를 `{PROBLEM}` 으로 추출

### Phase 0-1: Preflight (auto mode 진입 전 필수)

**`auto-mode.json`을 만들기 전에** `/preflight`를 실행한다. auto mode가 켜지면 AskUserQuestion이 금지되므로, 사람만 답할 수 있는 값(사업자 정보·연령 등급·데이터 안전·가격)은 **여기서만** 받을 수 있다.

```
Skill(preflight)
```

완료 후 `docs/progress/preflight.json`을 읽는다:

| 결과 | 동작 |
|---|---|
| `tier1_ok: false` | **auto mode를 켜지 않는다.** preflight가 안내한 조치를 출력하고 종료 |
| `skills_ok: false` | `bash scripts/doctor-skills.sh --fix`로 해소하고 `bash scripts/doctor-skills.sh`로 `SKILLS_OK`를 확인한 뒤 진행한다. 해소 없이 auto mode를 켜면 파이프라인이 중간에 죽는다 (실측 결함) |
| MCP를 이번에 새로 설정 | **진행한다.** 세션 재시작을 요구하지 않는다 — `db-implement`가 Supabase CLI 폴백으로 마이그레이션을 적용한다 (preflight Phase 1.5) |
| `release_ready: false` | **진행한다.** `verify` phase(빌드+동작확인)까지 완주하고 `deploy`/`build`/`launch`만 연기된다 |
| `tier1_ok: true` | Phase 0-2로 진행 |

### Phase 0-2: auto-mode.json 생성

`preflight.json`의 결과를 preferences에 반영한다 — 값을 임의로 정하지 않는다.

```bash
mkdir -p docs/progress
cat > docs/progress/auto-mode.json << 'AUTOEOF'
{
  "enabled": true,
  "problem": "{PROBLEM}",
  "release_ready": {preflight.json의 release_ready},
  "preferences": {
    "use_supabase": {인증 필요 여부 — preflight의 T1_MCP/T1_SUPA_ENV 결과 기준},
    "supabase_mode": "cloud",
    "kakao_login": {카카오 키가 이미 설정됐거나 사용자가 원한 경우 true},
    "locale": "ko",
    "icon_source": "{preflight가 찾은 아이콘 소스 경로 또는 null}",
    "declarations": "docs/store-declarations.yaml"
  }
}
AUTOEOF
```

**필드 계약:**

| 필드 | 의미 | 소비자 |
|---|---|---|
| `enabled` | auto mode 활성 여부 — Stop 훅 라우터의 단일 판정 기준 | 모든 스킬, Stop 라우터 |
| `release_ready` | `false`면 라우터가 `deploy`/`build`/`launch`를 건너뛴다 (`verify`까지는 그대로 완주). deploy가 호출되더라도 Phase 0에서 `phase_deferred`로 얕게 빠진다 | deploy, build, launch |
| `preferences.supabase_mode` | `cloud`(기본) 또는 `local`. Phase 3-2 폴백이 기록한다 | db-implement, deploy |
| `preferences.icon_source` | 아이콘 소스 경로. null이면 `/setup-icons`는 스킵 | setup-icons |
| `preferences.declarations` | 스토어 선언 데이터 파일 경로 | launch, setup-landing |

3. `AUTO_MODE=true` 설정. 이후 모든 Phase에서 auto mode 동작 적용.

`$ARGUMENTS`가 `auto:`로 시작하지 않으면 기존 동작 그대로 진행 (preflight도 실행하지 않는다 — interactive mode는 각 단계에서 직접 물어본다).

---

## Auto Mode

`docs/progress/auto-mode.json` 파일이 존재하고 `enabled=true`이면:

- AskUserQuestion을 사용하지 않는다 — AI가 자율적으로 최적 결정
- 모든 검증 체크포인트에서 "이대로 진행" 자동 선택
- 완료 후 다음 skill을 즉시 호출한다
- **예외 — supervisor 모드**: `docs/progress/supervisor.json` 이 존재하면 다음 skill 을 호출하지 않는다. 이 phase 의 `phase_completed` 를 기록하고 턴을 끝낸다 (supervisor 가 새 프로세스로 다음 phase 를 띄운다 — CLAUDE.md "Auto Mode 실행 계약")

---

## Progress Tracking (JSONL)

> 스키마: `docs/progress/SCHEMA.md` 참조

**`phase_started`는 Phase 2의 `initial-setup.sh` 실행 직후에 기록한다** (스킬 시작 시점이 아님 — 아래 Phase 2 하단의 append 명령 참조). `initial-setup.sh`가 `docs/progress/{pipeline,features,deploys}.jsonl`을 truncate(초기화)하므로, 그 전에 기록한 `phase_started`는 지워진다. 따라서 이 이벤트는 반드시 스크립트 실행 이후 1회만 기록한다.

**Phase 4 검증 성공 + Phase 5 보고 후** (Phase 6 체이닝 전) append:

```bash
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":null,"phase":"setup","skill":"setup","event":"phase_completed","detail":{}}' >> docs/progress/pipeline.jsonl
```

> Phase 4 검증이 최종 실패한 경우에는 `phase_completed` 대신 `phase_blocked`를 기록한다 (Phase 4-4 참조).

---

## Phase 1: Extract GitHub Organization

```bash
git remote get-url origin
```

Parse the owner from the URL:

- `git@github.com:OWNER/repo.git` → `OWNER`
- `https://github.com/OWNER/repo.git` → `OWNER`

Convert to lowercase → `{ORG}`.

### Phase 1.5: Vendor Repo Guard

origin이 여전히 벤더 템플릿 repo(`product-engineer-community/shippen`)를 가리키면, 이후 모든 작업의 push 대상이 없으므로(그리고 `{ORG}`가 벤더 org로 잘못 잡히므로) 먼저 경고하고 own repo로 재지정하도록 안내한다.

```bash
git remote get-url origin | grep -qiE '[:/]product-engineer-community/shippen(\.git)?$' && echo "VENDOR_ORIGIN" || echo "OWN_ORIGIN"
```

`VENDOR_ORIGIN`이면:

- **Interactive mode**: 아래를 안내하고 재지정 완료 후 재실행하도록 중단한다 (README "Quick Start" 절차):
  ```
  ⚠️ origin이 벤더 템플릿 repo(product-engineer-community/shippen)입니다.
  본인 repo를 먼저 만들고 origin을 재지정해주세요 (README Quick Start 참조):

    gh repo create <your-username>/<your-app> --private --source . --push
    # 또는 수동:
    git remote set-url origin git@github.com:<your-username>/<your-app>.git
    git push -u origin main
  ```
- **Auto mode**: 위 경고를 출력하되 중단하지 않고, `{ORG}`는 벤더 org를 쓰지 않도록 "app" 기본값으로 대체한 뒤 진행한다.

`OWN_ORIGIN`이면 파싱한 owner를 그대로 `{ORG}`로 사용한다.

If no git remote or parsing fails:

- Auto mode: `{ORG}` = "app" (기본값)
- Interactive mode: ask with AskUserQuestion.

---

## Phase 2: initial-setup.sh (org scope + 의존성 설치)

```bash
chmod +x scripts/initial-setup.sh
./scripts/initial-setup.sh --org "{ORG}"
```

단일 기능:

- org scope 교체 — 루트 `package.json`의 `name`에서 현재 스코프를 동적 감지한 뒤 `@{ORG}-service`로 교체 (감지 실패 시 `@myorg-service` placeholder를 fallback으로 사용)
- pnpm install
- .env.development 생성

**Wait for full completion.**

```
Phase 2 완료: 프로젝트 초기 설정
  ✔ org scope 교체 (@{ORG}-service)
  ✔ 의존성 설치
  ✔ 환경 변수 (.env.development)
```

`initial-setup.sh`가 진행 로그를 초기화하므로, **완료 직후** `phase_started`를 기록한다 (Progress Tracking 참조):

```bash
mkdir -p docs/progress
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":null,"phase":"setup","skill":"setup","event":"phase_started","detail":{}}' >> docs/progress/pipeline.jsonl
```

---

## Phase 2.5: 에뮬레이터 시작 + Supabase 사용 여부 확인

### 에뮬레이터 시작 (Background)

Supabase 프로비저닝 동안 부팅되도록 먼저 띄운다.

에뮬레이터 준비는 **`scripts/ensure-emulator.sh` 하나로 한다.** 직접 `emulator` 를 띄우지 않는다 —
GPU 렌더링 모드·화면 잠듦·AVD 락·프로세스 분리·포트 리버스를 그 스크립트가 전부 처리한다.

```bash
bash scripts/ensure-emulator.sh
```

- `EMULATOR_READY=<serial>` → 계속
- `EMULATOR_FAILED=no-avd` →
  - **Auto mode**: 에뮬레이터 없이 진행 (서버+웹뷰만 시작). Phase 4-3은 스킵하고 그 사실을 보고한다
  - **Interactive mode**: AskUserQuestion — "Android Studio에서 AVD를 먼저 생성해주세요" / Options: "AVD 생성 완료", "에뮬레이터 없이 진행"
- 그 외 `EMULATOR_FAILED=*` → `--restart` 로 1회 재시도 후 사유를 그대로 보고

### Supabase 사용 여부 확인

**Auto mode**: `auto-mode.json`의 `preferences.use_supabase` 값을 `{USE_SUPABASE}`로 사용. AskUserQuestion 스킵.

**Interactive mode**: AskUserQuestion으로 질문:

> "이 앱에 사용자 인증(로그인/회원가입)이 필요한가요?"
>
> - **"예 — Supabase로 인증 구현"**
> - **"아니오 — 인증 없이 진행"**

응답을 `{USE_SUPABASE}` 변수로 기억한다 (예=true, 아니오=false).

---

## Phase 3: Supabase Provisioning — `{USE_SUPABASE}=true`일 때만

> **`{USE_SUPABASE}=false`이면 Phase 3를 스킵하고 Phase 4로 진행한다.**

### 3-1: 클라우드 프로비저닝 시도

```bash
chmod +x scripts/provision-supabase.sh
bash scripts/provision-supabase.sh > /tmp/provision-supabase.log 2>&1 </dev/null
echo "exit=$?"; tail -20 /tmp/provision-supabase.log
```

### 3-2: 실패 시 — 로컬 Supabase 폴백 (중단하지 않는다)

클라우드 프로비저닝은 **계정 사정으로 실패할 수 있다**: 무료 플랜 프로젝트 개수 한도,
조직 미생성, 미로그인, 결제 필요, 네트워크. 이것들은 전부 **외부 계정 사안**이므로
`phase_blocked` 사유가 아니다 — 로컬 스택으로 내려간다.

> 실측: `러닝 기록 공유 앱` 완주 테스트에서 클라우드 프로젝트 생성이 계정 한도에 걸렸고,
> 로컬 Supabase로 내려가 파이프라인이 그대로 완주했다. 이 경로가 없으면 계정 한도 하나로
> "한 줄 요구사항 → 동작하는 앱" 계약이 통째로 깨진다.

```bash
docker info >/dev/null 2>&1 || echo "DOCKER_DOWN"   # Docker Desktop 미기동이면 먼저 띄운다
pnpm dlx supabase init --force >/dev/null 2>&1 || true
pnpm dlx supabase start
pnpm dlx supabase status -o env    # API URL / ANON_KEY / SERVICE_ROLE_KEY 를 여기서 읽는다
```

읽은 값을 env 파일에 반영한다. **에뮬레이터는 `localhost`로 호스트에 닿지 못한다** — `10.0.2.2`를 쓴다:

**호스트 주소는 "그 코드가 어디서 실행되는가"로 정한다** — 파일 위치가 아니다:

| 실행 위치 | 호스트 표기 |
|---|---|
| Mac 호스트의 Node 프로세스 (server) | `127.0.0.1` |
| Android 에뮬레이터 안 (RN 앱, **그리고 그 안의 WebView**) | `10.0.2.2` |

웹뷰 번들은 호스트의 vite가 서빙하지만 **실행은 에뮬레이터의 WebView 안**에서 된다.
따라서 웹뷰의 `VITE_*`도 `10.0.2.2`다 (`127.0.0.1`을 쓰면 에뮬레이터 안에서 자기 자신을 가리켜 실패한다).
데스크톱 브라우저로 웹뷰를 직접 열어 볼 때만 `127.0.0.1`이 필요하다.

| 파일 | 키 | 값 |
|---|---|---|
| `apps/mobile/.env.development` | `EXPO_PUBLIC_SUPABASE_URL` | `http://10.0.2.2:54321` |
| `apps/mobile/.env.development` | `EXPO_PUBLIC_SUPABASE_KEY` | `supabase status`의 `ANON_KEY` |
| `apps/mobile/.env.development` | `EXPO_PUBLIC_SERVER_URL` | `http://10.0.2.2:3000/api` |
| `apps/mobile/.env.development` | `EXPO_PUBLIC_WEBVIEW_URL` | `http://10.0.2.2:4200` |
| `apps/server/.env.development` | `SUPABASE_URL` | `http://127.0.0.1:54321` |
| `apps/server/.env.development` | `SUPABASE_SERVICE_ROLE_KEY` | `supabase status`의 `SERVICE_ROLE_KEY` |
| `apps/webview/.env.development` | `VITE_SUPABASE_URL` | `http://10.0.2.2:54321` |
| `apps/webview/.env.development` | `VITE_SERVER_URL` | `http://10.0.2.2:3000` |

폴백을 썼으면 `auto-mode.json`의 `preferences`에 기록한다 — 이후 phase가 이 사실을 알아야 한다:

```bash
node -e "
const f='docs/progress/auto-mode.json'; const a=require('./'+f);
a.preferences.supabase_mode='local';
a.preferences.supabase_local_note='클라우드 프로비저닝 실패로 로컬 스택 사용 — 배포 시 클라우드 프로젝트 필요';
require('fs').writeFileSync(f, JSON.stringify(a,null,2)+'\n');
console.log('supabase_mode=local recorded');"
```

`supabase_mode=local`이면:
- `db-implement`는 `pnpm dlx supabase db push`(또는 `db reset`)로 로컬에 마이그레이션을 적용한다
- `deploy` phase는 어차피 release-gated이므로, 클라우드 프로젝트는 그때 만들면 된다

Docker조차 없어서 로컬 스택도 못 띄우면 그때만 `phase_blocked`를 기록한다
(`reason`에 `docker info` 실제 출력을 넣는다).

---

## Phase 4: 개발 서버 전체 시작 + 빌드 검증

Supabase 프로비저닝 완료 후(또는 스킵 후) 개발 서버를 전체 시작한다.

`{PACKAGE_NAME}`은 `apps/mobile/app.json`의 `expo.android.package` 값.

### 4-1: pnpm dev 실행

```bash
pnpm dev &
```

`pnpm dev` = `turbo run dev` → server(webpack build + node) + mobile(expo run:android — 네이티브 빌드 + 설치 + Metro) + webview(vite) 병렬 실행.

### 4-2: 서버 + 웹뷰 검증

> **서버 판정은 `/api`로 한다. 루트(`/`)를 치면 안 된다.**
> `apps/server/src/main.ts`가 `setGlobalPrefix('api')`를 하므로 `http://localhost:3000`은
> 서버가 **정상 기동한 상태에서도 404**다. 루트로 `curl -sf`를 걸면 서버가 멀쩡해도 항상 실패해
> SERVER_FAIL로 판정되고 `phase_blocked`가 기록된다 — 첫 phase에서 파이프라인이 죽는다 (실측 결함).
>
> | 엔드포인트 | 의미 | 용도 |
> |---|---|---|
> | `/api` | liveness — Nest 앱이 떠 있는가 | **게이트 판정용** (외부 의존 없음) |
> | `/api/health` | readiness — Supabase 연결까지 정상인가 | 정보 수집용 (실패해도 게이트를 막지 않는다) |
>
> 게이트를 `/api/health`로 걸면 Supabase가 잠깐 느릴 때 setup 전체가 막힌다. liveness와 readiness를 분리한다.

```bash
# 서버 대기 (최대 30초)
for i in $(seq 1 6); do
  curl -sf http://localhost:3000/api > /dev/null && echo "Server OK" && break
  sleep 5
done

# 웹뷰 대기 (최대 30초)
for i in $(seq 1 6); do
  curl -sf http://localhost:4200 > /dev/null && echo "WebView OK" && break
  sleep 5
done

# 최종 상태 판정 (OK 미출력 시 FAIL)
curl -sf http://localhost:3000/api > /dev/null && echo "SERVER_OK" || echo "SERVER_FAIL"
# readiness (정보용 — 실패해도 SERVER_FAIL로 치지 않는다)
curl -sf http://localhost:3000/api/health > /dev/null && echo "SUPABASE_WIRING_OK" || echo "SUPABASE_WIRING_WARN"
curl -sf http://localhost:4200 > /dev/null && echo "WEBVIEW_OK" || echo "WEBVIEW_FAIL"
```

`SERVER_FAIL` 또는 `WEBVIEW_FAIL`이면 **Phase 5로 진행하지 말고 Phase 4-4 (검증 실패 처리)로 이동**한다.

### 4-3: 모바일 앱 설치 + 실행 검증

에뮬레이터가 있을 때만 수행. `expo run:android`가 네이티브 빌드 + 설치를 완료할 때까지 대기한다.

> 포트 리버스(8081/3000/4200/54321)와 화면 깨우기는 Phase 2.5의 `ensure-emulator.sh`가 이미 걸어 두었다.
> 그 사이 에뮬레이터를 재기동했다면 스크립트를 다시 돌린다 — Metro(8081)가 끊기면 dev 빌드는 빈 화면만 뜨고,
> 증상이 앱 버그처럼 보여 디버깅이 헛돈다 (실측: `Cannot connect to Metro. URL: 10.0.2.2:8081`).

```bash
# 에뮬레이터 부팅 완료 대기 (Phase 2.5에서 시작됨)
for i in $(seq 1 30); do
  BOOT=$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
  [ "$BOOT" = "1" ] && echo "EMULATOR_BOOT_COMPLETE" && break
  sleep 3
done

# 앱 설치 대기 (최대 10분 — 첫 네이티브 빌드는 오래 걸림)
for i in $(seq 1 120); do
  adb shell pm list packages 2>/dev/null | grep -q "{PACKAGE_NAME}" && echo "APP_INSTALLED" && break
  sleep 5
done

# 앱 foreground 실행 대기 (최대 3분)
for i in $(seq 1 36); do
  adb shell dumpsys activity top 2>/dev/null | grep -q "{PACKAGE_NAME}" && echo "APP_RUNNING" && break
  sleep 5
done
```

`APP_INSTALLED`/`APP_RUNNING`이 끝내 출력되지 않으면 모바일은 **비차단 실패**로 처리한다: Phase 5 보고에 ❌ 표기하되 서버+웹뷰가 정상이면 Phase 5로 진행한다 (에뮬레이터는 선택적 환경이므로).

### 4-3.5: 템플릿 기준선 품질 게이트

**기능을 짜기 전에 템플릿 자체가 건강한지 먼저 확인한다.** 여기서 빨간불이면 이후 implement 단계의
정적 검사가 "내가 방금 짠 코드 탓"으로 보여 디버깅이 통째로 헛돈다. 게다가 husky pre-commit이
`typecheck && lint && test && build`를 돌리므로, 하나라도 실패하면 **auto mode의 Stop 훅 auto-commit이
매 턴 조용히 실패**해 아무것도 커밋되지 않는다 (실측 결함: 신규 프로젝트가 import 정렬 에러 3건으로 실패했다).

```bash
pnpm typecheck 2>&1 | tail -3
pnpm lint      2>&1 | grep -E "✖|problems" | tail -3
pnpm test      2>&1 | tail -3
pnpm build     2>&1 | tail -3
```

- **에러(error)가 있으면 고친다.** import 정렬 같은 자동 수정 가능 항목은 `npx eslint --fix <파일>`로 즉시 해결한다
- **경고(warning)는 그대로 둔다** — 템플릿의 의도된 상태다
- 수정 후 재실행해 `0 errors`를 확인하고, 그 사실을 Phase 5 보고에 남긴다
- 자동으로 못 고치는 에러만 `phase_blocked`에 **실제 에러 출력과 함께** 기록한다

### 4-4: 검증 실패 처리 (서버/웹뷰)

4-2에서 `SERVER_FAIL` 또는 `WEBVIEW_FAIL`이 나온 경우:

1. **원인 확인**

   ```bash
   lsof -i :3000 2>/dev/null | cat
   lsof -i :4200 2>/dev/null | cat
   ```

   - 포트가 열려 있지 않으면 `pnpm dev` 프로세스 상태와 출력 로그(백그라운드 셸 출력)를 읽어 에러 원인을 파악한다 (의존성 누락, .env 미생성, 포트 충돌 등).

2. **재시도 (최대 2회)**: 파악된 원인을 수정한 뒤 기존 프로세스를 정리하고 `pnpm dev`를 재시작, 4-2 검증을 다시 실행한다.

   ```bash
   kill %1 2>/dev/null; pnpm dev &
   ```

3. **최종 실패 시 (2회 재시도 후에도 FAIL)**:

   - `pipeline.jsonl`에 `phase_blocked` 기록 (phase_completed는 기록하지 않는다):

   ```bash
   echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":null,"phase":"setup","skill":"setup","event":"phase_blocked","detail":{"reason":"dev server 검증 실패: {SERVER_FAIL/WEBVIEW_FAIL + 파악된 원인}","manual_action":"{필요한 수동 조치 — 예: .env.development 값 확인 후 /setup 재실행}"}}' >> docs/progress/pipeline.jsonl
   ```

   - Phase 5 보고에서 실패 컴포넌트를 ❌ BLOCKED로 표기한다.
   - **Phase 6 체이닝을 중단한다** — `/start`를 호출하지 않고, 사용자에게 실패 원인과 수동 조치를 안내한 후 종료한다.

---

## Phase 5: Status Report

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  개발 환경 설정 {완료! / 일부 실패 (BLOCKED)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Organization:  {ORG} (@{ORG}-service)
  Supabase:      {USE_SUPABASE ? "✔ 연동 완료" : "⏭ 스킵"}
  Server:        ✔ http://localhost:3000 / ❌ BLOCKED ({원인 요약})
  WebView:       ✔ http://localhost:4200 / ❌ BLOCKED ({원인 요약})
  Mobile:        ✔ 에뮬레이터에서 실행 중 / ❌ 설치·실행 실패 / ⏭ 에뮬레이터 없이 진행

  다음: /start → 앱 이름 결정 + 카카오 로그인 설정 + 기획 시작
        (BLOCKED 시: {manual_action} 후 /setup 재실행)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Phase 6: Auto-chain to /start

> **전제**: Phase 4 서버/웹뷰 검증 성공 (`phase_completed` 기록됨). Phase 4-4에서 `phase_blocked`가 기록된 경우 이 Phase를 실행하지 않는다.

**Auto mode**: `/start`에 `{PROBLEM}` (Phase 0에서 추출한 문제 설명)을 argument로 전달하여 즉시 호출.

**Interactive mode**: `/start`를 argument 없이 호출.

`/start` will:

1. Collect problem → derive core feature
2. Recommend and select app name
3. Run `branding.sh` → real app name/bundle ID 적용
4. Kakao Developers 브라우저 자동화 (실제 앱 이름 + 빌드 결과 키 해시 사용)
5. Save `core-idea.md`
6. Auto-chain to `/clarify-core-feature`
