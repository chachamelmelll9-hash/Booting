---
type: Entity
title: Supabase 프로젝트 (개발 / 운영)
description: 개발 ifkazhqwjbtxkmppsedi 는 08-31 부터 시드 데이터로 쓰고 있다. 운영 booting-prod(vyiauclgelpuxitsoeii) 는 09-09 에 만들었지만 마이그레이션 적용·Auth 설정·비밀번호 재설정이 남았다.
tags: [entity, supabase, infra]
sources:
  - id: preflight
    resource: /docs/progress/preflight.json
  - id: session
    resource: session:beebb230-c0d5-44e2-8b3c-4b26fcc4e1ca
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# Supabase 프로젝트

| | 개발 | 운영 |
|---|---|---|
| ref | `ifkazhqwjbtxkmppsedi` | `vyiauclgelpuxitsoeii` |
| 이름 | (preflight 가 생성) | `booting-prod` |
| 리전 | ap-northeast-2 (서울) | ap-northeast-2 |
| 만든 때 | 2026-08-31 `/preflight` (`provision-supabase.sh`) | 2026-09-09 10:54 Management API (`logs/sb-create.mjs`) |
| 데이터 | 시드 계정 38, 공개 프로필 27, 인연·하트 테스트 데이터 | **비어서 시작** — 시드를 옮기지 않는다. 실제 어르신 프로필과 테스트가 섞이면 분리할 수 없고, 시드 프로필에 실제 사용자가 하트를 보내게 된다 |
| 마이그레이션 | 20개 적용 | **적용 여부 미확인.** 09-09 에 18개 PENDING 상태에서 소유자에게 `$env:SUPABASE_PROJECT_REF='vyiauclgelpuxitsoeii'; node scripts/db-migrate.mjs` 를 부탁했고, 그 뒤 대화가 사주로 넘어갔다. 이후 사주 마이그레이션 2개는 개발에만 적용됐다 |
| Auth 설정 | 이메일 확인 **켜짐**(API 가입 시 세션이 안 나온다), 카카오 provider on (`client_id` = 네이티브 키, `email_optional`) | 대시보드 설정은 자동으로 안 넘어간다: 이메일 확인 on/off 결정, Redirect URL `booting-mobile://reset-password`, 카카오 provider (폴백 로그인에 필요) |
| Storage | 비공개 버킷 2 (init 마이그레이션이 만든다) | 마이그레이션에 포함 |
| 접근 | MCP 는 **사용자 스코프**(`.mcp.json` 없음 — 중복 등록을 피하려 의도적으로), 키는 `SUPABASE_ACCESS_TOKEN` env + Management API | 같음 |

## 운영 프로젝트에서 해야 할 것 (순서)

1. **DB 비밀번호 재설정** — 생성 시 비밀번호가 09-09 세션 대화에 평문으로 찍혔다. 이 위키는 그 값을 옮기지 않는다.
2. `node scripts/db-migrate.mjs --status` 로 20개 PENDING 확인 → 적용.
3. 배포 직전 SQL (`20260908100000` 주석) — 운영은 스텁 인증이 없으니 인덱스만.
4. Auth: 이메일 확인 여부, Redirect URL, 카카오 provider.
5. `apps/server` 운영 `.env` 의 `SUPABASE_URL/ANON_KEY/SECRET_KEY` 를 이 프로젝트 값으로.

## 무료 플랜 메모

09-09 조회 때 조직에 활성 프로젝트가 이미 2개였다(무료 플랜 활성 2개 제한). 세 번째가 생성됐으니 하나는 일시중지 상태였거나 플랜이 다르다 — 대시보드에서 확인.

## 관련

[database](database.md) · [server](server.md) env · [결정](../decisions/2026-09-09-supabase-prod-project.md) · [open-questions](../open-questions.md)
