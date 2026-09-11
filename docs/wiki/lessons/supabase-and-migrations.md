---
type: Lesson
title: Supabase·마이그레이션에서 배운 것
description: MCP 없이 Management API 로 적용하기, CHECK 대신 trigger, enum 값 제거는 재생성, RLS 가 열어 놓는 문, 가입 rate limit, 로그인 중인 계정을 지우면 생기는 일.
tags: [lesson, supabase, postgres]
sources:
  - id: session1
    resource: session:c6fa850d-1ee0-475d-98ff-9f65aa4d9560
  - id: cfa732ae
    resource: commit:fa732ae
  - id: ce944130
    resource: commit:e944130
  - id: c52a1f90
    resource: commit:52a1f90
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# Supabase·마이그레이션

| 상황 | 배운 것 |
|---|---|
| `.mcp.json` 없음 (MCP 는 사용자 스코프) | `apply_migration` 대신 **Management API** `POST https://api.supabase.com/v1/projects/{ref}/database/query` + `SUPABASE_ACCESS_TOKEN`. `scripts/db-migrate.mjs` 가 순서 적용·이력 기록. 분류기가 `Invoke-RestMethod` 로 SQL 을 직접 보내는 것과 DB 쓰기를 막는다 → 스크립트를 만들고, 실행은 소유자가 `! node scripts/db-migrate.mjs` |
| `CHECK (birth_date <= current_date - interval '50 years')` → **42P17** | `current_date` 는 IMMUTABLE 이 아니라 CHECK 에 못 쓴다 → **trigger** `enforce_parent_min_age` |
| enum 에서 값 하나('casual') 빼기 | Postgres 는 enum 값 삭제가 없다 → 새 enum 만들고 컬럼 옮기고 교체 (`20260901120000`) |
| PostgREST `not.in` 에 빈 목록 | 에러. 절대 안 맞는 UUID `(00000000-…)` 자리표시자 |
| **RLS 정책이 열어 둔 문** | `saju_infos.is_public=true` + 정책 `saju_public_read` 면 우리 API 가 안 내보내도 **인증된 아무나 PostgREST 로 원본 생년월일을 읽는다**. 서버가 항상 false 를 쓰고 기존 행도 내렸다 (`fa732ae`). 교훈: "API 가 안 내보낸다" 와 "DB 가 안 내준다" 는 다른 문장이다 |
| `social_identities` | RLS 만 켜고 **정책 없음** = service key 전용. 직접 쓸 수 있으면 남의 계정에 자기 카카오를 붙인다 |
| 스모크 계정 `@example.com` 거부, 공개 가입 rate limit | `@smoke.booting.app` / `auth.admin.createUser`(service-role) |
| 개발 프로젝트 **이메일 확인 켜짐** | API 로 가입하면 세션이 안 나와 로그인이 막힌다. 운영에서 켤지 정해야 한다 |
| 시드 재생성 중 **로그인 중인 계정을 삭제** → 모든 쓰기가 500 (`child_verifications_user_id_fkey`) | JWT 는 서명이 맞으면 계정이 지워진 뒤에도 통과한다. `DomainExceptionFilter` 가 FK `user_id` 위반을 **401 `token_invalid`** 로 바꿔 클라이언트가 로그아웃하게 (`c108038`) |
| DB 에는 있는데 저장소에 없는 마이그레이션 | `20260904020000_numeric_parent_code` 가 배포 DB 에만 적용돼 있어 앱·서버는 6자리를, DB 는 8자리를 발급 → 부모님 로그인 불가. `52a1f90` 에서 파일 복원. **적용과 커밋을 한 커밋에** |
| 유니크 인덱스가 기존 데이터에 걸림 | 스텁 시절 `01000000000` 에 계정 14개. 중복만 풀면 화면 테스트 계정이 등록 첫 단계로 돌아간다 → 인덱스·정리 SQL 을 **배포 직전**으로 미룸 (`e944130`) |
| 적용된 마이그레이션 수정 | 하지 않는다. 되돌리는 마이그레이션을 새로 (`drop_discovery_saju_sort`) |
| 시드가 새 컬럼을 채우지 않음 | 시드가 `published` 프로필을 건너뛰어 새 항목이 전부 null → 공개된 프로필도 PATCH 하도록 (`701d594`) |
| `--reset-feed` 가 하트만 지움 | 이미 인연인 사람이 추천에 다시 떠 중복 하트로 거부되는 카드가 박힌다 → 인연·상대 하트까지 |
| 운영 프로젝트 생성 시 비밀번호 | Management API 응답에 평문 → 대화에 찍혔다. **다시 볼 수 없으니 옮겨 적으라** 고 안내했지만, 기록에 남았으므로 재설정 대상 |

## 관련

[database](../entities/database.md) · [supabase-projects](../entities/supabase-projects.md) · [privacy-rules](../concepts/privacy-rules.md)
