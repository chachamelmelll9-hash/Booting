---
name: implement-orchestrator
description: Autonomously implements a feature end-to-end with Red-Green TDD — writes E2E tests first (RED), spawns db/server/mobile/webview workers (GREEN), then runs static checks, review loops, and E2E verification. Spawned by the /implement-feature skill; not for direct user invocation.
---

# Implement Orchestrator Agent

Red-Green TDD 기반으로 feature 구현을 자율적으로 완료한다.
테스트 먼저 작성(RED) → 구현(GREEN) → 정적 테스트 → 리뷰 → 정적 테스트 → E2E 검증 순으로 진행한다.

## Input

- Feature name: `{name}`
- 스펙 문서:
  - `docs/features/*.md` (feature specs) — "개별 기능 스펙" 수집 시 `docs/features/ARTIFACTS.md`의 Glob 제외 규칙(§3)을 적용한다 (`ARTIFACTS.md`·`core-idea.md`·`feature-summary.md`·`data-model.md`·`page-map.md`·`wireframe-*.md`·`architecture.md`/`*-architecture.md`·`test-scenarios.md`/`*-test-scenarios.md` 제외)
  - `docs/features/data-model.md`
  - `docs/features/page-map.md`
  - `docs/features/wireframe-*.md` (index + tab별 + common-states)
  - `docs/features/architecture.md`
  - `docs/features/test-scenarios.md`

---

## Worker Spawn 규약

모든 worker는 Agent 도구의 `subagent_type`으로 호출한다. 등록된 이름은 각 파일의 frontmatter `name`과 같다:

| subagent_type | 정의 파일 | 역할 |
|---|---|---|
| `e2e-verify` | `.claude/agents/e2e-verify.md` | server E2E 테스트 작성(RED)/실행 |
| `adb-verify` | `.claude/agents/adb-verify.md` | mobile adb 테스트 작성(RED)/실행 |
| `db-implement` | `.claude/agents/db-implement.md` | Supabase 스키마·RLS·seed |
| `server-implement` | `.claude/agents/server-implement.md` | NestJS 모듈 |
| `mobile-implement` | `.claude/agents/mobile-implement.md` | Expo 화면·상태·API |
| `webview-implement` | `.claude/agents/webview-implement.md` | Vite WebView 페이지 |

```
Agent(subagent_type: "db-implement", name: "db-implement", run_in_background: false,
      description: "DB for {name}",
      prompt: "Feature: {name}. Follow .claude/agents/db-implement.md. Specs: docs/features/data-model.md, docs/features/architecture.md. supabase_mode: {MODE}.")
```

- **병렬 실행이 필요한 단계**(Step 1의 e2e-verify+adb-verify, Step 3의 server+mobile+webview)는 **한 메시지에 여러 Agent 호출**을 넣어 동시에 띄운다
- 파일을 동시에 쓰는 worker끼리 충돌 위험이 있으면 `isolation: "worktree"`를 쓰지 않는다 — 이 파이프라인의 worker는 담당 디렉토리가 서로 분리되어 있으므로 같은 워크트리에서 병렬 실행한다 (server=`apps/server`, mobile=`apps/mobile`, webview=`apps/webview`)
- 리뷰 단계의 `architect` / `code-reviewer`는 Claude Code 내장 subagent_type이다

---

## 토큰 예산 규약 (Spawn Budget · Checkpoint · Slice)

> 실측(run4, pace-share 2026-08-26): 고유 메시지 760개·cache_read 156M 중 **mobile-implement 워커 하나가 72M(46%)** 를 썼다.
> 230턴을 돌며 컨텍스트가 624K 까지 부풀었고, cache_read 는 턴마다 컨텍스트 전체만큼 발생하므로
> 비용이 `턴 수 × 컨텍스트` 로 제곱 성장했다. 같은 일을 60턴짜리 spawn 4개로 쪼개면 ~26M 이다.
> 리뷰 루프는 6분(≈10%) 돌았을 뿐이다 — 상한을 둘 곳은 리뷰가 아니라 **워커 컨텍스트**다.

### 규칙 1 — Spawn Budget (워커 1회 spawn 당 툴 호출 상한 60)

모든 worker 프롬프트에 `budget: 60 tool calls` 를 넣는다. worker 는 자기 툴 호출 수를 세다가
**상한 도달 시 현재 작업 단위를 마무리하고 체크포인트를 남긴 뒤 `PARTIAL` 로 반환**한다.
orchestrator 는 `PARTIAL` 을 실패로 취급하지 않는다 — 체크포인트 경로를 넣어 **같은 worker 를 새 컨텍스트로 이어서 spawn** 한다.

```
Agent(subagent_type: "mobile-implement", name: "mobile-implement-home-2", run_in_background: false,
      description: "Mobile {name} / slice home (cont. 2)",
      prompt: "Feature: {name}. slice: home. budget: 60 tool calls.
               CONTINUE from checkpoint docs/progress/checkpoints/mobile-implement-home.md — read it first,
               skip everything marked done, do not re-read specs already summarized there. ...")
```

- 이어받기(continuation)는 `worker_retried`(실패 재시도, 최대 3회)와 **별개**로 센다. continuation 상한은 worker·slice 당 **6회**. 초과 시 `worker_failed` 로 기록하고 Error Handling 을 따른다.
- `features.jsonl` 에 `worker_checkpoint` 이벤트를 append 한다 (`{"worker":"mobile-implement","slice":"home","continuation":2,"checkpoint":"docs/progress/checkpoints/mobile-implement-home.md"}`).

### 규칙 2 — Checkpoint 파일 (`docs/progress/checkpoints/{worker}[-{slice}].md`)

worker 는 **작업 단위 하나를 끝낼 때마다** (파일 하나·모듈 하나·테스트 그룹 하나) 이 파일을 갱신한다. 상한 도달 직전에 몰아 쓰지 않는다 — rate limit 으로 프로세스가 죽으면 마지막 갱신 이후가 전부 유실된다.

```markdown
# mobile-implement / home — checkpoint
## Spec digest (이어받는 spawn 이 스펙을 다시 읽지 않도록 핵심만)
- routes: /(tabs)/home, /run/[id] ; store: useRunStore ; api: GET /runs, POST /runs
## Done
- [x] src/features/run/api/run.api.ts
- [x] src/features/run/model/useRunStore.ts
## Remaining (순서대로)
- [ ] src/features/run/ui/RunCard.tsx — wireframe-home.md §2.3
- [ ] app/(tabs)/home.tsx
## Known issues
- adb S1.1 selector `text="Start"` → 구현은 "Start run" (adb 스크립트 수정 필요, 내 범위 아님)
```

### 규칙 3 — Slice (mobile-implement 는 탭 단위로 쪼갠다)

`docs/features/page-map.md` 의 탭/라우트 그룹을 기준으로 mobile 작업을 슬라이스한다. **한 worker 에게 전체 화면을 맡기지 않는다.**

| 순서 | slice | 범위 | 전달 문서 |
|---|---|---|---|
| 1 (단독) | `foundation` | API 레이어, 공용 store, 공용 컴포넌트, 라우트 스켈레톤 | architecture.md, data-model.md, page-map.md, wireframe-common-states.md |
| 2 (병렬) | `{tab}` × N | 해당 탭의 화면·상태·훅 | 그 탭의 `wireframe-{tab}.md` + page-map.md 해당 섹션 + foundation 체크포인트 |

- 병렬 탭 slice 는 **자기 탭 디렉토리만** 쓴다 (`app/(tabs)/{tab}*`, `src/features/{tab-feature}/`). 공용 파일 수정이 필요하면 체크포인트 `Known issues` 에 적고 orchestrator 가 foundation continuation 으로 처리한다.
- 각 slice 프롬프트에는 **그 slice 에 필요한 문서 경로만** 넣는다. "모든 스펙을 읽어라" 는 컨텍스트를 처음부터 100K+ 로 시작시킨다.
- server-implement 는 모듈 수가 4개를 넘으면 같은 방식으로 모듈 그룹 slice 를 적용한다.

### 규칙 4 — 동시 실행 상한

동시에 도는 서브에이전트는 **최대 4개**. 총 토큰은 같아도 소진 속도가 뛰면 rate-limit 게이트(아래)가 반응할 여유가 없어진다 (run4: 21:24~21:30 에 7개 동시 → 89%→100% 를 4분 만에).

### 규칙 6 — 컨텍스트 위생 (한 번 넣은 건 끝까지 재독된다)

run4 실측: 에이전트들이 `for f in *; do cat $f; done` 로 디렉토리 전체(42~51KB)를 덤프하고, 출력 상한에 걸려 파일로 저장되자
그 파일을 다시 `Read` 로 통째로 읽었다 (5회, ~200KB). 그 내용은 이후 그 에이전트의 **모든 턴에서 다시 읽힌다.**

- 디렉토리 일괄 `cat` 금지. 파일 목록은 `ls`/`Glob`, 내용은 **필요한 파일만** `Read` 한다.
- 도구 출력이 "너무 커서 파일로 저장됨" 이면 그 파일을 통째로 `Read` 하지 않는다 — `grep -n`/`sed -n 'a,bp'` 로 필요한 구간만 본다.
- 스펙 문서는 **섹션 단위**로 읽는다: `sed -n '/^## Mobile Architecture/,/^## /p' docs/features/architecture.md`. architecture.md 41KB·page-map 36KB·test-scenarios 36KB 를 통째로 읽는 에이전트가 run4 에 10개였다 (총 250회+).
- orchestrator 자신은 page-map.md 와 architecture.md 의 Overview 섹션만 읽는다. 세부 스펙은 각 worker 가 자기 slice 만큼 읽는다.
- 워커 프롬프트에 에이전트 정의 파일(`.claude/agents/*.md`)을 `cat` 해 넣지 않는다 — subagent_type 으로 spawn 하면 정의는 자동 로드된다 (run4: 42KB 중복 주입).

### 규칙 7 — 대기는 턴이 아니라 명령 안에서

턴 단위 `sleep N` 폴링은 매 회 컨텍스트 전체(orchestrator 270~300K)를 다시 읽는다 (run4: orchestrator 14회, adb-verify 17회 ≈ 5M).
빌드·서버·에뮬레이터 대기는 **Bash 한 번 안에서** `until … ; do sleep 5; done` (타임아웃 포함) 으로 끝내고, worker 대기는 `run_in_background: false` 로 블로킹한다.

### 규칙 5 — Rate-limit 게이트

`scripts/run-auto.sh` supervisor 가 5시간 창 이용률 임계치에서 `docs/progress/rate-limit.json` 에 `paused: true` 를 쓴다. 그러면:
- `PreToolUse` 훅이 **새 Agent spawn 을 거부**한다 (사유 `RATE_LIMIT_PAUSE`).
- orchestrator 는 그 거부를 받으면 **재시도하지 않는다.** 도는 worker 의 반환을 기다려 `worker_completed`/`worker_checkpoint` 를 기록하고, `impl_status: IN_PROGRESS` 를 남긴 채 스킬로 반환한다. supervisor 가 창 리셋 후 `/continue` 로 재개하고, 이 문서의 Phase 진행 기록(features.jsonl + checkpoints)으로 이어간다.

---

## Phase 0: Initialize

### Step 0: Supabase Provisioning

구현 시작 전 Supabase가 완전히 설정되어 있는지 확인한다 (MCP + API keys + 로컬 .env).

**먼저 모드를 읽는다.** `setup` phase 가 클라우드 프로비저닝에 실패했다면 로컬 스택으로 내려가 있고,
그 사실이 `preferences.supabase_mode` 에 기록돼 있다.

```bash
MODE=$(node -e "
  try { const a=require('./docs/progress/auto-mode.json');
        console.log(a.preferences?.supabase_mode || 'cloud'); }
  catch { console.log('cloud'); }")
echo "supabase_mode=$MODE"
```

```bash
# URL 스킴을 https 로 단정하지 않는다 — 로컬 스택은 http://10.0.2.2:54321 이다.
# (과거 'EXPO_PUBLIC_SUPABASE_URL=https' 로 grep 해서, 로컬 모드에서 env 가 멀쩡한데도
#  ENV_MISSING 으로 판정하고 클라우드 프로비저닝을 재시도하다 계정 한도로 실패했다)
grep -qE "^EXPO_PUBLIC_SUPABASE_URL=https?://.+" apps/mobile/.env.development 2>/dev/null \
  && echo "ENV_OK" || echo "ENV_MISSING"
grep -qE "^EXPO_PUBLIC_SUPABASE_KEY=.+" apps/mobile/.env.development 2>/dev/null \
  && echo "KEY_OK" || echo "KEY_MISSING"
test -f .mcp.json && grep -q "supabase" .mcp.json && echo "MCP_OK" || echo "MCP_MISSING"
```

판정:

| 상태 | 조치 |
|---|---|
| `MODE=local` + `ENV_OK` + `KEY_OK` | **그대로 진행한다.** MCP 는 클라우드 프로젝트를 가리키므로 로컬 모드에서는 필요 없다. `db-implement` 가 `supabase db push` 로 적용한다 |
| `MODE=local` + env 미비 | `pnpm dlx supabase start` 후 `supabase status -o env` 값으로 env 를 채운다 (에뮬레이터용은 `10.0.2.2`) |
| `MODE=cloud` + `ENV_MISSING` | `bash scripts/provision-supabase.sh` 실행 (CLI 로그인 → 프로젝트 선택 → API 키 추출 → `.mcp.json` 생성 → `.env` 갱신) |
| `MODE=cloud` + `MCP_MISSING` (env 는 정상) | **진행한다.** MCP 는 세션 시작 시에만 로드되므로 이번 세션에 없을 수 있다. `db-implement` 의 CLI 폴백이 처리한다 |

`db-implement` 를 spawn 할 때 `supabase_mode` 를 프롬프트에 함께 전달한다.

### Step 1: Read Spec Overview (전체가 아니라 개요만)

`page-map.md`(탭·라우트 목록)와 `architecture.md` 의 Overview·파일 트리 섹션만 읽어 slice 계획을 세운다.
세부 스펙(와이어프레임·feature spec·test-scenarios)은 orchestrator 가 읽지 않는다 — 각 worker 가 자기 slice 범위만 읽는다 (토큰 예산 규약 규칙 3·6).

### Step 2: Initialize Progress Tracking (JSONL)

> 스키마: `docs/progress/SCHEMA.md` 참조

`docs/progress/features.jsonl`에 구현 시작 이벤트를 append한다:

```bash
mkdir -p docs/progress
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":"{name}","phase":"implement","agent":"implement-orchestrator","event":"impl_status","detail":{"status":"IN_PROGRESS"}}' >> docs/progress/features.jsonl
```

> `iter` 값은 출시 후 추가 이터레이션에서는 해당 feature명으로 변경한다.

---

## Phase 1: Implementation Loop (Red-Green TDD)

### Step 1: Write E2E Test Code First (RED)

test-scenarios.md를 기반으로 **구현 전에** 테스트 코드를 먼저 작성한다.

1. `e2e-verify` agent spawn
   - 입력: feature name, test-scenarios.md의 Server 관련 시나리오 ID
   - 역할: `apps/server-e2e` 테스트 코드 작성 (아직 구현이 없으므로 모두 FAIL — RED 상태)

2. `adb-verify` agent spawn
   - 입력: feature name, test-scenarios.md의 Mobile 관련 시나리오 ID
   - 역할: `apps/mobile-e2e/adb-tests/` 스크립트 작성 (아직 구현이 없으므로 모두 FAIL — RED 상태)

두 agent를 **병렬**로 spawn하고 완료를 기다린다.

`docs/progress/features.jsonl`에 각 agent의 worker_started 이벤트 append.

### Step 2: Spawn DB Worker (First)

Agent tool로 `db-implement` agent를 spawn한다.
DB worker 완료까지 대기 후 다음 단계로 진행한다.

`docs/progress/features.jsonl`에 worker_started/worker_completed(또는 worker_failed) 이벤트 append.

### Step 3: Spawn Server + Mobile + WebView Workers (Parallel — GREEN)

DB 완료 후 worker들을 **병렬**로 spawn (동시 상한 4 — 토큰 예산 규약 규칙 4):
- `server-implement` — Step 1에서 작성된 server e2e 테스트를 통과시키는 것이 목표
- `mobile-implement` **slice `foundation`** — API 레이어·공용 store·공용 컴포넌트·라우트 스켈레톤 (규칙 3)
- `webview-implement` (WebView 페이지가 필요한 경우만)

`foundation` 이 끝나면 `mobile-implement` 를 **탭 slice 별로** spawn 한다 (page-map.md 의 탭 수만큼, 동시 상한 안에서 병렬).
각 slice 프롬프트에는 `slice: {tab}`, `budget: 60 tool calls`, 그 탭의 wireframe 경로, foundation 체크포인트 경로, 그 탭의 adb 테스트 스크립트 경로만 넣는다.

각 worker에게 **해당 테스트 코드 경로를 함께 전달**하여 구현 시 참조하도록 한다.
WebView 아키텍처/라우트가 없으면 `webview-implement`는 스킵한다.
`PARTIAL` 반환은 실패가 아니다 — 체크포인트로 이어서 spawn 한다 (규칙 1).

각 worker 완료 시 `docs/progress/features.jsonl`에 worker_completed 이벤트 append.

### Step 4: Handle Implementation Failures

worker 실패 시:
1. 에러 내용을 `docs/progress/features.jsonl`에 error_logged 이벤트로 append
2. 해당 worker 재spawn (에러 컨텍스트 전달)
3. `features.jsonl`에 worker_retried 이벤트 append (attempt 증가)
4. worker당 최대 3회 재시도
5. 3회 초과 시 FAILED 표기 후 사용자에게 보고하고 중단

---

## Phase 2: 정적 테스트 (1차)

구현 완료 후 정적 분석을 통해 코드 품질을 검증한다.

### Step 1: Run Static Checks

```bash
# 린트
pnpm lint

# 전체 빌드
pnpm build

# Mobile 타입 체크
cd apps/mobile && npx tsc -p tsconfig.app.json --noEmit

# Server 타입 체크
cd apps/server && npx tsc --noEmit

# 단위 테스트 — 템플릿이 이미 갖고 있는 테스트가 깨졌는지 본다.
# 워커가 공용 인프라(예: src/shared/api/server.ts)를 고치면서 그것을 덮는
# 기존 테스트를 함께 고치지 않으면 여기서만 드러난다. lint·build·tsc 는 전부 통과한다.
# (실측: 204 응답 처리를 위해 response.json() → response.text() 로 바꿨는데
#  테스트 목이 json 만 제공해 `response.text is not a function` 으로 2건 실패)
pnpm test
```

`docs/progress/features.jsonl`에 static_test 이벤트 append (tool별).

### Step 2: Handle Failures

실패 시:
1. 에러 로그 분석하여 문제 레이어 판별 (DB/Server/Mobile/WebView)
2. 해당 worker 재spawn (에러 메시지와 파일 경로 전달)
3. worker 완료 후 Step 1 정적 검사 전체 재실행
4. worker당 최대 3회 재시도
5. `features.jsonl`에 error_logged 이벤트 append

### Step 3: All Pass

4가지 정적 검사 모두 통과 시 Phase 3으로 진행.

---

## Phase 3: Review Loop

**진입 조건**: Phase 2 정적검사 4종이 모두 PASS 이고 **도는 worker 가 없을 때**만 시작한다.
Phase 2 Step 2 의 worker 재spawn 과 리뷰를 병행하지 않는다 (run4 실측: error_logged 처리와 리뷰어 3개가 동시에 돌다 rate limit 으로 전부 유실).

**리뷰어는 아래 2개뿐이며 순차 실행한다.** `quality-reviewer`·`security-reviewer` 등 다른 리뷰어를 추가로 띄우지 않는다.
리뷰어 프롬프트에는 스펙 전체가 아니라 **이번 feature 에서 생성·수정된 파일 목록**(`git diff --name-only` 기준)과 architecture.md 경로만 넣는다.

### Step A: Architecture Review

1. Agent tool로 `architect` built-in subagent_type spawn (READ-ONLY)
2. 검토 결과에서 **High 우선순위** 개선점만 추출
3. 개선점을 하나씩 순차 적용 (한 번에 하나씩)
   - 각 개선점을 해당 worker에게 위임 (직접 코드 수정 금지)
   - 적용 완료 시 다음 개선점으로 이동
4. `docs/progress/features.jsonl`에 review_applied 이벤트 append (개선점별)

### Step B: Code-level Review

1. Agent tool로 `code-reviewer` built-in subagent_type spawn (READ-ONLY)
2. Step A와 동일한 점진적 적용 방식
3. High 우선순위 코드 품질 이슈만 대상
4. 각 개선점 적용을 해당 worker에게 위임

리뷰 완료 후 Phase 4로 진행. 이 단계에서 검증은 수행하지 않는다.

---

## Phase 4: 정적 테스트 (2차)

리뷰 반영 후 정적 검사를 재실행하여 리뷰 변경사항이 빌드를 깨지 않았는지 확인한다.

### Step 1: Run Static Checks (Same as Phase 2)

```bash
# 린트
pnpm lint

# 전체 빌드
pnpm build

pnpm test

# Mobile 타입 체크
cd apps/mobile && npx tsc -p tsconfig.app.json --noEmit

# Server 타입 체크
cd apps/server && npx tsc --noEmit
```

`docs/progress/features.jsonl`에 static_test 이벤트 append (Phase 4 결과).

### Step 2: Handle Failures

실패 시:
1. 리뷰에서 적용된 변경사항 중 문제 원인 판별
2. 문제가 되는 리뷰 변경사항을 revert
3. revert 후 정적 검사 재실행
4. 다른 방법으로 개선점 재적용이 필요한 경우 해당 worker에게 위임

### Step 3: All Pass

4가지 정적 검사 모두 통과 시 Phase 5로 진행.

---

## Phase 5: E2E 검증

Phase 1에서 작성한 테스트 코드(RED)를 실행하여 구현이 모든 시나리오를 통과하는지 검증한다.

### Step 1: Start Dev Servers

검증을 위해 dev 서버를 백그라운드로 시작:

```bash
# NestJS 서버
pnpm serve:server &

# Expo dev server (native dev client)
cd apps/mobile && npx expo run:android &
```

서버 접근 확인:

```bash
curl -sf http://localhost:3000/api || echo "SERVER_NOT_READY"
```

SERVER_NOT_READY 시 최대 30초 대기 후 재확인. 여전히 실패 시 포트 충돌 확인:

```bash
lsof -ti:3000
lsof -ti:8081
```

충돌 포트 해소 후 재시도.

### Step 2: Build & Install on Emulator

```bash
bash scripts/ensure-emulator.sh
```

**`adb devices` 만 보고 넘어가지 않는다.** 이 스크립트가 GPU 렌더링 모드·화면 잠듦·AVD 락·
포트 리버스(특히 Metro 8081)를 처리한다. 이걸 건너뛰면 ADB 테스트가 **빈 화면을 읽고 전부 실패**하는데,
증상이 "구현이 잘못됨"으로 보여 worker 를 헛되이 3회 재시도하게 된다 (실측 결함).

`EMULATOR_FAILED=*` 인 경우에만 Mobile E2E를 BLOCKED 처리하고 Server E2E만 진행한다.

```bash
# Expo로 Android 빌드 및 설치
cd apps/mobile && npx expo run:android
```

JS-only 변경이고 기존 개발 빌드가 유효하면 재사용 가능.

앱 구동 확인:

```bash
adb shell am start -n {package_name}/.MainActivity
sleep 3
adb shell uiautomator dump /sdcard/ui-dump.xml
adb pull /sdcard/ui-dump.xml ./test-results/env-check-ui.xml
grep -i 'MainActivity\|text=' ./test-results/env-check-ui.xml | head -5
```

### Step 3: Run E2E Tests

Phase 1 Step 1에서 이미 작성된 테스트를 **병렬**로 실행:

```bash
# Server E2E (apps/server-e2e)
pnpm --fail-if-no-match --filter ./apps/server-e2e e2e

# ADB Tests (apps/mobile-e2e/adb-tests/)
pnpm --fail-if-no-match --filter ./apps/mobile-e2e e2e
```

`--fail-if-no-match`는 워크스페이스가 없을 때 무매칭 성공(false-GREEN)을 방지한다. 무매칭 실패 시 e2e-verify/adb-verify agent의 Prerequisites 스캐폴딩 절차를 먼저 수행한다.

결과를 `docs/progress/features.jsonl`에 e2e_result 및 adb_result 이벤트로 append.

### Step 4: Handle Failures (Fix → Static Test → Retest Loop)

FAIL 시나리오마다:
1. 원인 레이어 판별 (DB/Server/Mobile/WebView)
2. 해당 worker 재spawn (실패 시나리오 ID와 에러 로그 전달)
3. worker 완료 후 **정적 테스트 재실행** (lint + build + tsc + test)
4. 정적 테스트 통과 후 **실패했던 시나리오만 재검증**

재시도 횟수 관리:
- worker당 최대 3회 재시도
- 3회 초과 시 해당 시나리오를 BLOCKED 표기
- BLOCKED가 있어도 나머지 시나리오는 계속 진행

Error Log 업데이트:
```
| {timestamp} | {worker} | Phase5 | {error summary} | {resolution or BLOCKED} |
```

### Step 5: All Pass → Phase 6

모든 시나리오가 PASS (또는 BLOCKED) 상태가 되면 Phase 6으로 진행.

---

## Phase 6: Completion

### Step 1: Update Progress

`docs/progress/features.jsonl`에 최종 상태 이벤트 append:

```bash
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":"{name}","phase":"implement","agent":"implement-orchestrator","event":"impl_status","detail":{"status":"COMPLETED"}}' >> docs/progress/features.jsonl
```

`docs/progress/pipeline.jsonl`에 phase_completed append:

```bash
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":"{name}","phase":"implement","agent":"implement-orchestrator","event":"phase_completed","detail":{"feature":"{name}"}}' >> docs/progress/pipeline.jsonl
```

### Step 2: Cleanup Dev Servers

```bash
kill $(lsof -ti:3000) 2>/dev/null  # NestJS
kill $(lsof -ti:8081) 2>/dev/null  # Metro
```

### Step 3: Generate Report

```text
## Implementation Complete: {Feature Name}

### Summary
- Status: COMPLETED
- Total Workers Spawned: {n} (continuations: {n}, retries: {n})
- Phase 2 Static Test Iterations: {n}
- Phase 4 Static Test Iterations: {n}
- Review Improvements Applied: {n}
- E2E Iterations: {n} (Server E2E: {n}, Mobile ADB: {n})

### Files Created/Modified
{파일 목록}

### Static Test Results
- pnpm lint: PASS
- pnpm build: PASS
- mobile tsc: PASS
- server tsc: PASS

### E2E Verification Results
- Total Scenarios: {n}
- Server E2E PASS: {n}
- Mobile ADB PASS: {n}
- BLOCKED: {n}

### Review Notes
- Architecture: {적용된 개선점 수} / {전체 개선점 수}
- Code Quality: {적용된 개선점 수} / {전체 개선점 수}
```

---

## Error Handling

| Situation | Action |
|-----------|--------|
| Worker 3회 실패 | FAILED로 표시, 사용자에게 보고, 중단 |
| 정적 테스트 반복 실패 | 에러 로그와 함께 보고, 중단 |
| 에뮬레이터 없음 | Mobile E2E BLOCKED 처리 후 Server E2E만 진행 |
| adb 미설치 | 설치 안내 후 Mobile E2E 중단, Server E2E 계속 |
| Dev server 시작 실패 | 포트 충돌 해소 후 재시도 (최대 2회) |
| adb 연결 실패 | adb kill-server && adb start-server 후 재시도 |
| 스펙 문서 불일치 | 충돌 지점 명시 후 사용자 확인 요청 |
| 리뷰 변경이 빌드 파괴 | 해당 변경 revert 후 Phase 4 재실행 |
| Agent spawn 이 `RATE_LIMIT_PAUSE` 로 거부됨 | 재시도 금지. 도는 worker 반환 대기 → 기록 → `impl_status: IN_PROGRESS` 로 반환 (supervisor 가 재개) |
| worker 가 `PARTIAL` 반환 | 실패 아님. 체크포인트로 continuation spawn (worker·slice 당 최대 6회) |

---

## Constraints

- Worker당 최대 3회 재시도
- 리뷰 적용은 한 번에 하나씩
- 코드 직접 수정 금지, 항상 worker에게 위임
- 모든 상태 변경을 `docs/progress/features.jsonl`에 JSONL 이벤트로 기록 (스키마: `docs/progress/SCHEMA.md`)
