---
name: implement-feature
description: Implement a feature end-to-end using the orchestrator agent system with build, verify, and review loops. Use when the user wants to implement a feature that has spec documents ready (or needs to generate them first).
argument-hint: "[feature-name]"
allowed-tools: Read, Write, Edit, Glob, Grep, Agent, Bash(pnpm *), Bash(cd apps/*), Bash(cat *), Bash(mkdir *), Bash(echo *), Skill(verify-app)
---

## Auto Mode

`docs/progress/auto-mode.json` 파일이 존재하고 `enabled=true`이면:
- Orchestrator 완료 후 `/verify-app`을 즉시 호출 (앱이 실제로 빌드·기동되는지 증명하는 phase)
- `/deploy`로 바로 가지 않는다 — deploy는 외부 인프라가 필요하고, 없으면 라우터가 건너뛴다
- 결과 보고는 간략하게 출력 후 체이닝

---

## Usage

If the user provided an argument, use it as the feature name: $ARGUMENTS

If $ARGUMENTS is empty, look for the most recently modified `{feature}-test-scenarios.md` file in `docs/features/` using Glob (`*-test-scenarios.md`), and use `{feature}` as the name.

**초기 파이프라인 fallback**: 초기 파이프라인은 접두사 없는 고정명 `docs/features/test-scenarios.md`만 존재하므로 `*-test-scenarios.md` glob에 걸리지 않는다. 스냅샷이 하나도 없으면 `docs/features/test-scenarios.md` 존재를 확인하고, feature name은 `test-scenarios.md`(또는 `docs/features/feature-summary.md`)의 제목/핵심 기능에서 도출한다. `test-scenarios.md`도 없으면 사용자에게 스킬 파이프라인을 먼저 실행하라고 안내한다 (starting with `/clarify-core-feature`).

## Prerequisites

This skill requires all spec documents to exist before spawning the orchestrator:

1. `docs/features/*.md` — feature specs (from `/clarify-core-feature`)
2. `docs/features/data-model.md` (from `/clarify-core-feature`)
3. `docs/features/page-map.md` (from `/define-pages`)
4. `docs/features/wireframe-*.md` (from `/design-wireframes`)
5. `docs/features/architecture.md` (from `/design-architecture`)
6. `docs/features/test-scenarios.md` (from `/write-test-scenarios`)

## Instructions

### Step 1: Determine Feature Name

If $ARGUMENTS is provided, use it as `{name}`.

Otherwise, derive `{name}` per the Usage fallback: the most recent `{feature}-test-scenarios.md` snapshot if present, else the fixed-name `docs/features/test-scenarios.md` (initial pipeline) with `{name}` derived from `test-scenarios.md` or `docs/features/feature-summary.md`.

### Step 2: Check Document Existence

Check all documents exist using Glob:

```
docs/features/*.md (feature specs, at least 1)
docs/features/data-model.md
docs/features/page-map.md
docs/features/wireframe-index.md (+ wireframe-*.md)
docs/features/architecture.md
docs/features/test-scenarios.md
```

> `docs/features/*.md`로 "개별 기능 스펙"을 수집할 때는 `docs/features/ARTIFACTS.md`의 Glob 제외 규칙(§3)을 적용한다 — `ARTIFACTS.md`, `core-idea.md`, `feature-summary.md`, `data-model.md`, `page-map.md`, `wireframe-*.md`, `architecture.md`/`*-architecture.md`, `test-scenarios.md`/`*-test-scenarios.md`는 스펙 수집에서 제외한다.

### Step 3: Handle Missing Documents

If any documents are missing, run the corresponding skill in order:

| Missing Document | Skill to Run |
|-----------------|-------------|
| feature specs + `data-model.md` | `/clarify-core-feature` |
| `page-map.md` | `/define-pages` |
| `wireframe-index.md` | `/design-wireframes` |
| `architecture.md` | `/design-architecture` |
| `test-scenarios.md` | `/write-test-scenarios` |

Run each missing skill **in order** (they depend on each other sequentially).
Each skill involves user interaction, so wait for completion before proceeding.

After running a skill, re-check if the document was created.

### Step 3.5: Record Progress (JSONL)

> 스키마: `docs/progress/SCHEMA.md` 참조

Orchestrator 생성 전, `docs/progress/pipeline.jsonl`에 append:
```bash
mkdir -p docs/progress
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":"{name}","phase":"implement","skill":"implement-feature","event":"phase_started","detail":{"feature":"{name}"}}' >> docs/progress/pipeline.jsonl
```

### Step 4: Spawn Orchestrator

Once all prerequisite documents (Step 2의 6개 항목) are confirmed to exist, spawn the orchestrator agent **explicitly via the Agent tool**:

```
Agent(
  subagent_type: "implement-orchestrator",
  name: "implement-orchestrator",
  run_in_background: false,
  description: "Implement {name}",
  prompt: "Feature name: {name}. Follow .claude/agents/implement-orchestrator.md Phase 0~6 in order. Active iter: {iter}."
)
```

- 에이전트 정의: `.claude/agents/implement-orchestrator.md` (frontmatter `name: implement-orchestrator`으로 등록됨)
- `run_in_background: false` — 이 스킬은 orchestrator 완료 결과를 Step 5에서 보고해야 하므로 동기 실행한다
- Pass the feature name as context
- The orchestrator will autonomously manage:
  1. Phase 0: Initialize (read specs, init features.jsonl)
  2. Phase 1: Red-Green TDD (테스트 먼저 작성(RED) → DB → Server+Mobile+WebView 구현(GREEN))
  3. Phase 2: 정적 테스트 1차 (lint/build/typecheck)
  4. Phase 3: Review Loop (architecture + code review)
  5. Phase 4: 정적 테스트 2차
  6. Phase 5: E2E 검증 (Phase 1에서 작성된 테스트 실행 → 실패 수정 루프)
  7. Phase 6: Completion report

The orchestrator runs autonomously. Wait for it to complete.

### Step 4.5: 진행 기록 확인 (라우터 안전망)

**orchestrator 가 `phase_completed` 를 실제로 남겼는지 반드시 확인한다.**
`pipeline.jsonl` 은 Stop 훅 라우터의 **유일한 입력**이다. `phase_started` 만 남고 종료 이벤트가
없으면 라우터는 같은 phase 를 계속 재라우팅하다 정체 감지로 파이프라인을 세운다.

이 phase 는 시작(`implement-feature` 스킬)과 종료(`implement-orchestrator` 에이전트)의 기록
주체가 다르므로, 에이전트가 중간에 죽으면 기록이 비어 있을 수 있다.

```bash
tail -5 docs/progress/pipeline.jsonl | grep '"phase":"implement"' | grep -oE '"event":"[a-z_]+"' | tail -1
```

- `"event":"phase_completed"` → 정상. Step 5로 진행
- 그 외(비었거나 `phase_started`) → orchestrator 결과를 보고 **직접 기록한다**:
  - 구현이 실제로 끝났으면(`features.jsonl` 의 worker_completed + 정적 검사 통과) `phase_completed`
  - 실패로 끝났으면 `phase_blocked` 에 **실제 에러 내용**을 담아 기록

```bash
# 성공으로 판정한 경우에만
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":"{name}","phase":"implement","skill":"implement-feature","event":"phase_completed","detail":{"feature":"{name}","note":"orchestrator 기록 누락분 보정"}}' >> docs/progress/pipeline.jsonl
```

**구현이 안 끝났는데 `phase_completed` 를 쓰지 않는다.** 그건 라우터를 속여 검증 없는 앱을
`verify` 로 넘기는 것이고, `verify` 가 실패해도 원인이 두 단계 앞이라 진단이 어려워진다.

### Step 5: Report Results

When the orchestrator completes, read `docs/progress/features.jsonl`의 해당 feature 이벤트들을 스캔하여 최종 상태를 파악하고 사용자에게 보고한다:

- Implementation status (COMPLETED / FAILED)
- Build results
- Verification results (Server E2E / Mobile ADB pass rate — Phase 5)
- Review improvements applied (Phase 3~4)
- Any blocked or failed items

If FAILED, explain what failed and suggest next steps.

### Step 5.5: Auto-Chain to Deploy

`docs/progress/auto-mode.json`을 읽는다. `enabled=true`이면:

1. 결과 보고 출력 (Step 5)
2. 즉시 `/deploy initial`을 호출한다 (`Skill(deploy) initial`)
   - **supervisor 모드**(`docs/progress/supervisor.json` 존재)에서는 호출하지 않고 턴을 끝낸다. 라우터가 다음 phase(`verify`)를 새 프로세스로 띄운다.

`auto-mode.json`이 없거나 `enabled=false`이면 보고만 하고 종료.

## Interaction Rules

1. This skill is the **entry point only**. It handles document preparation and orchestrator launch.
2. If documents are missing, the user will interact with the prerequisite skills (clarify, pages, wireframes, architecture, test-scenarios).
3. Once the orchestrator is spawned, it runs autonomously.
4. The final report is presented to the user for review.
5. Do NOT modify code directly in this skill — all implementation is delegated to the orchestrator and its workers.
