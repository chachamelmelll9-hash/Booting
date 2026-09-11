---
type: Entity
title: 모노레포
description: Turborepo + pnpm 워크스페이스. apps/mobile·server·webview·mobile-e2e·server-e2e, packages/i18n·supabase·webview-bridge. shippen 템플릿에서 분리됐다.
tags: [entity, repo]
sources:
  - id: pkg
    resource: /package.json
  - id: ws
    resource: /pnpm-workspace.yaml
  - id: claude-md
    resource: /CLAUDE.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 모노레포

- 경로 `C:\proj\Booting` (ASCII 여야 한다 — [windows-dev-environment](windows-dev-environment.md)). 원격 `git@github.com:chachamelmelll9-hash/Booting.git`, `main` 하나. 작성자 `chachamelmelll9` / `chachamelmelll9-hash`.
- 루트 패키지 `@chachamelmelll9-hash-service/source`. 스코프 `@chachamelmelll9-hash-service/*` 는 `initial-setup.sh --org` 가 치환했다.
- **pnpm 10.27.0** (`packageManager`), `node-linker=hoisted`, **Turborepo** ^2.5 (실행 2.7.3). `node_modules` 는 저장소 안 실디렉터리 5.2GB — 정션이면 Metro 가 엔트리를 못 찾는다.
- 패치: `react-native-reanimated@4.1.6` (`patches/`).

## 워크스페이스

| 패키지 | 무엇 | 위키 |
|---|---|---|
| `apps/mobile` | Expo 앱 (자녀용) | [mobile-app](mobile-app.md) |
| `apps/server` | NestJS API + 부모님 웹 렌더 | [server](server.md) |
| `apps/webview` | Vite React (도움말·법적 고지) | [webview](webview.md) |
| `apps/mobile-e2e` | Maestro / adb 테스트 스크립트 (파이프라인 `adb-verify` 용) | |
| `apps/server-e2e` | Jest 서버 E2E (파이프라인 `e2e-verify` 용) | |
| `packages/i18n` | ko/en 번역 (기본 **ko**, 영어는 설정에서만) | |
| `packages/supabase` | Supabase 클라이언트·타입 | |
| `packages/webview-bridge` | 앱↔웹뷰 postMessage 타입 | `docs/auth-architecture.md` |

> 터보 캐시 재생 로그에 `packages/*` 가 옛 경로(`Desktop\parents-_matching\packages\…`)로 찍힌다. 캐시 히트 메타의 흔적일 뿐 빌드는 현재 경로에서 돈다 — pnpm 가상 스토어가 옛 경로를 물고 있던 09-01 문제와 같은 뿌리 ([lesson](../lessons/windows-build-gotchas.md)).

## 명령

| 무엇 | 명령 |
|---|---|
| 타입체크 | `pnpm typecheck` (모바일은 **`cd apps/mobile && npx tsc -p tsconfig.app.json --noEmit`** — 루트 `tsconfig.json` 은 `include: []`) |
| 린트 | `pnpm lint` (모바일 `npx eslint app src --quiet` 로 error 만) |
| 테스트 | `pnpm test` — 서버 spec 5, 모바일 jest(`useDailyPicks.spec.ts` 7) |
| 빌드 | `pnpm build`; 서버 개발은 **`pnpm build:dev`** (production 번들은 `.env.production` 을 읽어 죽는다) |
| 개발 스택 | `scripts/dev-up.ps1` (Metro·API·터널 독립 프로세스) — [scripts-and-tooling](scripts-and-tooling.md) |
| 스토어 빌드 | `cd apps/mobile && pnpm build:android` → `scripts/build-android.sh` → AAB. **EAS Build 금지** (CLAUDE.md) |
| OTA | `cd apps/mobile && pnpm update` (JS 만 바뀔 때) |

## 게이트

husky pre-commit 이 `typecheck && lint && test && build` 를 돈다 — 커밋 한 번에 turbo 출력 150KB 가 나온다 (`--quiet` 로 커밋). lint 가 error 로 잡는 규칙: `unused-imports/no-unused-imports`, `simple-import-sort/imports`. 경고(react-perf, a11y hint, color literal)는 그대로 둔다 — 템플릿의 의도된 상태.

## 설치 규칙 (CLAUDE.md)

- 모바일: `cd apps/mobile && npx expo install <pkg>` (SDK 호환 버전 자동)
- 서버/웹뷰: `cd apps/<x> && pnpm add <pkg>`; 공통: `pnpm install -w <pkg>`
- 네이티브 모듈이 늘면 `expo prebuild --clean -p android` + 네이티브 재빌드 + 스토어 빌드 (`runtimeVersion` fingerprint)

## 관련

`README.md`(shippen 파이프라인 안내), `AGENTS.md`(Codex 워크플로), `MIGRATION.md`(템플릿 이전 안내) · [shippen-pipeline](shippen-pipeline.md)
