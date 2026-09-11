---
type: Decision
title: 저장소를 ASCII 경로로 옮기고 MAX_PATH 는 config plugin 으로 넘는다
description: 한글 경로에서 Android 빌드가 죽었다. 검사 우회·환경변수로는 안 돼 저장소를 C:\proj\Booting 으로 옮겼고, 이어 나온 260자 제한은 레지스트리가 아니라 CMake 플러그인으로 넘었다.
tags: [decision, windows, build]
sources:
  - id: cb03ff40
    resource: commit:b03ff40
  - id: ce72ddee
    resource: commit:e72ddee
  - id: notes
    resource: /docs/progress/windows-setup-notes.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# ASCII 경로와 MAX_PATH

## 배경
`/setup auto:` 첫 시도가 `C:\Users\한화손해보험\Desktop\parents-_matching` 에서 `phase_blocked`. AGP 가 비ASCII 프로젝트 경로를 거부하고, 검사를 넘겨도(`overridePathCheck`) `:app` 의 cxx 경로가 배치 파일에서 깨진다. `GRADLE_USER_HOME`·`TEMP`·`JAVA_HOME` 을 ASCII 로 옮겨 플러그인 해석과 node_modules 하위 CMake 는 통과시켰지만 `:app` 은 남았다.

## 결정
1. **저장소를 `C:\proj\Booting` 으로 이동** (`b03ff40`). 최상위 폴더 핸들을 잡던 것은 VS Code 창과 고아 콘솔이었다 — 핸들이 없는 하위 항목만 옮기는 식으로. 바탕화면에는 정션 대신 바로가기.
2. 그 뒤 나온 `ninja: Filename longer than 260 characters`(310자)는 **`plugins/withAndroidCmakeObjectPathMax.js`** 로 — `buildStagingDirectory=C:/cxx/booting` + `CMAKE_OBJECT_PATH_MAX=250`, win32 에서만 주입. 310→228 (`e72ddee`).
3. `node_modules` 정션(`C:\proj\pm\node_modules`)은 제거하고 저장소 안 실디렉터리로 — Metro 가 정션 실경로를 상대화하며 `..` 를 잃어 엔트리를 못 찾았다.

## 버린 대안
- `LongPathsEnabled=1` — 켰지만 SDK ninja 1.10.2 는 long path 를 인지하지 않는다(바이너리에 문자열 자체가 없다). 효과 없음, 되돌리지는 않음.
- 저장소 경로 더 줄이기 / `subst` 드라이브 / ABI 축소 — 미러링되는 꼬리만 271자라 무의미.
- 앱 이름을 ASCII 로 — 홈 표시명은 `부팅` 으로 두고 slug/scheme/번들만 ASCII (`booting-mobile`, `com.booting.app`).

## 근거
`android/` 는 gitignore 된 생성물이라 gradle 을 직접 고쳐도 `prebuild --clean` 에 사라진다 → config plugin 이 유일하게 살아남는 자리. 두 조치는 한쪽만으로는 안 된다(해시 축약은 축약 결과가 예산 안에 들어올 때만 적용된다).

## 이후
09-07 릴리스 빌드에서 Gradle **캐시** 경로의 한글이 다시 문제 → `build-android.sh` 가 홈이 한글이면 Gradle 홈·TEMP 를 ASCII 로 복사 (`5a8ed05`). prefab LF 버그는 별개로 남아 있다 — [windows-build-gotchas](../lessons/windows-build-gotchas.md).
