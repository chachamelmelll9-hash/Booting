# Accessibility

React Native 모바일 앱의 접근성 규칙. **CRITICAL** 우선순위.

## Rules

| Rule | Standard |
|------|----------|
| **Contrast** | 본문 텍스트 4.5:1, 대형 텍스트 3:1 (WCAG AA) |
| **Labels** | 모든 의미있는 이미지/아이콘에 `accessibilityLabel` |
| **Roles** | 인터랙티브 요소에 `accessibilityRole` 적절히 설정 (`button`, `link`, `header`, `tab` 등) |
| **Hints** | 동작 결과 설명: `accessibilityHint="프로필 설정 화면으로 이동합니다"` |
| **Focus Order** | 스크린리더 포커스 순서가 시각적 순서와 일치 |
| **Reading Order** | VoiceOver/TalkBack 읽기 순서가 논리적 |
| **Dynamic Type** | 시스템 텍스트 크기 설정 지원. 최대 크기에서도 레이아웃 깨짐 없음 |
| **Reduced Motion** | `AccessibilityInfo.isReduceMotionEnabled` 확인. 애니메이션 축소/비활성화 |
| **Color Not Only** | 색상만으로 정보 전달 금지. 아이콘/텍스트 병용 (에러=빨강+아이콘+메시지) |
| **Escape Routes** | 모달/멀티스텝 플로우에 취소/뒤로가기 제공 |
| **Form Labels** | 모든 입력 필드에 `accessibilityLabel` |
| **States** | `accessibilityState={{ selected, disabled, expanded, checked }}` 올바르게 전달 |
| **Keyboard Shortcuts** | 시스템/접근성 단축키 보존 |
| **Heading Hierarchy** | 논리적 heading 계층. `accessibilityRole="header"` 적절 사용 |
| **Focus Rings** | 포커스된 요소에 2-4px 시각적 인디케이터 |
| **Skip Links** | 주요 콘텐츠 영역으로 건너뛰기 |
| **Group Elements** | 관련 요소 `accessibilityElementsHidden` 또는 `importantForAccessibility`로 그룹화 |

## Implementation Patterns

### Accessible Button

```typescript
<Pressable
  onPress={onPress}
  accessibilityRole="button"
  accessibilityLabel="장바구니에 추가"
  accessibilityHint="선택한 상품을 장바구니에 담습니다"
  accessibilityState={{ disabled: isLoading }}
>
  <Icon name="cart-plus" />
</Pressable>
```

### Accessible Form Field

```typescript
<View>
  <Text
    nativeID="email-label"
    accessibilityRole="text"
  >
    이메일
  </Text>
  <TextInput
    accessibilityLabelledBy="email-label"
    accessibilityLabel="이메일 입력"
    accessibilityHint="로그인에 사용할 이메일을 입력하세요"
    keyboardType="email-address"
    autoComplete="email"
    textContentType="emailAddress"
  />
  {error && (
    <Text
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{ color: theme.error }}
    >
      {error}
    </Text>
  )}
</View>
```

### Reduced Motion Hook

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
