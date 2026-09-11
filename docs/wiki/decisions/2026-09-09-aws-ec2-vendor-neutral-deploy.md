---
type: Decision
title: 서버는 AWS EC2 로, 배포 워크플로는 업체 중립으로
description: Oracle 가입이 계속 실패해 AWS 로. 워크플로가 하는 일은 "GHCR 이미지 + SSH + docker compose" 뿐이라 이름만 바꿨다. Caddy 는 도메인 없이도 뜨게. EC2 는 도메인·env 준비 뒤에 켠다 — 계정이 크레딧 방식이라 켜둔 만큼 깎인다.
tags: [decision, infra, deploy]
sources:
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

# AWS EC2, 업체 중립

## 배경
소유자(09-09): "고정 도메인 어떻게 만드는지 알려줘" → "오라클 가입이안돼" → "vercel은왜안댐" → "aws로해줘 알서잘해줄거라믿엉" → "무료로하고싶어" → "아직 도메인은 없고 우선 1번(EC2)으로 연결해줘 나중에 도메인 줄게".

## 결정
- **EC2** (Oracle 과 같은 구조: Ubuntu + Docker + Caddy). `deploy.yml` 시크릿 `ORACLE_* → DEPLOY_*`, `provision-oracle.sh`·`setup-deploy.sh` 도 함께(워크플로만 바꾸면 이름이 어긋나 배포가 **조용히** 건너뛴다).
- `Caddyfile` 을 `{$SERVER_DOMAIN::80}` — 도메인 없으면 HTTP 만(개발 확인용이라고 파일에 적어 둠), 있으면 자동 HTTPS.
- `infra/EC2_GUIDE.md` — Elastic IP 강조.
- 운영 `.env.example` 에 빠져 있던 `PUBLIC_BASE_URL`·`KAKAO_NATIVE_APP_KEY`·`CORS_ORIGINS` 추가, 각 값에 "비면/바뀌면 무엇이 죽는지" (`8d2cf5e`).

## 정정 (같은 날)
- 소유자 계정은 **크레딧 $100 / 182일** — "12개월 무료" 가 아니다. EC2 는 켜둔 만큼 깎인다(t3.micro 월 ~$16, **t4g.micro 월 ~$11 권고**). 6개월 뒤 실청구 또는 이전.
- **Elastic IP(공인 IPv4) 도 과금** (월 ~$3.6).
- 가입 리전이 시드니 → **서울**로 바꿀 것.
- 그래서 **EC2 는 도메인·`.env.production`·운영 DB 가 준비된 뒤에 켠다.**

## 버린 대안 (근거는 [deploy-infra](../entities/deploy-infra.md))
터널(PC 프로세스) · Vercel(서버리스 — `setInterval` 루프·Dockerfile·콜드스타트·비상업) · Render 무료(15분 잠듦) · Railway $5(무료 아님) · Oracle(가입 실패, ARM 용량) · Lightsail $7.

## 남은 전제
**도메인.** HTTPS 없이는 부모님 카톡 링크·안드로이드 통신이 막힌다. 09-11 권고: Cloudflare Registrar `.com`, 루트 도메인을 EC2 에, DNS only. 소유자 "고민좀해볼게".
