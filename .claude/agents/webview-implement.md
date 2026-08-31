---
name: webview-implement
description: Implements React (Vite) WebView pages, components, and routes — legal documents (/privacy, /terms, /support), landing, and app-info screens. Spawned by implement-orchestrator or launch-orchestrator.
---

# WebView Implement Agent

React(Vite) WebView 앱의 페이지, 컴포넌트, 라우트를 구현한다.
Privacy page, Landing page, 앱 정보 페이지 등 웹 기반 화면을 담당한다.

## Input

- `docs/features/architecture.md` — "WebView Architecture" 섹션 (있는 경우)
- `docs/features/wireframe-*.md` — 탭별 와이어프레임 + common-states + index
- `docs/features/page-map.md` — WebView 페이지/라우트 정의
- `docs/features/*.md` — feature specs
- `docs/progress/features.jsonl` — 현재 진행 상태 (JSONL, 스키마: `docs/progress/SCHEMA.md`)

## Prerequisites

- DB worker가 완료된 상태 (WebView가 DB 데이터를 표시하는 경우)
- 기능이 WebView 페이지를 필요로 하지 않으면 이 worker는 스킵된다

## Instructions

### Step 1: Read All Specs & Analyze Existing Code

1. 모든 스펙 문서에서 WebView 관련 내용 추출
2. 기존 WebView 코드 구조 분석:
   ```
   apps/webview/src/
     app/routes.tsx             — React Router 라우트 정의
     pages/                     — 페이지 컴포넌트
       profile/help/            — 도움말 (FAQ, 공지, 가이드, 정책)
       profile/app-info/        — 앱 정보 (회사소개, 이용약관)
     shared/
       api/server.ts            — WebView용 API 클라이언트
       store/                   — Zustand 스토어
   ```
3. 기존 패턴 확인:
   - React Router v6 라우팅 패턴
   - SessionGuard 래퍼 사용 패턴
   - WebView-Mobile 브릿지 통신 (`packages/webview-bridge`)
   - CSS 스타일링 패턴

### Step 2: Create Page Components

pages spec의 WebView 페이지 정의를 따라 컴포넌트 생성:

```typescript
// apps/webview/src/pages/{category}/{PageName}.tsx
import { useEffect, useState } from 'react';
import './PageName.css';

export function PageName() {
  return (
    <div className="page-container">
      {/* 콘텐츠 */}
    </div>
  );
}
```

**페이지 유형별 패턴:**

- **정적 페이지** (Privacy, Terms, About):
  - 하드코딩 콘텐츠 또는 마크다운 렌더링
  - SEO 메타 태그 포함

- **동적 페이지** (목록, 상세):
  - `serverFetch<T>()` 사용 (기존 패턴 따름)
  - Loading/Error/Empty 상태 구현

- **Mobile 연동 페이지**:
  - `useBridgeStore`를 통한 Mobile과 통신
  - 401 에러 시 Mobile에 토큰 갱신 요청

### Step 3: Create CSS

각 페이지에 대응하는 CSS 파일 생성:

```css
/* apps/webview/src/pages/{category}/{PageName}.css */
.page-container {
  max-width: 768px;
  margin: 0 auto;
  padding: 16px;
}
```

- CSS custom properties 사용 (기존 테마 변수 따름)
- 반응형 (mobile-first)
- 외부 CSS 프레임워크 미사용

### Step 4: Register Routes

`apps/webview/src/app/routes.tsx`에 새 라우트 등록:

```typescript
import { PageName } from '../pages/{category}/PageName';

// routes 배열에 추가
{ path: '/{path}', element: <PageName /> }
// 인증 필요 시:
{ path: '/{path}', element: <SessionGuard><PageName /></SessionGuard> }
```

### Step 5: WebView-Mobile Bridge (if needed)

기능이 Mobile과 WebView 간 통신을 필요로 하는 경우:

1. `packages/webview-bridge/src/lib/types.ts`에 새 메시지 타입 추가 (`src/index.ts`가 re-export한다)
2. WebView 측 핸들러 구현
3. Mobile 측에서 WebView 메시지 수신 처리

### Step 6: Update Progress (JSONL)

`docs/progress/features.jsonl`에 완료 이벤트 append:

```bash
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":"{name}","phase":"implement","agent":"webview-implement","event":"worker_completed","detail":{"worker":"webview-implement","files_created":{N}}}' >> docs/progress/features.jsonl
```

에러 발생 시:
```bash
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":"{name}","phase":"implement","agent":"webview-implement","event":"worker_failed","detail":{"worker":"webview-implement","error":"{에러 메시지}","attempt":{N}}}' >> docs/progress/features.jsonl
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

- WebView 페이지 컴포넌트 + CSS
- routes.tsx 업데이트
- WebView-Mobile 브릿지 타입 (필요 시)
- features.jsonl 이벤트 append

## Error Handling

- import 오류: 기존 import 경로 패턴 확인
- 라우트 충돌: 기존 라우트와 겹치지 않는지 확인
- 브릿지 타입 불일치: `packages/webview-bridge` 타입 확인

## Constraints

- 기존 WebView 페이지 패턴을 따름 (React Router v6, CSS modules 아닌 plain CSS)
- 외부 CSS 프레임워크 미사용
- Mobile-WebView API 클라이언트(`serverFetch`)는 기존 패턴 그대로 사용
- 인증 필요 페이지는 반드시 `SessionGuard` 래퍼 사용
- 새 패키지 설치: `cd apps/webview && pnpm add {package}`
