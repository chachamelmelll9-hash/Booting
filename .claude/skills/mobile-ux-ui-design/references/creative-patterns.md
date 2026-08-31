# Creative Patterns (Premium UI)

AI 기본을 넘어 프리미엄 모바일 인터페이스를 구축하기 위한 고급 패턴. MOTION_INTENSITY와 VISUAL_DENSITY 다이얼에 따라 적용 수준을 조절한다.

## Materiality & Depth

### Glassmorphism (모바일 최적화)

```typescript
import { BlurView } from 'expo-blur';

function GlassCard({ children }: Props) {
  return (
    <BlurView intensity={20} tint="light" style={styles.container}>
      <View style={styles.innerBorder}>
        {children}
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  innerBorder: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
  },
});
```

### Tinted Shadows

배경 색상에 맞춘 틴티드 섀도우는 깊이감을 자연스럽게 전달한다.

```typescript
const tintedShadow = (accentColor: string) => ({
  shadowColor: accentColor,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 12,
  elevation: 8,
});
```

## Density-Based Patterns

### VISUAL_DENSITY > 7 (Dashboard/Cockpit)

- 제네릭 카드 컨테이너 금지
- `borderTopWidth: 1` 또는 구분선으로 논리적 그룹핑
- 데이터 메트릭은 박스 없이 여백으로 호흡
- elevation은 기능적으로 필요한 경우에만
- 숫자는 모노스페이스 (`fontVariant: ['tabular-nums']`)

### VISUAL_DENSITY 1-3 (Gallery/Luxury)

- 넓은 여백, 큰 섹션 간격
- 대형 이미지/타이포그래피
- 최소한의 UI 크롬
- 콘텐츠가 스스로 말하게

## Motion Patterns (MOTION_INTENSITY > 5)

### Scroll-Driven Header

```typescript
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

function CollapsibleHeader() {
  const scrollY = useSharedValue(0);

  const headerStyle = useAnimatedStyle(() => ({
    height: interpolate(scrollY.value, [0, 100], [200, 60], Extrapolation.CLAMP),
    opacity: interpolate(scrollY.value, [0, 80], [1, 0.9], Extrapolation.CLAMP),
  }));

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => { scrollY.value = event.contentOffset.y; },
  });

  return (
    <>
      <Animated.View style={[styles.header, headerStyle]} />
      <Animated.ScrollView onScroll={scrollHandler} scrollEventThrottle={16}>
        {/* content */}
      </Animated.ScrollView>
    </>
  );
}
```

### Shared Element Transition

리스트 → 디테일 화면 전환 시 공유 요소로 시각적 연속성 제공.

### Pull-to-Refresh with Custom Animation

기본 RefreshControl 대신 커스텀 애니메이션으로 브랜드 개성 표현.

## Micro-Interactions

### Press Scale with Spring

```typescript
function PressableCard({ children, onPress }: Props) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 22, stiffness: 180 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 18, stiffness: 120 }); }}
      onPress={onPress}
    >
      <Animated.View style={animStyle}>{children}</Animated.View>
    </Pressable>
  );
}
```

### Stagger Grid Entry

아이템당 40ms 딜레이로 워터폴 진입 효과.

### Status Dot Pulse

온라인/활성 상태 표시 시 미세한 펄스 애니메이션.

## Radius System

의도적인 border-radius 시스템으로 AI 기본 패턴(모든 곳에 16) 방지.

```typescript
const radius = {
  none: 0,    // 구분선, 테이블
  xs: 4,      // 인풋, 작은 요소
  sm: 8,      // 버튼, 칩
  md: 12,     // 카드
  lg: 16,     // 모달, 시트
  full: 9999, // 아바타, 뱃지
} as const;
```
