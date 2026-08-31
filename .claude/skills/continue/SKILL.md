---
name: continue
description: Analyze current project state, sync progress documents, then auto-chain to the next pipeline skill to resume work seamlessly.
allowed-tools: Read, Write, Edit, Glob, Grep, Agent, Bash(ls *), Bash(git *), Bash(pnpm *), Bash(cat *), Bash(wc *), Bash(cd apps/*), Bash(mkdir *), Bash(echo *), Skill(setup), Skill(start), Skill(clarify-core-feature), Skill(define-pages), Skill(design-wireframes), Skill(design-architecture), Skill(write-test-scenarios), Skill(implement-feature), Skill(verify-app), Skill(deploy), Skill(setup-icons), Skill(setup-landing), Skill(make-aso-images), Skill(launch), Skill(preflight)
---

## Auto Mode

`docs/progress/auto-mode.json` 파일이 존재하고 `enabled=true`이면:
- 이 세션과 이후 체이닝되는 모든 skill에서 auto mode 동작 적용
- "다음에 추가할 기능을 설명해주세요" 질문 스킵 (initial 파이프라인에서는 해당 없음)
- 다음 skill 호출 시 `Skill(next-skill)` 도구 사용하여 직접 호출
- **예외 — supervisor 모드**: `docs/progress/supervisor.json` 이 존재하면 다음 skill 을 호출하지 않는다. `phase_completed` 를 기록하고 턴을 끝낸다 (supervisor 가 새 프로세스로 다음 phase 를 띄운다 — CLAUDE.md "Auto Mode 실행 계약")

---

## Usage

No arguments required. This skill inspects the current project state autonomously.

## Instructions

### Step 0: JSONL 진행상황 확인

> 스키마: `docs/progress/SCHEMA.md` 참조

3개 JSONL 파일을 스캔하여 현재 파이프라인 상태를 파악한다.

#### 0-1. 파이프라인 상태 (`docs/progress/pipeline.jsonl`)

파일이 없으면 → 파이프라인 미시작. Step 1로 넘어가서 파일 존재 여부로 추론한다.

파일이 있으면 역순 스캔:

1. 최신 `iteration_completed` 이벤트 찾기 → 기준 버전 (예: `"1.0.0"`)
2. 그 이후 `iteration_started` 이벤트 존재? → **활성 이터레이션** (출시 후 추가 Feature)
3. 둘 다 없으면 → 초기 파이프라인 (`iter="initial"`)

활성 `iter`의 이벤트만 필터하여:
- 마지막 `phase_completed` → 완료된 단계
- `phase_started`만 있고 `phase_completed` 없음 → **중단 지점** (이 phase 재개)
- 다음 phase = 파이프라인 순서상 다음

**파이프라인 순서** (Stop 훅 라우터와 동일한 순서를 쓴다 — 어긋나면 재개 지점이 갈린다. 정본: `.codex/hooks/lib/common.py`의 `PIPELINE_PHASES`):
- initial: `setup → start → clarify → define-pages → wireframes → architecture → test-scenarios → implement → verify → deploy → build → launch`
- 출시 후: `clarify → define-pages → wireframes → architecture → test-scenarios → implement → verify → deploy` (setup/start 건너뜀. OTA면 build/launch 건너뜀)

**`build` phase는 3개 subphase로 구성된다** (`docs/progress/SCHEMA.md` 참조). phase 이름은 모두 `build`이고 `skill` 값으로 구분한다:

| 순서 | skill | 필수 여부 |
|---|---|---|
| 1 | `setup-icons` | 아이콘 소스 이미지가 있을 때만 (없으면 `phase_skipped`) |
| 2 | `setup-landing` | 필수 |
| 3 | `make-aso-images` | 필수 |

`build`가 완료된 것으로 보려면 **필수 subphase 전부**가 `phase_completed`(또는 setup-icons의 `phase_skipped`)여야 한다. 하나라도 남아 있으면 그 subphase부터 재개한다 — 이 판정 로직은 `.codex/hooks/lib/progress.py`의 `build_subphase_statuses`와 동일하다.

**출시 후 활성 이터레이션이 없는 경우:**
`iteration_completed` 이벤트가 존재하고 이후 `iteration_started`가 없으면, 유저에게 묻는다:
"다음에 추가할 기능을 설명해주세요." (AskUserQuestion 사용)

유저가 기능을 설명하면:
1. feature명을 추출하여 `iter`로 사용
2. `pipeline.jsonl`에 `iteration_started` 이벤트 append
3. `/clarify-core-feature`를 다음 스킬로 설정

#### 0-2. 구현 상태 (`docs/progress/features.jsonl`)

implement phase 진행 중인 경우에만 확인한다.

활성 `iter`와 `feature`로 필터하여:
- `impl_status` 최신 이벤트 → 전체 상태 (IN_PROGRESS/COMPLETED/FAILED)
- `worker_*` 이벤트 → worker별 상태 복원:
  - 최신 이벤트가 `worker_completed` → COMPLETED
  - 최신 이벤트가 `worker_failed` → FAILED (detail.error 확인)
  - 최신 이벤트가 `worker_started` 또는 `worker_retried` → IN_PROGRESS
  - 이벤트 없음 → PENDING
- `static_test` 이벤트 → tool별 최신 결과
- `e2e_result`, `adb_result` → 검증 상태
- `error_logged` → 에러 이력

#### 0-3. 배포 상태 (`docs/progress/deploys.jsonl`)

deploy/build/launch phase 확인 시 스캔한다.

활성 `iter`로 필터하여:
- `component_deployed` → 배포된 컴포넌트 목록
- `build_completed` → 빌드 산출물
- `store_submitted` / `store_released` → 스토어 상태

pipeline.jsonl이 존재하면 Step 1의 기획 산출물 확인(1-1)을 **검증 용도**로만 사용한다 (JSONL 상태와 실제 파일 상태가 일치하는지 확인). 불일치가 있으면 실제 파일 상태를 기준으로 보정 이벤트를 추가한다.

pipeline.jsonl이 존재하지 않으면 Step 1로 넘어가서 기존 방식대로 파일 존재 여부로 추론한다.

### Step 1: 코드 기준 구현 현황 전체 확인

프로젝트의 실제 코드와 산출물을 기준으로 현재 상태를 파악한다.

#### 1-1. 기획 산출물 확인

> 산출물 파일명 계약: `docs/features/ARTIFACTS.md` 참조.

```
docs/features/core-idea.md          → /start 완료 여부
docs/features/feature-summary.md    → /clarify-core-feature 완료 여부
docs/features/data-model.md         → /clarify-core-feature 완료 여부
docs/features/page-map.md           → /define-pages 완료 여부
docs/features/wireframe-index.md    → /design-wireframes 완료 여부
docs/features/wireframe-*.md        → 개별 와이어프레임 존재
docs/features/architecture.md       → /design-architecture 완료 여부
docs/features/test-scenarios.md     → /write-test-scenarios 완료 여부
```

개별 기능 스펙(`docs/features/{feature}.md`)은 `feature-summary.md`의 Source Spec 목록으로 존재 여부를 확인한다.
출시 후 이터레이션(활성 iter = feature명)에서는 `docs/features/{feature}-architecture.md`, `docs/features/{feature}-test-scenarios.md` 존재도 함께 확인한다.

Glob으로 존재 여부를 확인하고, 존재하는 파일은 내용을 읽어 완성도를 판단한다.

#### 1-2. 구현 코드 확인

```bash
# Mobile 앱 — feature별 디렉토리 구조 확인
ls apps/mobile/src/features/ 2>/dev/null

# Server — 모듈 구조 확인
ls apps/server/src/ 2>/dev/null

# WebView — 페이지 구조 확인
ls apps/webview/src/pages/ 2>/dev/null

# Supabase 마이그레이션 확인
ls supabase/migrations/ 2>/dev/null
```

각 앱의 실제 파일 수와 구조를 확인하여 구현 범위를 파악한다.

#### 1-3. 빌드/배포 산출물 확인

```bash
# 빌드 산출물
ls apps/mobile/build-*.aab 2>/dev/null          # Android AAB
ls apps/mobile/build/ipa/*.ipa 2>/dev/null       # iOS IPA

# 스크린샷/ASO
ls assets/screenshots/android/ko/*.png 2>/dev/null
ls assets/aso-images/ios/ko/*.png 2>/dev/null

# 스토어 리스팅
ls docs/store-listing.md 2>/dev/null
ls docs/release-notes.md 2>/dev/null
```

#### 1-4. 정적 검증 상태 (빠른 체크)

구현 코드가 존재하면 빌드/타입체크 상태를 간단히 확인한다:

```bash
# lint 상태 (에러만 카운트)
pnpm lint 2>&1 | tail -5

# Mobile 타입체크
cd apps/mobile && npx tsc -p tsconfig.app.json --noEmit 2>&1 | tail -5
```

에러가 있으면 개수와 주요 파일을 기록한다. 에러가 없으면 "PASS"로 기록.

### Step 2: 진행상황 문서와 코드 대조 및 최신화

#### 2-1. features.jsonl 대조

`docs/progress/features.jsonl`이 존재하면 Step 0-2에서 복원한 worker 상태와 Step 1에서 파악한 실제 코드 상태를 대조한다:
- JSONL에 "COMPLETED"이나 코드에 없는 항목 → 불일치 표시
- 코드가 있으나 JSONL에 미반영 → 보정 이벤트 append
- 빌드/테스트 결과가 변경된 경우 → 새 `static_test` 이벤트 append

#### 2-2. features.jsonl 미존재 시

구현 코드가 존재하지만 features.jsonl이 없으면:
- "진행상황 JSONL 없음 — 코드 기준 상태만 보고" 표시
- features.jsonl 생성은 하지 않음 (/implement-feature에서 생성)

### Step 3: 파이프라인 위치 판단 및 다음 단계 자동 실행

전체 파이프라인과 현재 위치를 매핑한다:

```
Pipeline:
  /setup → /start → /clarify-core-feature → /define-pages → /design-wireframes
  → /design-architecture → /write-test-scenarios → /implement-feature
  → /deploy → [build: /setup-icons → /setup-landing → /make-aso-images] → /launch
```

Step 1~2의 결과를 종합하여:

1. **현재 완료된 단계** 목록
2. **다음 실행할 스킬** (하나만 명확하게)

파이프라인 중간 단계가 빠진 경우 (예: wireframe 없이 architecture 존재) 경고를 표시하고, 빠진 단계부터 실행한다.

### Output Format

현황 보고 후 바로 다음 스킬을 실행한다:

```
## 프로젝트 현황

### 기획 산출물
| 단계 | 산출물 | 상태 |
|------|--------|------|
| /start | core-idea.md | ✅ 완료 / ❌ 미완료 |
| /clarify-core-feature | feature specs, feature-summary.md, data-model.md | ✅ / ❌ |
| ... | ... | ... |

### 구현 현황
| 앱 | 모듈/Feature 수 | 주요 구현 항목 | 빌드 상태 |
|----|-----------------|---------------|-----------|
| Mobile | {n}개 feature | ... | PASS/FAIL |
| Server | {n}개 module | ... | PASS/FAIL |
| WebView | {n}개 page | ... | PASS/FAIL |

### 진행상황 문서 동기화
- {동기화 결과 요약}

---

## 다음 단계: /{next-skill}

이어서 진행합니다.
```

### Step 4: 다음 스킬 자동 체이닝

현황 보고 출력 직후, 판단된 다음 스킬을 **즉시 호출**한다.

- 해당 스킬의 SKILL.md를 읽고, 내용에 따라 실행한다.
- 사용자에게 "실행할까요?" 같은 확인을 별도로 묻지 않는다.
- 스킬이 argument를 받는 경우, Step 1에서 파악한 정보로 자동 추론하여 전달한다.

**예시:**
- 다음이 `/clarify-core-feature`이면 → `docs/features/core-idea.md`에서 core feature를 읽어 argument로 전달
- 다음이 `/implement-feature`이면 → 활성 iter가 feature명이면 그것을 전달, 초기 파이프라인이면 `docs/features/test-scenarios.md`(또는 `feature-summary.md`)에서 feature name을 추출하여 전달
- 다음이 `/deploy`이면 → argument 없이 바로 실행

## Interaction Rules

1. Step 1~2는 읽기 전용 분석이다. features.jsonl 보정 이벤트 append 외에는 코드를 수정하지 않는다.
2. 빌드/타입체크는 빠른 확인만 한다. 실패 시 원인 분석까지는 하지 않고 상태만 보고한다.
3. 다음 단계가 여러 갈래일 수 있으면 (예: deploy와 make-aso-images가 독립적) 파이프라인 순서 기준 우선 실행한다.
4. **Step 3 보고 후 멈추지 않고 Step 4로 바로 이어간다.** 이 스킬의 핵심은 분석 후 즉시 작업을 이어가는 것이다.
