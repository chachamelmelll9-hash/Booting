# Output Template: Feature Specification

Write to `docs/features/{feature-name-in-kebab-case}.md`:

```markdown
# Feature: {Feature Name}

## User Goal
{리프레이밍한 사용자 목표 — 기능이 아니라 태스크 관점}

## Summary
{One paragraph description based on clarified details}

## User Journey

### Step 1: {단계명} — {사용자 행동 요약}
- **사용자가 보는 것**: {화면 구성 요소}
- **사용자가 하는 것**: {인터랙션}
- **시스템 피드백**: {응답/전환}
- **시각적 위계**: {가장 중요한 요소 → 덜 중요한 요소 순서}
- **States**:
  - Loading: {해당 시 구체적 표시 방식}
  - Empty: {해당 시 안내 문구 + CTA}
  - Error: {구체적 에러 메시지 예시}
  - Success: {완료 피드백}

### Step 2: {단계명} — {사용자 행동 요약}
...

## State Matrix
| Step | Loading | Empty | Error | Success |
|------|---------|-------|-------|---------|
| {단계1} | {표시 방식} | {안내 방식} | {에러 메시지} | {피드백} |
| {단계2} | ... | ... | ... | ... |

## Visual Hierarchy Notes
- 각 화면에서 가장 먼저 눈에 들어와야 할 요소
- CTA 버튼의 레이블 (동작을 명확히 설명하는 2-3단어)
- 정보의 우선순위 (크기 → 대비 → 위치 → 여백 → 굵기)

## Consistency Checklist
- [ ] 같은 동작은 앱 전체에서 같은 모습인가?
- [ ] 컬러/스페이싱/타이포그래피가 기존 디자인 시스템과 일관되는가?
- [ ] 버튼 스타일이 기존 패턴과 통일되는가?

## Accessibility Notes
- 터치 타겟 최소 44×44px 확보
- 텍스트 대비 4.5:1 이상
- 색상만으로 정보를 전달하지 않음 (아이콘+텍스트 병행)
- 에러 상태: 빨간 테두리 + 에러 아이콘 + 구체적 텍스트 메시지

## Technical Notes
- **Processing**: {On-device / Server-side / Hybrid}
- **Data Flow**: {Input -> Processing -> Output}
- **Dependencies**: {APIs, libraries, services needed}

## Screen Inventory
| Screen | Route | Description |
|--------|-------|-------------|
| ... | ... | ... |

## Decision Log
| Question | Choice | Reason |
|----------|--------|--------|
| ... | ... | User selected |
```
