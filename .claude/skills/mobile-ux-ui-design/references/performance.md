# Performance Guardrails

React Native 모바일 앱의 퍼포먼스 규칙.

## Rules

| Rule | Standard | Avoid |
|------|----------|-------|
| **Transform Only** | `transform`과 `opacity`만 애니메이션 | `width`, `height`, `top`, `left` 애니메이션 |
| **Virtualize Lists** | 50+ 아이템은 `FlatList`/`FlashList` 가상화 | 긴 리스트에 `ScrollView` + `.map()` |
| **Main Thread** | 프레임당 ~16ms 이하 (60fps). 무거운 작업은 별도 스레드 | 메인 스레드에서 무거운 연산 |
| **Image Optimization** | 적절한 크기로 리사이즈. `expo-image` 캐싱 | 원본 대형 이미지 직접 로드 |
| **Content Jumping** | 비동기 콘텐츠에 공간 예약. CLS 방지 | 데이터 로드 시 레이아웃 시프트 |
| **Debounce/Throttle** | 스크롤/입력 등 고빈도 이벤트에 적용 | 고빈도 이벤트 직접 처리 |
| **Memo** | 비용 큰 컴포넌트에 `React.memo`, `useMemo`, `useCallback` | 불필요한 리렌더 방치 |
| **Progressive Loading** | 1초 이상 시 스켈레톤/시머. 긴 블로킹 스피너 금지 | 3-4초 빈 화면 |
| **Input Latency** | 터치 시 100ms 이내 시각적 피드백 | 느린 터치 반응 |
| **Offline Support** | 오프라인 상태 메시지 + 기본 폴백 | 오프라인 시 빈 화면 |
| **Network Fallback** | 느린 네트워크에 열화 모드 (저해상도, 애니메이션 축소) | 동일한 리소스 요구 |
| **Bundle Splitting** | 라우트별 코드 분할 (React Suspense / 동적 import) | 모든 코드 초기 로드 |
| **Font Loading** | 폰트 로딩 완료 전 앱 표시 지연 (expo-splash-screen) | 폰트 로드 중 깜빡임 |
| **Key Prop** | FlatList/map에 안정적 key. index 사용 자제 | key={index}로 리렌더 유발 |

## Implementation Patterns

### Optimized FlatList

```typescript
import { FlatList } from 'react-native';

<FlatList
  data={items}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <MemoizedItem item={item} />}
  getItemLayout={(_, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
  maxToRenderPerBatch={10}
  windowSize={5}
  removeClippedSubviews
  initialNumToRender={10}
/>
```

### Memoized Component

```typescript
const MemoizedItem = React.memo(
  ({ item }: { item: Item }) => (
    <View style={styles.item}>
      <Text>{item.title}</Text>
    </View>
  ),
  (prev, next) => prev.item.id === next.item.id && prev.item.updatedAt === next.item.updatedAt,
);
```
