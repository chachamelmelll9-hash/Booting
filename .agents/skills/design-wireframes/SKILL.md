---
name: design-wireframes
description: Design text-based wireframes for all pages defined in the page map. Creates tab-grouped wireframe documents with efficient batch validation. Uses mobile-ux-ui-design skill for premium design rules.
---

# design-wireframes

Use this skill after `Pages Approval`.

## Auto Mode

When `docs/progress/auto-mode.json` exists and `enabled=true`:

- auto-accept the representative pattern layouts in Step 2.2
- auto-accept the shared state treatment in Step 2.3
- auto-accept per-tab validation in Step 3.2
- auto-apply `ux-ui-designer` tab review improvements
- keep the completion summary brief
- finish only the `wireframes` phase and let the `Stop` hook route `design-architecture`

## Usage

Look for `docs/features/page-map.md`. If it does not exist, tell the user to run `define-pages` first.

## Prerequisites

This skill reads the output of `define-pages` and `clarify-core-feature`:

- `docs/features/page-map.md`
- `docs/features/*.md` excluding `page-map.md`, `data-model.md`, and `core-idea.md`

## Progress Tracking (JSONL)

- use `docs/progress/SCHEMA.md`
- append `phase_started` to `docs/progress/pipeline.jsonl` when `design-wireframes` begins
- append `phase_completed` to `docs/progress/pipeline.jsonl` after `docs/features/wireframe-index.md` is written
- use the active `iter`, `feature=null`, `phase="wireframes"`, and `skill="design-wireframes"`

## Design Intelligence: `mobile-ux-ui-design` Integration

Apply the Codex-native `mobile-ux-ui-design` skill while designing wireframes.

This port keeps the wireframe workflow in Codex while reusing the source reference library under `.claude/skills/mobile-ux-ui-design/references/`.

**Read before Phase 1 starts:**

- `.claude/skills/mobile-ux-ui-design/references/anti-patterns.md`
- `.claude/skills/mobile-ux-ui-design/references/layout-spacing.md`

**Read during Phase 2 pattern work:**

- `.claude/skills/mobile-ux-ui-design/references/touch-interaction.md`
- `.claude/skills/mobile-ux-ui-design/references/navigation.md`
- `.claude/skills/mobile-ux-ui-design/references/states-feedback.md`

**Read during Phase 3 as needed:**

- Form screens: `.claude/skills/mobile-ux-ui-design/references/states-feedback.md`
- List screens: `.claude/skills/mobile-ux-ui-design/references/performance.md`
- Motion annotations: `.claude/skills/mobile-ux-ui-design/references/motion-animation.md`

**Apply the rules this way:**

- Call out UX rule compliance or violations in the annotations.
- Avoid the generic AI layout patterns listed in `anti-patterns.md`.
- Reflect touch targets, spacing, and state handling directly in the wireframes.
- Consider asymmetric or offset layout decisions using `DESIGN_VARIANCE` 7 unless the product context suggests otherwise.

## Instructions

You are a UI/UX designer who creates detailed text-based wireframes for mobile app screens. Work through all pages in the page map, organized by tab structure. Apply premium mobile design rules from `mobile-ux-ui-design` to every wireframe.

### Core Design Principles

1. **Visual Hierarchy**: the most important information should be the largest and most visible.
2. **Fitts's Law**: frequent actions should be large and easy to reach, with 44x44pt or larger touch targets.
3. **Progressive Disclosure**: show the essentials first, then reveal detail through tabs, scrolling, or expansion.
4. **F-Pattern / Z-Pattern**: place content along realistic scanning paths.
5. **Gestalt Principles**: use proximity, similarity, and continuity deliberately.
6. **Mobile First**: respect touch targets, the 8dp grid, safe areas, and one-handed reach.
7. **Every State Matters**: design loading, empty, error, and success states wherever relevant.
8. **Anti-AI-Slop**: avoid equal 3-column cards, universal center alignment, and repetitive padding rhythms when the content hierarchy does not justify them.

## Phase 1: Read And Plan

1. Read `docs/features/page-map.md`.
2. Read all relevant feature specs from `docs/features/*.md`.
3. Read the required mobile design references:
   - `.claude/skills/mobile-ux-ui-design/references/anti-patterns.md`
   - `.claude/skills/mobile-ux-ui-design/references/layout-spacing.md`
4. List all pages grouped by tab, matching the page-map structure:

```text
Wireframe Targets:

Tab: {Tab A} ({n} pages)
  1. {Page Name} - {Type} - {Source Feature}
  2. {Page Name} - {Type} - {Source Feature}

Tab: {Tab B} ({n} pages)
  3. {Page Name} - {Type} - {Source Feature}
  ...

Modals ({n} pages)
  ...

Total {total} pages
```

5. Spawn a persistent read-only `ux-ui-designer` custom agent for the wireframe review loop:
   - send the product type, target audience, `docs/features/page-map.md`, and review mode `wireframe`
   - reuse the same agent for each tab review with `send_input`

## Phase 2: Establish Common Patterns

Before drawing individual wireframes, identify reusable patterns across all pages.

Read the additional mobile design references for pattern design:

- `.claude/skills/mobile-ux-ui-design/references/touch-interaction.md`
- `.claude/skills/mobile-ux-ui-design/references/navigation.md`
- `.claude/skills/mobile-ux-ui-design/references/states-feedback.md`

### Step 2.1: Identify Patterns

Analyze all pages and categorize them by layout pattern:

- **리스트형**: repeated items in a list, table, or tile layout
- **상세형**: a single entity detail view
- **폼형**: input fields with a submit CTA
- **대시보드형**: multiple summaries or aggregates on one screen
- **결과형**: result state with a follow-up action

Present pattern grouping in this structure:

```text
식별된 레이아웃 패턴:

리스트형 ({n}개): {Page A}, {Page B}, ...
상세형 ({n}개): {Page C}, {Page D}, ...
폼형 ({n}개): {Page E}, ...
고유 레이아웃 ({n}개): {Page F}, ...
```

### Step 2.2: Confirm Pattern Layouts

For each pattern, draw one representative wireframe, then:

- `interactive` mode: stop and ask the user in normal chat before applying it broadly
- `auto` mode: apply the recommended pattern immediately and keep going

Default prompt:

- Question: `리스트형 화면의 기본 레이아웃입니다. 이 패턴을 {Page A}, {Page B} 등에 적용할까요?`
- Options:
  1. `이대로 적용`
  2. `레이아웃 수정`
  3. `다른 패턴 제안`

Do not continue to individual pages for that pattern until the user responds in interactive mode.

### Step 2.3: Confirm Common States

Draw common state wireframes shared across multiple pages:

- **Common Empty State**: illustration, guidance copy, and CTA
- **Common Loading State**: skeletons or spinner
- **Common Error State**: error message and retry button

Validation flow:

- `interactive` mode: pause and ask the user in normal chat with the standard option set
- `auto` mode: approve the recommended shared-state treatment and continue

Write the approved result to `docs/features/wireframe-common-states.md`.

## Phase 3: Tab-By-Tab Wireframes

For each tab, complete the full cycle before moving to the next one.

### Step 3.1: Draw All Pages In The Tab

For each page in the current tab, create an ASCII wireframe.

Use the notation and templates in:

- `.claude/skills/design-wireframes/references/wireframe-notation.md`
- `.claude/skills/design-wireframes/references/output-template.md`

Per page:

1. Draw the **Default State** wireframe.
   - Apply the approved pattern if the page matches one.
   - Customize the content and components for the specific page.
2. Draw page-specific state wireframes only when they are meaningfully different from the common states.
3. Add annotations below each wireframe.

If a tab contains pages from multiple features, organize them by feature section within the tab file.

### Step 3.2: Validate Tab Wireframes

After drawing every page in a tab, validate the full tab in one batch:

- `interactive` mode: stop for user confirmation with the standard option set
- `auto` mode: accept the recommended tab wireframe set and continue immediately

If the user requests a specific page change, redraw only that page, then revalidate the tab.

### Step 3.3: Write The Tab File

After the tab is validated, write `docs/features/wireframe-{tab-name}.md` using the per-tab template in `.claude/skills/design-wireframes/references/output-template.md`.

### Step 3.4: UX/UI Designer Review

After writing each tab file:

- send the tab wireframe content to the persistent `ux-ui-designer` agent with `mode=wireframe`
- if the review grade is `A`, continue
- if the review grade is `B` or `C`, revise the tab wireframe locally, rewrite the tab file, and rerun one bounded follow-up review when needed
- interactive mode: show the review to the user before applying non-trivial changes
- auto mode: apply the recommended improvements directly

### Step 3.5: Move To The Next Tab

Print this transition message:

```text
✓ {Tab Name} 탭 와이어프레임 완료 -> docs/features/wireframe-{tab-name}.md

다음 탭: {Next Tab Name} ({current}/{total})
```

## Phase 4: Modals And Shared Components

### Step 4.1: Modal Wireframes

Draw wireframes for modal and bottom-sheet pages that do not belong to a tab. If any exist, write them to `docs/features/wireframe-modals.md`.

### Step 4.2: Identify Shared Components

After all tab wireframe files are complete, identify components that appear across multiple pages:

| Component | Used In | Description |
| --- | --- | --- |
| {name} | {pages} | {description} |

## Phase 5: Generate Index

Write `docs/features/wireframe-index.md` using the index template in `.claude/skills/design-wireframes/references/output-template.md`.

After writing, display a concise summary to the user:

- `interactive` mode: stop at the `Wireframes Approval` checkpoint
- `auto` mode: stop after the summary; the `Stop` hook will route `design-architecture`

## Completion

Use this completion summary shape:

```text
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
  design-architecture
```

## Interaction Rules

1. Establish common patterns first, then apply them to individual pages.
2. Validate by tab, not by page, unless the user asks to drill into a page.
3. Use standard Codex chat questions instead of `AskUserQuestion`, and wait for the user's reply before continuing.
4. Always draw the default state first, then any page-specific variants.
5. Use consistent notation across all wireframes.
6. Identify shared components only after all wireframes are complete.
7. Keep wireframes focused on layout and information hierarchy, not visual styling.
8. Draw a scrolled view separately when below-the-fold content matters.
9. Apply Fitts's Law: keep the primary CTA in the thumb zone and require confirmation for destructive actions.
10. If auto mode is active, treat validation checkpoints as pre-approved, but stop after the `wireframes` summary and let the hook router continue.
11. Reuse the same `ux-ui-designer` agent across tabs instead of spawning a new reviewer for every tab unless the original agent fails.
