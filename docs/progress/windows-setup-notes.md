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

## 2. 저장소 경로 — 미해결 blocker

Android Gradle Plugin 이 **비ASCII 프로젝트 경로**를 거부한다:

```
Your project path contains non-ASCII characters. This will most likely cause the build to fail on Windows.
```

`android.overridePathCheck=true` (config plugin `plugins/withAndroidPathCheckOverride.js` 로 영속화) 로
검사 자체는 넘겼고, Gradle 홈·TEMP 를 ASCII 로 옮겨 `node_modules` 하위 CMake 타깃은 전부 성공했다.
그러나 `:app` 모듈이 쓰는 아래 경로가 배치 파일 안에서 깨져 여전히 실패한다:

```
C:\Users\한화손해보험\Desktop\parents-_matching\apps\mobile\android\app\build\intermediates\cxx\refs\...
```

**해결책 = 저장소를 ASCII 경로로 옮기는 것.** 세션 안에서는 Claude Code 가 프로젝트 디렉터리를 CWD 로
잡고 있어 `Move-Item` 이 "used by another process" 로 실패한다. 세션 밖에서 실행해야 한다:

```powershell
# Claude Code 를 완전히 종료한 뒤, 프로젝트 밖 경로에서
Move-Item 'C:\Users\한화손해보험\Desktop\parents-_matching' 'C:\proj\parents-matching'
New-Item -ItemType Junction -Path 'C:\Users\한화손해보험\Desktop\parents-_matching' -Target 'C:\proj\parents-matching'
```

정션을 남기므로 바탕화면에서 여는 방식은 그대로 유지된다. 이후 **`C:\proj\parents-matching` 에서**
Claude Code 를 열고 `/continue` 로 재개한다 (바탕화면 정션 경로로 열면 canonical 경로가 다시 한글이 된다).

> 참고: `C:\proj\parents-matching` 을 정션으로 두고 그쪽에서 빌드하는 방법은 **통하지 않는다.**
> Gradle/Expo 가 canonical 경로로 되돌려 한글 경로를 그대로 쓴다 (실측 확인).

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
