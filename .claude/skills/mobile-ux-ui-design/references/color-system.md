# Color System

React Native 모바일 앱의 컬러 시스템 규칙.

## Rules

| Rule | Standard | Avoid |
|------|----------|-------|
| **Max Accent** | 최대 1개 액센트 컬러. 채도 < 80% | 여러 강조색 동시 사용 |
| **AI Purple Ban** | AI 퍼플/블루 그라디언트 금지. 뉴트럴 베이스(Zinc/Slate) + 단일 고대비 액센트 | 보라색 버튼 글로우, 네온 그라디언트 |
| **Consistency** | 전체 앱에서 하나의 팔레트 유지. 웜/쿨 그레이 혼합 금지 | 화면마다 다른 색상 체계 |
| **Semantic Tokens** | `primary`, `secondary`, `error`, `surface`, `onSurface` 사용 | 컴포넌트에 하드코딩 hex |
| **Dark Mode** | 다크 모드는 탈채도/밝은 톤 변형. 반전 아님. 별도 대비 테스트 | 라이트 모드 값 그대로 반전 |
| **Contrast** | 본문 4.5:1, 대형 텍스트 3:1 (WCAG AA) | 회색 배경에 회색 텍스트 |
| **Color Not Only** | 색상만으로 정보 전달 금지 — 아이콘/텍스트 병용 | 에러를 빨간색으로만 표시 |
| **Accessible Pairs** | 전경/배경 쌍 WCAG 검증 도구로 확인 | 감각적으로만 판단 |
| **Surface Readability** | 카드/서피스를 배경과 충분한 opacity/elevation으로 구분 | 과투명 서피스로 계층 흐림 |
| **Border Visibility** | 구분선이 양쪽 테마에서 모두 보이도록 | 한 테마에서만 보이는 보더 |
| **Scrim** | 모달 스크림 40-60% 블랙으로 전경 격리 | 약한 스크림으로 배경 경쟁 |

## Light/Dark Mode Contrast

| Aspect | Do | Don't |
|--------|----|-------|
| Text (Light) | body 대비 ≥ 4.5:1 | 저대비 회색 body |
| Text (Dark) | primary ≥ 4.5:1, secondary ≥ 3:1 | 배경에 묻히는 텍스트 |
| State Parity | 프레스/포커스/디세이블이 양쪽 동등하게 구분 | 한 테마에서만 상태 정의 |
| Token-Driven | 시맨틱 토큰으로 테마별 매핑 | 화면별 하드코딩 hex |
| Test Both | 배포 전 양쪽 모두 테스트 | 한 테마에서만 검증 |

## Implementation

```typescript
const palette = {
  zinc: {
    50: '#fafafa', 100: '#f4f4f5', 200: '#e4e4e7',
    300: '#d4d4d8', 400: '#a1a1aa', 500: '#71717a',
    600: '#52525b', 700: '#3f3f46', 800: '#27272a',
    900: '#18181b', 950: '#09090b',
  },
  accent: {
    light: '#10b981',   // Emerald 500
    DEFAULT: '#059669',  // Emerald 600
    dark: '#047857',     // Emerald 700
  },
} as const;

const lightTheme = {
  background: palette.zinc[50],
  surface: '#ffffff',
  surfaceSecondary: palette.zinc[100],
  text: palette.zinc[900],
  textSecondary: palette.zinc[500],
  textTertiary: palette.zinc[400],
  border: palette.zinc[200],
  borderSubtle: palette.zinc[100],
  primary: palette.accent.DEFAULT,
  primaryText: '#ffffff',
  error: '#dc2626',
  errorBg: '#fef2f2',
  success: '#16a34a',
  successBg: '#f0fdf4',
};

const darkTheme = {
  background: palette.zinc[950],
  surface: palette.zinc[900],
  surfaceSecondary: palette.zinc[800],
  text: palette.zinc[50],
  textSecondary: palette.zinc[400],
  textTertiary: palette.zinc[500],
  border: palette.zinc[800],
  borderSubtle: palette.zinc[900],
  primary: palette.accent.light,
  primaryText: palette.zinc[950],
  error: '#f87171',
  errorBg: '#451a1a',
  success: '#4ade80',
  successBg: '#14532d',
};
```
