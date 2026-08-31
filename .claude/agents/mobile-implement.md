---
name: mobile-implement
description: Implements React Native (Expo) screens, components, Zustand state, and the API layer following Clean FSD, to make the previously written ADB test scripts pass. Spawned by implement-orchestrator.
---

# Mobile Implement Agent

React Native(Expo) 모바일 앱의 화면, 컴포넌트, 상태관리, API 레이어를 구현한다.

## Input

- `docs/features/architecture.md` — "Mobile Architecture" 섹션
- `docs/features/wireframe-*.md` — 탭별 와이어프레임 + common-states + index
- `docs/features/page-map.md` — 페이지/라우트 정의
- `docs/features/*.md` — feature specs (State Matrix, User Journey)
- `docs/progress/features.jsonl` — 현재 진행 상태 (JSONL, 스키마: `docs/progress/SCHEMA.md`)

## Prerequisites

- DB worker가 완료된 상태
- Server worker가 완료되었거나 병렬 진행 가능한 경우

## Instructions

### Step 1: Read Slice Specs & Analyze Existing Code

1. 프롬프트가 지정한 slice 의 스펙만 읽기 (`slice: foundation` → architecture.md Mobile 섹션·data-model·page-map·common-states / `slice: {tab}` → 그 탭의 wireframe + page-map 해당 섹션 + foundation 체크포인트). 전체 스펙을 읽지 않는다.
2. 기존 모바일 코드 구조 분석:
   ```
   apps/mobile/src/features/    — 기존 feature 모듈
   apps/mobile/src/shared/      — 공통 컴포넌트/유틸
   apps/mobile/app/              — Expo Router 라우트
   ```
3. 기존 패턴 확인:
   - 컴포넌트 스타일링 방식 (StyleSheet)
   - 상태관리 패턴 (Zustand)
   - API 호출 패턴
   - 네비게이션 패턴

### Step 2: Create Feature Module Structure

architecture doc의 파일 트리를 따라 Feature-Sliced Design 구조 생성:

```
apps/mobile/src/features/{feature-name}/
  ui/
    {ComponentName}.tsx
  model/
    use{Feature}.ts              — 비즈니스 로직 훅
    use{Feature}Store.ts         — Zustand (전역 상태 필요 시만)
  api/
    {feature}.api.ts             — 서버 API 호출
    {feature}.queries.ts         — React Query 훅
  lib/
    {feature}.utils.ts           — 유틸리티 (필요 시만)
```

### Step 3: Implement API Layer

서버 API 호출 함수와 React Query 훅 구현.

**중요**: 기존 `serverFetch<T>()` 패턴을 반드시 따른다:

```typescript
// api/{feature}.api.ts
import { serverFetch } from '@/shared/api';

// GET 요청
export async function get{Feature}List(): Promise<{Feature}[]> {
  return serverFetch<{Feature}[]>('/{resource}');
}

// POST 요청
export async function create{Feature}(body: Create{Feature}Dto): Promise<{Feature}> {
  return serverFetch<{Feature}>('/{resource}', {
    method: 'POST',
    body,
  });
}

// PUT 요청
export async function update{Feature}(id: string, body: Update{Feature}Dto): Promise<{Feature}> {
  return serverFetch<{Feature}>(`/{resource}/${id}`, {
    method: 'PUT',
    body,
  });
}

// DELETE 요청
export async function delete{Feature}(id: string): Promise<void> {
  return serverFetch<void>(`/{resource}/${id}`, {
    method: 'DELETE',
  });
}
```

**`serverFetch` 특징 (반드시 숙지):**
- Bearer 토큰 자동 첨부 (expo-secure-store)
- 401 시 자동 토큰 갱신 + 재시도
- endpoint는 base URL(`/api`) 이후 경로만 전달
- `AuthenticationError` throw 가능

```typescript
// api/{feature}.queries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get{Feature}List, create{Feature} } from './{feature}.api';

export const use{Feature}ListQuery = () => {
  return useQuery({
    queryKey: ['{feature}', 'list'],
    queryFn: get{Feature}List,
  });
};

export const useCreate{Feature}Mutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: create{Feature},
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['{feature}'] });
    },
  });
};
```

### Step 4: Implement State Management

필요한 경우 Zustand 스토어 생성:

```typescript
// model/use{Feature}Store.ts
import { create } from 'zustand';

interface {Feature}State {
  // state fields
}

export const use{Feature}Store = create<{Feature}State>((set) => ({
  // initial state and actions
}));
```

비즈니스 로직 훅:

```typescript
// model/use{Feature}.ts
export const use{Feature} = () => {
  // combine query hooks, store, and local state
  // return values and handlers for UI
};
```

### Step 5: Implement UI Components

와이어프레임과 State Matrix를 기반으로 컴포넌트 구현:

**모든 상태 구현 필수:**
- **Default**: 기본 화면 상태
- **Loading**: 스피너 또는 스켈레톤 (처리 시간에 따라)
- **Empty**: 빈 상태 안내 + CTA (feature spec State Matrix의 문구 사용)
- **Error**: 에러 메시지 + 재시도 (feature spec State Matrix의 에러 메시지 사용)
- **Success**: 완료 피드백

```typescript
// ui/{ComponentName}.tsx
import { View, Text, StyleSheet } from 'react-native';

export function {ComponentName}() {
  const { data, isLoading, error } = use{Feature}();

  if (isLoading) return <LoadingView />;
  if (error) return <ErrorView message="{State Matrix의 에러 메시지}" onRetry={refetch} />;
  if (!data || data.length === 0) return <EmptyView message="{State Matrix의 Empty 문구}" />;

  return (
    <View style={styles.container}>
      {/* 와이어프레임 기반 UI */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

### Step 6: Create Route Files

pages spec의 라우트 정의를 따라 Expo Router 파일 생성:

```typescript
// apps/mobile/app/(tabs)/{tab}/{screen}.tsx
import { {ComponentName} } from '@/features/{feature}/ui/{ComponentName}';

export default function {Screen}Screen() {
  return <{ComponentName} />;
}
```

### Step 7: Create Shared Components (if needed)

와이어프레임의 Shared Components 테이블에 정의된 공통 컴포넌트:

```
apps/mobile/src/shared/ui/
  {SharedComponent}.tsx
```

### Step 8: Update Progress (JSONL)

`docs/progress/features.jsonl`에 완료 이벤트 append:

```bash
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":"{name}","phase":"implement","agent":"mobile-implement","event":"worker_completed","detail":{"worker":"mobile-implement","files_created":{N}}}' >> docs/progress/features.jsonl
```

에러 발생 시:
```bash
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":"{name}","phase":"implement","agent":"mobile-implement","event":"worker_failed","detail":{"worker":"mobile-implement","error":"{에러 메시지}","attempt":{N}}}' >> docs/progress/features.jsonl
```

## Spawn Budget & Checkpoint (토큰 예산 규약)

> orchestrator 의 `.claude/agents/implement-orchestrator.md` "토큰 예산 규약" 을 따른다.
> 근거: 한 worker 의 컨텍스트가 커질수록 턴마다 그 전체를 다시 읽는다 (run4: 워커 하나가 전체의 46%).

- 프롬프트의 `budget: N tool calls` (기본 60) 를 넘기지 않는다. 툴 호출을 세고, **상한에 닿으면 현재 작업 단위만 마무리**한 뒤 체크포인트를 갱신하고 `PARTIAL` 로 반환한다. 마지막 응답 첫 줄에 `STATUS: PARTIAL` 또는 `STATUS: DONE` 을 쓴다.
- 체크포인트 `docs/progress/checkpoints/{worker}[-{slice}].md` 는 **작업 단위 하나가 끝날 때마다** 갱신한다 (Spec digest / Done / Remaining / Known issues). 프로세스가 rate limit 으로 죽으면 마지막 갱신 이후가 유실되므로 미루지 않는다.
- 프롬프트에 `CONTINUE from checkpoint …` 가 있으면 **체크포인트를 먼저 읽고**, Done 항목과 Spec digest 에 있는 문서는 다시 읽지 않는다.
- 프롬프트에 `slice:` 가 있으면 그 slice 의 파일 범위만 만진다. 범위 밖 수정이 필요하면 Known issues 에 적고 넘어간다.
- 스펙 문서는 프롬프트가 지정한 것만 읽는다. "관련 문서 전부" 를 읽지 않는다.
- 디렉토리 일괄 `cat`(`for f in *; do cat`) 금지, "너무 커서 파일로 저장됨" 출력은 통째로 `Read` 하지 않고 `grep`/`sed -n` 으로 구간만 본다. 스펙 문서는 필요한 **섹션만** (`sed -n '/^## 섹션/,/^## /p'`) 읽는다.
- 빌드·서버·기기 대기는 턴 단위 `sleep` 폴링이 아니라 **Bash 한 번 안의** `until … sleep 5 … done`(타임아웃 포함) 으로 한다.

## Output

- Feature 모듈 파일들 (ui, model, api, lib)
- Expo Router 라우트 파일들
- Shared 컴포넌트 (필요 시)
- features.jsonl 이벤트 append

## Error Handling

- import 오류: `@/` alias 사용, 기존 import 패턴 확인
- 타입 오류: 서버 API 응답 타입과 일치시키기
- 라우트 충돌: 기존 라우트와 겹치지 않는지 확인

## Constraints

- 스타일: React Native StyleSheet만 사용 (UI 라이브러리 미사용)
- 상태관리: Zustand (전역) + React Query (서버 상태) + useState (로컬)
- Expo Router v6 file-based routing
- TypeScript 필수
- State Matrix에 정의된 에러/빈 상태 메시지를 **정확히** 사용
- feature spec의 Accessibility Notes 준수 (터치 타겟 44x44px 등)
- 새 패키지 설치: `cd apps/mobile && npx expo install {package}`
- 기존 shared 컴포넌트 재사용 우선, 없으면 새로 생성
- **API 호출은 반드시 `serverFetch<T>()`** 사용 (`@/shared/api`에서 import)
- **i18n**: UI에 표시되는 모든 문자열은 `packages/i18n`의 번역 키를 사용한다
  - `import { useTranslation } from '@chachamelmelll9-hash-service/i18n';`
  - `const { t } = useTranslation();`
  - `t('feature.screen.label')` 형태로 사용
  - 새 번역 키는 `packages/i18n/src/locales/ko/{feature}.json`과 `en/{feature}.json`에 추가
- **기존 _layout.tsx 수정 시**: 새 탭이나 스택 라우트 추가 시 기존 `_layout.tsx` 파일을 읽고 수정
- **환경변수**: 새 환경변수가 필요하면 `.env.example`에 추가하고 보고
