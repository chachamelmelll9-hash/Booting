---
type: Entity
title: 이 머신의 개발 환경 (Windows 11)
description: 파이프라인은 macOS 기준으로 쓰였다. 이 PC 에서 실제로 필요한 경로·환경 변수·AVD·메모리 조건. 다음 세션은 이걸 먼저 읽는다.
tags: [entity, environment, windows]
sources:
  - id: notes
    resource: /docs/progress/windows-setup-notes.md
  - id: auto-mode
    resource: /docs/progress/auto-mode.json
  - id: c5a8ed05
    resource: commit:5a8ed05
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 이 머신

Windows 11 Enterprise, PowerShell 5.1, RAM 15.6GB, 사용자 홈 경로에 **한글**. 정본 메모: `docs/progress/windows-setup-notes.md`.

## 경로

| 무엇 | 경로 | 왜 여기 |
|---|---|---|
| 저장소 | `C:\proj\Booting` | AGP 가 비ASCII 프로젝트 경로에서 죽는다. 바탕화면에는 바로가기(`.lnk`)만 — 정션을 두면 한글 경로가 되살아난다 |
| `node_modules` | 저장소 안 실디렉터리 5.2GB (정션 아님) | 정션이면 Metro 가 `expo-router/entry` 를 못 찾아 검은 화면 |
| 네이티브 빌드 출력 `.cxx` | `C:\cxx\booting` | MAX_PATH 260 — `withAndroidCmakeObjectPathMax.js` (win32 만) |
| JDK | `C:\proj\jdk17\jdk-17.0.20.1+1` (Temurin 17) | Android Studio JBR 은 Java 25 라 Gradle 8.14 가 거부 |
| Android SDK | `C:\Android\Sdk` | |
| Gradle 홈 | `C:\proj\gradle-home` (릴리스 빌드 스크립트는 홈이 한글이면 ASCII 로 복사해 쓴다, 5.21GB) | prefab 배치 파일이 한글 캐시 경로를 깨뜨린다 |
| TEMP/TMP | `C:\proj\gtmp` | 같은 이유 |
| Git Bash | `C:\Users\<user>\AppData\Local\Programs\Git\bin\bash.exe` | PATH 에 없다. `scripts/*.sh` 는 이 경로로 |
| Hermes Agent | `%LOCALAPPDATA%\hermes` | [hermes-discord-bot](hermes-discord-bot.md) |

세션마다 넘겨야 하는 것: `GRADLE_USER_HOME`, `TEMP/TMP`, (bash 스크립트에) `ANDROID_HOME=/c/Android/Sdk` POSIX 표기. `JAVA_HOME` 은 User 환경변수로 영구.

## 없는 것

Docker(로컬 Supabase 폴백 불가), Xcode(iOS 불가), `bd`(beads), 진짜 `python3`(Windows Store 스텁 — `test-pipeline.sh` 1·2/4 와 Stop 훅 라우터가 죽는다), `lsof`(PowerShell 등가물로).

## 레지스트리

`HKLM\...\FileSystem\LongPathsEnabled = 1` 로 켜 뒀다 — ninja 에는 효과 없지만 다른 도구엔 도움. 되돌리려면 0.

## 에뮬레이터 (AVD)

| AVD | 이미지 | 용도 |
|---|---|---|
| `booting_play` | android-35 `google_apis_playstore` x86_64, `hw.keyboard=yes` | 자녀 앱 — **카카오톡 설치·로그인**(공유 테스트). Play 이미지는 `sdkmanager --package_file` 로 받았다(PowerShell 이 `;` 를 자른다) |
| `shippen_api35` | android-35 `google_apis` | 부모 화면/두 번째 기기 |
| (세 번째, 09-07) | | 신규 가입 흐름 |

- 창은 항상 `y=-661` 에 뜬다 → Win32 `MoveWindow` 로 내린다 (소유자: "위에 잘렸어 내려줘"). 재시작마다 재발.
- **한 대 2.5GB.** 두 대 + Metro(누수 시 2.4GB) + Claude 면 여유가 2GB 로 떨어져 ANR·봇 종료가 났다. 09-10 부터 부모님 웹은 PC 크롬으로.
- 로케일 `ko-KR` 은 `adb root` + `setprop persist.sys.locale` + reboot 로 — reboot 가 `adb reverse` 를 지운다.
- Gboard 에 한국어(두벌식) 추가돼 있음.

## 포트

8081 Metro · 3000 API · 4200 웹뷰(한때 `Desktop\shippen` 의 vite 가 점유 → 4201 로 밀림) · 54321 로컬 Supabase(미사용). `ensure-emulator.sh` 가 넷 다 `adb reverse`.

## 훅 상태

`.claude/settings.json` 의 `bd prime`(Session/PreCompact)·Stop auto-commit(bash)·`/usr/bin/env python3` 라우터·PreToolUse rate gate — **전부 이 머신에서 실행되지 않는다.** 커밋은 수동, 파이프라인 재개는 스킬 체이닝만.

## 관련

[windows-build-gotchas](../lessons/windows-build-gotchas.md) · [emulator-and-adb](../lessons/emulator-and-adb.md) · [powershell-and-claude-code-gotchas](../lessons/powershell-and-claude-code-gotchas.md) · [결정 ASCII 경로](../decisions/2026-08-31-repo-to-ascii-path.md)
