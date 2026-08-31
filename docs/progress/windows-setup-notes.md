# Windows 실행 환경 메모 (2026-08-31 `/setup` 에서 확인)

이 파이프라인은 macOS 기준으로 작성돼 있다. 이 머신(Windows 11 / PowerShell)에서 실제로 막혔던 지점과
해결한 방법을 남긴다. **다음 세션은 이 문서를 먼저 읽고 시작한다.**

## 1. 반드시 설정해야 하는 환경 변수

Android(Gradle) 관련 작업을 할 때는 아래를 **항상** 함께 넘긴다. 하나라도 빠지면 CMake/prefab 단계에서
경로가 깨져 실패한다.

```powershell
$env:JAVA_HOME        = "C:\proj\jdk17\jdk-17.0.20.1+1"
$env:ANDROID_HOME     = "C:\Android\Sdk"
$env:ANDROID_SDK_ROOT = "C:\Android\Sdk"
$env:GRADLE_USER_HOME = "C:\proj\gradle-home"   # 기본값 C:\Users\한화손해보험\.gradle 은 한글이라 깨진다
$env:TEMP = "C:\proj\gtmp"; $env:TMP = "C:\proj\gtmp"
```

`JAVA_HOME` 은 User 환경변수로도 영구 설정해 두었다. `GRADLE_USER_HOME` / `TEMP` 는 세션마다 넘겨야 한다.

| 항목 | 값 | 비고 |
|---|---|---|
| JDK | Temurin **17.0.20.1** (`C:\proj\jdk17`) | Android Studio 번들 JBR 은 **Java 25.0.2** 인데 Gradle 8.14.3 은 Java 24 까지만 지원해서 플러그인 해석부터 실패한다 |
| Git Bash | `C:\Users\한화손해보험\AppData\Local\Programs\Git\bin\bash.exe` | PATH 에 없다. `scripts/*.sh` 는 이 경로로 직접 호출한다 |
| bash 스크립트 호출 시 | `ANDROID_HOME=/c/Android/Sdk` (POSIX 표기) | `initial-setup.sh` 의 `[ -d "$ANDROID_HOME" ]` 가 역슬래시 경로에서 실패해 `set -e` 로 죽는다 |
| Docker | 미설치 | 로컬 Supabase 폴백 불가. 클라우드 프로젝트를 쓰므로 영향 없다 |
| Xcode | 없음 (Windows) | iOS 빌드·제출은 이 머신에서 불가능 |

## 2. 저장소 경로 — 해소됨 (2026-08-31 이동 완료)

**현재 저장소 위치: `C:\proj\Booting`** — 앞으로 Claude Code 는 이 경로에서 연다.

Android Gradle Plugin 이 **비ASCII 프로젝트 경로**를 거부한다:

```
Your project path contains non-ASCII characters. This will most likely cause the build to fail on Windows.
```

`android.overridePathCheck=true` (config plugin `plugins/withAndroidPathCheckOverride.js` 로 영속화) 로
검사 자체는 넘겼지만, `:app` 모듈이 쓰는 `...\apps\mobile\android\app\build\intermediates\cxx\refs\...`
경로가 배치 파일 안에서 깨져 계속 실패했다. **해결책은 저장소를 ASCII 경로로 옮기는 것**이었고 실제로 옮겼다.

### 이동을 막던 것 — 최상위 디렉터리 핸들

`Move-Item` 이 "used by another process" 로 실패할 때 범인은 Claude Code 가 아니었다. 하위 디렉터리는 전부
자유롭고 **최상위 디렉터리에만** 핸들이 걸려 있었다. 실제 보유자:

| 보유자 | 정체 |
|---|---|
| `Code.exe` (main + utility) | 그 폴더를 연 VS Code 창 — 파일 워처가 폴더 핸들을 잡는다 |
| `OpenConsole.exe` ×2 | 부모가 이미 죽은 고아 콘솔 — CWD 가 그 폴더였다 |

범인 특정은 `NtQuerySystemInformation(SystemExtendedHandleInformation)` + `GetFinalPathNameByHandle` 로
핸들을 열거해서 했다 (Restart Manager 는 디렉터리에 대해 `RmGetList` 가 error 5 로 실패한다).

프로세스를 종료할 수 없는 상황이면 **최상위 디렉터리를 rename 하지 말고 하위 항목을 전부 새 폴더로 옮긴다** —
하위 항목에는 핸들이 없으므로 동일 볼륨 rename 으로 즉시 이동하고, 빈 껍데기 폴더만 남는다.

### 현재 구성

```
C:\proj\Booting                 # 저장소 본체 (ASCII 경로)
C:\proj\Booting\node_modules    # 실제 디렉터리 (5.2GB) — 정션 아님
C:\cxx\booting                  # Android 네이티브 빌드 출력(.cxx) — 2.5 절 참조
```

> **`node_modules` 정션은 2026-08-31 에 제거했다** (`C:\proj\pm\node_modules` → 저장소 안으로 이동).
> 정션으로 두면 저장소 **밖**의 실경로가 노출돼 Metro 가 엔트리 모듈을 못 찾는다 — 2.6 절 참조.
> 이동은 같은 볼륨 rename 이라 즉시 끝나지만, **Gradle autolinking 캐시가 옛 절대경로를 물고 있어서**
> 이동 후에는 `expo prebuild --clean -p android` 를 반드시 다시 돌려야 한다
> (안 하면 `No matching variant of project :react-native-async-storage_async-storage ... No variants exist`).

> **바탕화면에는 정션을 만들지 않았다.** 바탕화면 경로(`C:\Users\한화손해보험\...`)가 한글이라, 그 경로로 열면
> 정션을 canonical 로 되돌리지 못하는 도구에서 한글 경로가 되살아난다 — 이번에 해결한 문제가 그대로 재발한다.
> 대신 바로가기(`바탕화면\Booting.lnk`)만 두었다. 바로가기는 빌드 도구가 프로젝트 루트로 오인할 수 없다.

## 2.5. MAX_PATH 260자 제한 — 해소됨 (2026-08-31, config plugin)

ASCII 경로로 옮긴 뒤 곧바로 **다음 벽**이 나왔다. `:app:buildCMakeDebug[arm64-v8a]` 에서:

```
ninja: error: Stat(reactnativekeyboardcontroller_autolinked_build/CMakeFiles/
react_codegen_reactnativekeyboardcontroller.dir/C_/proj/pm/node_modules/
react-native-keyboard-controller/common/cpp/react/renderer/components/
reactnativekeyboardcontroller/RNKCKeyboardBackgroundViewShadowNode.cpp.o):
Filename longer than 260 characters
```

CMake 는 **CMake 소스 트리 밖에 있는 소스 파일**의 오브젝트 경로를 절대경로 그대로 미러링한다
(`C:\...` → `C_\...`). `node_modules` 가 정션으로 저장소 밖(`C:\proj\pm\node_modules`)에 있어서
그 절대경로가 통째로 `.cxx\Debug\<hash>\<abi>\...\CMakeFiles\<target>.dir\` 아래에 다시 붙는다.
합계 **341자**다.

> **저장소 경로를 더 줄여도 해결되지 않는다.** 미러링되는 꼬리 부분(타깃 디렉터리 58 + autolinked_build 46
> + 라이브러리 내부 경로 100 + 파일명 42 ≈ 271자)만으로 이미 260을 넘는다. `subst` 드라이브,
> `node_modules` 재배치, ABI 축소(`x86_64` 는 `arm64-v8a` 보다 3자 짧을 뿐) 전부 무의미하다.

### 먼저 시도했다가 **효과가 없었던 것** — `LongPathsEnabled=1`

```powershell
Set-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem' -Name LongPathsEnabled -Value 1 -Type DWord
```

값은 실제로 켜졌고(`RtlAreLongPathsEnabled()` = True, 재부팅 불필요) 다른 도구에는 도움이 되므로
그대로 두었지만, **이 빌드 실패는 고치지 못한다.** Android SDK 가 번들한 ninja 1.10.2 바이너리에는
`longPathAware` 매니페스트도 `RtlAreLongPathsEnabled` 호출도 들어 있지 않다 — 즉 260자 검사가 무조건 걸린다.

```powershell
# 바이너리에 두 문자열 모두 없다 → long path 인지 자체를 안 한다
$s=[Text.Encoding]::ASCII.GetString([IO.File]::ReadAllBytes('C:\Android\Sdk\cmake\3.22.1\bin\ninja.exe'))
$s -match 'longPathAware'; $s -match 'RtlAreLongPathsEnabled'
```

되돌리려면 같은 값을 `0` 으로 쓴다. 이 설정은 머신 전역(HKLM)이며 관리자 권한이 필요하다.

### 실제 해결 — `plugins/withAndroidCmakeObjectPathMax.js`

CMake 는 오브젝트 이름이 `CMAKE_OBJECT_PATH_MAX` 를 넘으면 **앞쪽 디렉터리를 MD5 해시로 대체**해 줄인다.
문제는 이 축약이 *축약한 결과가 예산 안에 들어올 때만* 적용된다는 점이다. `.cxx` 가 기본 위치
(`apps/mobile/android/app/.cxx`, 접두사 69자)에 있으면 오브젝트 이름에 74자만 남는데 해시 형태가 81자라,
CMake 는 포기하고 긴 이름을 그대로 내보낸다. 그래서 **두 가지를 같이** 해야 한다:

| 조치 | 효과 |
|---|---|
| `buildStagingDirectory = file("C:/cxx/booting")` | `.cxx` 접두사 69자 → 14자 |
| `arguments "-DCMAKE_OBJECT_PATH_MAX=250"` | 남은 예산 ~104자 → 해시 축약이 실제로 적용된다 |

실측: 최장 오브젝트 경로 **310자 → 228자**. `android/` 는 gitignore 대상(CNG 생성물)이라 config plugin 으로
넣어야 `prebuild` 후에도 살아남는다. win32 에서만 적용되므로 macOS/Linux 출력은 그대로다.

ninja 는 두 지점에서 다르게 걸린다 — 둘 다 넘겨야 한다:

| 오류 | 검사 대상 |
|---|---|
| `Stat(...): Filename longer than 260 characters` | build.ninja 에 적힌 **상대** 경로 |
| `mkdir(...): No such file or directory` | 상대 경로를 CWD 기준으로 푼 **절대** 경로 |

## 2.6. Metro 가 엔트리 모듈을 못 찾던 문제 — `node_modules` 정션 (해소됨)

네이티브 빌드가 성공하고 앱이 설치된 뒤에도 **검은 화면**만 떴다. logcat 에 원인이 있었다:

```
Unable to resolve module ./pm/node_modules/expo-router/entry from C:\proj\Booting/.
  * C:\proj\Booting\pm\node_modules\expo-router\entry ← 존재하지 않는 경로
```

`node_modules` 가 `C:\proj\pm\node_modules` 를 가리키는 정션이라, 해석된 **실경로가 프로젝트 루트 밖**이다.
Expo 가 그 실경로를 프로젝트 기준 상대 경로로 바꾸는 과정에서 `..` 하나를 잃어버려 존재하지 않는 지정자가 된다.
`node_modules` 를 저장소 안으로 옮기자 바로 해결됐다 (`node_modules\expo-router\entry.js` 로 번들링 성공).

> 증상이 앱 버그처럼 보이지만 **앱 코드와 무관하다.** 검은 화면을 만나면 먼저
> `adb logcat | Select-String UnableToResolve` 를 본다.

> 화면 캡처 자체도 함정이 있다. 앱이 그리는 중이면 `screencap` 이 상태바만 있는 검은 PNG 를 준다.
> 렌더링 여부는 `adb shell uiautomator dump` 로 텍스트를 확인하는 편이 확실하다.

## 3. 포트 4200 충돌

`C:\Users\한화손해보험\Desktop\shippen` (다른 프로젝트) 의 vite 가 `--port 4200` 으로 떠 있어 4200 을
점유한다. 그래서 이 프로젝트의 webview 는 4201 로 밀린다.

모바일 앱의 `EXPO_PUBLIC_WEBVIEW_URL=http://10.0.2.2:4200` 은 4200 을 가리키므로, **그 프로세스를 끄지
않으면 앱 안의 웹뷰가 엉뚱한 앱을 띄운다.** 다음 세션에서 먼저 정리한다.

## 4. 이미 고쳐서 커밋 대상인 크로스플랫폼 버그

macOS 동작을 바꾸지 않는 방식으로 수정했다.

| 파일 | 문제 | 수정 |
|---|---|---|
| `apps/server/package.json` | `NODE_ENV=x cmd` 는 cmd.exe 에서 파싱 불가 → build/build:dev/dev 전부 실패, husky pre-commit 도 항상 실패 | `cross-env` 도입 |
| `apps/mobile/package.json` | `> /dev/null` 이 Windows 에 없음 | `expo config --type public --json` |
| `apps/mobile/jest.resolver.js` | `basedir.includes('expo/src/winter')` 가 역슬래시 경로에서 매칭 실패 → 워크어라운드 무력화, 4개 스위트 전부 죽음 | 경로 구분자 정규화 (32 tests pass) |
| `apps/mobile/plugins/withAndroidPathCheckOverride.js` (신규) | prebuild 가 gradle.properties 를 덮어써 override 가 사라짐 | win32 에서만 `android.overridePathCheck=true` 를 주입하는 config plugin |

## 5. Stop 훅 라우터가 동작하지 않는다

`.claude/settings.json` 의 Stop 훅이 `/usr/bin/env python3` 를 호출하는데 Windows 에는 그 경로가 없다.
auto-commit 훅도 bash 문법이다. 따라서:

- **2차 메커니즘(Stop 훅 라우터)은 이 머신에서 죽어 있다.** phase 재개는 스킬 내 체이닝(1차)에만 의존한다
- 턴마다 자동 커밋이 되지 않는다. 커밋은 직접 해야 한다

`python3` 는 PATH 에 있으므로(`WindowsApps\python3.exe`), 필요하면 `.claude/settings.local.json` 에
`python3 "$CLAUDE_PROJECT_DIR/.claude/hooks/stop_pipeline_router.py"` 로 훅을 하나 더 걸어 되살릴 수 있다.
