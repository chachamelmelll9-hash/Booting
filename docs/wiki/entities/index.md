# 실체

코드·인프라·도구·환경. 경로와 버전을 적는다. "왜" 는 [concepts/](../concepts/index.md), [decisions/](../decisions/index.md).

## 코드

| 페이지 | 한 줄 |
|---|---|
| [monorepo](monorepo.md) | Turborepo + pnpm 10, apps 5 · packages 3, 품질 게이트 |
| [mobile-app](mobile-app.md) | Expo SDK 54 · RN 0.81.5 · Router v6. 라우트·feature 13·shared/ui 31 |
| [server](server.md) | NestJS 11 모듈 15. `/api/*` 와 공개 표면(`/p`, `/consent`, 콜백) |
| [database](database.md) | Supabase Postgres. 마이그레이션 20, 함수 4, RLS |
| [webview](webview.md) | Vite React — 도움말·법적 고지 페이지. 부모님 웹이 아니다 |
| [design-system](design-system.md) | 민트 팔레트·토큰·원석 카드·워드마크 |

## 외부 서비스

| 페이지 | 한 줄 |
|---|---|
| [supabase-projects](supabase-projects.md) | 개발 `ifkazhqwjbtxkmppsedi` / 운영 `vyiauclgelpuxitsoeii` |
| [kakao-developers](kakao-developers.md) | 앱 키, 플랫폼, 공유 콜백, 로그인·OIDC, 비즈니스 앱 한계 |
| [deploy-infra](deploy-infra.md) | GHCR → SSH → docker compose + Caddy. AWS EC2 (미생성), 도메인(미정) |

## 도구·환경

| 페이지 | 한 줄 |
|---|---|
| [scripts-and-tooling](scripts-and-tooling.md) | seed·smoke·db-migrate·dev-up·ensure-emulator·build |
| [windows-dev-environment](windows-dev-environment.md) | 이 머신의 경로·JDK·Gradle·AVD·메모리 |
| [shippen-pipeline](shippen-pipeline.md) | 템플릿의 auto 파이프라인과 여기서 죽어 있는 부분 |
| [hermes-discord-bot](hermes-discord-bot.md) | 소유자 PC 의 Hermes Agent 디스코드 봇 (앱 밖) |
