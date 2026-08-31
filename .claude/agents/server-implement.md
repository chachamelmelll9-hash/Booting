---
name: server-implement
description: Implements NestJS server modules (controller, service, DTO, guard) to make the previously written apps/server-e2e tests pass, with ownership-scoped queries to avoid IDOR. Spawned by implement-orchestrator.
---

# Server Implement Agent

NestJS 서버 모듈을 구현한다 (controller, service, DTO, guard).

## Input

- Architecture doc — "Server Architecture" + "API Contracts" 섹션. `docs/features/{feature}-architecture.md`를 우선 읽고, 없으면 고정명 alias `docs/features/architecture.md`로 fallback한다 (계약: `docs/features/ARTIFACTS.md`)
- `docs/features/{name}.md` — feature spec
- `docs/progress/features.jsonl` — 현재 진행 상태 (JSONL, 스키마: `docs/progress/SCHEMA.md`)

## Prerequisites

- DB worker가 완료된 상태 (orchestrator가 context로 전달)

## Instructions

### Step 1: Read Architecture & Analyze Existing Code

1. architecture doc의 "Server Architecture"와 "API Contracts" 섹션 읽기
2. 기존 서버 구조 분석:
   ```
   apps/server/src/
   ```
   - 기존 모듈 패턴 확인 (특히 auth 모듈)
   - 공통 guard, decorator, filter 확인
   - app.module.ts의 import 패턴 확인

### Step 2: Create Module Structure

architecture doc의 파일 트리를 따라 생성:

```
apps/server/src/{module}/
  {module}.controller.ts
  {module}.service.ts
  {module}.module.ts
  dto/
    {action}.dto.ts
  guard/                    (필요 시에만)
    {guard}.guard.ts
```

### Step 3: Implement DTOs

API Contracts에 정의된 Request/Response DTO 구현:

```typescript
// class-validator 데코레이터 사용
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class {Action}Dto {
  @IsString()
  @IsNotEmpty()
  field: string;
}
```

### Step 4: Implement Service

비즈니스 로직 구현:
- Supabase 클라이언트를 통한 DB 접근
- 기존 auth service 패턴 참고
- 에러 핸들링 (HttpException 사용)
- **소유권 스코핑 필수**: `getClient()`(service_role)는 RLS를 우회하므로, 모든 사용자 데이터 조회/변경 쿼리에 `@User('id')`로 주입받은 userId 조건을 반드시 포함한다. 누락 시 IDOR 취약점이 된다.

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';

import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class {Module}Service {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findOne(userId: string, id: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('{table}')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId) // 소유권 스코핑 — 다른 사용자 행 접근(IDOR) 차단
      .single();

    if (error || !data) {
      throw new NotFoundException({ code: '{resource}_not_found' });
    }
    return data;
  }
}
```

RLS를 서버 경로에서도 활성화하려면 사용자 JWT로 스코프된 클라이언트를 사용한다 (권장):

```typescript
// controller에서 accessToken을 넘겨받아 사용
const client = this.supabaseService.getUserClient(accessToken);
// 이 클라이언트의 쿼리는 해당 사용자의 RLS 정책이 적용된다
```

### Step 5: Implement Controller

REST 엔드포인트 구현:
- API Contracts에 정의된 메서드, 경로, 인증 요구사항 따름
- 기존 auth controller 패턴 참고
- **글로벌 prefix `api`가 자동 부착된다** (main.ts의 `setGlobalPrefix('api')`). `@Controller('api/{resource}')`로 쓰면 `/api/api/{resource}`가 되므로 반드시 `@Controller('{resource}')`만 쓴다 (최종 경로: `/api/{resource}`).
- 인증이 필요한 엔드포인트는 `@UseGuards(AuthGuard)` + `@User()` 데코레이터로 사용자를 주입받아 서비스에 userId를 전달한다.

```typescript
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard';
import { User } from '../auth/user.decorator';

@Controller('{resource}')
export class {Module}Controller {
  constructor(private readonly {module}Service: {Module}Service) {}

  @Post()
  @UseGuards(AuthGuard)  // Auth: Required인 경우
  async {method}(@User('id') userId: string, @Body() {dto}: {Action}Dto) {
    return this.{module}Service.{method}(userId, {dto});
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  async findOne(@User('id') userId: string, @Param('id') id: string) {
    return this.{module}Service.findOne(userId, id);
  }
}
```

### Step 6: Register Module

`apps/server/src/{module}/{module}.module.ts` 생성:

```typescript
import { Module } from '@nestjs/common';

@Module({
  controllers: [{Module}Controller],
  providers: [{Module}Service],
  exports: [{Module}Service],  // 다른 모듈에서 사용 시
})
export class {Module}Module {}
```

`apps/server/src/app/app.module.ts`에 새 모듈 등록:
- imports 배열에 추가

### Step 7: Update Progress (JSONL)

`docs/progress/features.jsonl`에 완료 이벤트 append:

```bash
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":"{name}","phase":"implement","agent":"server-implement","event":"worker_completed","detail":{"worker":"server-implement","files_created":{N}}}' >> docs/progress/features.jsonl
```

에러 발생 시:
```bash
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":"{name}","phase":"implement","agent":"server-implement","event":"worker_failed","detail":{"worker":"server-implement","error":"{에러 메시지}","attempt":{N}}}' >> docs/progress/features.jsonl
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

- NestJS 모듈 파일들 (controller, service, module, DTOs)
- app.module.ts 업데이트
- features.jsonl 이벤트 append

## Error Handling

- import 오류: 기존 코드에서 정확한 import 경로 확인
- 타입 오류: DTO와 서비스 간 타입 일치 확인
- 모듈 등록 누락: app.module.ts에 반드시 등록

## Constraints

- 기존 auth 모듈의 코딩 패턴을 따름 (네이밍, 구조, 에러 핸들링)
- API Contracts에 정의된 엔드포인트만 구현 (추가 엔드포인트 생성 금지)
- class-validator 데코레이터로 입력 검증
- Supabase 클라이언트를 통한 DB 접근 (직접 SQL 사용 지양)
- **컨트롤러 경로에 `api/`를 붙이지 않음** — 글로벌 prefix `api`가 자동 부착되므로 `@Controller('{resource}')` 형태만 사용 (`@Controller('api/{resource}')` 금지, `/api/api/*` 발생)
- **모든 사용자 데이터 조회/변경은 `@User('id')`로 소유권 스코핑 필수** — `getClient()`(service_role)는 RLS를 우회하므로 쿼리마다 `.eq('user_id', userId)` 등 소유권 조건을 강제한다. 가능하면 `supabaseService.getUserClient(accessToken)`으로 RLS가 적용되는 사용자 스코프 클라이언트를 사용:

  ```typescript
  @Get(':id')
  @UseGuards(AuthGuard)
  async findOne(@User('id') userId: string, @Param('id') id: string) {
    return this.{module}Service.findOne(userId, id); // service에서 .eq('user_id', userId)
  }
  ```
- **Supabase 프로젝트는 비대칭 JWT 서명 키(ES256/RS256) 필수** — AuthGuard가 JWKS(`{SUPABASE_URL}/auth/v1/.well-known/jwks.json`)로 토큰을 검증하므로, legacy HS256 shared secret 방식이면 모든 인증이 실패한다. Supabase Dashboard → Auth → JWT Keys에서 signing key 방식(ECC/RSA) 사용 여부를 확인한다.
- 무차별 대입에 민감한 신규 엔드포인트에는 `@Throttle({ default: { limit: 5, ttl: 60000 } })` 적용 (전역 ThrottlerGuard는 app.module.ts에 이미 등록됨, 기본 60회/분)
- 새 패키지 설치가 필요하면 `cd apps/server && pnpm add {package}` 사용
