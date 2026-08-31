---
name: clarify-core-feature
description: Clarify and concretize a core feature idea into detailed UX specs, a consolidated feature summary, and a unified data model using normal chat or Codex multi-agent auto mode.
---

# clarify-core-feature

Use this skill when the user has a vague app idea and needs concrete, implementable feature specifications.

## Inputs

- optional feature description
- otherwise `docs/features/core-idea.md`

## Mode Selection

- `interactive`: default when the user is actively answering questions. Ask one question at a time in normal chat.
- `auto`: when the user explicitly asks Codex to drive the clarification loop automatically, or when `docs/progress/auto-mode.json` exists with `enabled=true`. Do not use Claude agent teams. Instead:
  - keep the main Codex session as the team lead and user-facing owner
  - spawn a persistent `clarifying-plan-agent`
  - reuse it via `send_input` for product and UX multiple-choice decisions
  - when a decision depends on specific codebase evidence, optionally spawn a short-lived read-only `explorer` or a second `clarifying-plan-agent` instance for a bounded second opinion
  - keep all file writes, progress summaries, and final judgment in the main Codex session

## Usage

1. If the user provided a feature description directly, use it.
2. Otherwise, if `docs/features/core-idea.md` exists, read it and use that as the feature description.
3. If neither exists, ask in normal chat:

```text
만들고 싶은 핵심 기능을 간단하게 설명해주세요.

예시:
- "AI로 비슷한 사진을 자동 분류하고 앨범을 만들어주는 기능"
- "기프티콘 이미지에서 만료일을 자동으로 찾아서 저장하고 알림을 준다"
```

## Progress Tracking (JSONL)

- use `docs/progress/SCHEMA.md`
- append `phase_started` to `docs/progress/pipeline.jsonl` when clarification begins
- append `feature_completed` to `docs/progress/pipeline.jsonl` after each feature spec is written
- append `phase_completed` to `docs/progress/pipeline.jsonl` after `docs/features/feature-summary.md` and `docs/features/data-model.md` are written
- use `iter="initial"` for the first pipeline and the active feature iteration name for post-launch work
- use `phase="clarify"` and `skill="clarify-core-feature"`

## Core UX Principles

Apply these throughout all phases:

1. User goals first. Design for tasks, not isolated features.
2. Clarity over cleverness. Every element must have a purpose.
3. Consistency builds trust. Same action means the same appearance.
4. Every step has states. Always cover loading, empty, error, and success.
5. Every action needs a response. Users should always see feedback.
6. Accessibility is the default, not an afterthought.

## Workflow

### Phase 1: Feature Decomposition

1. Analyze the feature description and extract 3-4 app-specific features.
2. Exclude generic boilerplate such as auth, profile, settings, and onboarding.
3. Keep each feature as a coherent unit of user value with a short descriptive name.
4. Present the feature list as informational output and continue without a separate confirmation stop.

Expected output shape:

```text
핵심 기능 {n}개:
1. {Feature Name}
2. {Feature Name}
3. {Feature Name}
4. {Feature Name}
```

### Phase 2: Dependency Sort

1. Sort features by dependency order.
2. Put independent features first and dependent or aggregate features later.
3. Present the sorted order as informational output and continue.

Expected output shape:

```text
구현 순서 (의존성 기준):
1. {Feature A} — 독립적
2. {Feature B} — 독립적
3. {Feature C} — Feature A 데이터 활용
4. {Feature D} — Feature A, B, C 데이터 종합
```

### Phase 3: Per-Feature Clarification Cycle

Complete one feature entirely before moving to the next.

#### Step 3.1: Reframe As User Goal

1. Convert the feature description into a task-oriented user goal.
2. Present both the original feature description and the reframed goal.

#### Step 3.2: Decompose Into User Journey

Break the goal into 4-7 applicable steps across this pattern:

1. 발견(Discovery)
2. 진입(Entry)
3. 입력/선택(Input)
4. 대기/진행(Waiting)
5. 결과 확인(Result)
6. 후속 행동(Next Action)
7. 이탈/완료(Exit)

For each included step, fill:

| # | 사용자 행동 | 사용자가 보는 것 | 시스템 피드백 | 상태 고려 |
| --- | --- | --- | --- | --- |

#### Step 3.3: Validate User Journey

Validate the journey until it is accepted.

- `interactive` mode:
  Ask in normal chat with numbered options:
  1. 이대로 진행
  2. 단계 추가/수정 필요
  3. 단계 삭제 필요
  4. 사용자 목표 재정의 필요
  5. 전체 재구성
- `auto` mode:
  Send the same option set to `clarifying-plan-agent` and proceed with its answer. If codebase consistency is unclear, get one bounded second opinion before finalizing the journey.

#### Step 3.4: Clarify Each Step With Deep Questions

For each step in the validated journey, ask targeted multiple-choice questions.

Use `.claude/skills/clarify-core-feature/references/question-guide.md` for category prompts.

Rules:

- always generate 3-5 concrete options labeled `A`, `B`, `C`, `D`, `E`
- in `interactive` mode, always include a last option: `기타 (직접 설명)`
- in `auto` mode, still generate the concrete option set, but instruct `clarifying-plan-agent` to choose from the concrete options and never choose `기타`
- ask in Korean
- keep one decision point per question
- when a choice implies sub-decisions, drill into them immediately
- ask about error states for every step with concrete message examples
- when clarifying a result or output screen, always ask: `이 화면에서 사용자가 가장 먼저 봐야 할 정보 1가지는?`
- give a brief progress summary after every 3-4 questions
- total questions per feature should usually land in the 8-15 range depending on complexity

Multi-agent handling in `auto` mode:

- spawn a persistent `clarifying-plan-agent` near the start of the clarification cycle
- send it the current feature description, dependency order, earlier decisions, and the concrete option set for each question
- when the question depends on existing app patterns, route a bounded read-only codebase question to an `explorer` or a second `clarifying-plan-agent` instance
- resolve disagreements locally in the main Codex session and keep the decision log consistent

#### Step 3.5: Generate Feature Specification

After the current feature's questions are complete:

1. Write `docs/features/{feature-name-in-kebab-case}.md`.
2. Follow `.claude/skills/clarify-core-feature/references/output-template.md`.
3. Preview the generated document content for the user.
4. Append the matching `feature_completed` event to `docs/progress/pipeline.jsonl`.

#### Step 3.6: Move To The Next Feature

Use a transition message like:

```text
✓ {Feature Name} 스펙 완료 → docs/features/{feature-name}.md

다음 기능: {Next Feature Name} ({current}/{total})
```

Repeat Phase 3 until all sorted features are completed.

### Phase 4: Consolidated Feature Summary

After all feature specs are generated:

1. Read every feature spec written in Phase 3.
2. Create or refresh `docs/features/feature-summary.md`.
3. Include:
   - dependency-sorted feature list
   - one subsection per feature
   - user goal
   - 1-paragraph summary
   - ordered journey step labels
   - key screens or routes if already implied
   - source spec path
   - key decisions that downstream skills need to know

Suggested structure:

```markdown
# Feature Summary

## Ordered Features
1. {Feature A} — {dependency note}
2. {Feature B} — {dependency note}

## Features

### {Feature A}
- Source Spec: `docs/features/{feature-a}.md`
- User Goal: {goal}
- Summary: {paragraph}
- Journey Steps: {Discovery -> Entry -> ...}
- Key Screens: {screen list or TBD}
- Key Decisions: {important UX decisions}
```

### Phase 5: Unified Data Model

After the feature summary is written:

1. Read all feature specs again.
2. Derive a unified logical data model across the features.
3. Identify entities, key attributes, and relationships.
4. Include `User` minimally as the shared anchor.
5. Note each entity's source features.
6. Validate the data model:
   - `interactive` mode: ask in normal chat with numbered options
     1. 이대로 진행
     2. 엔티티 추가/수정 필요
     3. 관계 수정 필요
     4. 속성 수정 필요
   - `auto` mode: let `clarifying-plan-agent` choose from the same option set and refine until accepted
7. Write `docs/features/data-model.md` using `.claude/skills/clarify-core-feature/references/data-model-template.md`.
8. Append the matching `phase_completed` event to `docs/progress/pipeline.jsonl` with both planning artifacts.

### Completion

Report completion with:

```text
기능 명세 완료!

생성된 파일:
  - docs/features/{feature-1}.md
  - docs/features/{feature-2}.md
  - docs/features/{feature-3}.md
  - docs/features/{feature-4}.md
  - docs/features/feature-summary.md
  - docs/features/data-model.md

다음 단계:
  /define-pages
```

Then stop and present `Spec Approval` with:

- short summary of what changed
- open decisions or blockers
- recommended default
- exact next action if approved

If auto mode is active, keep the summary concise, stop after the `Spec Approval` response, and let the `Stop` hook route `define-pages`.

## Outputs

- `docs/features/{feature-name}.md`
- `docs/features/feature-summary.md`
- `docs/features/data-model.md`

## Codex Notes

- Use normal chat instead of `AskUserQuestion`.
- Keep the main Codex session responsible for user communication and `Spec Approval`.
- Replace Claude agent-team auto mode with Codex multi-agent orchestration using `clarifying-plan-agent`.
- Reuse `.claude/skills/clarify-core-feature/references/` rather than duplicating the reference library.
- Treat `docs/progress/auto-mode.json` as the persisted auto-mode trigger across turns.
- In hook-driven auto mode, this skill owns only the `clarify` phase and must not manually continue into `define-pages`.
- Keep filenames aligned with the Claude workflow plus the Codex `feature-summary.md` artifact contract.
- Keep `pipeline.jsonl` event semantics aligned with the source clarify flow.
