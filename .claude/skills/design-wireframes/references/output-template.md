# Output Templates

## 1. Per-Tab Wireframe File

Write to `docs/features/wireframe-{tab-name}.md`:

```markdown
# Wireframe: Tab {Tab Name}

## Overview
- Tab: {Tab Name}
- Pages: {count}
- Source Features: {feature1}, {feature2}

## Feature: {Feature A}

### 1. {Page Name}
- **Route**: `app/(tabs)/{tab}/{page}`
- **Type**: Tab | Stack
- **Pattern**: 리스트형 | 상세형 | 폼형 | 대시보드형 | 고유

#### Default State
```
{ASCII wireframe}
```

**Annotations:**
- [1] {component}: {설명, 동작, 탭 시 이동 등}
- [2] {component}: {설명}
- **Visual Hierarchy**: {가장 중요한 요소} > {두 번째} > {세 번째}
- **Interaction**: {스와이프, 롱프레스 등 특수 인터랙션}

#### Empty State (if different from common)
```
{ASCII wireframe}
```

### 2. {Page Name}
...

## Feature: {Feature B} (if applicable)

### 3. {Page Name}
...

## Tab Navigation Flow
```
[Tab Root: 목록] --tap item--> [상세] --edit--> [수정 Modal]
                                  |
                              [공유 BottomSheet]
```
```

---

## 2. Common States File

Write to `docs/features/wireframe-common-states.md`:

```markdown
# Wireframe: Common States

공통 상태 화면 — 여러 페이지에서 동일하게 사용되는 상태별 와이어프레임.
개별 탭 와이어프레임에서 "Common State 사용"으로 표기된 경우 이 파일을 참조.

## Empty State
```
{ASCII wireframe — 일러스트 + 안내 문구 + CTA}
```

**적용 페이지**: {page1}, {page2}, ...
**Annotations:**
- {설명}

## Loading State
```
{ASCII wireframe — 스켈레톤 or 스피너}
```

**적용 페이지**: {page1}, {page2}, ...
**Annotations:**
- {설명}

## Error State
```
{ASCII wireframe — 에러 메시지 + 재시도}
```

**적용 페이지**: {page1}, {page2}, ...
**Annotations:**
- {설명}
```

---

## 3. Modals File (if applicable)

Write to `docs/features/wireframe-modals.md`:

```markdown
# Wireframe: Modals & Bottom Sheets

## 1. {Modal Name}
- **Route**: `app/{modal-name}.tsx`
- **Type**: Modal | BottomSheet
- **Triggered From**: {어떤 화면에서 호출}
- **Source Feature**: {기능명}

#### Default State
```
{ASCII wireframe}
```

**Annotations:**
- {설명}
```

---

## 4. Index File

Write to `docs/features/wireframe-index.md`:

```markdown
# Wireframe Index

## Overview
- Page Map: `docs/features/page-map.md`
- Feature Specs: `docs/features/*.md`
- Total Pages: {count} (Default: {n}, States: {n})

## Design Decisions
- Layout Patterns: {확정된 패턴 요약}
- Primary CTA Style: {버튼 스타일}
- Common States: `wireframe-common-states.md` 참조

## Files
| File | Tab | Pages | Source Features |
|------|-----|-------|-----------------|
| `wireframe-{tab-a}.md` | {Tab A} | {n}개 | {features} |
| `wireframe-{tab-b}.md` | {Tab B} | {n}개 | {features} |
| `wireframe-{tab-c}.md` | {Tab C} | {n}개 | {features} |
| `wireframe-modals.md` | Modals | {n}개 | {features} |
| `wireframe-common-states.md` | — | — | (공통) |

## Shared Components
| Component | Used In | Description |
|-----------|---------|-------------|
| {name} | {pages} | {설명} |

## Screen Flow (전체)
```
[Tab A: Home] --tap item--> [Detail] --action--> [Result]
      |                                              |
      |                                         [Share Modal]
      |
[Tab B: Record] --complete--> [Tab A: Home] (갱신)
```

## Decision Log
| Tab | Page | Question | Choice |
|-----|------|----------|--------|
| ... | ... | ... | ... |
```
```
