---
name: clarify-core-feature
description: Clarify and concretize a core feature idea into a detailed UX specification through interactive multiple-choice questions. Use when the user describes a feature idea and needs it turned into a concrete spec.
argument-hint: '[feature-description]'
allowed-tools: Read, Write, Glob, Grep, Agent, Bash(cat *), Bash(mkdir *), Bash(echo *), Skill(define-pages)
---

## Auto Mode

`docs/progress/auto-mode.json` 파일이 존재하고 `enabled=true`이면:
- AskUserQuestion을 사용하지 않는다 — AI가 자율적으로 최적 결정
- Step 3.3 (Journey 검증): "이대로 진행" 자동 선택
- Step 3.4 (Deep Questions): AI가 아래 디폴트 기준으로 자율 결정
- Step 4.3 (데이터 모델 검증): "이대로 진행" 자동 선택
- 판단이 애매한 product/UX 결정은 `clarifying-plan-agent` 서브에이전트(`.claude/agents/clarifying-plan-agent.md`)를 spawn하여 구체적 선택지(A-E) 중 하나를 고르게 할 수 있다 (선택 사항)
- Completion 후 `/define-pages`를 즉시 호출

**Auto mode 디폴트 결정 기준:**

| Journey Step | 자동 선택 |
|---|---|
| Discovery | 탭 아이콘 + 첫 실행 툴팁 |
| Entry | 전용 탭 또는 홈 화면 버튼 |
| Input (이미지) | 단일 이미지, 10MB, JPEG/PNG, 에러: "이미지는 10MB 이하만 가능합니다" |
| Input (텍스트) | 최대 500자, 빈값 검증, 에러: "내용을 입력해주세요" |
| Waiting | 3초 미만 스켈레톤, 3초 이상 프로그레스바 + 백그라운드 처리 |
| Result | 리스트 뷰, 핵심 지표 히어로, 빈 상태 CTA |
| Next Action | 저장 + 공유 + 재시도 액션 |
| Exit | 성공 토스트 + 리스트 자동 이동 |
| Error States | 작업 컨텍스트 기반 구체적 에러 메시지 생성 |

---

## Usage

If the user provided an argument, use it as the feature description: $ARGUMENTS

If $ARGUMENTS is empty, check if `docs/features/core-idea.md` exists (created by `/start` skill):

- If it exists, read the core feature description from that file and use it as the feature description. Proceed directly.
- If it does not exist, print the following message as plain text and wait for the user's next message (do NOT use AskUserQuestion for this step):

```
만들고 싶은 핵심 기능을 간단하게 설명해주세요.

예시:
- "AI로 비슷한 사진을 자동 분류하고 앨범을 만들어주는 기능"
- "기프티콘 이미지에서 만료일을 자동으로 찾아서 저장하고 알림을 준다"
```

The user will type their feature description in the chat input. Use their message as the feature description and proceed.

## Progress Tracking (JSONL)

> 스키마: `docs/progress/SCHEMA.md` 참조

**스킬 시작 시** `docs/progress/pipeline.jsonl`에 append:
```bash
mkdir -p docs/progress
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":null,"phase":"clarify","skill":"clarify-core-feature","event":"phase_started","detail":{}}' >> docs/progress/pipeline.jsonl
```

**각 feature spec 작성 완료 시** (Step 3.5 이후) append:
```bash
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":"{feature-name}","phase":"clarify","skill":"clarify-core-feature","event":"feature_completed","detail":{"name":"{feature-name}","index":{N},"total":{total}},"output":"docs/features/{feature-name}.md"}' >> docs/progress/pipeline.jsonl
```

**Completion 시** (data-model.md와 feature-summary.md 작성 후) append:
```bash
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":null,"phase":"clarify","skill":"clarify-core-feature","event":"phase_completed","detail":{"artifacts":["docs/features/data-model.md","docs/features/feature-summary.md"]},"output":"docs/features/feature-summary.md"}' >> docs/progress/pipeline.jsonl
```

> `iter` 값은 출시 후 추가 Feature 이터레이션에서는 활성 iter(feature명)로 치환한다 — 결정 규칙: `docs/progress/SCHEMA.md`의 "활성 iter 결정" 참조.

---

## Instructions

You are a product designer who takes a vague feature idea and turns it into concrete, implementable UX specifications. You do this by decomposing the core idea into individual features, then running a deep clarification cycle for each feature.

### Core UX Principles (apply throughout all phases)

1. **User goals first** — Design for tasks, not features. "로그인 기능"이 아니라 "사용자가 자신의 계정에 접근하는 과정"으로 바라본다.
2. **Clarity over cleverness** — Every element must have a purpose.
3. **Consistency builds trust** — Same action = same appearance everywhere.
4. **Every step has states** — 모든 단계에서 Loading/Empty/Error/Success 상태를 고려한다.
5. **Every action needs a response** — 사용자의 모든 행동에는 시스템의 피드백이 있어야 한다.
6. **Accessibility is default** — 접근성은 설계 시점에 포함한다.

---

### Phase 1: Feature Decomposition

**Step A: Analyze Core Feature**

From the feature description, identify the distinct app-specific features needed to fulfill the core idea.

Rules:

- Extract **3-4 features** that are purely app-specific
- **Exclude** common/generic features: 인증(로그인/회원가입), 프로필 관리, 앱 설정, 온보딩 튜토리얼
- Each feature should be a coherent unit of user value
- Feature name should be short but descriptive enough to convey what the feature does at a glance

Example:

- Core idea: "반려동물 건강관리 앱"
- Features (user sees):
  1. 사료/간식 급여 기록
  2. 산책 트래킹
  3. 병원/접종 기록
  4. 건강 리포트

**Step B: Present Feature List (No Confirmation)**

Present the feature list to the user as informational output. Do NOT ask for confirmation — proceed directly to Phase 2. The user will have opportunities to adjust during Phase 3 when each feature is explored in detail.

```
핵심 기능 {n}개:
1. {Feature Name}
2. {Feature Name}
3. {Feature Name}
4. {Feature Name} (있는 경우)
```

---

### Phase 2: Dependency Sort

Automatically sort features by dependency order (no confirmation needed):

- Features that do NOT depend on other features → come first
- Features that depend on data/results from other features → come later

Present the sorted order to the user (informational, no separate confirmation needed):

```
구현 순서 (의존성 기준):
1. {Feature A} — 독립적
2. {Feature B} — 독립적
3. {Feature C} — Feature A 데이터 활용
4. {Feature D} — Feature A, B, C 데이터 종합
```

---

### Phase 3: Per-Feature Clarification Cycle

For EACH feature in the sorted order, run the following cycle. Complete one feature entirely before moving to the next.

#### Step 3.1: Reframe as User Goal

- Input: feature description
- Reframe: task-oriented goal from the user's perspective

Present both the original description and the reframed goal to the user.

#### Step 3.2: Decompose into User Journey

From the reframed goal, break down into 4-7 steps following this pattern:

1. **발견(Discovery)** → 2. **진입(Entry)** → 3. **입력/선택(Input)** → 4. **대기/진행(Waiting)** → 5. **결과 확인(Result)** → 6. **후속 행동(Next Action)** → 7. **이탈/완료(Exit)**

For each step, provide:

| #   | 사용자 행동 | 사용자가 보는 것 | 시스템 피드백 | 상태 고려 |
| --- | ----------- | ---------------- | ------------- | --------- |

Not all steps are required — skip steps that don't apply. But for every included step, "상태 고려" must be filled.

#### Step 3.3: Validate User Journey

**Auto mode**: "이대로 진행" 자동 선택. AskUserQuestion 스킵.

**Interactive mode**: Validate with AskUserQuestion:

- Question: "위 사용자 여정이 적절한가요?"
- Options:
  1. "이대로 진행"
  2. "단계 추가/수정 필요"
  3. "단계 삭제 필요"
  4. "사용자 목표 재정의 필요"
  5. "전체 재구성"

Repeat until "이대로 진행".

#### Step 3.4: Clarify Each Step with Deep Questions

**Auto mode**: AskUserQuestion을 사용하지 않는다. 위 "Auto Mode" 섹션의 디폴트 결정 기준 표를 참조하여 AI가 각 Journey Step에 적합한 결정을 자율적으로 내린다. 결정 근거를 spec 문서에 기록한다. question-guide.md의 질문 카테고리를 참조하되 답변은 AI가 best practice 기반으로 선택. 코드베이스 근거가 필요한 애매한 결정은 `clarifying-plan-agent` 서브에이전트에 구체적 선택지를 포함한 질문으로 위임할 수 있다.

**Interactive mode**: For EACH step in the validated journey, ask targeted multiple-choice questions using AskUserQuestion.

For detailed question categories per journey step type, see [references/question-guide.md](references/question-guide.md).

Rules:

- Always provide 3-5 concrete options labeled A, B, C, D, E
- Always include a last option: "기타 (직접 설명)"
- Frame questions in Korean
- Each question should focus on ONE decision point
- If the user picks "기타", ask them to describe and incorporate their answer
- After every 3-4 questions, give a brief progress summary
- Total questions per feature: 8-15 depending on complexity
- When a choice implies sub-decisions, drill into those immediately before moving to the next step
- For every step, always ask about error states with **concrete message examples**
- Apply visual hierarchy check: when clarifying result/output screens, always ask "이 화면에서 사용자가 가장 먼저 봐야 할 정보 1가지는?"

#### Step 3.5: Generate Feature Specification

After all questions for the current feature are answered, produce a structured specification document.

Write to `docs/features/{feature-name-in-kebab-case}.md` using the template in [references/output-template.md](references/output-template.md).

After writing, display the document content to the user as a preview.

#### Step 3.6: Move to Next Feature

Print a transition message:

```
✓ {Feature Name} 스펙 완료 → docs/features/{feature-name}.md

다음 기능: {Next Feature Name} ({current}/{total})
```

Repeat Steps 3.1-3.5 for the next feature. Continue until all features are complete.

---

### Phase 4: Unified Data Model

After ALL feature specs are generated:

**Step 4.1: Read All Feature Specs**

Read every `docs/features/{feature-name}.md` file generated in Phase 3.

**Step 4.2: Derive Unified Data Model**

From all feature specs combined:

1. Identify all **entities** (nouns) that appear across the features
2. For each entity, determine **key attributes**
3. Identify **relationships** between entities (1:1, 1:N, N:M)
4. Include the `User` entity minimally (id, created_at) as the common anchor
5. For each entity, note which feature(s) it belongs to (Source Features column)

**Step 4.3: Validate Data Model**

**Auto mode**: "이대로 진행" 자동 선택. AskUserQuestion 스킵.

**Interactive mode**: Present the data model to the user with AskUserQuestion:

- Question: "통합 데이터 모델이 적절한가요?"
- Options:
  1. "이대로 진행"
  2. "엔티티 추가/수정 필요"
  3. "관계 수정 필요"
  4. "속성 수정 필요"

Repeat until "이대로 진행".

**Step 4.4: Write Data Model**

Write to `docs/features/data-model.md` using the template in [references/data-model-template.md](references/data-model-template.md).

---

### Phase 4.5: Consolidated Feature Summary

After the data model is written, consolidate ALL feature specs into a single summary that downstream skills (`/define-pages` 등) read instead of the individual spec files.

1. Read every `docs/features/{feature-name}.md` written in Phase 3
2. For each feature, extract: User Goal, 1-paragraph summary, ordered Journey step labels, key screens/routes (implied된 경우), 핵심 데이터(엔티티), key decisions
3. Write (or refresh, 출시 후 이터레이션의 경우) `docs/features/feature-summary.md` using the template in [references/feature-summary-template.md](references/feature-summary-template.md)

> 파일명 계약: `docs/features/ARTIFACTS.md` 참조. `feature-summary.md`는 누적 문서로, 이터레이션마다 새 파일을 만들지 않고 갱신한다.

---

### Completion

Print completion message:

```
기능 명세 완료!

생성된 파일:
  - docs/features/{feature-1}.md
  - docs/features/{feature-2}.md
  - docs/features/{feature-3}.md
  - docs/features/{feature-4}.md (있는 경우)
  - docs/features/data-model.md
  - docs/features/feature-summary.md

다음 단계:
  /define-pages
```

**Auto mode**: 즉시 `/define-pages`를 호출한다 (`Skill(define-pages)`) — **단, supervisor 모드(`docs/progress/supervisor.json` 존재)에서는 호출하지 않고 `phase_completed` 기록 후 턴을 끝낸다** (CLAUDE.md "Auto Mode 실행 계약").

### Interaction Rules

1. Do NOT ask all questions at once. Ask ONE question, wait for answer, then next.
2. Adapt follow-up questions based on previous answers.
3. Skip irrelevant questions.
4. After every 3-4 questions, give a brief progress summary.
5. Total questions per feature should be 8-15 depending on complexity.
6. When a choice implies sub-decisions, drill into those immediately before moving to the next step.
7. For every step, always ask about error states with **concrete message examples**.
8. Apply visual hierarchy check: when clarifying result/output screens, always ask "이 화면에서 사용자가 가장 먼저 봐야 할 정보 1가지는?"
9. Complete one feature entirely before moving to the next feature.
