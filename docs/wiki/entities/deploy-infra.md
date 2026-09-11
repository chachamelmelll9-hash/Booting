---
type: Entity
title: 배포 인프라
description: 서버는 GHCR 이미지 → SSH → docker compose + Caddy(자동 HTTPS). 업체 중립. 목표는 AWS EC2 서울이지만 인스턴스도 도메인도 아직 없다. 웹뷰는 Cloudflare Pages 예정, 앱은 로컬 빌드 → 스토어.
tags: [entity, infra, deploy]
sources:
  - id: workflow
    resource: /.github/workflows/deploy.yml
  - id: guide
    resource: /infra/EC2_GUIDE.md
  - id: c798b4e1
    resource: commit:798b4e1
  - id: c8d2cf5e
    resource: commit:8d2cf5e
  - id: session
    resource: session:beebb230-c0d5-44e2-8b3c-4b26fcc4e1ca
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 배포 인프라

**한 번도 배포된 적이 없다** (`docs/progress/deploys.jsonl` 비어 있음). 준비된 것과 남은 것을 나눈다.

## 서버 — 준비됨

`.github/workflows/deploy.yml` (`main` 에 `apps/server/**`, `packages/supabase/**`, lockfile, `infra/**` 가 바뀌면):

1. `ci` — `pnpm turbo run typecheck lint test --filter=…/server...`
2. `build-and-deploy` — GitHub Secrets `DEPLOY_HOST` / `DEPLOY_SSH_USER` / `DEPLOY_SSH_KEY` 셋 중 하나라도 없으면 **경고만 남기고 성공으로 끝난다** (배포가 조용히 건너뛴다 — 알아채기 어렵다)
3. buildx `linux/amd64` → `ghcr.io/<owner>/booting-server:latest`
4. `appleboy/ssh-action` → VM `~/app` 에서 `docker compose pull && up -d --force-recreate` → `curl /api/health` 12회×5초

`infra/oracle/` (이름만 Oracle — Ubuntu + Docker + Caddy + ufw 라 어디서든 같다): `setup.sh`(VM 부트스트랩), `docker-compose.yml`(`SERVER_IMAGE`), **`Caddyfile`** — `{$SERVER_DOMAIN::80}`: `SERVER_DOMAIN` 없으면 `:80` HTTP 만(개발 확인용), 있으면 그 도메인 + Let's Encrypt 자동. `.env.example` 은 [server](server.md) env 표.
`infra/EC2_GUIDE.md`: 인스턴스 → Elastic IP → `setup.sh` → compose/Caddyfile 업로드 → `.env` → Secrets 등록 → 도메인/HTTPS.

> 가이드의 "t3.micro 12개월 무료" 는 **이 계정에 맞지 않는다** — 크레딧 $100/182일 방식이다 (아래).

## 서버 — 남은 것

| # | 무엇 | 메모 |
|---|---|---|
| 1 | **도메인** | 09-11 권고: 무료 서브도메인(DuckDNS)은 부모님이 카톡에서 여는 링크로 부적합. **Cloudflare Registrar `.com`**(연 ~$10.4, 갱신가 동일) 또는 `.co.kr`. **루트 도메인을 EC2 에** — 부모님 링크가 `api.booting.com/p/…` 이 되지 않게(`.env.example` 기본값 `api.` 는 바꿀 것). Cloudflare DNS 는 **DNS only(회색)** — 프록시를 켜면 Caddy 의 인증서 발급이 꼬인다. 소유자 "고민좀해볼게" |
| 2 | **EC2** | 서울 `ap-northeast-2`(가입은 시드니로 됐음 — 바꿀 것), Ubuntu 24.04, **`t4g.micro`(ARM, 월 ~$6)** 권고 → 워크플로 `platforms: linux/arm64` 한 줄. 20GB. Elastic IP(**공인 IPv4 월 ~$3.6 과금** — "붙어 있으면 무료" 는 옛 정책). 준비 전에 켜면 크레딧만 축난다 |
| 3 | AWS 계정 조건 | **크레딧 $100, 182일**. 소진·만료 시 청구가 아니라 **중단**. 6개월 뒤 월 $11~16 실청구 → 그때 Railway($5)/Oracle 로 옮기는 선택지 (Dockerfile 이라 30분) |
| 4 | Secrets 3개 + VM `.env` | `.pem` 은 채팅에 붙이지 말고 Secrets 에 직접 |
| 5 | `PUBLIC_BASE_URL` = `https://<도메인>`, 카카오 콘솔 도메인·콜백 URL 교체 | |

## 검토했다가 버린 것 (09-09)

| | 왜 아니었나 |
|---|---|
| cloudflared 터널(지금) | PC 프로세스에 묶임. PC 끄면 모든 부모님 링크가 동시에 죽고, 재시작하면 주소가 바뀐다 |
| Vercel | 서버리스 — `setInterval` 유지보수 루프가 살 자리가 없고, Dockerfile 을 못 받고, 부모님 웹이 매번 콜드스타트, Hobby 는 비상업 |
| Render 무료 | 15분 무접속 시 잠듦 — 부모님이 링크 눌렀을 때 30초 하얀 화면 |
| Railway $5 | 가장 간단(Dockerfile 그대로). 무료가 아니라 보류 |
| Oracle Always Free | 가입이 카드/리전에서 계속 실패. 되더라도 ARM 용량 부족 잦음 |
| Lightsail Containers $7 | 도메인 없이 HTTPS 주소를 주지만 유료 |

## 웹뷰

`apps/webview` → Cloudflare Pages (`provision-cloudflare.sh`, `.github/workflows/deploy-webview.yml`). 미프로비저닝. 주소가 정해지면 `CORS_ORIGINS`·`EXPO_PUBLIC_WEBVIEW_URL`.

## 앱

- **로컬 빌드만.** `pnpm build:android` → AAB (09-07 첫 성공, arm64 포함). EAS Build 금지.
- 스토어: `play-store.mjs upload`, Play 서비스 계정 없음, `store-declarations.yaml` 사업자 항목 TODO. iOS 는 macOS 필요.
- OTA: `pnpm update` (`expo-updates`, `__EAS_PROJECT_ID__` 플레이스홀더 — `npx eas-cli init` 으로 ID 만 발급).
- 릴리스 키스토어: `apps/mobile/release.jks` + `keystore.properties`(gitignore, preflight 가 생성) — **카카오 키 해시 미등록**.

## 관련

[결정 AWS](../decisions/2026-09-09-aws-ec2-vendor-neutral-deploy.md) · [supabase-projects](supabase-projects.md) · [open-questions](../open-questions.md)
