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
C:\proj\Booting\node_modules    # → C:\proj\pm\node_modules 정션 (5.2GB, .cxx 네이티브 캐시 보존)
```

`node_modules` 는 정션을 그대로 유지했다. 이미 ASCII 경로이고, 옮기면 `.cxx` CMake 캐시가 절대경로 기준으로
무효화되기 때문이다.

> **바탕화면에는 정션을 만들지 않았다.** 바탕화면 경로(`C:\Users\한화손해보험\...`)가 한글이라, 그 경로로 열면
> 정션을 canonical 로 되돌리지 못하는 도구에서 한글 경로가 되살아난다 — 이번에 해결한 문제가 그대로 재발한다.
> 대신 바로가기(`바탕화면\Booting.lnk`)만 두었다. 바로가기는 빌드 도구가 프로젝트 루트로 오인할 수 없다.

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
