---
type: Entity
title: 스크립트와 개발 도구
description: scripts/ 의 실제 쓰임 — 시드·스모크·마이그레이션·개발 스택·에뮬레이터·빌드. 무엇을 먼저 돌려야 하고 무엇이 이 머신에서 안 도는지.
tags: [entity, tooling]
sources:
  - id: scripts
    resource: /scripts
  - id: c0d71644
    resource: commit:0d71644
  - id: c70f70f2
    resource: commit:70f70f2
  - id: c1c56708
    resource: commit:1c56708
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 스크립트와 개발 도구

## 매일 쓰는 것

| 스크립트 | 무엇 | 메모 |
|---|---|---|
| `scripts/dev-up.ps1` / `dev-down.ps1` | Metro(8081)·API(3000)·cloudflared 터널을 **독립 프로세스**로 띄우고 `logs/` 에 남기며 `adb reverse` 를 건다 | 에이전트 세션의 백그라운드로 띄우면 세션 정리 때 같이 죽는다(`70f70f2`). **터널 주소를 출력만 하고 `PUBLIC_BASE_URL` 은 안 고친다** — 매번 손으로. UTF-8 BOM 필수(PS 5.1) |
| `scripts/ensure-emulator.sh` (`.ps1`) | 에뮬레이터 준비의 **유일한 경로**: 소프트웨어 렌더링, 화면 깨우기·**안 잠들게**(배터리 AC 고정, `4ec206e`), AVD 락, 프로세스 분리, 포트 리버스 8081/3000/4200/54321. `ANDROID_SERIAL` 로 대상 지정, `--restart` | 여러 대일 때 시리얼·`--restart` 버그 수정 `1c56708`. 직접 `emulator` 를 띄우지 않는다 |
| `scripts/seed-demo.mjs` | 시드 프로필 23+ 생성/갱신(공개된 프로필도 PATCH), `--clean`, `--reset-feed`(demo 의 하트·넘김·인연·상대 하트 삭제), `--heart-me`(이성 시드가 demo 에게 하트, 8/12 인사말), `--scenarios`(대화 연결/대화 중/매칭 인연 실제 API 로), `--partner-intent`, `--heart <email>`, **`--diagnose`**(dev-login 으로 붙어 프로필/필터/추천/하트를 서버에서 재현 — "앱 문제 vs 서버 문제" 를 한 번에 가른다) | 계정은 service-role admin API 로 만든다(공개 가입은 rate limit). 도메인 `@seed.booting.app`. 데모 비밀번호는 `.launch-demo-account`(gitignore) |
| `scripts/smoke-api.mjs` | 관통 검사 71+ (E2E-01 + SEC.1~4, IDOR, 동성친구, 사진 최소, 인사말, 한쪽 확인 ≠ matched, 목록 제외…) | 서버 켜고 돈다 |
| `scripts/db-migrate.mjs` | `supabase/migrations/*.sql` 순서 적용 (Management API `POST /v1/projects/{ref}/database/query`), `--status`, `--only <file>`, `--sql "<query>"` | `SUPABASE_ACCESS_TOKEN` env 필요, `SUPABASE_PROJECT_REF` 로 대상 선택. **DB 쓰기는 분류기가 막아 소유자가 `!` 로 돈다** |

## 빌드·스토어

| 스크립트 | 무엇 | 이 머신 |
|---|---|---|
| `scripts/build-android.sh` (`pnpm build:android`) | 릴리스 AAB — 한글 홈이면 Gradle 홈·TEMP 를 ASCII 로 옮긴다(`5a8ed05`) | ✅ 09-07 64.8MB |
| `scripts/build-ios.sh`, `submit-ios.sh`, `app-store.mjs`, `setup-apple-auth.sh` | iOS | ❌ Xcode 없음 |
| `scripts/play-store.mjs` | Play 업로드/상태 | 서비스 계정 없음 |
| `scripts/upload-images.mjs` | 스토어 이미지 | |
| `scripts/branding.sh`, `initial-setup.sh` | 템플릿 치환(이미 끝남) | |

## 인프라

| 스크립트 | 무엇 |
|---|---|
| `scripts/setup-deploy.sh` → `provision-oracle.sh` + `provision-cloudflare.sh` | Oracle VM + Cloudflare Pages 프로비저닝 (시크릿 이름은 `DEPLOY_*` 로 맞춤). Oracle 가입이 안 돼 미사용 |
| `scripts/provision-supabase.sh` | Supabase 클라우드 프로젝트 + env (08-31 사용) |
| `.github/workflows/deploy.yml` | [deploy-infra](deploy-infra.md) |

## 파이프라인

`scripts/run-auto.sh`(supervisor), `doctor-skills.sh`, `test-pipeline.sh`(4개 중 python3 기반 2개는 이 머신의 python3 가 Windows Store 스텁이라 실행 불가) — [shippen-pipeline](shippen-pipeline.md).

## 위키

| 스크립트 | 무엇 |
|---|---|
| `scripts/wiki-extract-sessions.mjs <세션 dir> <out dir>` | Claude Code jsonl → user/assistant 텍스트 마크다운 (tool_result·thinking 제외). `*.user.md` 는 사용자 발화만 |
| `scripts/wiki-lint.mjs` | `docs/wiki` 의 깨진 상대 링크·frontmatter `type` 누락·고아 페이지 |
| `scripts/link-wiki.ps1` | `apps/wiki` → `docs` 정션 생성 (Obsidian 볼트) |

## 계정·데이터 다루기

- 개발 로그인: `demo@seed.booting.app`(등록 완료) / 로그인 화면 `새 계정`(`?fresh=1`, 매번 새로). 비밀번호는 저장소 밖.
- 시드를 다시 만들면 **로그인 중인 계정을 지우지 말 것** — JWT 는 서명이 맞으면 통과해 모든 쓰기가 500 났다 (→ `DomainExceptionFilter` 가 401 로 바꿔 로그아웃시킴, `c108038`).
- `--reset-feed` 는 인연과 상대 하트까지 지운다 — 하트만 지우면 이미 인연인 사람이 추천에 다시 떠 중복 하트로 거부되는 카드가 박힌다.

## 관련

[windows-dev-environment](windows-dev-environment.md) · [emulator-and-adb](../lessons/emulator-and-adb.md) · [metro-and-dev-servers](../lessons/metro-and-dev-servers.md)
