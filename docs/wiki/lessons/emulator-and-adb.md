---
type: Lesson
title: 에뮬레이터·adb 에서 실제로 막혔던 것
description: 검은 스크린샷, 화면 밖 창, 여러 대 시리얼, 잠듦, 키보드·로케일, Play 이미지, 탭이 안 먹는 좌표. 증거는 스크린샷보다 uiautomator 덤프.
tags: [lesson, emulator, adb]
sources:
  - id: c1c56708
    resource: commit:1c56708
  - id: c4ec206e
    resource: commit:4ec206e
  - id: fm
    resource: /docs/pipeline-failure-modes.md
  - id: sessions
    resource: session:c1a1aa6b-94cb-4bf4-989e-52e8e143eabf
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# 에뮬레이터·adb

| 증상 | 원인 | 조치 |
|---|---|---|
| 스크린샷이 전부 **검은 PNG**(바이트 수 동일) | host-GPU 렌더링 + `mWakefulness=Asleep`. 또는 앱이 그리는 중 | `ensure-emulator.sh` 로만 띄운다(swiftshader + 깨우기). **렌더 여부는 `adb shell uiautomator dump` 로 텍스트를 본다** — 스크린샷은 2차 증거 |
| PowerShell 로 `adb exec-out screencap -p > f.png` 하면 깨진 PNG | 리다이렉트가 BOM/인코딩을 섞는다 | `adb shell screencap -p /sdcard/s.png` → `adb pull` |
| 에뮬레이터 창이 **위쪽이 잘려** 보임 | 창이 `y=-661` 에 뜬다 (두 대면 정확히 겹친다). 재시작마다 재발 | Win32 `MoveWindow`(`Add-Type` P/Invoke) 로 y=0~220 에 나란히. 소유자 "내려줘" = **이것**, 종료가 아니다 |
| `adb shell` → `more than one device` / 스크립트가 엉뚱한 기기 보고 / `--restart` 가 **다른 에뮬레이터까지** 죽임 | 첫 줄만 집던 `adb devices` 파싱, `pgrep qemu` 로 종료 판정 | `ANDROID_SERIAL=emulator-5556` 지정. `1c56708` 이 `target_serial()`·시리얼 기준 대기·"붙은 기기 0대일 때만 pkill" 로 수정 |
| 몇 분 뒤 화면이 꺼져 screencap 이 잠금 화면 | `svc power stayon true` 는 **충전 중에만**. 에뮬레이터는 기본 방전 상태 | `settings put system screen_off_timeout 2147483647` + `dumpsys battery set ac 1` / `set status 2` — `emulator-*` 시리얼에만 (`4ec206e`) |
| 입력란에 타자가 안 쳐짐 | AVD `hw.keyboard=no` | `config.ini` 에서 `yes`, 재시작 |
| 한글이 안 쳐짐 / 이메일에 한글이 조합됨 | Gboard 에 한국어 없음 / ko-KR 에서 `email-address` 키보드가 IME 를 안 바꿈 | 두벌식 추가 / 이메일 칸은 `visible-password` 키보드 (`c108038`) |
| `adb shell input text` 가 공백에서 끊김 | 공백이 인자 구분 | `%s` 로 |
| 로케일 바꾸니 Metro 연결 끊김 | `setprop persist.sys.locale` + reboot 가 `adb reverse` 를 지운다 | 8081/3000/4200/54321 다시 reverse (`ensure-emulator.sh`) |
| 카카오톡을 설치할 Play 스토어가 없음 | `google_apis` 이미지 | `system-images;android-35;google_apis_playstore;x86_64` — sdkmanager 인자를 **`--package_file`** 로 (PowerShell/batch 가 `;` 를 자른다) → AVD `booting_play` |
| 카카오 공유 시 카톡이 로그인돼 있지 않음 | 카톡은 폰 1대만 — 개발 기기에 로그인하면 본인 폰이 로그아웃 | 개발 빌드 '나에게 보내기'(REST) — [parent-share-kakao](../concepts/parent-share-kakao.md) |
| `input tap` 이 목록 행에 안 먹음 | 좌표를 텍스트 위치로 찍었다 | uiautomator 덤프의 `content-desc`/`bounds` 로 Pressable 중앙을 계산해 탭 |
| `Pixel Launcher isn't responding` ANR | 소프트웨어 렌더링이라 런처가 느림. 앱과 무관 | 팝업 닫기 |
| 앱 ANR "failed to complete startup", 사진 안 뜸 | **호스트 메모리 부족**(에뮬레이터 2대 5GB + Metro 누수) | 에뮬레이터 1대로, Metro 재시작, 부모님 웹은 PC 크롬 |
| `Cannot find native module 'ExponentImagePicker'` 빨간 화면 | 설치된 APK 가 네이티브 모듈 추가 커밋보다 오래됨 | 재빌드·재설치 (앱 버그 아님) |
| `Attempted to navigate before mounting the Root Layout` | (a) `_layout.tsx` 편집 직후 Fast Refresh 잔상 — 콜드 스타트하면 사라짐 (b) **진짜 버그**: 뒤로가기로 나갔다 다시 열면 expo-router 모듈 스코프의 `rootNavigationState` 가 살아 있어 가드를 통과 | (b) `navigationRef.isReady()` 추가 확인 (`2052a2f`) |
| Fast Refresh 후 `useNativeDriver` 충돌 | 편집 전 값이 네이티브 드라이버로 시작됨 | 콜드 리스타트 |

## 확인 루틴

1. `adb devices` → 대상 시리얼 확정
2. `adb -s <serial> shell uiautomator dump /sdcard/ui.xml; cat` → 텍스트·bounds
3. 필요할 때만 screencap → pull → Read 로 눈 확인
4. 세 화면(카드·펼친 카드·상세) 처럼 같은 값이 여러 곳에 나오면 **전부** 덤프한다 — 하나 빠뜨렸다가 "똑바로 안할래??" 를 들었다

## 관련

[windows-dev-environment](../entities/windows-dev-environment.md) · [scripts-and-tooling](../entities/scripts-and-tooling.md) · [collaboration-notes](collaboration-notes.md)
