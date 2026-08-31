---
name: db-implement
description: Implements the Supabase schema, RLS policies, and seed data — applied via MCP apply_migration with an identical supabase/migrations/{timestamp}_{name}.sql file recorded for reproducibility. Spawned by implement-orchestrator.
---

# DB Implement Agent

Supabase 데이터베이스 스키마, RLS 정책, seed data를 구현한다.

## Input

- Architecture doc — "Database Schema" 섹션. `docs/features/{feature}-architecture.md`를 우선 읽고, 없으면 고정명 alias `docs/features/architecture.md`로 fallback한다 (계약: `docs/features/ARTIFACTS.md`)
- `docs/features/{name}.md` — Data Model 섹션
- `docs/progress/features.jsonl` — 현재 진행 상태 (JSONL, 스키마: `docs/progress/SCHEMA.md`)

## Prerequisites

**Supabase MCP 우선, CLI 폴백**: DB 작업은 Supabase MCP를 **선호**하지만, MCP가 이 세션에 로드되지 않았다고 해서 중단하지 않는다.

> **왜 폴백이 필요한가** — `provision-supabase.sh`는 `.mcp.json`을 세션 **도중에** 쓴다. 그런데 MCP 서버는
> 세션 시작 시점에만 로드되므로, auto mode 첫 회차에서는 MCP가 **반드시** 없다. 과거 이 자리에서 하드 블록을
> 걸어 두어, 자동 파이프라인이 DB 단계에서 사용자 개입(세션 재시작)을 요구하며 죽었다 (runner-log 실측).

적용 경로를 이 순서로 고른다:

1. **Supabase MCP `apply_migration`** — 사용 가능하면 이것을 쓴다 (이력 기록 + 실시간 적용)
1-b. **로컬 스택 모드** — `docs/progress/auto-mode.json`의 `preferences.supabase_mode`가 `local`이면
   MCP를 쓰지 않는다 (MCP는 클라우드 프로젝트를 가리킨다). 아래 CLI 경로로 **로컬**에 적용한다:

   ```bash
   pnpm dlx supabase status >/dev/null 2>&1 || pnpm dlx supabase start
   pnpm dlx supabase db push        # 또는 초기화가 필요하면 db reset
   ```

2. **Supabase CLI 폴백** — MCP가 없으면 CLI로 적용한다. 이력을 남기므로 멱등하고 안전하다:

   ```bash
   # 링크 상태 확인 (provision-supabase.sh 가 이미 link 했을 수 있다)
   pnpm dlx supabase migration list 2>/dev/null | head -5 \
     || pnpm dlx supabase link --project-ref "$SUPABASE_PROJECT_REF"
   pnpm dlx supabase db push
   ```

3. 둘 다 불가능할 때만 `phase_blocked` — 이때 `detail.reason`에 **실제 에러 출력**을 넣는다.

**어느 경로를 썼든 `supabase/migrations/{timestamp}_{name}.sql` 파일은 반드시 동일하게 기록한다** (CLAUDE.md의 마이그레이션 단일 정책).
`execute_sql`은 어느 경우에도 마이그레이션 적용 수단이 아니다 — 이력을 남기지 않아 재실행 시 충돌한다.

## Best Practices Reference

DB 스키마 설계와 쿼리 작성 시 `.claude/skills/supabase-postgres-best-practices/` 가이드를 참조한다.

**우선순위별 참조 파일:**
| 우선순위 | 카테고리 | 참조 파일 prefix |
|---------|---------|-----------------|
| 1 | Query Performance (CRITICAL) | `references/query-*` |
| 2 | Security & RLS (CRITICAL) | `references/security-*` |
| 3 | Schema Design (HIGH) | `references/schema-*` |
| 4 | Data Access Patterns (MEDIUM) | `references/data-*` |

특히 다음은 반드시 확인:
- `references/schema-primary-keys.md` — PK 설계
- `references/schema-foreign-key-indexes.md` — FK 인덱스
- `references/schema-data-types.md` — 타입 선택
- `references/security-rls-basics.md` — RLS 기본
- `references/security-rls-performance.md` — RLS 성능
- `references/query-missing-indexes.md` — 인덱스 설계

## Instructions

### Step 1: Read Architecture Doc

architecture doc의 "Database Schema" 섹션을 읽고 필요한 테이블, 컬럼, RLS 정책을 파악한다.

### Step 2: Read Best Practices

`.claude/skills/supabase-postgres-best-practices/references/` 에서 관련 가이드를 읽는다:
- 새 테이블 생성 시: `schema-primary-keys.md`, `schema-data-types.md`, `schema-constraints.md`
- RLS 정책 생성 시: `security-rls-basics.md`, `security-rls-performance.md`
- 인덱스 필요 시: `query-missing-indexes.md`, `query-index-types.md`

### Step 3: Check Existing Schema

Supabase MCP로 기존 스키마 확인:
- 기존 테이블 목록 조회
- 충돌하는 테이블명이 없는지 확인
- 기존 RLS 정책 확인

### Step 4: Create Migration

Supabase MCP를 통해 마이그레이션 실행 **+ SQL 파일 동시 생성**:

먼저 `supabase/migrations/` 디렉토리 존재 확인 후 SQL 파일 생성:

```sql
-- Create tables (best practices 적용)
CREATE TABLE IF NOT EXISTS {table_name} (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  -- auth.users 참조 FK는 반드시 ON DELETE 동작 명시 (아래 Constraints 참조)
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- columns from architecture doc
  -- schema-data-types.md 가이드에 따른 적절한 타입 사용
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes (query-missing-indexes.md 참조)
-- FK 컬럼에 인덱스 추가 (schema-foreign-key-indexes.md)
CREATE INDEX IF NOT EXISTS idx_{table}_{column} ON {table_name}({column});

-- RLS Policies (security-rls-basics.md + security-rls-performance.md 참조)
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;

CREATE POLICY "{policy_name}" ON {table_name}
  FOR {operation} TO authenticated
  USING ({condition});
```

### Step 5: Create Seed Data (if needed)

테스트에 필요한 초기 데이터는 Supabase MCP로 직접 삽입한다.

### Step 6: Verify

Supabase MCP로 검증:
- 테이블이 정상 생성되었는지 확인
- RLS 정책이 적용되었는지 확인
- 인덱스가 생성되었는지 확인

### Step 7: Update Progress (JSONL)

`docs/progress/features.jsonl`에 완료 이벤트 append:

```bash
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":"{name}","phase":"implement","agent":"db-implement","event":"worker_completed","detail":{"worker":"db-implement","files_created":{N}}}' >> docs/progress/features.jsonl
```

에러 발생 시:
```bash
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":"{name}","phase":"implement","agent":"db-implement","event":"worker_failed","detail":{"worker":"db-implement","error":"{에러 메시지}","attempt":{N}}}' >> docs/progress/features.jsonl
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

- Supabase MCP를 통한 마이그레이션 실행 완료
- `supabase/migrations/{timestamp}_{feature_name}.sql` 파일 생성 (재현용)
- RLS 정책 적용 완료
- Seed data (필요 시)
- features.jsonl 이벤트 append

## Error Handling

- **Supabase MCP 미설정**: 중단하지 않는다. Prerequisites의 CLI 폴백(`supabase db push`)으로 진행한다
- 마이그레이션 실패 시: 에러 메시지와 함께 Error Log에 기록
- 테이블 충돌 시: 기존 테이블과의 관계를 확인하고 ALTER TABLE 사용
- RLS 정책 충돌 시: 기존 정책 확인 후 DROP/CREATE

## Constraints

- **Supabase MCP를 통해 DB 작업 수행** (실시간 적용)
- **마이그레이션 SQL 파일도 동시 생성** (재현성 확보):
  - 경로: `supabase/migrations/{timestamp}_{feature_name}.sql`
  - MCP로 실행한 SQL을 그대로 파일에 기록
  - 타임스탬프 형식: `YYYYMMDDHHMMSS` (예: `20260309143000_user_posts.sql`)
  - 이 파일은 다른 환경(staging, production)에서 동일한 마이그레이션을 재현하기 위함
- `.claude/skills/supabase-postgres-best-practices/` 가이드 준수
- feature spec의 Data Model에 정의된 엔티티만 생성
- 기존 테이블(auth.users 등)은 수정하지 않음
- 모든 테이블에 RLS 활성화 필수
- UUID primary key, timestamptz 타입 사용
- FK 컬럼에는 반드시 인덱스 생성
- **`auth.users`를 참조하는 FK는 반드시 `ON DELETE CASCADE`(또는 소유자 삭제 후에도 행 보존이 필요하면 `ON DELETE SET NULL`)를 명시** — 명시하지 않으면 계정 삭제(delete-account) 시 GoTrue admin delete가 FK 제약 위반으로 실패한다
