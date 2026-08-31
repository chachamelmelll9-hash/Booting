---
name: design-wireframes
description: Design text-based wireframes for all pages defined in the page map. Creates tab-grouped wireframe documents with efficient batch validation. Uses mobile-ux-ui-design skill for premium design rules.
allowed-tools: Read, Write, Glob, Grep, Bash(cat *), Bash(mkdir *), Bash(echo *), Agent, Skill(design-architecture), Skill(mobile-ux-ui-design)
---

## Auto Mode

`docs/progress/auto-mode.json` 파일이 존재하고 `enabled=true`이면:
- AskUserQuestion을 사용하지 않는다 — AI가 자율적으로 최적 결정
- 패턴 레이아웃 검증 (Step 2.2): "이대로 적용" 자동 선택
- 공통 상태 검증 (Step 2.3): "이대로 진행" 자동 선택
- 탭별 와이어프레임 검증 (Step 3.2): "이대로 진행" 자동 선택
- Completion 후 `/design-architecture`를 즉시 호출

---

## Usage

Look for `docs/features/page-map.md` using Glob. If it doesn't exist, tell the user to run `/define-pages` first.

## Prerequisites

This skill reads the output of `/define-pages` and `/clarify-core-feature`:
- `docs/features/page-map.md` (page map from `/define-pages`)
- `docs/features/*.md` (feature specs from `/clarify-core-feature` — skip `ARTIFACTS.md`, `page-map.md`, `data-model.md`, `core-idea.md`, `feature-summary.md`, `wireframe-*.md`, `architecture.md`, `*-architecture.md`, `test-scenarios.md`, `*-test-scenarios.md`)

> 산출물 파일명 계약: `docs/features/ARTIFACTS.md` 참조.

## Design Intelligence: `/mobile-ux-ui-design` 연동

와이어프레임 설계 시 `.claude/skills/mobile-ux-ui-design/` 스킬의 규칙을 적용한다.

**Phase 1 시작 전 필수 읽기:**
- `.claude/skills/mobile-ux-ui-design/references/anti-patterns.md` — AI 기본 패턴(균등 3열, 모든 중앙 정렬 등) 방지
- `.claude/skills/mobile-ux-ui-design/references/layout-spacing.md` — 8dp 그리드, safe area, 스페이싱 계층

**Phase 2 (패턴 수립) 시 읽기:**
- `.claude/skills/mobile-ux-ui-design/references/touch-interaction.md` — 터치 타겟 44pt+, press 피드백
- `.claude/skills/mobile-ux-ui-design/references/navigation.md` — 하단 탭 5개 이하, 뒤로가기 일관성
- `.claude/skills/mobile-ux-ui-design/references/states-feedback.md` — Loading/Empty/Error/Success 상태 설계

**Phase 3 (개별 와이어프레임) 시 상황별 읽기:**
- 폼 화면 → `.claude/skills/mobile-ux-ui-design/references/states-feedback.md` (Form Rules 섹션)
- 리스트 화면 → `.claude/skills/mobile-ux-ui-design/references/performance.md` (가상화 필요 여부 판단)
- 애니메이션 주석 → `.claude/skills/mobile-ux-ui-design/references/motion-animation.md` (스프링 물리 원칙)

**적용 방법:**
- 와이어프레임 Annotations에 UX 규칙 위반/준수 사항을 명시한다
- 패턴 수립 시 AI 기본 패턴(anti-patterns.md)을 의식적으로 회피한다
- 터치 타겟, 스페이싱, 상태 처리를 와이어프레임 단계에서부터 반영한다
- 레이아웃 결정 시 DESIGN_VARIANCE 다이얼(기본 7)에 따라 비대칭/오프셋 레이아웃을 고려한다

## Progress Tracking (JSONL)

> 스키마: `docs/progress/SCHEMA.md` 참조

**스킬 시작 시** `docs/progress/pipeline.jsonl`에 append:
```bash
mkdir -p docs/progress
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":null,"phase":"wireframes","skill":"design-wireframes","event":"phase_started","detail":{}}' >> docs/progress/pipeline.jsonl
```

**Completion 시** (wireframe-index.md 작성 후) append:
```bash
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":null,"phase":"wireframes","skill":"design-wireframes","event":"phase_completed","detail":{"artifacts":["docs/features/wireframe-index.md"]},"output":"docs/features/wireframe-index.md"}' >> docs/progress/pipeline.jsonl
```

> `iter` 값은 출시 후 추가 Feature 이터레이션에서는 활성 iter(feature명)로 치환한다 — 결정 규칙: `docs/progress/SCHEMA.md`의 "활성 iter 결정" 참조.

---

## Instructions

You are a UI/UX designer who creates detailed text-based wireframes for mobile app screens. You work through all pages in the page map, organized by tab structure. You apply premium mobile design rules from the `/mobile-ux-ui-design` skill to every wireframe.

### Core Design Principles (apply to every wireframe)

1. **Visual Hierarchy** — 가장 중요한 정보가 가장 크고 눈에 띄어야 한다.
2. **Fitts's Law** — 자주 쓰는 버튼은 크고, 손이 닿기 쉬운 위치에 (터치 타겟 44×44pt 이상).
3. **Progressive Disclosure** — 핵심만 먼저, 세부사항은 탭/스크롤/확장으로.
4. **F-Pattern / Z-Pattern** — 사용자의 시선 흐름을 고려한 배치.
5. **Gestalt Principles** — 근접성, 유사성, 연속성.
6. **Mobile First** — 터치 타겟 44×44pt 이상, 8dp 그리드, safe area 준수, 한 손 조작 고려.
7. **Every State Matters** — 모든 화면에서 Loading(스켈레톤)/Empty(CTA)/Error(원인+재시도)/Success 상태를 설계한다.
8. **Anti-AI-Slop** — 균등 3열 카드, 모든 중앙 정렬, 동일 패딩 반복 등 제네릭 패턴을 피하고 콘텐츠 우선순위에 따른 차별화된 레이아웃을 설계한다.

---

### Phase 1: Read & Plan

1. Read `docs/features/page-map.md`
2. Read all feature spec files from `docs/features/*.md` (skip `ARTIFACTS.md`, `page-map.md`, `data-model.md`, `core-idea.md`, `feature-summary.md`, `wireframe-*.md`, `architecture.md`, `*-architecture.md`, `test-scenarios.md`, `*-test-scenarios.md` — `docs/features/ARTIFACTS.md`의 Glob 규칙 참조)
3. Read mobile UX/UI design rules (필수):
   - `.claude/skills/mobile-ux-ui-design/references/anti-patterns.md`
   - `.claude/skills/mobile-ux-ui-design/references/layout-spacing.md`
4. List all pages grouped by tab (matching page-map structure):

```
와이어프레임 대상 페이지:

Tab: {Tab A} ({n}개 페이지)
  1. {Page Name} — {Type} — {Source Feature}
  2. {Page Name} — {Type} — {Source Feature}

Tab: {Tab B} ({n}개 페이지)
  3. {Page Name} — {Type} — {Source Feature}
  ...

Modals ({n}개)
  ...

총 {total}개 페이지
```

---

### Phase 2: Establish Common Patterns

Before drawing individual wireframes, identify and confirm reusable patterns across all pages.

Read additional mobile UX/UI rules for pattern design:
- `.claude/skills/mobile-ux-ui-design/references/touch-interaction.md`
- `.claude/skills/mobile-ux-ui-design/references/navigation.md`
- `.claude/skills/mobile-ux-ui-design/references/states-feedback.md`

**Step 2.1: Identify Patterns**

Analyze all pages and categorize them by layout pattern:
- **리스트형**: 목록 → 아이템 반복 (카드/테이블/타일)
- **상세형**: 단일 항목의 상세 정보 표시
- **폼형**: 입력 필드 + 제출 CTA
- **대시보드형**: 여러 정보의 요약/집계
- **결과형**: 처리 결과 + 후속 행동

Present pattern grouping:
```
식별된 레이아웃 패턴:

리스트형 ({n}개): {Page A}, {Page B}, ...
상세형 ({n}개): {Page C}, {Page D}, ...
폼형 ({n}개): {Page E}, ...
고유 레이아웃 ({n}개): {Page F}, ...
```

**Step 2.2: Confirm Pattern Layouts**

**Auto mode**: "이대로 적용" 자동 선택. AskUserQuestion 스킵.

**Interactive mode**: For each pattern, draw ONE representative wireframe and ask using AskUserQuestion:
- Question: "리스트형 화면의 기본 레이아웃입니다. 이 패턴을 {Page A}, {Page B} 등에 적용할까요?"
- Options:
  1. "이대로 적용"
  2. "레이아웃 수정"
  3. "다른 패턴 제안"

**Step 2.3: Confirm Common States**

Draw common state wireframes (shared across multiple pages) and confirm:

- **Common Empty State**: 일러스트 + 안내 문구 + CTA
- **Common Loading State**: 스켈레톤 or 스피너
- **Common Error State**: 에러 메시지 + 재시도 버튼

**Auto mode**: "이대로 진행" 자동 선택. AskUserQuestion 스킵.

**Interactive mode**: Ask using AskUserQuestion:
- Question: "공통 상태 화면입니다. 적절한가요?"
- Options:
  1. "이대로 진행"
  2. "Empty State 수정"
  3. "Loading State 수정"
  4. "Error State 수정"

These common states will be written to `docs/features/wireframe-common-states.md`.

---

### Phase 3: Tab-by-Tab Wireframes

For EACH tab, run the following cycle. Complete one tab entirely before moving to the next.

#### Step 3.1: Draw All Pages in Tab

For each page in the current tab, create a wireframe using ASCII art.

For the wireframe format, notation rules, and state wireframe guidelines, see [references/wireframe-notation.md](references/wireframe-notation.md).

Per page:
1. Draw the **Default State** wireframe
   - Apply confirmed pattern layout if the page matches a pattern
   - Customize content/components for the specific page
2. Draw **page-specific state wireframes** (Empty, Loading, Error) — only if meaningfully different from the common states
3. Add **annotations** below each wireframe

If a tab contains pages from multiple features, organize by feature section within the tab:

```
## Feature: {Feature A}
### 1. {Page Name}
...

## Feature: {Feature B}
### 2. {Page Name}
...
```

#### Step 3.2: Validate Tab Wireframes

**Auto mode**: "이대로 진행" 자동 선택. AskUserQuestion 스킵.

**Interactive mode**: After drawing ALL pages in a tab, validate the entire tab at once using AskUserQuestion:
- Question: "{Tab Name} 탭의 와이어프레임 {n}개입니다. 전체적으로 적절한가요?"
- Options:
  1. "이대로 진행"
  2. "특정 페이지 수정 필요 (페이지명 지정)"
  3. "전체 레이아웃 방향 수정"

If "특정 페이지 수정 필요":
- Ask which page needs modification
- Redraw that page only
- Re-validate

#### Step 3.3: Write Tab Wireframe File

After validation, write to `docs/features/wireframe-{tab-name}.md` using the per-tab template in [references/output-template.md](references/output-template.md).

#### Step 3.4: Move to Next Tab

Print transition message:
```
✓ {Tab Name} 탭 와이어프레임 완료 → docs/features/wireframe-{tab-name}.md

다음 탭: {Next Tab Name} ({current}/{total})
```

Repeat Steps 3.1-3.3 for the next tab.

---

### Phase 3.5: UX/UI Designer Review (per tab)

각 탭의 와이어프레임이 완성될 때마다(Step 3.3 직후) UX/UI 디자이너 에이전트의 리뷰를 받는다.

**각 탭 완료 후** (Step 3.3 이후) `ux-ui-designer` 를 **탭마다 단발로** spawn한다 (`.claude/agents/ux-ui-designer.md`).
리뷰 본문이 에이전트의 반환값이다 — 상주 리뷰어·준비 알림·shutdown 이 없다.

> 실측(run4): 상주 리뷰어 하나가 탭 7개 와이어프레임을 SendMessage 로 차례로 받아 컨텍스트에 전부 누적했다.
> 탭마다 새 에이전트면 각 리뷰의 컨텍스트는 레퍼런스 4개(~13KB) + 그 탭 파일 하나뿐이다.

1. `Agent(subagent_type: "ux-ui-designer", run_in_background: true, description: "UX review: wireframe {tab}", prompt: …)`
   - 프롬프트: 리뷰 모드 `wireframe`, 제품 유형·타겟 사용자 한 줄, **그 탭의 wireframe 파일 경로 하나**, page-map.md 의 해당 탭 라우트 목록(인라인)
   - 다른 탭의 와이어프레임·architecture·앱 코드는 읽지 말라고 명시한다
2. 리뷰가 도는 동안 **다음 탭 와이어프레임 작성을 시작한다** (Step 3.4) — 리뷰를 기다리며 놀지 않는다
3. 완료 알림으로 리뷰를 받으면 반영:
   - 평가 A → 그대로
   - 평가 B/C → Anti-Slop 지적사항과 레이아웃 대안을 반영하여 해당 탭 와이어프레임 수정 후 파일 재작성

**리뷰어 대기에는 상한을 둔다 (auto mode 필수).** 리뷰는 품질 향상 수단이지 phase 의 전제가 아니다.
리뷰어가 응답하지 않는데 무한정 기다리면 이 phase 가 정체되고, 라우터의 정체 감지가
파이프라인을 통째로 중단시킨다.

- 대기 중에는 **리뷰와 무관한 독립 작업**(공통 컴포넌트 도출, anti-pattern 셀프 체크)을 먼저 끝낸다
- 백그라운드 리뷰 태스크가 끝나지 않으면 `TaskOutput`/`ListAgents` 로 상태를 확인한다
- 리뷰어가 죽었거나 독립 작업까지 끝난 뒤에도 응답이 없으면 **셀프 리뷰로 대체하고 진행한다**:
  `mobile-ux-ui-design` 스킬의 체크리스트를 직접 적용하고,
  `phase_completed` 의 `detail.ux_review` 에 `"self (reviewer unresponsive)"` 로 남긴다
- **리뷰어 미응답을 `phase_blocked` 사유로 쓰지 않는다** — 산출물은 이미 만들어졌다

**Auto mode**: 에이전트의 개선 제안을 자동으로 반영한다.
**Interactive mode**: 에이전트의 피드백을 사용자에게 보여주고 반영 여부를 확인한다.

---

### Phase 4: Modals & Shared Components

#### Step 4.1: Modal Wireframes

Draw wireframes for modal/bottom-sheet pages (not belonging to any tab).
Include them in `docs/features/wireframe-modals.md` if any exist.

#### Step 4.2: Identify Shared Components

After ALL wireframes are complete, review all tab wireframe files and identify components that appear across multiple pages:

| Component | Used In | Description |
|-----------|---------|-------------|
| {name} | {pages} | {설명} |

---

### Phase 5: Generate Index

Write `docs/features/wireframe-index.md` using the index template in [references/output-template.md](references/output-template.md).

After writing, display a summary to the user.

---

### Completion

Print completion message:

```
와이어프레임 완료!

생성된 파일:
  - docs/features/wireframe-index.md
  - docs/features/wireframe-common-states.md
  - docs/features/wireframe-{tab-a}.md
  - docs/features/wireframe-{tab-b}.md
  - docs/features/wireframe-{tab-c}.md
  - docs/features/wireframe-modals.md (있는 경우)

공통 컴포넌트: {count}개 식별
총 와이어프레임: {count}개 (Default: {n}, States: {n})

다음 단계:
  /design-architecture
```

**Auto mode**: 즉시 `/design-architecture`를 호출한다 (`Skill(design-architecture)`) — **단, supervisor 모드(`docs/progress/supervisor.json` 존재)에서는 호출하지 않고 `phase_completed` 기록 후 턴을 끝낸다** (CLAUDE.md "Auto Mode 실행 계약").

### Interaction Rules

1. Establish common patterns FIRST, then apply to individual pages.
2. Validate per TAB (not per page) for efficiency.
3. Only drill into individual pages when the user requests modifications.
4. Always draw the default state first, then page-specific variant states.
5. Use consistent notation across all wireframes (see wireframe-notation.md).
6. Identify shared components AFTER all wireframes are complete.
7. Keep wireframes focused on layout and information hierarchy, not visual styling.
8. For complex screens, draw scrolled view separately if below-the-fold content is important.
9. Apply Fitts's Law: primary CTA at bottom (thumb zone), destructive actions require confirmation.
10. Apply Progressive Disclosure: show summary first, details on tap/expand.
11. If a tab has pages from multiple features, group by feature section within the tab file.
12. **Anti-AI-Slop**: 균등 3열 카드, 모든 중앙 정렬, 동일 패딩 반복 패턴을 피한다. 콘텐츠 우선순위에 따라 차별화된 레이아웃을 설계한다 (anti-patterns.md 참조).
13. **8dp Grid**: 모든 스페이싱은 4/8dp 배수 시스템. Annotations에 주요 간격을 명시한다 (layout-spacing.md 참조).
14. **Touch Targets**: 모든 인터랙티브 요소의 터치 영역이 44×44pt 이상인지 와이어프레임에서 확인한다.
15. **States Design**: Empty 상태는 CTA 포함, Error 상태는 원인+해결+재시도, Loading은 레이아웃 매칭 스켈레톤 (states-feedback.md 참조).
