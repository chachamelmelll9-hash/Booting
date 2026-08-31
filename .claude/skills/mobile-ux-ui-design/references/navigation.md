# Navigation Patterns

React Native + Expo Router 네비게이션 규칙.

## Rules

| Rule | Standard | Avoid |
|------|----------|-------|
| **Bottom Nav Limit** | 하단 탭 최대 5개. 아이콘 + 텍스트 라벨 필수 | 6개 이상 탭, 아이콘만 있는 탭 |
| **Bottom Nav = Top Level** | 하단 탭은 최상위 화면 전용 | 탭 안에 서브 네비게이션 |
| **Active State** | 현재 위치 시각적 강조 (색상, 굵기, 인디케이터) | 현재 탭 불분명 |
| **Back Behavior** | 뒤로가기 예측 가능 + 일관적. 스크롤/상태 보존 | 뒤로가기 시 상태 초기화 |
| **State Preservation** | 뒤로 시 이전 스크롤 위치, 필터, 입력 복원 | 탭 전환 시 상태 소실 |
| **Deep Linking** | 모든 주요 화면이 딥링크/URL로 도달 가능 | 딥링크 미지원 |
| **Modal Escape** | 모달/시트에 명확한 닫기 어포던스. 스와이프 다운 해제 | 닫기 방법 불분명 |
| **Modal ≠ Navigation** | 모달을 주요 네비게이션에 사용 금지 | 모달로 주요 화면 이동 |
| **Search Accessible** | 검색이 쉽게 접근 가능. 최근/추천 검색어 제공 | 검색 기능 숨김 |
| **Gesture Nav** | iOS 스와이프백, Android predictive back 충돌 없이 지원 | 커스텀 제스처가 시스템과 충돌 |
| **Tab Badge** | 뱃지는 미읽음/대기에 제한적. 방문 후 제거 | 뱃지 남발 |
| **Back Stack** | 네비게이션 스택 조용히 리셋 금지 | 갑자기 홈으로 돌아감 |
| **Persistent Nav** | 핵심 네비 딥 페이지에서도 접근 가능 | 깊은 화면에서 탭바 사라짐 |
| **Destructive Separation** | 위험 액션 (삭제, 로그아웃) 일반 네비와 시각적/공간적 분리 | 삭제가 일반 메뉴와 같은 위치 |
| **Nav Consistency** | 네비게이션 위치가 모든 페이지에서 동일 | 페이지별 다른 네비 위치 |
| **No Mixed Patterns** | 같은 계층에 Tab + Sidebar + Bottom Nav 혼합 금지 | 복수 네비 패턴 혼재 |
| **Overflow Menu** | 액션이 공간 초과 시 "더보기" 메뉴 | 빽빽하게 모두 표시 |
| **Empty Nav State** | 네비 목적지 비가용 시 이유 설명 | 조용히 숨기기 |

## iOS vs Android

| Aspect | iOS (HIG) | Android (Material) |
|--------|-----------|-------------------|
| Primary Nav | Bottom Tab Bar | Top App Bar + Bottom Nav |
| Back | 스와이프 백 | System back button |
| Actions | Navigation bar trailing | Top App Bar actions |
| Drawer | 사용 자제 (보조적) | 보조 네비게이션용 |
