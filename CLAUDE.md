# Shippen

## Project Structure

- **Monorepo**: Turborepo with pnpm
- **Apps**:
  - `apps/mobile/` - React Native + Expo mobile app (template with auth & routing)
  - `apps/server/` - NestJS backend server (authentication API)
  - `apps/webview/` - React web app for WebView integration

### 모바일 빌드 & 스토어 제출

> **로컬 빌드 전용** — EAS Build를 사용하지 않는다. 모든 빌드는 로컬 머신에서 `scripts/build-android.sh`, `scripts/build-ios.sh` 스크립트로 수행한다.

```bash
# 프로덕션 빌드 (apps/mobile 에서)
pnpm build:android    # → scripts/build-android.sh → AAB 생성
pnpm build:ios        # → scripts/build-ios.sh → IPA 생성

# 스토어 제출
node scripts/play-store.mjs upload <aab>
bash scripts/submit-ios.sh <ipa>
node scripts/app-store.mjs full-submit --ko "릴리스 노트" --en "Release notes"

# OTA 업데이트 (JS만 변경 시 — 스토어 심사 없이)
cd apps/mobile && pnpm update
```

- **EAS Build 사용 금지** — 빌드는 반드시 로컬 스크립트(`scripts/build-android.sh`, `scripts/build-ios.sh`)로 수행
- `npx eas-cli init`은 OTA 업데이트용 프로젝트 ID 발급에만 사용 (빌드 아님)
- 네이티브 변경 시 → 로컬 스토어 빌드 필요 (`runtimeVersion`은 fingerprint policy로 자동 감지)
- JS만 변경 시 → `pnpm update`로 OTA 배포 (스토어 심사 불필요)

## Package Installation Rules

### Expo (Mobile App)

```bash
cd apps/mobile
npx expo install <library-name>
```

**이유:** `npx expo install`은 현재 Expo SDK 버전과 호환되는 패키지 버전을 자동으로 선택합니다.

### Server / Webview

#### 공통 패키지

```bash
pnpm install -w <library-name>
```

#### 특정 앱에서만 사용하는 패키지

```bash
cd apps/server
pnpm add <library-name>
```

## Supabase

- **CLI 실행**: `pnpm dlx supabase` (글로벌 설치 대신 항상 이 방식 사용)
- **Configuration**: Set in `.env.development` / `.env.production` (see `.env.example` files)
- **Supabase MCP 필수**: `.mcp.json`에 Supabase MCP가 반드시 설정되어 있어야 한다
- **구현 시작 전**: `./scripts/provision-supabase.sh` 실행하여 Supabase MCP 설정
- DB 스키마 설계 시 `.claude/skills/supabase-postgres-best-practices/` 가이드를 참조한다
- **마이그레이션 단일 정책**: 스키마 변경 SQL은 MCP `apply_migration`으로 실행하되, 동일 SQL을 `supabase/migrations/{timestamp}_{name}.sql` 파일로 반드시 기록한다 (재현용 — 배포 시 이 파일들이 순서대로 적용된다)

### MCP로 수행하는 작업

- 스키마 변경 (테이블/인덱스/RLS 정책 생성·수정): `apply_migration`
- 데이터 CRUD (SELECT/INSERT/UPDATE/DELETE): `execute_sql`
- 테이블·확장·마이그레이션 목록 조회: `list_tables`, `list_extensions`, `list_migrations`
- TypeScript 타입 생성: `generate_typescript_types`
- 로그 조회·디버깅: `get_logs`, `get_advisors`
- API URL·키 조회: `get_project_url`, `get_publishable_keys`

### CLI로 수행하는 작업 (MCP 대체 불가)

- 마이그레이션 롤백·스쿼시·복구: `migration down/squash/repair`
- 스키마 diff·덤프: `db diff`, `db dump`
- 로컬 Supabase 환경: `start/stop/status`, `db reset`
- DB 성능 분석: `inspect db bloat/locks/outliers` 등
- 시크릿 관리: `secrets set/unset`
- Storage 파일 조작: `storage cp/rm`
- Edge Functions 로컬 실행: `functions serve`

## Template Features

This template includes:

- **Authentication System**: Login, signup, logout with JWT tokens
- **Tab Navigation**: Bottom tab navigation with Expo Router v6
- **WebView Integration**: Mobile-WebView bridge for hybrid apps
- **Internationalization**: i18n support (English/Korean)
- **TypeScript**: Full TypeScript configuration
- **State Management**: Zustand for global state
- **Styling**: React Native StyleSheet (no UI library dependencies)
- **AdMob**: Google AdMob integration (banner + native ads, env-var driven)

## Coding Conventions

- TypeScript 사용
- Expo Router v6 (file-based routing)
- 스타일: React Native StyleSheet (UI 라이브러리 미사용)
- 상태 관리: Zustand

## Build Commands

```bash
# 전체 빌드
pnpm build

# WebView 빌드
pnpm build:webview

# Server 빌드
pnpm build:server

# 린트
pnpm lint

# 특정 앱 린트
pnpm lint:mobile
pnpm lint:server

# 패키지 빌드 (Turborepo가 자동으로 의존성 순서대로 빌드)
pnpm build
```

## TypeScript 체크

Turborepo monorepo에서 **project references** 구조를 사용하므로, 타입 체크 시 반드시 올바른 tsconfig를 지정해야 합니다.

```bash
# Mobile 타입 체크 (올바른 방법)
cd apps/mobile
npx tsc -p tsconfig.app.json --noEmit

# 잘못된 방법 (include: []라서 체크 안됨)
npx tsc --noEmit  # 사용하지 말 것
```

**이유:** 기본 `tsconfig.json`은 `"include": []`이고 `references`만 정의되어 있어서, 직접 `tsc --noEmit`을 실행하면 체크할 파일이 없습니다.

## Getting Started

1. **Run initial-setup.sh** (자동으로 node/pnpm 설치 + 파일 치환 + pnpm install 실행):
   ```bash
   ./scripts/initial-setup.sh
   ```

2. **Set up environment variables** (각 앱에 `.env.development` 생성):
   ```bash
   cp apps/mobile/.env.example apps/mobile/.env.development
   cp apps/server/.env.example apps/server/.env.development
   cp apps/webview/.env.example apps/webview/.env.development
   # 프로덕션 배포 시:
   cp apps/mobile/.env.example apps/mobile/.env.production
   ```

3. **Phase-specific setup** (필요 시점에 실행):
   - 구현 시작 전: `./scripts/provision-supabase.sh` (Supabase MCP 설정)
   - OTA 업데이트 사용 시: `cd apps/mobile && npx eas-cli init` (프로젝트 ID 발급, 빌드와 무관)
   - 배포 직전: `./scripts/setup-deploy.sh` (Oracle Cloud + Cloudflare 설정 안내)

4. **Start development servers**:
   ```bash
   # Start backend server
   pnpm serve:server

   # Start mobile app
   cd apps/mobile
   npx expo start

   # Start webview app
   pnpm dev:webview
   ```

5. **Build for production**:
   ```bash
   # Build server
   pnpm build:server

   # Build webview
   pnpm build:webview

   # Build mobile (local native build)
   cd apps/mobile
   pnpm build:android
   pnpm build:ios
   ```

## Migration from Previous Version

If you're migrating from the previous device-specific version of this repository, please refer to [MIGRATION.md](./MIGRATION.md) for database cleanup instructions and other migration steps.


<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:ca08a54f -->
## Auto Mode 실행 계약 (Claude 런타임)

한 줄 요구사항에서 스토어 제출까지 자동 진행하는 모드. **진입점은 `/setup auto: {문제 설명}`** 이다 (`/start`가 아니다).

### 진행 메커니즘 — 2중 구조, 우선순위 고정

| 순위 | 메커니즘 | 역할 |
|---|---|---|
| 1차 | **스킬 내 체이닝** (`Skill(next)`) | 한 턴 안에서 다음 phase로 즉시 이어간다. 빠르다 |
| 2차 | **Stop 훅 라우터** (`.claude/hooks/stop_pipeline_router.py`) | 턴이 끝났는데 파이프라인이 안 끝났으면 다음 phase를 주입해 재개한다 |

- 라우터는 `pipeline.jsonl`에서 **`phase_completed`가 없는 첫 phase**를 고르므로, 체이닝이 이미 진행시킨 phase를 다시 실행하지 않는다. 두 메커니즘은 경쟁하지 않고 보완한다.
- **supervisor 모드** (`docs/progress/supervisor.json`이 있고 그 pid가 살아 있으면): **스킬 내 체이닝을 하지 않는다.** 현재 phase의 `phase_completed`를 기록하고 턴을 끝낸다. Stop 훅도 다음 phase를 주입하지 않으며, `scripts/run-auto.sh`가 라우터 프롬프트로 **새 프로세스**를 띄운다. 이유: run4에서 planning 5개 phase가 한 턴에 체이닝되어 MAIN 컨텍스트가 49K→339K로 누적됐고 이후 모든 턴이 그걸 재독했다. phase마다 새 컨텍스트로 시작하면 그 누적이 없다.
- 라우터 정본 로직은 `.codex/hooks/lib/`(phase 순서·blocker 판정·build subphase 규칙)이며 Codex와 공유한다. **phase 순서를 바꿀 때는 `.codex/hooks/lib/common.py`의 `PIPELINE_PHASES`를 고쳐야 한다** — 스킬 문서만 고치면 라우터와 어긋난다.
- 무한 루프 방지: 진행 기록(fingerprint)이 2회 연속 그대로면 중단하고, 연속 자동 진행 60회에서도 중단한다.

### 규약

- **`phase_completed` / `phase_deferred` / `phase_blocked` 중 하나를 반드시 기록한다.** 라우터의 유일한 입력이다. 기록하지 않으면 같은 phase를 반복 라우팅하다 정체 감지로 멈춘다.
- 외부 수동 blocker(계정·2FA·크레덴셜)를 만나면 임의 진행하지 않는다. **release-gated phase(`deploy`/`build`/`launch`)면 `phase_deferred`**를 기록하고 그 phase만 넘긴다. 로컬에서 자동 해결이 불가능한 문제일 때만 `phase_blocked` + `manual_action`으로 파이프라인을 세운다.
- auto mode에서 **AskUserQuestion을 쓰지 않는다.** 사람만 답할 수 있는 값은 진입 전 `/preflight`에서 받는다.
- **선언값은 생성하지 않는다** (declarations-as-data). 연령 등급·데이터 안전·사업자 정보·가격·국가는 `docs/store-declarations.yaml`에서만 읽고, 없으면 `phase_deferred`. 틀린 선언은 리젝이 아니라 계정 정지로 이어진다.
- **로컬 완주는 계정과 무관하다.** `verify` phase(앱 빌드 + 에뮬레이터 기동 + ADB 스모크)까지는 외부 계정·인프라 없이 **반드시** 자동 완주한다. Oracle·Cloudflare·Play·App Store가 없다는 이유로 `phase_blocked`를 기록하면 결함이다 — 그건 `phase_deferred`이고, 라우터가 `deploy`/`build`/`launch`를 건너뛴다.
- **개인 스킬 shadowing 금지.** `~/.claude/skills/`에 같은 이름의 스킬이 있으면 프로젝트 정본이 가려진다. `/preflight`의 `T1_SKILLS` 점검(`scripts/doctor-skills.sh`)을 통과해야 auto mode를 시작한다.
- 스토어 제출 승인은 `store-declarations.yaml`의 `submit_policy`를 따른다: `first-app-manual`(기본 — 준비는 전부 자동, 마지막 제출만 확인) / `auto`.

### 실행 — rate limit 창을 넘겨 완주하려면 supervisor 로 띄운다

```bash
bash scripts/run-auto.sh "문제 설명"    # 새 파이프라인
bash scripts/run-auto.sh --resume       # 중단 지점에서 재개
```

파이프라인은 5시간 rate limit 창 하나에 끝나지 않는다 (실측: planning 48분 + implement 97분+ + verify 45분, run4 는 146분에 100% 소진).
supervisor 는 `claude -p` 의 stream-json 에서 `rate_limit_event.utilization` 을 읽어 **85% 에서 pause**(`docs/progress/rate-limit.json`) →
Stop 훅은 다음 phase 를 주입하지 않고 `PreToolUse` 훅(`.claude/hooks/pre_tool_rate_gate.py`)은 새 Agent spawn 을 거부한다 →
97%/rejected 에서 프로세스 종료 → `resetsAt` 까지 대기 → `/continue` 재기동. 도는 워커는 체크포인트(`docs/progress/checkpoints/`)를 남기고 끝나므로 유실이 작다.

### 토큰 예산 (implement phase)

실측(run4): 토큰의 46% 를 **mobile-implement 워커 하나**가 썼다 — 230턴 동안 컨텍스트가 624K 로 부풀었고 턴마다 그걸 다시 읽는다. 리뷰 루프는 10% 였다.
그래서 `implement-orchestrator.md` "토큰 예산 규약" 이 정한다: 워커 spawn 당 **툴 호출 60회 상한** → 체크포인트 남기고 `PARTIAL` 반환 → 새 컨텍스트로 이어서 spawn.
mobile 은 `foundation` + 탭 단위 slice 로 쪼개고, 동시 서브에이전트는 4개까지, 리뷰어는 architect→code-reviewer 2개 순차뿐이다.

### 상태 파일

| 파일 | 역할 |
|---|---|
| `docs/progress/auto-mode.json` | `enabled`(라우터 판정 기준), `problem`, `release_ready`, `preferences` |
| `docs/progress/supervisor.json` | supervisor 생존 표식(pid) — 있으면 phase 마다 새 프로세스, 스킬 체이닝 금지 |
| `docs/progress/rate-limit.json` | supervisor 가 쓰는 5시간 창 이용률·pause 플래그 — Stop/PreToolUse 훅의 게이트 입력 |
| `docs/progress/checkpoints/*.md` | 워커 체크포인트 (Spec digest / Done / Remaining) — continuation spawn 의 입력 |
| `docs/progress/runs/*.jsonl` | supervisor 가 남기는 `claude -p` stream-json 로그 (토큰·이용률 분석용) |
| `docs/progress/preflight.json` | 1회 세팅 점검 결과 + 남은 blocker |
| `docs/progress/pipeline.jsonl` | phase 전환 — 재개 지점의 단일 근거 |
| `test-results/verify/` | `verify` phase 증거 (기동 스크린샷·ADB 스모크 로그) |
| `docs/store-declarations.yaml` | 스토어 선언 데이터 (사용자 소유) |

전제 조건 체크리스트는 `docs/preflight.md`, 이벤트 스키마는 `docs/progress/SCHEMA.md` 참조.

### 파이프라인을 고칠 때

스킬·에이전트·훅을 수정했으면 **반드시** 회귀 테스트를 돌린다:

```bash
bash scripts/test-pipeline.sh
```

라우팅·게이트 규칙(rate-limit pause 포함), 토큰 예산 규약 정합성, 스킬/에이전트 참조 정합성, `disable-model-invocation` 재유입,
루트(`/`)를 치는 서버 헬스체크, 직접 `emulator` 기동, 개인 스킬 shadowing을 잡는다.
실제로 죽었던 파이프라인 로그(runner-log)를 재생하는 케이스가 포함돼 있다.

에뮬레이터가 필요한 작업은 `scripts/ensure-emulator.sh` 로만 준비한다 —
직접 띄우면 Apple Silicon 기본 GPU 모드에서 스크린샷이 통째로 검게 나와,
스모크 증거와 스토어 스크린샷이 무의미해진다.

## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->
