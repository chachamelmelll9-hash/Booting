---
name: start
description: Collect problem description, derive core feature, recommend app names, run branding.sh, configure Kakao login via browser automation, and chain to /clarify-core-feature. Called after /setup.
argument-hint: "[core-feature-description]"
allowed-tools: Read, Write, Glob, Grep, AskUserQuestion, Bash(./scripts/branding.sh *), Bash(chmod *), Bash(git *), Bash(keytool *), Bash(openssl *), Bash(sed *), Bash(grep *), Bash(cat *), Bash(adb *), Bash(cd apps/mobile *), Bash(npx expo *), Bash(agent-browser *), Bash(sleep *), Bash(kill *), Bash(lsof *), Bash(maestro *), Bash(cd apps/mobile-e2e *), Bash(pnpm *), Bash(node *), Bash(mkdir *), Bash(echo *), Bash(test *), Skill(clarify-core-feature)
---

## Auto Mode

`docs/progress/auto-mode.json` 파일이 존재하고 `enabled=true`이면:
- AskUserQuestion을 사용하지 않는다 — AI가 자율적으로 최적 결정
- 모든 검증 체크포인트에서 첫 번째/추천 옵션 자동 선택
- 완료 후 다음 skill을 즉시 호출한다
- **예외 — supervisor 모드**: `docs/progress/supervisor.json` 이 존재하면 다음 skill 을 호출하지 않는다. 이 phase 의 `phase_completed` 를 기록하고 턴을 끝낸다 (supervisor 가 새 프로세스로 다음 phase 를 띄운다 — CLAUDE.md "Auto Mode 실행 계약")

---

## Usage

If the user provided an argument, use it as the core feature description: $ARGUMENTS

If $ARGUMENTS is empty, print the following message as plain text and wait for the user's next message (do NOT use AskUserQuestion for this step):

```
어떤 문제를 해결하고 싶으신가요? 간단하게 설명해주세요.

예시:
- "반려동물 건강관리가 너무 흩어져 있어서, 사료/산책/병원 기록을 한곳에서 관리하고 싶다"
- "기프티콘 만료일을 자꾸 놓쳐서, 이미지에서 자동으로 찾아 알림을 받고 싶다"
- "교회 설교를 다시 듣기 어려워서, 음성을 텍스트로 변환하고 AI로 요약하고 싶다"
```

## Instructions

### Step 1: Derive Core Feature

From the user's problem description, derive a single-line core feature statement.

Format: **"{problem} → {solution}"** (one line, concise)

**Auto mode**: `auto-mode.json`의 `problem` 필드를 사용하여 core feature 도출. 확인 없이 바로 진행.

**Interactive mode**: Use AskUserQuestion to confirm:
- Question: "핵심 기능이 맞나요?"
- Header: "Core Feature"
- Options: derived statement + "직접 수정"

### Step 2: Recommend App Names

Generate 3 app name candidates based on the core feature.

**Naming guidelines:**
- 짧고 기억하기 쉬운 이름 (1-2 단어)
- 핵심 기능을 암시하되 직접적이지 않은 이름
- 영어 이름 권장 (App Store 글로벌 노출)
- 소문자로 변환 시 valid bundle ID segment (특수문자/공백 불가)

**Auto mode**: 3개 후보 중 첫 번째를 자동 선택. AskUserQuestion 스킵.

**Interactive mode**: Use AskUserQuestion to present 3 recommendations + "직접 입력":

After selection, resolve ORG. **remote 가 없을 수 있으므로 폴백 체인을 쓴다** —
`git remote get-url origin` 하나만 믿으면 로컬 전용 프로젝트에서 빈 값이 되어
`com..myapp` 같은 깨진 번들 ID가 만들어진다.

```bash
# 1) git remote 의 owner
ORG=$(git remote get-url origin 2>/dev/null \
      | sed -E 's#.*[:/]([^/]+)/[^/]+(\.git)?$#\1#')
# 2) initial-setup.sh 가 넣어 둔 package.json 스코프 (@{org}-service/...)
[ -z "$ORG" ] && ORG=$(node -e "
  const m=(require('./package.json').name||'').match(/^@([^/]+)-service\//);
  process.stdout.write(m?m[1]:'')" 2>/dev/null)
# 3) 저장소 디렉토리명
[ -z "$ORG" ] && ORG=$(basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")

ORG_LOWER=$(echo "$ORG" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9')
[ -n "$ORG_LOWER" ] || { echo "BLOCKING: ORG 도출 실패"; }
echo "ORG=$ORG_LOWER"
```

Auto-derive:
- `APP_NAME` = selected or custom name
- `ORG` = 위 체인의 결과 (lowercase, 영숫자만)
- `BUNDLE_ID` = `com.{ORG_LOWER}.{appname_lower_no_space}`

**번들 ID 검증** — 비어 있는 세그먼트가 있으면 스토어 등록이 불가능하다:

```bash
echo "$BUNDLE_ID" | grep -Eq '^[a-z][a-z0-9]*\.[a-z][a-z0-9]*\.[a-z][a-z0-9]*$' \
  && echo "BUNDLE_ID_OK" || echo "BLOCKING: BUNDLE_ID 형식 오류 ($BUNDLE_ID)"
```

### Step 3: Run branding.sh

```bash
chmod +x scripts/branding.sh
./scripts/branding.sh --name "{APP_NAME}" --bundle-id "{BUNDLE_ID}"
```

This replaces:
- `MyApp` → `{APP_NAME}` (app.json, i18n, UI strings, docs)
- `com.myorg.myapp` → `{BUNDLE_ID}` (app.json, workflows)
- `myapp-mobile` → `{appname}-mobile` (slug, deep links, docs)
- `myapp-server` → `{appname}-server` (docs)
- `myapp-` → `{appname}-` (workflows, docker-compose)

### Step 3.5: 네이티브 프로젝트 재생성 (브랜들 ID가 바뀌었으면 필수)

`branding.sh`는 `app.json`만 고친다. 그런데 `/setup`의 `pnpm dev`가 이미 `apps/mobile/android/`를
**옛 패키지명으로 생성**해 두었고, `expo run:android`는 기존 네이티브 프로젝트를 재사용한다.
이걸 재생성하지 않으면:

- 에뮬레이터에는 계속 `com.myorg.myapp`(템플릿 기본값)이 설치된다
- `verify` phase가 **브랜딩되지 않은 엉뚱한 앱**을 검증하고 "동작 확인 완료"로 보고한다
- `apps/mobile/android/`는 gitignore라 이 불일치가 커밋 diff에도 안 보인다

> 실측 결함: `app.json`은 `Stride`/`com.app.stride`인데 설치된 앱은 `com.myorg.myapp`이었다.
> 과거에는 이 재생성이 **Step 4(카카오) 안에만** 있어서, `preferences.kakao_login=false`면
> 통째로 건너뛰어졌다. 카카오 사용 여부와 무관하게 여기서 한다.

```bash
PKG_JSON=$(node -e "console.log(require('./apps/mobile/app.json').expo.android.package)")
PKG_NATIVE=$(grep -m1 'applicationId' apps/mobile/android/app/build.gradle 2>/dev/null              | sed -E "s/.*applicationId[[:space:]]*['\"]([^'\"]+)['\"].*/\1/")
echo "app.json=$PKG_JSON  native=${PKG_NATIVE:-<none>}"

if [ -z "$PKG_NATIVE" ] || [ "$PKG_JSON" != "$PKG_NATIVE" ]; then
  echo "REBUILD_NATIVE: 브랜딩이 네이티브에 반영되지 않았다 — prebuild --clean 실행"
  # 옛 패키지 앱이 남아 있으면 지운다 (서명·패키지 충돌 방지)
  [ -n "$PKG_NATIVE" ] && adb uninstall "$PKG_NATIVE" >/dev/null 2>&1 || true
  cd apps/mobile && npx expo prebuild --platform android --clean && cd ../..
else
  echo "NATIVE_IN_SYNC"
fi
```

재생성 후 실제로 맞춰졌는지 다시 확인한다 — 이 검증을 빼면 조용히 어긋난 채 진행된다:

```bash
grep -m1 'applicationId' apps/mobile/android/app/build.gradle | sed -E "s/.*applicationId[[:space:]]*['\"]([^'\"]+)['\"].*/\1/"
```

출력이 `app.json`의 `expo.android.package`와 같아야 한다. 다르면 `phase_blocked`.

### Step 4: Kakao Developers Setup (Browser Automation)

branding.sh 완료 후 실제 앱 이름과 번들 ID로 카카오 개발자 등록을 진행한다.
/setup에서 빌드된 `~/.android/debug.keystore`를 사용하여 키 해시를 추출한다.

**Auto mode**: `auto-mode.json`의 `preferences.kakao_login`이 `false`이면 Step 4 전체를 스킵하고 Step 5로 이동.

#### 4-1: Check if already configured

```bash
grep "nativeAppKey" apps/mobile/app.json
```

`__KAKAO_NATIVE_APP_KEY__`가 아니면 (이미 설정됨) Step 5로 스킵.

#### 4-2: Get Android debug key hash

/setup에서 빌드가 완료되었으므로 `~/.android/debug.keystore`가 존재한다.

```bash
keytool -exportcert -alias androiddebugkey \
  -keystore ~/.android/debug.keystore \
  -storepass android 2>/dev/null \
  | openssl sha1 -binary | openssl base64
```

Save as `{DEBUG_KEY_HASH}`.

#### 4-3: Open Kakao Developers (headed browser)

```bash
agent-browser --headed open "https://developers.kakao.com"
agent-browser wait --load networkidle
agent-browser snapshot -i
```

**If NOT logged in**, print and wait:

```
카카오 개발자 사이트에 로그인해주세요.
계정이 없으면 '회원가입' 버튼을 눌러 가입 후 로그인해주세요.
```

**Auto mode**: 로그인이 필요하면 Kakao 설정을 건너뛰고 Step 5로 이동.

**Interactive mode**: Use AskUserQuestion (options: "로그인 완료", "건너뛰기").
"건너뛰기" → Step 5로 스킵.

#### 4-4: Create Kakao Application

```bash
agent-browser open "https://developers.kakao.com/console/app"
agent-browser wait --load networkidle
agent-browser snapshot -i
agent-browser click @{add_app_button_ref}
agent-browser wait --load networkidle
agent-browser snapshot -i
```

Fill form — **실제 앱 이름과 org 사용**:
- 앱 이름: `{APP_NAME}`
- 사업자명: `{ORG}`

```bash
agent-browser fill @{app_name_field} "{APP_NAME}"
agent-browser fill @{company_field} "{ORG}"
agent-browser click @{save_button}
agent-browser wait --load networkidle
```

#### 4-5: Get Native App Key

```bash
agent-browser snapshot -i
```

"네이티브 앱 키" 추출 → `{KAKAO_NATIVE_KEY}`.

#### 4-6: Register Android Platform

```bash
agent-browser open "https://developers.kakao.com/console/app/{app_id}/config/platform"
agent-browser wait --load networkidle
agent-browser snapshot -i
```

**실제 번들 ID + 빌드 결과 키 해시 사용**:
- 패키지명: `{BUNDLE_ID}`
- 키 해시: `{DEBUG_KEY_HASH}`

```bash
agent-browser fill @{package_name_field} "{BUNDLE_ID}"
agent-browser fill @{key_hash_field} "{DEBUG_KEY_HASH}"
agent-browser click @{save_button}
agent-browser wait --load networkidle
```

#### 4-7: Enable Kakao Login + OpenID Connect

```bash
agent-browser open "https://developers.kakao.com/console/app/{app_id}/product/login"
agent-browser wait --load networkidle
agent-browser snapshot -i
agent-browser click @{kakao_login_toggle}
agent-browser wait --load networkidle
agent-browser snapshot -i
agent-browser click @{openid_toggle}
agent-browser wait --load networkidle
```

#### 4-8: Update app.json + .env + Rebuild

app.json의 네이티브 SDK 키(`__KAKAO_NATIVE_APP_KEY__`)와 런타임 env 키(`EXPO_PUBLIC_KAKAO_NATIVE_KEY`)에 **동일한 값**을 기록한다.
`EXPO_PUBLIC_KAKAO_NATIVE_KEY`가 비어 있으면 앱은 카카오 SDK 초기화를 건너뛰고 로그인 화면에서 카카오 버튼을 숨긴다 (`app/_layout.tsx`, `app/(auth)/login.tsx`).

```bash
# 1) app.json 네이티브 SDK 키 치환
sed -i '' 's/__KAKAO_NATIVE_APP_KEY__/{KAKAO_NATIVE_KEY}/g' apps/mobile/app.json
grep "nativeAppKey" apps/mobile/app.json

# 2) 런타임 env에 동일 값 기록 — 개발 빌드는 .env.development, 프로덕션 빌드 시 .env.production
#    (.env.development는 initial-setup.sh가 .env.example에서 생성하므로 EXPO_PUBLIC_KAKAO_NATIVE_KEY= 라인이 이미 존재)
sed -i '' 's|^EXPO_PUBLIC_KAKAO_NATIVE_KEY=.*|EXPO_PUBLIC_KAKAO_NATIVE_KEY={KAKAO_NATIVE_KEY}|' apps/mobile/.env.development
grep "EXPO_PUBLIC_KAKAO_NATIVE_KEY" apps/mobile/.env.development

agent-browser close
```

카카오 키 반영 + branding 적용을 위해 재빌드한다. 아래 명령은 모두 **저장소 루트 기준**이며, 첫 줄은 빌드 후 `cd ../..`로 루트에 복귀하므로 이후 `adb` 명령의 상대경로가 루트 기준으로 유지된다:

```bash
cd apps/mobile && npx expo prebuild --platform android --clean && cd android && ./gradlew assembleDebug && cd ../..
adb install -r apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
adb shell am force-stop {BUNDLE_ID}
adb shell am start -n {BUNDLE_ID}/.MainActivity
```

### Step 5: Save Feature Description

Write to `docs/features/core-idea.md`:

```markdown
# Core Feature Idea

{core feature description from the user}

---

Generated by `/start` skill.
Next: `/clarify-core-feature`
```

Print:

```
앱 브랜딩 + 카카오 로그인 설정 완료!

  App Name:    {APP_NAME}
  Bundle ID:   {BUNDLE_ID}
  NPM Scope:   @{ORG}-service
  Kakao Login: ✔ 설정 완료 / ⏭ 건너뜀

기획을 시작합니다...
```

### Step 5.5: Initialize Progress Tracking

> 스키마: `docs/progress/SCHEMA.md` 참조

```bash
mkdir -p docs/progress
```

`docs/progress/pipeline.jsonl`에 다음 2개 이벤트를 append한다:

```bash
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":null,"phase":"start","skill":"start","event":"phase_started","detail":{}}' >> docs/progress/pipeline.jsonl
```

```bash
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":null,"phase":"start","skill":"start","event":"phase_completed","detail":{"artifacts":["docs/features/core-idea.md"]},"output":"docs/features/core-idea.md"}' >> docs/progress/pipeline.jsonl
```

### Step 5.7: Kakao Login E2E Test (통과까지 수정 루프)

> **Step 4를 스킵했으면 이 Step도 스킵한다.** `preferences.kakao_login=false`거나 로그인 벽으로 카카오 설정을 건너뛴 경우, 앱은 카카오 버튼 자체를 숨기므로(`app/(auth)/login.tsx`) 이 테스트는 3회 재시도 후 반드시 실패한다. 스킵 사실만 기록하고 Step 6으로 간다:
>
> ```bash
> echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":null,"phase":"start","skill":"start","event":"phase_skipped","detail":{"item":"kakao-login-e2e","reason":"카카오 설정 스킵 — 로그인 화면에 카카오 버튼이 없음"}}' >> docs/progress/pipeline.jsonl
> ```
>
> `maestro`가 설치돼 있지 않은 경우에도 동일하게 스킵 기록 후 진행한다 (`which maestro`).

카카오 개발자 설정 완료 + 앱 리빌드 후 카카오 로그인 플로우를 검증한다. `{DEVICE_ID}`는 연결된 에뮬레이터 시리얼(`adb devices`에서 추출), `{PACKAGE_NAME}`은 `apps/mobile/app.json`의 `expo.android.package`.

#### Step 1: Kakao Login Test

```bash
cd apps/mobile-e2e && maestro --device {DEVICE_ID} test --env APP_ID={PACKAGE_NAME} maestro/03-auth/03-kakao-login.yaml
```

실패 시:
1. Maestro debug output 디렉토리에서 실패 스크린샷 읽기
2. 원인별 수정:
   - 카카오 SDK 초기화 실패 → `apps/mobile/app.json`의 `nativeAppKey` 확인
   - OAuth 화면 미표시 → 카카오 개발자 콘솔 설정 재확인 (`agent-browser`로 확인)
   - 동의 버튼 못 찾음 → `maestro/03-auth/03-kakao-login.yaml` selector 수정
   - 홈 화면 미도달 → 인증 콜백/토큰 저장 코드 수정
3. 재실행 (최대 3회)

#### 결과 처리

- PASS → Step 6 진행
- 3회 재시도 후 FAIL → BLOCKED 표기하고 Step 6 진행

---

### Step 6: Auto-chain to /clarify-core-feature

Immediately invoke `/clarify-core-feature` with the core feature description as argument.
