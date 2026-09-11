---
type: Lesson
title: Windows 네이티브 빌드에서 실제로 막혔던 것
description: 한글 경로, MAX_PATH 260, node_modules 정션, prefab 배치 LF 버그, Gradle 홈 mojibake, JDK 버전. 각각 무엇으로 넘겼고 무엇은 여전히 안 되는지.
tags: [lesson, windows, android, gradle]
sources:
  - id: notes
    resource: /docs/progress/windows-setup-notes.md
  - id: fm
    resource: /docs/pipeline-failure-modes.md
  - id: ce72ddee
    resource: commit:e72ddee
  - id: c5a8ed05
    resource: commit:5a8ed05
  - id: ce477b74
    resource: commit:e477b74
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-11T14:30:00+09:00
status: stable
---

# Windows 네이티브 빌드

| # | 증상 | 원인 | 조치 | 상태 |
|---|---|---|---|---|
| 1 | `Your project path contains non-ASCII characters` → `:app` cxx 경로가 배치에서 깨져 실패 | AGP/CMake 배치가 OEM 코드페이지로 한글 경로를 깨뜨린다. `overridePathCheck` 로 검사만 넘겨도 실패 | **저장소를 `C:\proj\Booting` 으로 이동** | 해소 |
| 2 | `ninja: Stat(...): Filename longer than 260 characters` (최장 310자) | CMake 가 소스 트리 밖(node_modules) 파일의 오브젝트 경로를 절대경로로 미러링 | `plugins/withAndroidCmakeObjectPathMax.js` — `buildStagingDirectory=C:/cxx/booting`(69→14자) **과** `CMAKE_OBJECT_PATH_MAX=250` 둘 다 (한쪽만은 안 된다). 310→228 | 해소 |
| 2' | 그 뒤 `ninja: mkdir(...): No such file` | ninja 는 상대 경로(`Stat`)와 CWD 기준 절대 경로(`mkdir`) 두 곳에서 다르게 검사한다 | 위와 동일 (staging dir 이 이걸 해결) | 해소 |
| 3 | `LongPathsEnabled=1` 을 켜도 그대로 | SDK 번들 ninja 1.10.2 에 `longPathAware`·`RtlAreLongPathsEnabled` 가 없다 — 검사 자체를 안 한다 | 켜 둔 채로 둠(다른 도구엔 유용). 해결책 아님 | 확인 |
| 4 | 설치 성공 후 **검은 화면**, logcat `Unable to resolve module ./pm/node_modules/expo-router/entry` | `node_modules` 가 저장소 밖 정션 → Expo 가 실경로를 상대화하며 `..` 하나를 잃는다 | 정션 제거, `node_modules` 를 저장소 안으로 이동 | 해소 |
| 5 | 이동 후 `No matching variant of project :react-native-async-storage_async-storage … No variants exist` | Gradle autolinking 캐시가 옛 절대경로 | `expo prebuild --clean -p android` | 해소 |
| 6 | 설치된 앱이 `com.myorg.myapp` | `android/` 가 브랜딩 전에 생성됐고 gitignore 라 diff 에 안 보인다 | prebuild --clean, `applicationId` 와 `app.json` 대조 | 해소 |
| 7 | `[CXX1429] prefab failed`, 로그에 `'lass-path' is not recognized` (앞 3글자 소실) | AGP 가 만드는 `prefab_command.bat` 이 **LF** 줄바꿈(Kotlin `appendLine`). cmd 가 `^` 이어쓰기 블록을 잘못 읽는다. **코드페이지 무관**(949/437/1252/65001 전부 실패) — `chcp 65001` 은 원인 해결이 아니었다. CRLF 로 바꾸면 성공하지만 AGP 가 매번 덮어쓴다 | **미해결.** 우회: `configureCMakeDebug` up-to-date 유지(`GRADLE_USER_HOME` 변경·prebuild 가 깬다), `-x 'configureCMakeDebug[x86_64]' -x 'buildCMakeDebug[x86_64]'`, 에뮬레이터용은 `-PreactNativeArchitectures=x86_64` 만, 네이티브 변경은 CI(리눅스) | 우회 |
| 8 | 릴리스(arm64) 빌드에서 prefab 배치 안 경로가 `?쒗솕?먰빐蹂댄뿕` 로 깨짐 | Gradle 캐시·TEMP 가 한글 사용자 홈 아래 | `GRADLE_USER_HOME`·`TEMP` 를 ASCII 로 (`build-android.sh` 가 홈이 한글이면 자동으로 복사, 4.5GB). 판정 기준은 TEMP 가 아니라 **홈** — git bash 가 TEMP 를 `/tmp` 로 덮어 ASCII 처럼 보인다 | 해소 |
| 9 | 플러그인 해석부터 실패 | Android Studio JBR = Java 25, Gradle 8.14.3 은 24 까지 | Temurin **17** `C:\proj\jdk17` | 해소 |
| 10 | `Unable to delete file …classes.jar` | 다른 JBR 로 뜬 Gradle 데몬이 잠금 | `gradlew --stop` 을 두 `GRADLE_USER_HOME` 에서 각각 | 해소 |
| 11 | 스토어 릴리스 번들 엔트리 해석 실패 (`versionCode` 1 — 한 번도 성공한 적 없었다) | 모노레포에서 `expo export:embed` 는 projectRoot, `expo-updates` 매니페스트는 serverRoot 기준 — 둘을 동시에 만족 못 함 | export:embed 프로세스에만 serverRoot 를 맞춤 (`e477b74`) | 해소 (AAB 64.8MB) |
| 12 | `NODE_ENV=x cmd` 파싱 불가, `> /dev/null` 없음, jest.resolver 역슬래시 매칭 실패 | POSIX 전제 | `cross-env`, `expo config --json`, 구분자 정규화 | 해소 (템플릿 수정) |
| 13 | Android 12 이하에서 사진 추가 영구 불가 위험 | `expo-image-picker` 가 구형에서 `WRITE_EXTERNAL_STORAGE` 를 요청하는데 매니페스트에서 차단했었다 | 차단을 되돌림 (카메라·마이크만 차단) | 해소 |

## 지금 빌드하는 법 (에뮬레이터용 디버그)

```powershell
$env:JAVA_HOME="C:\proj\jdk17\jdk-17.0.20.1+1"; $env:GRADLE_USER_HOME="C:\proj\gradle-home"; $env:TEMP="C:\proj\gtmp"; $env:TMP=$env:TEMP
cd apps\mobile; npx expo prebuild --clean -p android      # 네이티브 모듈이 바뀌었을 때만
cd android; cmd /c "chcp 65001 >nul && .\gradlew.bat :app:assembleDebug -PreactNativeArchitectures=x86_64 --no-daemon"
adb install -r app\build\outputs\apk\debug\app-debug.apk
```
약 11~14분. 설치된 APK 가 코드보다 오래되면 `Cannot find native module 'ExponentImagePicker'` 같은 빨간 화면이 난다 — 앱 버그가 아니라 재빌드 신호.

## 관련

[windows-dev-environment](../entities/windows-dev-environment.md) · [결정 ASCII 경로](../decisions/2026-08-31-repo-to-ascii-path.md) · `docs/pipeline-failure-modes.md` B3
