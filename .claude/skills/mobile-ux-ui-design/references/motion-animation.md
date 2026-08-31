# Motion & Animation

React Native 모바일 앱의 애니메이션 규칙. `react-native-reanimated` 기반.

## Principles

| Principle | Rule |
|-----------|------|
| **Duration** | 마이크로 인터랙션 150-300ms. 복잡한 전환 ≤ 400ms. 500ms 초과 금지 |
| **Spring Physics** | 선형/cubic-bezier 대신 스프링 기본. `damping: 15-20, stiffness: 100-150` |
| **Transform Only** | `width`, `height`, `top`, `left` 애니메이션 금지. `transform` + `opacity`만 |
| **Exit < Enter** | 퇴장 애니메이션은 진입의 60-70% 시간 |
| **Stagger** | 리스트/그리드 진입 시 아이템당 30-50ms 스태거. 동시 출현 금지 |
| **Interruptible** | 모든 애니메이션 중단 가능. 사용자 탭이 진행 중 애니메이션 즉시 취소 |
| **No Blocking** | 애니메이션 중 UI 입력 차단 금지 |
| **Motion Meaning** | 모든 애니메이션은 인과관계 표현. 장식용 금지 |
| **Reduced Motion** | `AccessibilityInfo.isReduceMotionEnabled` 존중 |
| **Shared Element** | 화면 간 시각적 연속성을 위한 공유 요소 전환 |
| **Direction** | 순방향 = 좌/상, 역방향 = 우/하. 방향 논리적 일관성 |
| **Scale Feedback** | 탭 가능 요소에 미세 스케일(0.95-1.05) press 피드백 |
| **Fade Threshold** | 페이딩 요소가 opacity 0.2 이하로 머무르지 않음 |
| **Crossfade** | 같은 컨테이너 내 콘텐츠 교체 시 크로스페이드 |
| **Modal Motion** | 모달/시트는 트리거 소스에서 애니메이션 (scale+fade 또는 slide-in) |
| **Continuity** | 화면 전환 시 공간적 연속성 유지 (공유 요소, 방향 슬라이드) |
| **Consistency** | 전역 duration/easing 토큰 통일. 모든 애니메이션 같은 리듬 |

## Spring Configs

```typescript
const SPRING_CONFIG = { damping: 18, stiffness: 120, mass: 1 };
const SPRING_SNAPPY = { damping: 22, stiffness: 180, mass: 0.8 };
const SPRING_GENTLE = { damping: 14, stiffness: 80, mass: 1.2 };
```

## Implementation Patterns

### Stagger List Entry

```typescript
import Animated, { FadeIn, Layout } from 'react-native-reanimated';

function StaggerList({ items }: { items: Item[] }) {
  return items.map((item, index) => (
    <Animated.View
      key={item.id}
      entering={FadeIn.delay(index * 40).springify().damping(18)}
      layout={Layout.springify()}
    >
      <ListItem item={item} />
    </Animated.View>
  ));
}
```

### Press Feedback

```typescript
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

function AnimatedCard({ children, onPress }: Props) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.97, SPRING_SNAPPY); }}
      onPressOut={() => { scale.value = withSpring(1, SPRING_CONFIG); }}
      onPress={onPress}
    >
      <Animated.View style={animStyle}>{children}</Animated.View>
    </Pressable>
  );
}
```

### Reduced Motion Support

```typescript
import { AccessibilityInfo } from 'react-native';

function useReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}
```
