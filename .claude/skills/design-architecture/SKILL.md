---
name: design-architecture
description: Design the folder structure and component architecture for mobile (Clean FSD) and server (Clean Architecture). Use when architecture needs to be designed from wireframes and pages spec.
argument-hint: "[feature-name]"
allowed-tools: Read, Write, Glob, Grep, Bash(ls *), Bash(cat *), Bash(mkdir *), Bash(echo *), Agent, Skill(write-test-scenarios)
---

## Auto Mode

`docs/progress/auto-mode.json` 파일이 존재하고 `enabled=true`이면:
- AskUserQuestion을 사용하지 않는다 — AI가 자율적으로 최적 결정
- 모바일 아키텍처 검증 (Phase 2-1): "이대로 진행" 자동 선택
- 서버 아키텍처 검증 (Phase 3-1): "이대로 진행" 자동 선택
- Completion 후 `/write-test-scenarios`를 즉시 호출

---

## Usage

If the user provided an argument, use it as the feature name: $ARGUMENTS

If $ARGUMENTS is empty, look for `docs/features/wireframe-index.md` using Glob. If it doesn't exist, tell the user to run `/design-wireframes` first.

## Prerequisites

This skill reads all previous outputs:
- `docs/features/*.md` (feature specs from `/clarify-core-feature` — 개별 스펙 수집 시 `docs/features/ARTIFACTS.md`의 Glob 제외 규칙 적용)
- `docs/features/page-map.md` (page map from `/define-pages`)
- `docs/features/wireframe-*.md` (wireframes from `/design-wireframes`)

Also reads the existing codebase structure to align with current patterns.

> 산출물 파일명 계약: `docs/features/ARTIFACTS.md` 참조.

## Progress Tracking (JSONL)

> 스키마: `docs/progress/SCHEMA.md` 참조

**스킬 시작 시** `docs/progress/pipeline.jsonl`에 append:
```bash
mkdir -p docs/progress
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":null,"phase":"architecture","skill":"design-architecture","event":"phase_started","detail":{}}' >> docs/progress/pipeline.jsonl
```

**Completion 시** (architecture.md 작성 후) append:
```bash
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":null,"phase":"architecture","skill":"design-architecture","event":"phase_completed","detail":{"artifacts":["docs/features/architecture.md"]},"output":"docs/features/architecture.md"}' >> docs/progress/pipeline.jsonl
```

> `iter` 값은 출시 후 추가 Feature 이터레이션에서는 활성 iter(feature명)로 치환한다 — 결정 규칙: `docs/progress/SCHEMA.md`의 "활성 iter 결정" 참조. 이터레이션에서는 `artifacts`에 `docs/features/{feature}-architecture.md`와 `docs/features/architecture.md`를 둘 다 나열한다.

---

## Instructions

You are a software architect who designs the folder structure and component architecture for a React Native + NestJS monorepo.

### Architecture Principles

For detailed architecture patterns, see:
- [references/mobile-fsd-guide.md](references/mobile-fsd-guide.md) — Mobile Clean FSD
- [references/server-clean-arch.md](references/server-clean-arch.md) — Server Clean Architecture

### Phase 1: Read All Specs & Analyze Codebase

1. Read all `docs/features/*.md`, `docs/features/page-map.md`, and all `docs/features/wireframe-*.md`
2. Read the existing codebase structure:
   - `apps/mobile/src/` — current FSD structure
   - `apps/mobile/app/` — current Expo Router routes
   - `apps/server/src/` — current NestJS module structure
   - `packages/` — shared packages
3. Present a summary:

```
Feature: {name}
Pages: {count}개 (New: {n}, Reused: {n})
Shared Components (from wireframes): {count}개
Server Endpoints Required: {count}개

Existing Structure:
- Mobile features: {list of current features/}
- Server modules: {list of current modules/}
- Shared packages: {list}
```

### Phase 2: Design Mobile Architecture

Design the mobile file tree following the Clean FSD pattern from [references/mobile-fsd-guide.md](references/mobile-fsd-guide.md).

Present the complete mobile file tree and ask for validation.

### Phase 2-1: Validate Mobile Architecture

**Auto mode**: "이대로 진행" 자동 선택. AskUserQuestion 스킵.

**Interactive mode**: Ask using AskUserQuestion:
- Question: "모바일 아키텍처가 적절한가요?"
- Options:
  1. "이대로 진행"
  2. "폴더 구조 수정"
  3. "컴포넌트 분리 변경"
  4. "feature 경계 재조정"

### Phase 3: Design Server Architecture

Design the server module structure following the Clean Architecture pattern from [references/server-clean-arch.md](references/server-clean-arch.md).

Present the complete server structure and ask for validation.

### Phase 3-1: Validate Server Architecture

**Auto mode**: "이대로 진행" 자동 선택. AskUserQuestion 스킵.

**Interactive mode**: Ask using AskUserQuestion:
- Question: "서버 아키텍처가 적절한가요?"
- Options:
  1. "이대로 진행"
  2. "모듈 구조 수정"
  3. "API 설계 변경"
  4. "DB 스키마 변경"

### Phase 3.5: UX/UI Designer Review

모바일 아키텍처가 확정된 후, UX/UI 디자이너 에이전트를 spawn하여 디자인 시스템 정합성을 검증한다.

1. `ux-ui-designer` 에이전트를 **단발로** spawn한다 (`.claude/agents/ux-ui-designer.md`) — 리뷰 본문이 반환값이다
   - `Agent(subagent_type: "ux-ui-designer", run_in_background: true, description: "UX review: component-architecture", prompt: …)`
   - 프롬프트에 **인라인으로** 넣는다 (architecture.md 41KB·page-map 36KB 를 다시 읽게 하지 않는다):
     - 리뷰 모드: `component-architecture`
     - 확정된 모바일 파일 트리 + shared/ui 컴포넌트 표 (본문)
     - wireframe-index.md 의 Shared Components 표 + Design Tokens (본문)
     - 디자인 토큰 파일 구조 (`shared/config/*` 목록)
   - 와이어프레임 탭 파일·앱 코드·package.json 은 읽지 말라고 명시한다
2. 리뷰가 도는 동안 서버 아키텍처 등 독립 작업을 진행하고, 완료 알림으로 결과를 받는다
3. 피드백 반영:
   - 평가 A → 그대로 진행
   - 평가 B/C → 누락된 공통 컴포넌트 추가, 디자인 토큰 구조 반영

**리뷰어 대기에는 상한을 둔다 (auto mode 필수).** 리뷰는 품질 향상 수단이지 phase 완료의 전제가 아니다.
응답 없는 리뷰어를 무한정 기다리면 phase 가 정체되고 라우터의 정체 감지가 파이프라인을 중단시킨다.
리뷰어는 **먼저 spawn 해 두고 그동안 서버 아키텍처 등 독립 작업을 진행**한다.
`TaskOutput`/`ListAgents` 로 상태를 확인한 뒤에도 결과가 없으면 `mobile-ux-ui-design` 체크리스트로
**셀프 리뷰를 대신 수행하고 진행한다** (`detail.review` 에 `"self (reviewer unresponsive)"`).
**리뷰어 미응답을 `phase_blocked` 사유로 쓰지 않는다** — 산출물은 이미 만들어졌다.

**Auto mode**: 에이전트의 개선 제안을 자동으로 반영한다.
**Interactive mode**: 에이전트의 피드백을 사용자에게 보여주고 반영 여부를 확인한다.

---

### Phase 4: Generate Architecture Document

Write the architecture document using the template in [references/output-template.md](references/output-template.md). 파일명은 `docs/features/ARTIFACTS.md` 계약을 따른다:

- **초기 파이프라인** (iter = `initial`): `docs/features/architecture.md` (고정명)
- **출시 후 이터레이션** (iter = feature명): `docs/features/{feature}-architecture.md`를 작성하고, `docs/features/architecture.md`를 동일 내용으로 갱신한다 (최신 alias)

### Completion

**Auto mode**: 즉시 `/write-test-scenarios`를 호출한다 (`Skill(write-test-scenarios)`) — **단, supervisor 모드(`docs/progress/supervisor.json` 존재)에서는 호출하지 않고 `phase_completed` 기록 후 턴을 끝낸다** (CLAUDE.md "Auto Mode 실행 계약").

### Interaction Rules

1. Always read the existing codebase structure BEFORE designing.
2. Minimize new files. Prefer extending existing components/modules.
3. Follow the exact naming conventions already used in the codebase.
4. Implementation order should minimize blocked dependencies (DB first, then server, then mobile).
5. For Zustand stores, only create when state must be shared across screens.
6. Keep features independent. Feature A should not import from Feature B.
