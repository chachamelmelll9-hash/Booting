---
type: Entity
title: 웹뷰 앱 (apps/webview)
description: 앱 안 WebView 로 여는 Vite React 페이지 — 도움말·FAQ·약관·회사 정보. 부모님이 보는 웹(/p)이 아니다. 배포지(Cloudflare Pages)와 법적 고지 본문은 미완.
tags: [entity, webview]
sources:
  - id: src
    resource: /apps/webview/src
  - id: auth-arch
    resource: /docs/auth-architecture.md
  - id: guard
    resource: /docs/webview-login-guard.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 웹뷰 앱

혼동 주의: **부모님 웹(`/p/:token`, `/consent/:token`)은 서버(NestJS)가 HTML 을 직접 그린다.** 이 `apps/webview` 는 자녀 앱의 `내 정보` 하위 화면이 WebView 로 여는 정적 프론트다. "페이지 둘 때문에 웹앱을 따로 띄우고 카카오 콘솔에 도메인을 하나 더 등록할 이유가 없다" (`aae19f6`) — 부모님 화면을 여기에 두지 않은 이유.

## 구조 (`src/`)

- `app/` — `routes.tsx`, `PageLayout`, `UnauthorizedPage`
- `features/session/` — 브리지(`postMessage`)로 앱에서 access token 을 받는다. **웹뷰는 소비자**: 토큰을 쓰기만 하고 갱신·401 판단은 앱이 한다 (`docs/auth-architecture.md`). `SessionGuard`, `docs/webview-login-guard.md`
- `features/loading/` — 오버레이
- `pages/legal/SupportPage`, `pages/profile/app-info/{Agreement,Company}Page`, `pages/profile/help/{Faq,Guide,Notice,Policy}Page` — 템플릿 본문. 부팅 문구로 채우는 것은 `/launch` 의 일(법적 문서 생성) — 미실행
- `shared/api/server.ts` — `VITE_SERVER_URL`

## env·포트

`VITE_SERVER_URL`, `VITE_SUPABASE_URL`(에뮬레이터 안에서 실행되므로 `10.0.2.2`). 개발 포트 4200 (`pnpm dev:webview`). 앱의 `EXPO_PUBLIC_WEBVIEW_URL` 이 가리킨다.

## 계획 (page-map 37~40)

`/privacy` 개인정보 처리방침(PRD 15장), `/terms` 이용약관(14장), `/support`, `/safety` 안전 가이드(앱 배너의 "자세히 보기" 목적지). 배포지 Cloudflare Pages(`provision-cloudflare.sh`) 미프로비저닝. 스토어 심사에 처리방침 URL 이 필요하므로 도메인·배포와 함께 풀린다.

## 관련

[server](server.md) · [deploy-infra](deploy-infra.md) · [parent-web-view](../concepts/parent-web-view.md)
