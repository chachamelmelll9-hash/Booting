# Wireframe Notation & Format

## Mobile Screen Template (iPhone proportions)

```
+----------------------------------+
|  9:41          [=] LTE  100%     |  <- Status Bar
+----------------------------------+
|  < Back     Page Title     [...] |  <- Navigation Bar
+----------------------------------+
|                                  |
|  [Main Content Area]             |
|                                  |
|  +----------------------------+  |
|  | Component                  |  |
|  | Description                |  |
|  +----------------------------+  |
|                                  |
|  +----------------------------+  |
|  | Component                  |  |
|  +----------------------------+  |
|                                  |
+----------------------------------+
|  [====CTA Button Label====]     |  <- Sticky Bottom (if needed)
+----------------------------------+
|  [Tab1]  [Tab2]  [Tab3]  [Tab4] |  <- Tab Bar (if tab screen)
+----------------------------------+
```

## Notation Rules

| Notation | Meaning |
|----------|---------|
| `[Button Label]` | 탭 가능한 버튼 |
| `[====Primary CTA====]` | 주요 CTA (가장 눈에 띄는 버튼) |
| `(icon)` | 아이콘 |
| `---` | 구분선 |
| `[...]` | 더보기 메뉴 |
| `< Back` | 뒤로가기 |
| `{ }` | 입력 필드 |
| `[x]` / `[ ]` | 체크박스 |
| `(o)` / `( )` | 라디오 버튼 |
| `[img]` | 이미지 영역 |
| `[||||||||--]` | 프로그레스 바 |

## State Wireframes

For each page, also draw key states:

- **Empty State**: 데이터가 없을 때 (일러스트 + 안내 문구 + CTA)
- **Loading State**: 스켈레톤 or 스피너
- **Error State**: 에러 메시지 + 재시도 버튼

Only draw states that are meaningfully different from the default view.

## Annotations Format

Below each wireframe, add:

```
Annotations:
- [1] {component}: {설명, 동작, 탭 시 이동 등}
- [2] {component}: {설명}
- Visual Hierarchy: {가장 중요한 요소} > {두 번째} > {세 번째}
- Interaction: {스와이프, 롱프레스 등 특수 인터랙션}
```
