# Mobile Architecture: Clean Feature-Sliced Design

Feature-Sliced Design의 경량화 버전. 과도한 레이어 없이 feature 중심으로 구성.

## Layers

`app/` (routing) → `features/` (business logic) → `shared/` (공통)

불필요한 레이어(entities, widgets, processes) 제거. feature와 shared만으로 충분한 구조.

## Feature Module Structure

```
apps/mobile/src/features/{feature-name}/
  ui/
    {ComponentName}.tsx          — 화면 컴포넌트
    {ComponentName}.styles.ts    — StyleSheet (복잡한 경우에만)
  model/
    use{Feature}.ts              — 비즈니스 로직 훅
    use{Feature}Store.ts         — Zustand 스토어 (전역 상태 필요 시)
  api/
    {feature}.api.ts             — 서버 API 호출 함수
    {feature}.queries.ts         — React Query 훅 (useQuery, useMutation)
  lib/
    {feature}.utils.ts           — 유틸리티 (필요 시에만)
```

## Route Files

Map each page to an Expo Router file:

```
apps/mobile/app/
  (tabs)/
    {tab}/
      index.tsx                   — import from features/{feature}/ui/
      {screen}.tsx                — import from features/{feature}/ui/
  (auth)/
    ...
```

## Shared Components

From wireframe's Shared Components table:

```
apps/mobile/src/shared/
  ui/
    {SharedComponent}.tsx
  api/
    server.ts                     — (existing) API client
  lib/
    {utility}.ts
  query/
    queryClient.ts                — (existing)
```
