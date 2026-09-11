---
type: Entity
title: 데이터베이스 (Supabase Postgres)
description: 마이그레이션 20개로 만든 스키마 — 초기 21테이블 + 대화 읽음·공유·소셜 신원·부모님 세션/관심 등. RLS 는 2차 방어선. 시간 규칙은 run_maintenance() 한 함수.
tags: [entity, db, supabase]
sources:
  - id: migrations
    resource: /supabase/migrations
  - id: data-model
    resource: /docs/features/data-model.md
  - id: arch
    resource: /docs/features/architecture.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 데이터베이스

적용 도구: `.mcp.json` 이 없어 MCP 대신 **Management API** — `node scripts/db-migrate.mjs` (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`). 이력은 `supabase_migrations.schema_migrations`. 정책: **적용된 마이그레이션은 고쳐 쓰지 않는다** — 되돌리는 마이그레이션을 새로 넣는다.

## 마이그레이션 (`supabase/migrations/`)

| 파일 | 무엇 |
|---|---|
| `20260901093000_init_booting_schema` | 테이블 21, enum 11, RLS 정책 30, 인덱스, **비공개 Storage 버킷 2** (사진·증명서). `parent_min_age` 는 CHECK 가 아니라 **trigger** (`current_date` 는 IMMUTABLE 이 아니라 42P17) |
| `20260901094500_seed_regions` | 시·군·구 229 + `region_distance_km(a,b)` 하버사인 |
| `20260901103000_maintenance_function` | `run_maintenance()` — 규칙 3 (60일 비공개, 90일 read-only, 3일 재알림), `pg_try_advisory_lock` |
| `20260901120000_drop_casual_goal` | `relationship_goal` enum 재생성 — `casual` 제거 |
| `20260901150000_add_height` | `height_cm` CHECK 120~220 |
| `20260901170000_heart_message` | `hearts.message` 1~200 |
| `20260901190000_nickname` | `nickname` 2~12, 백필 `left(display_name,1)||repeat('O',…)` |
| `20260902110000_backfill_report_blocks` | 기존 신고에 차단·종료 소급 |
| `20260902120000_conversation_reads` | `(conversation_id, user_id) PK, read_at` |
| `20260902140000_parent_shares` | `(connection_id, user_id) PK, shared_at` |
| `20260902141000_message_kind` | enum `text|system`, `messages.kind` |
| `20260902142000_saved_profiles` | 찜 (화면은 폐지, 테이블은 남음) |
| `20260903090000_parent_access` | `generate_parent_access_code()`, `parent_profiles.access_code` + trigger, `parent_sessions`, `parent_shares.parent_viewed_at`, enum `parent_interest_kind`, **`parent_interests`** |
| `20260903100000_social_identities` | PK `(provider, provider_uid)`, unique `(user_id, provider)`, RLS on·정책 없음 |
| `20260903110000_consent_link` | `consent_method` += `link`; `parent_consents` += `expires_at, consent_version, agreed_ip, agreed_user_agent`; token 인덱스 |
| `20260904020000_numeric_parent_code` | 코드 숫자 8자리로, 기존 코드 재발급 (DB 에만 있던 걸 `52a1f90` 에서 복원) |
| `20260906120000_expire_received_hearts` | `run_maintenance()` 규칙 4 — 14일 지난 미연결 하트 삭제 |
| `20260908100000_phone_verification_codes` | 인증번호 해시·만료·시도 컬럼 4개. **번호 유니크 인덱스 + 스텁 인증 비우기는 파일 안 주석 SQL — 배포 직전 실행** |
| `20260909120000_discovery_saju_sort` → `20260909170000_drop_discovery_saju_sort` | 정렬·최소 궁합 컬럼 추가 후 되돌림 |

## 테이블 (역할별)

- **사용자·인증**: `auth.users`(자녀), `child_verifications`(phone_verified_at, 코드 해시…, `family_doc_*` 는 과거 기록), `social_identities`
- **프로필**: `parent_profiles`(display_name·nickname·gender·birth_date·region_code·marital_status·height_cm·…·status·last_active_at·access_code), `parent_photos`, `parent_consents`, `saju_infos`(calendar_type, birth_time, birth_time_unknown, **is_public 항상 false**), `relationship_goals`, `profile_reviews`, `regions`
- **추천·관심**: `discovery_filters`, `hearts`(unique sender+target, message), `passes`, `saved_profiles`
- **인연**: `connections`(status, ended_reason), `conversations`, `conversation_reads`, `messages`(kind), `parent_shares`, `parent_interests`, `parent_sessions`
- **만남(API 전용)**: `parent_intents`, `meetings`, `meeting_confirmations`, `meeting_feedbacks`(RLS 작성자만)
- **안전·알림**: `blocks`, `reports`, `notifications`

## enum

`marital_status(bereaved|divorced)`, `profile_status(draft|consent_pending|review|published|hidden|rejected)`, `relationship_goal(remarriage|serious|travel_hobby|same_sex_friend|meal_walk|undecided)`, `connection_status`(7), `parent_intent_kind`, `meeting_feedback_kind`, `message_kind`, `consent_method(sms|in_person|link)`, `parent_interest_kind`. 표시 문구는 저장하지 않고 코드값만 — 문구는 모바일 config.

## 함수·트리거

| 이름 | 무엇 |
|---|---|
| `run_maintenance()` | 규칙 4: 미활동 60일 → hidden(TODO-11) / matched 90일 → conversation read-only(TODO-12) / 만남 확인 3일 재알림 / 미연결 하트 14일 삭제. 상태 변경과 알림 insert 를 한 문장에. 서버 `maintenance` 모듈이 10분마다 호출 |
| `region_distance_km(a, b)` | 대표 좌표 하버사인 |
| `generate_parent_access_code()` | 숫자 8자리 (6자리 100만 가지는 무작위 대입에 열린다) |
| `enforce_parent_min_age` | 만 50세 trigger |

## RLS 원칙

소유자 전체 / 타인은 `published` 만 select / 참여자 2인 (connections·messages) / 작성자만 (feedbacks) / **정책 없음 = 서버 전용** (social_identities) / `saju_public_read` 는 `is_public` 이 열지만 서버가 항상 false 를 쓴다. 서버는 service-role 로 RLS 를 지나가므로 **쿼리의 `userId` where 가 1차 방어**다.

## 시드 (`scripts/seed-demo.mjs`)

개발 프로젝트에 부모님 프로필 23+ (남 13 / 여 11, 52~72세, 서울 9구·경기 2·인천 1, 짧은 별명, 색 실루엣 아바타 3장, 실제 인물 사진 없음), demo 계정, `--heart-me`(이성만), `--scenarios`(대화 연결/대화 중/매칭), `--partner-intent`, `--reset-feed`, `--diagnose`, `--clean`. 사주 보정값은 22/27 공개 프로필에 (5명은 폴백 경로 검증용으로 비움).

## 관련

[supabase-projects](supabase-projects.md) · [supabase-and-migrations](../lessons/supabase-and-migrations.md) · `docs/features/data-model.md`
