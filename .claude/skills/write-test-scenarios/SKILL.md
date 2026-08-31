---
name: write-test-scenarios
description: Write E2E test scenarios based on User Journey steps from the feature specification. Generate scenarios that can be executed by server-e2e, adb, and post-deploy ADB smoke flows.
argument-hint: "[feature-name]"
allowed-tools: Read, Write, Glob, Grep, Bash(cat *), Bash(mkdir *), Bash(echo *), Skill(implement-feature)
---

## Auto Mode

`docs/progress/auto-mode.json` 파일이 존재하고 `enabled=true`이면:
- AskUserQuestion을 사용하지 않는다 — AI가 자율적으로 최적 결정
- Phase 2-1 (User Validation Checkpoint): 자동 승인, 피드백 없이 진행
- Completion 후 `/implement-feature`를 즉시 호출

---

## Usage

If the user provided an argument, use it as the feature name: $ARGUMENTS

If $ARGUMENTS is empty, look for `docs/features/architecture.md` using Glob. If it doesn't exist, tell the user to run `/design-architecture` first.

## Prerequisites

This skill reads all previous outputs:
- `docs/features/*.md` (feature specs from `/clarify-core-feature`)
- `docs/features/page-map.md` (page map from `/define-pages`)
- `docs/features/wireframe-*.md` (wireframes from `/design-wireframes`)
- `docs/features/architecture.md` (architecture from `/design-architecture`)

## Progress Tracking (JSONL)

> 스키마: `docs/progress/SCHEMA.md` 참조

**스킬 시작 시** `docs/progress/pipeline.jsonl`에 append:
```bash
mkdir -p docs/progress
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":null,"phase":"test-scenarios","skill":"write-test-scenarios","event":"phase_started","detail":{}}' >> docs/progress/pipeline.jsonl
```

**Completion 시** (test-scenarios 문서 작성 후) append. `detail.artifacts`에는 Phase 4에서 실제로 작성/갱신한 파일을 모두 나열한다 (계약: `docs/features/ARTIFACTS.md`):

- **초기 파이프라인** (iter="initial") — 고정명 1개:
```bash
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":null,"phase":"test-scenarios","skill":"write-test-scenarios","event":"phase_completed","detail":{"artifacts":["docs/features/test-scenarios.md"]},"output":"docs/features/test-scenarios.md"}' >> docs/progress/pipeline.jsonl
```

- **출시 후 이터레이션** (iter={feature}) — 스냅샷 + alias 둘 다 나열:
```bash
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"{feature}","feature":"{feature}","phase":"test-scenarios","skill":"write-test-scenarios","event":"phase_completed","detail":{"artifacts":["docs/features/{feature}-test-scenarios.md","docs/features/test-scenarios.md"]},"output":"docs/features/{feature}-test-scenarios.md"}' >> docs/progress/pipeline.jsonl
```

> **iter 치환**: 위 예시의 `"iter":"initial"`은 초기 파이프라인 기준이다. 출시 후 이터레이션에서는 기록 전에 활성 iter를 결정해 치환한다 — `docs/progress/SCHEMA.md`의 "활성 iter 결정" 규칙 참조. (phase_started 이벤트에도 동일하게 적용한다.)

---

## Instructions

You are a QA engineer who writes execution-ready E2E scenarios.
검증 타깃은 다음 3가지다:
- Server: `apps/server-e2e` (Jest 기반)
- Mobile: ADB test scripts (에뮬레이터/디바이스)
- Deploy 이후: ADB smoke (실제 앱 동작 확인)

### Core Principles

1. **Journey Step = Scenario Group** — User Journey step 하나가 시나리오 그룹 하나다.
2. **연속 흐름** — E2E는 순서대로 흘러가며 의존관계를 명시한다.
3. **Server/Mobile 분리 가능성** — 같은 기능도 서버 검증 포인트와 모바일 검증 포인트를 분리해서 쓴다.
4. **화면 우선 검증** — 모바일 결과는 화면 변화로 검증하고, 화면에 안 보이는 데이터만 DB 확인한다.
5. **자동 실행 가능성** — 시나리오는 Jest/ADB로 바로 변환 가능한 수준으로 구체적으로 작성한다.
6. **WebView 전용 브라우저 E2E 제외** — WebView는 독립 E2E 타깃으로 다루지 않는다.

### Phase 1: Read All Specs & Map Journey Steps

1. Read all four spec files
2. Extract User Journey steps and State Matrix
3. Present mapping summary

### Phase 2: Generate Scenarios by Journey Step

For the Gherkin scenario format and structure, see [references/gherkin-template.md](references/gherkin-template.md).

**Rules:**
- State Matrix에 정의되지 않은 상태는 시나리오를 만들지 않는다.
- "대기/진행(Waiting)" step은 독립 시나리오가 아니라 앞뒤 step에 포함한다.
- 화면으로 충분히 확인 가능한 결과는 DB 확인 시나리오를 생략한다.

### Phase 2-1: User Validation Checkpoint

**Auto mode**: 자동 승인. 피드백 없이 다음 step으로 진행.

**Interactive mode**: 2~3개 step 작성마다 사용자에게 확인한다.
- 무엇이 충분한지: 시나리오 수, 상태 커버리지, 검증 방식
- 피드백을 반영해 다음 step으로 진행

### Phase 3: E2E 관통 시나리오

모든 step별 시나리오 작성 후, 전체 Journey를 관통하는 E2E 시나리오를 작성한다.

### Phase 4: Generate Test Document

산출물 파일명은 `docs/features/ARTIFACTS.md` 계약을 따른다:
- **초기 파이프라인** (iter="initial"): 고정명 `docs/features/test-scenarios.md`에 작성한다.
- **출시 후 이터레이션** (iter={feature}): `docs/features/{feature}-test-scenarios.md` (이터레이션 canonical)에 작성하고, 동일 내용으로 `docs/features/test-scenarios.md` (최신 alias)를 갱신한다.

활성 iter 판정은 `docs/progress/SCHEMA.md`의 "활성 iter 결정" 규칙을 따른다.

작성 시 참조:
- [references/output-template.md](references/output-template.md)
- [references/adb-commands.md](references/adb-commands.md)

문서에는 최소한 다음 3개 체크리스트가 있어야 한다:
1. Server E2E Checklist
2. Mobile ADB Checklist
3. Post-deploy ADB Smoke Checklist

### Completion

**Auto mode**: 즉시 `/implement-feature`를 호출한다 (`Skill(implement-feature)`) — **단, supervisor 모드(`docs/progress/supervisor.json` 존재)에서는 호출하지 않고 `phase_completed` 기록 후 턴을 끝낸다** (CLAUDE.md "Auto Mode 실행 계약").

## Interaction Rules

1. Read ALL four spec files before writing scenarios.
2. Journey Step = Scenario Group.
3. Then 절은 가능한 한 눈으로 확인 가능한 결과를 우선 사용한다.
4. State Matrix에 정의된 상태만 시나리오로 만든다.
5. "대기/진행" step은 독립 시나리오로 분리하지 않는다.
6. When 절은 ADB/Jest로 실행 가능한 형태여야 한다.
7. Verification Checklist는 검증 에이전트가 그대로 실행할 수 있어야 한다.
8. E2E 관통 시나리오는 Happy Path 전체 연결이다.
9. Error/Empty 문구는 feature spec의 State Matrix 문구를 그대로 사용한다.
