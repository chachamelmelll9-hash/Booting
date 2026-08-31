# Icons & Visual Elements

React Native 모바일 앱의 아이콘 및 시각 요소 규칙.

## Rules

| Rule | Standard | Avoid |
|------|----------|-------|
| **No Emoji Icons** | 벡터 아이콘: `@expo/vector-icons`, `react-native-vector-icons` | 네비게이션/시스템에 이모지 |
| **Consistent Set** | 하나의 아이콘 패밀리/스타일 통일 | 여러 아이콘 세트 혼용 |
| **Consistent Sizing** | 토큰 정의: `sm: 16, md: 24, lg: 32` | 20/24/28pt 임의 혼합 |
| **Stroke Consistency** | 같은 레이어에서 일관된 stroke width (1.5px 또는 2px) | 두께 섞인 아이콘 |
| **Filled vs Outline** | 계층 레벨당 하나의 스타일. 활성 탭=Filled, 비활성=Outline | 같은 레벨에서 혼합 |
| **Touch Target** | 아이콘 작아도 터치 ≥ 44×44pt (`hitSlop`) | 작은 아이콘에 패딩 없음 |
| **Alignment** | 텍스트 베이스라인에 정렬, 일관된 패딩 | 미정렬 아이콘 |
| **Contrast** | WCAG: 소형 4.5:1, 대형 글리프 3:1 | 배경에 묻히는 저대비 |
| **Brand Logos** | 공식 에셋 + 가이드라인 준수 | 로고 추측, 비공식 리컬러링 |
| **No Decorative Icons** | 의미 전달용으로만 사용 | 장식용 아이콘 남발 |

## Recommended Icon Libraries (Expo)

| Library | Style | Usage |
|---------|-------|-------|
| `@expo/vector-icons` (Ionicons) | iOS-friendly | 범용 |
| `@expo/vector-icons` (MaterialIcons) | Material Design | Android 스타일 |
| `@expo/vector-icons` (Feather) | 얇은 stroke, 미니멀 | 모던 앱 |
| `react-native-vector-icons` (Phosphor) | 다양한 weight | 커스터마이징 필요 시 |

## Icon Size Tokens

```typescript
const iconSize = {
  xs: 12,  // 인라인 힌트
  sm: 16,  // 보조 아이콘
  md: 24,  // 기본 아이콘 (네비, 버튼)
  lg: 32,  // 강조 아이콘
  xl: 48,  // 빈 상태, 온보딩
} as const;
```
