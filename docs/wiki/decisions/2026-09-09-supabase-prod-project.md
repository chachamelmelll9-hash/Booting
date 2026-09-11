---
type: Decision
title: 운영 Supabase 프로젝트를 새로 만든다
description: 개발 프로젝트에는 시드 계정 38개와 테스트 프로필이 있다. 실제 어르신 프로필과 섞이지 않게 운영용 booting-prod 를 따로 만들었다. 마이그레이션으로 대부분 옮겨지지만 Auth 설정과 적용 자체는 남았다.
tags: [decision, infra, supabase]
sources:
  - id: session
    resource: session:beebb230-c0d5-44e2-8b3c-4b26fcc4e1ca
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 운영 Supabase 프로젝트

## 배경
`.env.production` 을 채우려니 Supabase 운영 프로젝트가 필요했다. (A) 개발 프로젝트를 그대로 — 실제 사용자와 시드가 한 DB 에 섞이고 추천 피드에 `주말엔낚시`·`색소폰5년` 같은 시드가 실제 사용자에게 보인다 / (B) 새 프로젝트. 소유자: "B로 가줘 새 프로젝트 만들어서 옮겨줘".

## 결정
- Management API 로 **`booting-prod`** (`vyiauclgelpuxitsoeii`, 서울) 생성 (09-09 10:54).
- 옮기는 것: 테이블·인덱스·RLS·**Storage 버킷과 정책**·지역 시드 — 전부 마이그레이션 파일에 있다.
- 옮기지 않는 것: **시드 데이터** (그게 B 를 고른 이유). 운영 DB 는 비어서 시작.
- 카카오 로그인의 계정 연결 경로는 서버가 직접 검증하므로 provider 설정 이전이 필수는 아니다 — 다만 폴백(`signInWithIdToken`) 은 필요 ([kakao-login-account-link](../concepts/kakao-login-account-link.md)).

## 남은 것 (미완)
1. 마이그레이션 적용 — 소유자에게 `SUPABASE_PROJECT_REF=vyiauclgelpuxitsoeii node scripts/db-migrate.mjs` 를 부탁한 시점에서 대화가 사주로 넘어갔다. **적용 여부 미확인.**
2. Auth 설정 2개: 이메일 확인(개발은 켜져 있어 API 가입 시 세션이 안 나온다 — 운영에서 켤지 결정), Redirect URL `booting-mobile://reset-password`.
3. **DB 비밀번호 재설정** — 생성 응답의 비밀번호가 세션 대화에 평문으로 남았다.
4. `.env.production`(서버·앱)에 새 URL·키.

## 관련
[supabase-projects](../entities/supabase-projects.md) · [open-questions](../open-questions.md)
