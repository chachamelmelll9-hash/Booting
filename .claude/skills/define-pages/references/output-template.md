# Output Template: Page Specification

Write to `docs/features/page-map.md`:

```markdown
# Pages

## Overview
- Source Features: {feature-1}, {feature-2}, {feature-3}
- Total Pages: {count} (Mobile: {n}, WebView: {n})
- New Pages: {count} | Reused: {count}
- Tabs: {count}

## Tab Structure
| # | Tab | Icon Hint | Root Screen | Primary Feature |
|---|-----|-----------|-------------|-----------------|
| 1 | {탭명} | {아이콘 설명} | {루트 화면명} | {주요 기능명} |

## Navigation Map

```
(tabs)
  |-- {tab-a}/
  |     |-- index.tsx          ({Tab A Root})
  |     |-- {screen}.tsx       ({Screen Name})
  |-- {tab-b}/
  |     |-- index.tsx          ({Tab B Root})
  |     |-- {screen}.tsx       ({Screen Name})
  |-- {tab-c}/
        |-- index.tsx          ({Tab C Root})

(auth)
  |-- login.tsx
  |-- signup.tsx

(modals)
  |-- {modal}.tsx
```

## Page Definitions

### Tab: {Tab A Name}

#### 1. {Page Name}
- **Route**: `app/(tabs)/{tab-a}/index.tsx`
- **Type**: Tab
- **Purpose**: {핵심 역할 한 줄}
- **Source Feature**: {기능명}
- **Data Source**: Server API | Local State | None
- **Navigation**:
  - From: Tab bar
  - To: {어디로 이동 가능}
  - Back: N/A (tab root)
- **Reuse**: New | Existing `{path}`

#### 2. {Page Name}
- **Route**: `app/(tabs)/{tab-a}/{screen}.tsx`
- **Type**: Stack
- **Purpose**: {핵심 역할 한 줄}
- **Source Feature**: {기능명}
- **Data Source**: Server API | Local State | None
- **Navigation**:
  - From: {어디서 진입}
  - To: {어디로 이동 가능}
  - Back: {뒤로가기 목적지}
- **Reuse**: New | Existing `{path}`

### Tab: {Tab B Name}
...

### Modals
#### {Modal Name}
- **Route**: `app/{modal-name}.tsx`
- **Type**: Modal
- **Purpose**: {역할}
- **Source Feature**: {기능명}
- **Triggered From**: {어떤 화면에서 호출}

### Auth Screens
(기존 보일러플레이트 재사용 — 변경 사항만 기록)

## WebView Pages (if applicable)

### 1. {Page Name}
- **Route**: `/webview/{path}`
- **Purpose**: {역할}
- **Source Feature**: {기능명}

## Cross-Feature Navigation
| From (Feature) | From Screen | To (Feature) | To Screen | Trigger |
|----------------|-------------|--------------|-----------|---------|
| {Feature A} | {Screen} | {Feature B} | {Screen} | {사용자 행동} |

## Navigation Flow Diagram

```
[Tab A: Home] --tap item--> [Detail] --action--> [Result]
      |                                              |
      |                                         [Share Modal]
      |
[Tab B: Record] --complete--> [Tab A: Home] (갱신)
```

## Server Endpoints Required
| Method | Endpoint | Used By | Source Feature | Description |
|--------|----------|---------|----------------|-------------|
| GET | /api/{resource} | {Page Name} | {Feature} | {설명} |
| POST | /api/{resource} | {Page Name} | {Feature} | {설명} |

## Decision Log
| Question | Choice | Reason |
|----------|--------|--------|
| ... | ... | User selected |
```
