---
type: Lesson
title: Metro·개발 서버·터널이 죽거나 어긋나는 이유
description: "앱이 안 뜬다" 의 절반은 앱 버그가 아니었다. Metro 가 죽는 이유 4가지, 서버가 죽는 이유 2가지, 터널 주소가 어긋나는 1가지, 그리고 로컬이 origin 뒤에 있던 1가지.
tags: [lesson, metro, dev-server, tunnel]
sources:
  - id: c5a8ed05
    resource: commit:5a8ed05
  - id: c70f70f2
    resource: commit:70f70f2
  - id: session
    resource: session:beebb230-c0d5-44e2-8b3c-4b26fcc4e1ca
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# Metro·개발 서버·터널

## Metro

| 증상 | 원인 | 조치 |
|---|---|---|
| `Unable to load script` / `Cannot connect to Metro. URL: 10.0.2.2:8081`, Metro 가 기동 직후 죽음 | (a) TTY 없이 리다이렉트로 띄운 `expo start` 가 대화형 모드에서 깨짐 (b) **`getNativeModuleVersionsAsync` 가 `api.expo.dev` 응답 본문을 두 번 읽음** — `Body is unusable: Body has already been read` (네트워크 실패 시) | (a) `CI=1`(단, watch 가 꺼진다) (b) 의존성 검증 끄기 / `--offline` (`5a8ed05` 가 dev-up 에 반영). `dev-up` 의 "UP" 판정은 포트를 잠깐 잡았다 사라지는 걸 놓친다 |
| `TypeError: fetch failed` 로 죽음 | 같은 뿌리 | `--offline` 재기동 |
| 코드를 고쳤는데 화면이 안 바뀜 (예: TabHeader 로고 안 보임) | stale 번들 캐시 | `expo start --clear` 후 `http://localhost:8081/.expo/.virtual-metro-entry.bundle?platform=android&dev=true` 로 **미리 워밍**(16.5MB, 첫 요청이 오래 걸려 앱이 타임아웃한다) |
| 앱이 느려지고 사진이 안 뜸 | Metro 가 이틀 동안 **2.4GB** 로 누수, 여유 1.8GB | Metro 재시작 (`Start-Process` 는 `npx` 가 안 되니 `node …\node_modules\expo\bin\cli start`) |
| 에뮬레이터가 옛 코드 | **로컬 `main` 이 origin 뒤** (다른 환경에서 커밋) | 판단 전에 `git fetch`. "어제 작업 없음" 이라고 단정했다가 정정한 일이 있다 |

## 서버

| 증상 | 원인 | 조치 |
|---|---|---|
| "관심보내기가 안되네" — 서버가 뜨자마자 죽음 | `pnpm build` 의 **production 번들이 `.env.production` 을 읽는다** (없거나 비어 있음) | **`pnpm build:dev`** + `node dist/main.js` (또는 `dev-up.ps1`) |
| 테스트 중 서버·Metro 가 사라짐 | 에이전트 세션의 백그라운드 작업으로 띄우면 세션 정리 때 같이 죽는다. 소유자 "아니 서버가 내려가면안되지??" | `scripts/dev-up.ps1` 이 **독립 프로세스**로 띄우고 `logs/` 에 남긴다 (`70f70f2`) |
| 새 라우트가 404 (콜백 안 옴) | 서버가 코드 변경 전 빌드로 돌고 있음 | 빌드 후 **재기동** — `Mapped {/api/kakao/share-callback, POST}` 로그 확인 |

## 터널 (`cloudflared` quick tunnel)

| 증상 | 원인 | 조치 |
|---|---|---|
| "부모님 동의처리실패", 부모님 웹 404, 카카오 콜백 미도착 | `PUBLIC_BASE_URL`(서버 env)과 카카오 콘솔 콜백 URL 이 **이전 세션의 터널 주소**. quick tunnel 은 실행마다 주소가 새로 발급된다 | `.env.development` 의 `PUBLIC_BASE_URL` 을 새 주소로, 서버 재기동, 콘솔 콜백 URL 수정. **`dev-up.ps1` 은 주소를 출력만 하고 env 를 안 고친다** — 자동화 미완 |
| 링크 수명에 대한 오해 | 터널은 "몇 분" 이 아니라 **프로세스** 기준 — PC 를 켜둔 동안은 같은 주소 | 실사용자에게는 절대 이 구조로 열지 않는다 (PC 끄면 모든 부모님 링크가 죽는다) — [deploy-infra](../entities/deploy-infra.md) |

## 포트

4200 이 `Desktop\shippen` 의 vite 에 잡혀 웹뷰가 4201 로 밀린 적이 있다 — 앱의 `EXPO_PUBLIC_WEBVIEW_URL` 은 4200 이라 엉뚱한 앱이 웹뷰에 떴다. `Stop-Process` 는 분류기가 막아 소유자가 종료.

## 확인 루틴

`adb logcat | Select-String UnableToResolve|Cannot connect` → `Get-Process node | Select WorkingSet64` → `curl localhost:3000/api` → 터널 주소와 `PUBLIC_BASE_URL` 대조 → 그다음에야 앱 코드를 본다.

## 관련

[scripts-and-tooling](../entities/scripts-and-tooling.md) · [windows-dev-environment](../entities/windows-dev-environment.md)
