---
okf_version: "0.2"
---

# 부팅(Booting) 위키

이혼·사별한 부모님의 새 인연을 **자녀가 대신 소개**하는 매칭 서비스의 지식 베이스다.
처음이면 이 순서로 읽는다: [핵심 아이디어](concepts/child-driven-matching.md) → [제품 원칙](concepts/product-principles.md) → [타임라인](timeline.md) → [미결 사항](open-questions.md).

규약은 [schema.md](schema.md), 범위는 [INSTRUCTIONS.md](INSTRUCTIONS.md), 작업 기록은 [log.md](log.md).

## 지금 상태 한 줄 (2026-09-11)

앱·서버·DB 는 에뮬레이터에서 끝까지 돈다 (등록 → 추천 → 관심 → 대화 → 부모님께 카톡 공유 → 부모님 웹에서 결정 → 매칭 → 연락처).
배포는 **도메인이 없어 멈춰 있다** — EC2 가이드·워크플로·운영 Supabase 프로젝트까지 준비됐고 도메인만 남았다. 자세히는 [open-questions.md](open-questions.md).

## 종합

| 페이지 | 한 줄 |
|---|---|
| [timeline.md](timeline.md) | 2026-08-31 PRD 부터 오늘까지, 날짜별 커밋·세션·결정 |
| [open-questions.md](open-questions.md) | 배포 전제(도메인·EC2·운영 DB), 미해결 버그, 문서 간 모순 |
| [concepts/glossary.md](concepts/glossary.md) | 인연/매칭, 대화 연결, 일주, 원석 카드 … 용어 |

## 개념 — [concepts/](concepts/index.md)

| 페이지 | 한 줄 |
|---|---|
| [child-driven-matching](concepts/child-driven-matching.md) | 자녀가 쓰고 부모님이 결정한다. North Star = 실제 만남 완료 건수 |
| [product-principles](concepts/product-principles.md) | PRD 핵심 원칙 7 + 전 기능 공통 제약 6 |
| [two-person-rule](concepts/two-person-rule.md) | 매칭은 양쪽 부모님이 각자 누른 뒤에만. 상호 하트는 '대화 연결' |
| [connection-state-machine](concepts/connection-state-machine.md) | `mutual_heart → chatting → parent_intent → matched / ended`, `matched` 는 종착점 |
| [parent-consent](concepts/parent-consent.md) | 동의는 부모님이 카톡 링크에서 직접. 개인정보보호법 고지 항목, `CONSENT_VERSION` |
| [parent-web-view](concepts/parent-web-view.md) | 부모님은 앱을 받지 않는다. `/p/:token` 서버 렌더 HTML, HMAC 30일 |
| [parent-share-kakao](concepts/parent-share-kakao.md) | 카카오 피드 카드 + **서버 콜백만** 공유 완료를 찍는다 |
| [hearts-and-greeting](concepts/hearts-and-greeting.md) | 관심 = 인사말 작성. 상호 하트 시 첫 메시지로 복사. 2주 만료 |
| [discovery-ranking](concepts/discovery-ranking.md) | 제외 집합은 서버만 계산, 조건 안에서는 궁합 높은 순 |
| [daily-picks](concepts/daily-picks.md) | 하루 6장 원석 카드, 기기 로컬 자정, 직전 6명 제외 |
| [saju-compatibility](concepts/saju-compatibility.md) | 사주팔자 서버 계산, 30~99점, 화면에는 일주·점수 두 값만 |
| [nickname-privacy](concepts/nickname-privacy.md) | 실명은 서버 밖으로 안 나간다. 공개 이름은 별명 |
| [privacy-rules](concepts/privacy-rules.md) | PRD 7장 비공개 표 + DTO·RLS 로 지키는 방법 |
| [verification-account-check](concepts/verification-account-check.md) | 본인인증 → '계정 확인'. 문자 fail-closed, 카카오 연결이 현재 유일한 문 |
| [kakao-login-account-link](concepts/kakao-login-account-link.md) | 카카오 로그인, `sub` 로 계정 연결, 이메일은 못 받는다 |
| [safety-report-block](concepts/safety-report-block.md) | 신고 = 차단. `ended` 인연은 목록에서 빠진다 |
| [notifications-badges](concepts/notifications-badges.md) | 알림 탭 없음, 관심·매칭 탭 민트 배지, `conversation_reads` |

## 실체 — [entities/](entities/index.md)

| 페이지 | 한 줄 |
|---|---|
| [monorepo](entities/monorepo.md) | Turborepo + pnpm, apps/mobile·server·webview, 버전 |
| [mobile-app](entities/mobile-app.md) | Expo SDK 54 / Router v6, 라우트·feature·shared 지도 |
| [server](entities/server.md) | NestJS 11 모듈 15개, 엔드포인트, 공개 표면(`/p`, `/consent`, `/api/kakao/share-callback`) |
| [database](entities/database.md) | Supabase 테이블·마이그레이션 20개·RLS 원칙 |
| [supabase-projects](entities/supabase-projects.md) | 개발 `ifkazhqwjbtxkmppsedi`, 운영 `vyiauclgelpuxitsoeii`(booting-prod) |
| [kakao-developers](entities/kakao-developers.md) | 네이티브 키, 공유 콜백, 로그인/OIDC, 비즈니스 앱 제약 |
| [design-system](entities/design-system.md) | 민트 팔레트, 토큰, 원석 카드, 워드마크 |
| [scripts-and-tooling](entities/scripts-and-tooling.md) | seed-demo, smoke-api, db-migrate, dev-up, ensure-emulator |
| [deploy-infra](entities/deploy-infra.md) | GHCR → SSH → docker compose + Caddy. EC2 가이드 |
| [windows-dev-environment](entities/windows-dev-environment.md) | 경로·JDK·Gradle 홈·MAX_PATH·에뮬레이터 |
| [shippen-pipeline](entities/shippen-pipeline.md) | auto mode 파이프라인, 이 머신에서 죽어 있는 것 |
| [webview](entities/webview.md) | Vite 앱 — 법적 고지·도움말 페이지, 부모님 화면은 아니다 |
| [hermes-discord-bot](entities/hermes-discord-bot.md) | 소유자가 붙인 Hermes Agent 디스코드 봇 (앱 밖 도구) |

## 결정 — [decisions/](decisions/index.md)

31건. 최근 것: [2026-09-11 직전 6명 제외](decisions/2026-09-11-exclude-previous-daily-picks.md) ·
[2026-09-10 탭 헤더 로고](decisions/2026-09-10-tab-header-logo-no-back.md) ·
[2026-09-09 사주 무료 MVP](decisions/2026-09-09-saju-free-in-mvp.md) ·
[2026-09-08 부모님은 웹으로](decisions/2026-09-08-parent-web-not-app.md).

## 교훈 — [lessons/](lessons/index.md)

| 페이지 | 한 줄 |
|---|---|
| [windows-build-gotchas](lessons/windows-build-gotchas.md) | 비ASCII 경로, MAX_PATH 260, prefab LF 배치 버그 |
| [emulator-and-adb](lessons/emulator-and-adb.md) | 검은 스크린샷, 창 위치 y=-661, 시리얼, 잠듦 |
| [metro-and-dev-servers](lessons/metro-and-dev-servers.md) | Metro 가 죽는 이유들, 터널 주소 갱신, 메모리 |
| [kakao-integration-gotchas](lessons/kakao-integration-gotchas.md) | KOE004, 키 해시, 도메인 등록, 버튼 규칙, 3초 웹훅 |
| [supabase-and-migrations](lessons/supabase-and-migrations.md) | MCP 없이 Management API, CHECK 대신 trigger, RLS 문 |
| [powershell-and-claude-code-gotchas](lessons/powershell-and-claude-code-gotchas.md) | 인코딩, here-string, 분류기 차단, 백그라운드 작업 |
| [collaboration-notes](lessons/collaboration-notes.md) | 소유자와 일하는 방식 — 확인 순서, 표현 해석 |

## 소스 — [sources/](sources/index.md)

원본 목록과 각 소스가 무엇을 말하는지. 세션 5건 + 이동 전 세션 2건, 커밋 107개, 기준 문서, `claude-mem`(비어 있음).
