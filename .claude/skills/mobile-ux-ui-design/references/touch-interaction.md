# Touch & Interaction

React Native 모바일 앱의 터치 및 인터랙션 규칙. **CRITICAL** 우선순위.

## Rules

| Rule | Standard | Avoid |
|------|----------|-------|
| **Touch Target** | 최소 44×44pt (iOS) / 48×48dp (Android). 시각적 크기 작으면 `hitSlop` 확장 | 작은 아이콘 터치 영역 무확장 |
| **Touch Spacing** | 터치 타겟 간 최소 8dp 간격 | 버튼들 붙어있어 오터치 |
| **Press Feedback** | 터치 시 80-150ms 이내 시각적 피드백 (opacity/scale/ripple) | 터치 시 무반응 |
| **Haptic Feedback** | 확인/중요 액션에 햅틱. 남용 금지 | 모든 터치에 햅틱 |
| **Gesture Standard** | 플랫폼 표준 제스처 사용 (iOS 스와이프백, 핀치줌) | 표준 제스처 재정의 |
| **System Gestures** | 시스템 제스처(컨트롤센터, 백 스와이프) 차단 금지 | 시스템 제스처 영역에 UI |
| **Gesture Conflicts** | 영역당 하나의 주요 제스처. 중첩 탭/드래그 금지 | 겹치는 제스처로 오동작 |
| **Disabled State** | `disabled` 시맨틱 + opacity 0.38-0.5 + 터치 불가 | 비활성인데 터치 가능해 보임 |
| **No Hover Dependency** | 모든 상호작용은 탭/프레스 기반 | hover에서만 정보 표시 |
| **Safe Area Touch** | 주요 터치 타겟을 노치/Dynamic Island/제스처바에서 멀리 | 가장자리에 중요 버튼 |
| **Swipe Affordance** | 스와이프 액션에 명확한 어포던스(쉐브론, 라벨, 힌트) | 숨겨진 스와이프만 존재 |
| **Drag Threshold** | 이동 임계값 설정 후 드래그 시작. 실수 드래그 방지 | 즉시 드래그 시작 |
| **Semantic Controls** | 네이티브 `Pressable`/`Button` 사용 + 접근성 역할 | 제네릭 `View`를 터치 요소로 |
| **Tap Delay** | 300ms 딜레이 없이 즉시 반응 | 느린 터치 반응 |

## Implementation

```typescript
import { Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';

function TapButton({ onPress, children, disabled }: Props) {
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      disabled={disabled}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={({ pressed }) => [
        styles.button,
        pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
        disabled && { opacity: 0.4 },
      ]}
      accessibilityRole="button"
    >
      {children}
    </Pressable>
  );
}
```
