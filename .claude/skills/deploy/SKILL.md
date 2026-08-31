---
name: deploy
description: Deploy the app to production and verify with ADB smoke tests. Supports initial mode (first full deployment) and incremental mode (deploy changed components). Runs ADB smoke twice — dev build first, then production build with screenshot capture for store submission.
argument-hint: "[initial | feature-name]"
allowed-tools: Read, Write, Edit, Glob, Grep, Agent, Bash(pnpm *), Bash(cd apps/*), Bash(ssh *), Bash(docker *), Bash(bash scripts/*), Bash(wrangler *), Bash(adb *), Bash(curl *), Bash(npx *), Bash(brew *), Bash(npm *), Bash(which *), Bash(node *), Bash(mkdir *), Bash(git *), Bash(test *), Bash(sleep *), Bash(grep *), Bash(cat *), Bash(jq *), Bash(supabase *), Bash(gh *), Bash(./gradlew *), Bash(xcodebuild *), Bash(xcrun *), Bash(pod *), Bash(find *), Bash(ls *), Bash(bundletool *), Skill(setup-icons), Skill(setup-landing), Skill(make-aso-images)
---

## Auto Mode

`docs/progress/auto-mode.json` 파일이 존재하고 `enabled=true`이면:
- 모드 선택 프롬프트 스킵, `initial` 자동 선택
- `release_ready: false`이면 orchestrator가 Phase 0 Step -1에서 **`phase_deferred`**로 이 phase만 연기한다 — 그 경우 체이닝하지 않는다
  (`phase_blocked`가 아니다. deploy는 외부 계정·인프라가 있어야만 도는 phase이고, 없다고 해서 파이프라인 전체를 죽여서는 안 된다.
   앱의 빌드·동작 확인은 앞선 `verify` phase가 이미 끝냈다)
- Orchestrator 완료 후 **Step 3.5의 release prep 순서대로** 체이닝한다: `/setup-icons` → `/setup-landing` → `/make-aso-images` → `/launch`
  (`build` phase의 3개 subphase — `docs/progress/SCHEMA.md`. `/make-aso-images`만 호출하면 랜딩·아이콘 subphase가 누락된다)

---

## Usage

If the user provided an argument, use it as the deploy mode: $ARGUMENTS

- `initial` → 최초 배포 (전체 앱 배포 + ADB smoke 검증)
- `{feature-name}` → 추가 배포 (해당 feature 배포 + ADB smoke 검증)

If $ARGUMENTS is empty:
- **Auto mode**: `initial` 자동 선택. 프롬프트 스킵.
- **Interactive mode**: ask the user:
```
배포 모드를 선택해주세요:

1. initial — 최초 전체 배포 (모든 컴포넌트 배포 + ADB smoke 검증)
2. {feature-name} — 특정 기능 추가 배포 (변경된 컴포넌트만 배포 + 검증)
```

## Instructions

### Step 1: Determine Deploy Mode

If $ARGUMENTS is `initial`:
- mode = `initial`
- 전체 컴포넌트(DB, Server, WebView) 배포

If $ARGUMENTS is a feature name:
- mode = `incremental`
- test-scenarios 존재 확인: `docs/features/{name}-test-scenarios.md`를 우선 확인하고, 없으면 고정명 alias `docs/features/test-scenarios.md`로 fallback한다 (계약: `docs/features/ARTIFACTS.md`)
- 둘 다 없으면 안내: "해당 feature의 test-scenarios가 없습니다. `/write-test-scenarios {name}`으로 먼저 생성해주세요."

### Step 2: Spawn Deploy Orchestrator

Deploy orchestrator agent를 **Agent 도구로 명시 spawn**한다:

```
Agent(
  subagent_type: "deploy-orchestrator",
  name: "deploy-orchestrator",
  run_in_background: false,
  description: "Deploy {mode}",
  prompt: "mode: {initial|incremental}. feature: {name or none}. Follow .claude/agents/deploy-orchestrator.md Phase 0~5 in order."
)
```

- 에이전트 정의: `.claude/agents/deploy-orchestrator.md` (frontmatter `name: deploy-orchestrator`으로 등록됨)
- `run_in_background: false` — Step 3 결과 보고와 Step 3.5 체이닝이 orchestrator 결과에 의존하므로 동기 실행
- 전달 입력: mode (initial / incremental), feature name (incremental인 경우)

Orchestrator가 자율적으로 관리:
1. Phase 0: Prerequisites Check (CLI/인프라/키/환경변수)
2. Phase 1: Deploy (DB → Server → WebView)
3. Phase 2: ADB Smoke #1 (dev 빌드 — 전체 시나리오 검증)
4. Phase 3: Production 빌드 (Android + iOS)
5. Phase 4: ADB Smoke #2 (production 빌드 + 스토어 원본 스크린샷 캡처) + iOS 시뮬레이터 스모크
6. Phase 5: Completion Report

### Step 3: Report Results

Orchestrator 완료 후 결과를 사용자에게 보고:
- 배포 결과 (성공/실패, 각 컴포넌트별)
- Smoke 검증 결과 (#1 dev ADB, #2 production ADB, #3 iOS simulator)
- Production 빌드 산출물 (AAB, IPA 경로)
- 스토어 원본 스크린샷 — 플랫폼별로 **둘 다** 보고한다 (하나라도 없으면 출시 단계가 막힌다):
  - Android: `assets/screenshots/android/{locale}/NN-name.png` (Phase 4 Step 2)
  - iOS: `assets/screenshots/ios/{locale}/NN-name.png` (Phase 4 Step 3.5)
- 해결되지 않은 문제 (있는 경우)
- 다음 단계 안내: `/setup-icons` → `/setup-landing` → `/make-aso-images` → `/launch`

### Step 3.5: Auto-Chain — Release Prep

`docs/progress/auto-mode.json`을 읽는다. `enabled=true`이면 아래 순서로 즉시 호출한다:

1. `/setup-icons` — 앱 아이콘 생성/교체 (소스 이미지가 있는 경우)
2. `/setup-landing` — 랜딩 페이지 생성 및 배포
3. `/make-aso-images` — 스토어 ASO 스크린샷 생성 → 완료 후 `/launch`로 체이닝
