# Layout & Spacing

React Native 모바일 앱의 레이아웃과 스페이싱 규칙.

## 8dp Grid System

모든 스페이싱은 4dp/8dp 배수 시스템을 따른다.

```typescript
const spacing = {
  xs: 4,     // 아이콘-텍스트 간격
  sm: 8,     // 인라인 요소 간격
  md: 16,    // 컴포넌트 내부 패딩
  lg: 24,    // 섹션 간 간격
  xl: 32,    // 주요 섹션 분리
  '2xl': 48, // 페이지 레벨 분리
  '3xl': 64, // 히어로/대형 섹션
} as const;
```

## Rules

| Rule | Standard | Avoid |
|------|----------|-------|
| **Safe Area** | 모든 고정 헤더/탭바/CTA에 safe area 준수 | 노치, 상태바, 제스처 영역 아래 UI |
| **System Bar** | 상태바/네비게이션바/홈 인디케이터 위 충분한 여백 | 터치 가능 콘텐츠가 OS 크롬과 충돌 |
| **Content Width** | 디바이스별 일관된 콘텐츠 너비 | 화면마다 다른 여백 |
| **Horizontal Padding** | 기본 `paddingHorizontal: 16-20` | 4px 같은 좁은 여백 |
| **Section Hierarchy** | 수직 리듬 단계: 16/24/32/48 | 같은 계층에 들쭉날쭉한 간격 |
| **Scroll + Fixed** | 고정 바 뒤에 콘텐츠 가려지지 않도록 inset 추가 | 스크롤이 헤더/푸터 뒤에 숨김 |
| **Landscape** | 가로 모드에서도 읽기/조작 가능 | 가로 모드 미고려 |
| **Visual Hierarchy** | 크기, 간격, 대비로 계층 구축 | 색상에만 의존 |
| **Viewport Stability** | `flex: 1` 사용 | `Dimensions.get('window').height` 남용 |
| **Readable Text** | 긴 텍스트가 대형 디바이스에서 읽기 좋은 너비 유지 | 태블릿에서 양 끝 가장자리 텍스트 |
| **Adaptive Gutters** | 대형 화면/가로 모드에서 수평 여백 증가 | 모든 크기/방향에서 같은 여백 |
| **Content Priority** | 모바일에서 핵심 콘텐츠 먼저. 부수적 콘텐츠는 폴드/숨김 | 중요 콘텐츠와 부수 콘텐츠 혼재 |

## Z-Index Scale

레이어 충돌 방지를 위한 체계적 z-index.

```typescript
const zIndex = {
  base: 0,
  card: 10,
  sticky: 20,
  overlay: 40,
  modal: 100,
  toast: 1000,
} as const;
```

## Implementation

```typescript
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function ScreenContainer({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{
      flex: 1,
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
      paddingHorizontal: spacing.md,
    }}>
      {children}
    </View>
  );
}
```
