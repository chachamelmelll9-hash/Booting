# Typography System

React Native 모바일 앱의 타이포그래피 규칙.

## Rules

| Rule | Standard | Avoid |
|------|----------|-------|
| **Display/Headlines** | `fontSize: 32-48`, `letterSpacing: -1` to `-2`, `fontWeight: '700'-'900'` | 작고 평범한 헤드라인 |
| **Body** | `fontSize: 16`, `lineHeight: 24` (1.5배), 최대 너비 제한 | 16px 미만 본문 텍스트 |
| **Font Scale** | 일관된 타입 스케일: 12 / 14 / 16 / 18 / 24 / 32 / 48 | 임의의 크기 값 혼재 |
| **Weight Hierarchy** | Bold 헤딩(600-700), Regular 본문(400), Medium 라벨(500) | 단일 weight로 모든 텍스트 |
| **Number Display** | 숫자/가격/타이머에 `fontVariant: ['tabular-nums']` 또는 모노스페이스 | 비례폭 숫자로 레이아웃 시프트 |
| **Line Length** | 모바일 35-60자, 태블릿 60-75자 | 화면 끝까지 이어지는 긴 텍스트 |
| **Truncation** | 말줄임보다 줄바꿈 선호. 말줄임 시 전체 텍스트 접근 방법 제공 | 무분별한 `numberOfLines={1}` |
| **Dynamic Type** | 시스템 텍스트 스케일링 지원. 확대 시 잘림/깨짐 방지 | 고정 크기만 사용 |
| **Letter Spacing** | 플랫폼 기본 letter-spacing 존중. 본문에 타이트 트래킹 금지 | 본문 텍스트에 좁은 자간 |
| **Text Styles System** | iOS Dynamic Type 11종 / Material 5 type roles 참조 | 스타일 없이 임의 크기 |

## Anti-Slop Font Rules

LLM이 자동으로 선택하는 "안전한" 폰트를 피하고, 개성 있는 폰트를 선택한다.

| Banned (AI Default) | Use Instead |
|---------------------|-------------|
| Inter, Roboto, Arial | Geist, Outfit, Cabinet Grotesk, Satoshi, Plus Jakarta Sans |
| System default만 사용 | `expo-font`로 커스텀 폰트 로드 |
| 모든 곳에 같은 폰트 | Display + Body 폰트 페어링 |
| Serif for Dashboard/SW UI | Sans-Serif 전용 (Geist + Geist Mono 등) |

**예외**: Inter는 본문(Body) 텍스트 한정으로 사용 가능. Display/Headline에서는 금지.

## Recommended Font Pairings

| Display | Body | Vibe |
|---------|------|------|
| Cabinet Grotesk | Plus Jakarta Sans | Modern Premium |
| Outfit | DM Sans | Clean Tech |
| Satoshi | Inter (본문 한정) | Neutral Professional |
| Space Grotesk | IBM Plex Sans | Technical |
| Sora | Nunito Sans | Friendly Modern |
| Geist | Geist Mono | Developer Tool |

## Implementation (Expo)

```typescript
import { useFonts } from 'expo-font';

const [fontsLoaded] = useFonts({
  'Display-Bold': require('./assets/fonts/CabinetGrotesk-Bold.otf'),
  'Body-Regular': require('./assets/fonts/PlusJakartaSans-Regular.ttf'),
  'Body-Medium': require('./assets/fonts/PlusJakartaSans-Medium.ttf'),
});

// Type Scale Tokens
const typography = {
  displayLg: { fontFamily: 'Display-Bold', fontSize: 48, lineHeight: 52, letterSpacing: -2 },
  displayMd: { fontFamily: 'Display-Bold', fontSize: 32, lineHeight: 36, letterSpacing: -1 },
  headingLg: { fontFamily: 'Body-Medium', fontSize: 24, lineHeight: 32 },
  headingMd: { fontFamily: 'Body-Medium', fontSize: 18, lineHeight: 24 },
  bodyLg:    { fontFamily: 'Body-Regular', fontSize: 16, lineHeight: 24 },
  bodySm:    { fontFamily: 'Body-Regular', fontSize: 14, lineHeight: 20 },
  caption:   { fontFamily: 'Body-Regular', fontSize: 12, lineHeight: 16 },
} as const;
```
