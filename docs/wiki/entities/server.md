---
type: Entity
title: 서버 (apps/server)
description: NestJS 11. /api/* 는 Supabase JWT 가드, 그 밖에 인증 없는 공개 표면 셋 — 부모님 웹 /p/*, 동의 페이지 /consent/*, 카카오 콜백. 모듈 15개, 유지보수 루프, 사주 엔진.
tags: [entity, server, nestjs]
sources:
  - id: appmodule
    resource: /apps/server/src/app/app.module.ts
  - id: page-map
    resource: /docs/features/page-map.md
  - id: envex
    resource: /infra/oracle/.env.example
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 서버

`@nestjs/core ^11`, `@supabase/supabase-js ^2.89`(service-role 클라이언트), `jose ^6`(JWKS 검증), `@nestjs/throttler ^6.4`, `korean-lunar-calendar ^0.4`. webpack 번들 → `dist/main.js`. 포트 3000. `Dockerfile` 있음.

## 모듈 (`app.module.ts` 순서)

| 모듈 | 책임 | 핵심 파일 |
|---|---|---|
| `supabase` | service-role 클라이언트 | |
| `auth` | JWT 가드(Supabase JWKS), 이메일 로그인/가입/갱신, **dev-login**, **카카오 resolve/link** | `auth.guard.ts`, `kakao-link.service.ts`, `user.decorator.ts` |
| `common` | `privacy.ts`(`maskName`,`calcAge`,`excerpt`,`formatRegion`,`nicknameLeaksRealName`), `DomainExceptionFilter`(FK `user_id` 위반 → 401 `token_invalid`) | |
| `regions` | 시군구 229, `codesWithin(origin, radius)` | |
| `notifications` | 알림 발행·조회 (별명은 조회 시점에 푼다) | |
| `verification` | 계정 확인 — 문자 코드(해시), `SmsService`(fail-closed), `phoneAvailable`, `kakaoLinked` | `sms.service.ts` |
| `parent-profile` | 프로필 CRUD·사진 경로·**동의 링크/페이지**·검수·공개·사주 보정값 | `consent.service.ts`, `consent-page.controller.ts`, `consent-document.ts` |
| `saju` | 사주팔자·궁합 엔진, `pillarsFor(profileIds)` 폴백 | `lib/{ganji,solar-terms,pillars,compatibility}.ts` |
| `discovery` | 후보·제외 집합·필터·**궁합 순 정렬**, `toItems`(공개 DTO 단일 지점) | `discovery.repository.ts` |
| `hearts` | 하트·넘김, **상호 하트 판정 → connection 생성**, 인사말 이관, 받은 관심(`hiddenSenderIds`) | |
| `connections` | 목록(ended·차단 제외)·`unread-count`·메시지·나가기·`share-token`·**`KakaoShareController`**·`markParentShare` | `kakao-share.controller.ts` |
| `meetings` | 일정·확인·피드백 API (앱 동선 밖), `match.service.ts` 는 옛 매칭 지점 | |
| `safety` | 신고(=차단)·차단·신고 내역 | |
| `parent` | **부모님 웹 렌더**(`/p/*`)·`recordInterest`/`recordDecline`(매칭 판정)·옛 `/api/parent/*` 코드 로그인(앱 화면은 삭제, 서버는 유지) | `parent-view.controller.ts`, `parent.guard.ts` |
| `maintenance` | `setInterval` 10분(기본) → `run_maintenance()` (DB 함수, advisory lock) | `MAINTENANCE_INTERVAL_MS`, `MAINTENANCE_DISABLED` |

`ThrottlerGuard` 전역. `assets/` 는 비어 있다.

## 표면

| 경로 | 인증 | 무엇 |
|---|---|---|
| `GET /api`, `GET /api/health` | 없음 | liveness / readiness(Supabase 연결). **게이트는 `/api`** — 루트 `/` 는 항상 404 |
| `POST /api/auth/login|signup|refresh|logout|reset-password` | 없음 | 템플릿 인증 (`docs/auth-architecture.md`) |
| `POST /api/auth/dev-login` | 없음, **production 403** | 개발 즉시 로그인 |
| `POST /api/auth/kakao/resolve`, `GET/POST/DELETE /api/auth/kakao/link` | resolve 는 없음(throttle), link 는 JWT | [kakao-login-account-link](../concepts/kakao-login-account-link.md) |
| `/api/me/verification*` | JWT | 계정 확인 |
| `/api/parent-profile*` (+`/consent`, `/consent/revoke`, `/submit`, `/visibility`, `/photos`) | JWT | 프로필 |
| `GET /consent/:token`, `POST /consent/:token/agree` | **없음** (`/api` prefix 제외) | 동의 페이지 |
| `GET /api/discovery`, `GET/PUT /api/discovery/filters`, `GET /api/profiles/:id` | JWT | 추천 |
| `POST /api/hearts`, `GET /api/hearts/received`, `POST /api/passes` | JWT | |
| `GET /api/connections`, `/unread-count`, `/:id`, `/:id/messages`, `/:id/end`, `/:id/share-token`, `/:id/parent-share`(dev) | JWT | |
| `POST|GET /api/kakao/share-callback` | **없음, HMAC `t`** | [parent-share-kakao](../concepts/parent-share-kakao.md) |
| `GET /p/:token`, `/p/:token/all`, `/p/:token/c/:id`, `POST …/interest`, `GET|POST …/decline` | **없음, 링크 서명** | [parent-web-view](../concepts/parent-web-view.md) |
| `/api/connections/:id/meeting*`, `/feedback` | JWT | 앱 동선 밖 |
| `/api/reports`, `/api/blocks` | JWT | |
| `/api/notifications` | JWT | |
| `/api/parent/*` | `ParentGuard`(`parent_sessions`) | 앱 부모님 화면용 — 지금 호출자 없음 |

## 지키는 규칙

- 모든 서비스 조회에 `userId` where (IDOR). RLS 는 2차.
- 공개 DTO 는 `DiscoveryService.toItems` 한 곳에서 만든다 — 실명·생년월일·연락처 없음.
- 상태 전이는 `ConnectionsService.setStatus` 를 거친다. `matched` 는 종착.
- 서버는 한글 표시 문구를 만들지 않는다 (예외: 부모님 웹 HTML — 서버 렌더라 천간·지지 표가 한 벌 더 있다).
- 개발 전용 경로는 `NODE_ENV === 'production'` 이면 403.

## env (운영 `infra/oracle/.env.example` 기준)

| 값 | 비면/바뀌면 |
|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | 서버가 안 뜬다 |
| `SUPABASE_SECRET_KEY` | service_role. **공유 링크·인증번호 해시의 서명 비밀** — 바꾸면 보낸 링크 전부 무효 |
| `PUBLIC_BASE_URL` | 부모님 링크(`/p`, `/consent`)의 바깥 주소. 비면 `public_url_missing`, 바뀌면 카톡방의 링크가 죽는다. **https·고정 도메인** |
| `CORS_ORIGINS` | 웹뷰 출처 |
| `KAKAO_NATIVE_APP_KEY` | 카카오 id_token `aud` 검증. 비면 계정 확인 불가 → 아무도 등록 못 함 |
| `SMS_PROVIDER` | 없음 = 문자 인증 fail-closed + 화면 감춤 |
| `NODE_ENV`, `PORT`, `MAINTENANCE_*` | |
| (개발) `SUPABASE_ACCESS_TOKEN` | Management API — `scripts/db-migrate.mjs` 용, 코드는 안 읽는다 |

## 테스트

spec 5 (`auth.guard`, `auth.service`, `saju/lib` ×3 — 25건), `scripts/smoke-api.mjs` 71+ 관통 검사(계정은 admin API 로 만든다), `apps/server-e2e`. 개발 실행은 `pnpm build:dev` + `node dist/main.js` 또는 `scripts/dev-up.ps1`.

## 관련

[database](database.md) · [deploy-infra](deploy-infra.md) · 초기 설계 `docs/features/architecture.md`(모듈 9개 시절)
