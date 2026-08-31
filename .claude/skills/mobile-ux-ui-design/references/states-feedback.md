# States & Feedback

모든 화면의 상태 처리와 사용자 피드백 규칙.

## Every Screen Must Handle All States

```
┌─────────────┐
│   Loading    │ → 스켈레톤 로더 (레이아웃 크기 매칭)
├─────────────┤
│   Empty      │ → 안내 메시지 + 행동 유도 (CTA)
├─────────────┤
│   Error      │ → 원인 + 해결 방법 + 재시도 버튼
├─────────────┤
│   Success    │ → 데이터 표시 + 다음 액션 유도
├─────────────┤
│   Partial    │ → 부분 데이터 + 로딩 인디케이터
└─────────────┘
```

## State Rules

| Rule | Standard | Avoid |
|------|----------|-------|
| **Loading** | 300ms 초과 시 스켈레톤/시머. 레이아웃 매칭 필수 | 범용 원형 스피너 |
| **Empty State** | 아름다운 구성 + 데이터 채우는 방법 안내 | 빈 화면 또는 "데이터 없음" 한 줄 |
| **Error Messages** | 원인 + 해결 방법 명시 | "오류 발생" 만 표시 |
| **Error Recovery** | 재시도, 수정, 도움말 링크 등 복구 경로 | 복구 방법 없는 에러 |
| **Submit Feedback** | 제출 시 로딩 → 성공/실패 전환 | 제출 후 피드백 없음 |
| **Toast** | 3-5초 자동 해제. 포커스 빼앗지 않음 | 무한 토스트 |
| **Confirmation** | 파괴적 액션 전 확인 대화상자 | 확인 없이 삭제 |
| **Undo** | 파괴적/대량 액션에 되돌리기 제공 | 되돌리기 불가능 |
| **Success Feedback** | 완료 시 간결한 시각적 확인 (체크마크, 토스트) | 성공 시 피드백 없음 |
| **Destructive CTA** | 위험 색상(빨강) + 주요 액션과 시각적 분리 | 삭제가 확인과 같은 스타일 |
| **Timeout** | 요청 타임아웃 시 명확한 피드백 + 재시도 | 무한 로딩 |

## Form Rules

| Rule | Standard | Avoid |
|------|----------|-------|
| **Visible Labels** | 입력마다 보이는 라벨 | placeholder를 라벨로 |
| **Label Position** | 라벨은 입력 필드 위 | 라벨이 필드 안에만 |
| **Error Placement** | 에러는 관련 필드 바로 아래 | 폼 상단에만 모아서 |
| **Helper Text** | 복잡한 입력에 영구적 도움말 | placeholder에만 도움말 |
| **Input Gap** | 입력 블록 간 `gap: 16` | 붙어있거나 불규칙 |
| **Keyboard Type** | `keyboardType="email-address"`, `"phone-pad"`, `"numeric"` | 기본 키보드만 |
| **Password Toggle** | 비밀번호 보기/숨기 토글 | 토글 없이 마스킹 |
| **Autofill** | `autoComplete` / `textContentType` 지원 | 자동완성 미지원 |
| **Inline Validation** | blur 시 검증. 입력 완료 후 에러 표시 | 타이핑 중 에러 |
| **Required** | 필수 필드 표시 (별표) | 필수 여부 불분명 |
| **Progressive Disclosure** | 복잡한 옵션 단계적 노출 | 폼 필드 수십 개 한꺼번에 |
| **Multi-Step** | 멀티스텝 폼에 진행 인디케이터 + 뒤로가기 | 진행 상태 없는 긴 폼 |
| **Autosave** | 긴 폼 자동 저장 | 뒤로가기 시 모든 입력 소실 |
| **Dismiss Confirm** | 미저장 변경 시트/모달 해제 전 확인 | 확인 없이 입력 소실 |
| **Touch-Friendly** | 모바일 입력 높이 ≥ 44pt | 작은 입력 필드 |
| **Focus Management** | 에러 후 첫 오류 필드로 자동 포커스 | 사용자가 에러 위치 직접 찾음 |

## Skeleton Implementation

```typescript
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';

function Skeleton({ width, height, borderRadius = 8 }: SkeletonProps) {
  const opacity = useSharedValue(0.3);

  React.useEffect(() => {
    opacity.value = withRepeat(withTiming(0.7, { duration: 800 }), -1, true);
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[animStyle, { width, height, borderRadius, backgroundColor: theme.surfaceSecondary }]}
    />
  );
}
```
