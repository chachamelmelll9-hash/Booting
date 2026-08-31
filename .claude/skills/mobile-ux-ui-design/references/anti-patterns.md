# Anti-Patterns (AI Slop Detection & Prevention)

LLM이 생성하는 제네릭 UI 패턴을 적극적으로 감지하고 방지한다. **모든 UI 생성 시 이 파일을 읽어야 한다.**

## Visual & Styling

| Forbidden Pattern | Why | Do Instead |
|-------------------|-----|------------|
| 보라색/파란색 그라디언트 배경 | AI 기본 미학의 대표 패턴 | 뉴트럴 베이스 + 단일 액센트 |
| `Inter`/`Roboto`를 Display 폰트로 | AI가 가장 많이 선택하는 "안전한" 폰트 | 개성 있는 Display 폰트 |
| 모든 요소에 `borderRadius: 16` | AI의 "모던해 보이게" 시도 | 의도적 radius 시스템 (0/4/8/12/99) |
| 모든 카드에 큰 그림자 | AI의 "깊이감" 시도 | 의미 있는 elevation 시스템 |
| 무분별한 그라디언트 | AI 기본 장식 | 플랫 컬러 또는 의미 있는 그라디언트만 |
| 이모지를 구조적 아이콘으로 | 비전문적, 플랫폼 불일치 | 벡터 아이콘 세트 |
| `borderRadius: 9999` 남발 | 모든 것을 "필(pill)" 형태로 | 계층에 맞는 radius 차별화 |

## Layout

| Forbidden Pattern | Why | Do Instead |
|-------------------|-----|------------|
| 모든 것이 중앙 정렬 | AI 기본 "안전한" 레이아웃 | DESIGN_VARIANCE에 따른 비대칭 |
| 모든 섹션 동일 패딩 | 시각적 단조로움 | 계층적 스페이싱 시스템 |
| 완벽하게 균등한 그리드만 | AI의 "정돈" 성향 | 콘텐츠에 맞는 가변 비율 |
| 3개씩 균등한 feature 카드 | AI의 가장 흔한 패턴 | 콘텐츠 우선순위에 따른 불균등 |
| 모든 리스트가 동일 카드 | 시각적 피로 | 콘텐츠 유형별 다른 표현 |

## Content & Data

| Forbidden Pattern | Why | Do Instead |
|-------------------|-----|------------|
| "Lorem ipsum" 유지 | 비완성 느낌 | 맥락에 맞는 실제 예시 텍스트 |
| $XX.XX 형식만 | AI 기본 데이터 패턴 | 실제 맥락 데이터 형식 |
| 모든 아바타가 동일 크기/형태 | 제네릭 느낌 | 맥락별 크기/형태 차별화 |
| 일반적인 "Welcome back" 인사 | AI 기본 텍스트 | 제품 맥락에 맞는 인사 |

## Motion

| Forbidden Pattern | Why | Do Instead |
|-------------------|-----|------------|
| 선형 이징 애니메이션 | 부자연스러운 움직임 | 스프링 물리 기반 |
| 모든 요소 동시 페이드인 | AI 기본 진입 패턴 | 스태거 시퀀스 |
| 장식용 무한 반복 애니메이션 | 산만함, 배터리 소모 | 의미 있는 상태 기반 애니메이션 |
| `Animated.timing` 300ms linear | RN 기본값 | `withSpring(value, { damping: 18 })` |

## React Native Specific

| Forbidden Pattern | Why | Do Instead |
|-------------------|-----|------------|
| `ScrollView` + `.map()` for long lists | 메모리 폭발 | `FlatList`/`FlashList` |
| `Dimensions.get('window').height` 고정 | 키보드/회전 시 깨짐 | `flex: 1` + safe area |
| 인라인 스타일 객체 | 매 렌더마다 새 객체 | `StyleSheet.create` |
| `onPress={() => fn(id)}` 인라인 | 매 렌더마다 새 함수 | `useCallback` 또는 메모이즈 |
| 모든 화면에 `<ScrollView>` | 불필요한 스크롤 | 콘텐츠가 화면 초과할 때만 |

## Detection Checklist

UI 생성 후 다음을 확인:
- [ ] 보라색/파란색 그라디언트가 있는가? → 제거
- [ ] Inter/Roboto가 Display 폰트인가? → 개성 있는 폰트로 교체
- [ ] 모든 요소가 중앙 정렬인가? → 비대칭 레이아웃 도입
- [ ] 3개씩 균등한 카드 패턴인가? → 콘텐츠 우선순위 차별화
- [ ] 이모지가 아이콘으로 쓰이는가? → 벡터 아이콘으로 교체
- [ ] 모든 애니메이션이 linear인가? → 스프링 물리로 변경
- [ ] 모든 리스트가 동일한 카드인가? → 유형별 차별화
