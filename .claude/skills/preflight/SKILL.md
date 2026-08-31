---
name: preflight
description: Check and prepare everything auto mode cannot automate — accounts, credentials, signing keys, browser console sessions, and the store declaration file. Run before `/setup auto:` (setup calls it automatically). Generates the Android keystore and docs/store-declarations.yaml.
argument-hint: "[tier1 | full]"
allowed-tools: Read, Write, Edit, Glob, Grep, AskUserQuestion, Bash(git *), Bash(node *), Bash(pnpm *), Bash(bash scripts/*), Bash(adb *), Bash(keytool *), Bash(openssl *), Bash(test *), Bash(ls *), Bash(cat *), Bash(grep *), Bash(echo *), Bash(mkdir *), Bash(cp *), Bash(chmod *), Bash(which *), Bash(curl *), Bash(supabase *), Bash(pnpm dlx supabase *), Bash(wrangler *), Bash(xcodebuild *), Bash(sips *), Bash(python3 *), Bash(pip *)
---

## 목적

auto mode는 **앱당 수동 개입 0**을 목표로 하지만, 계정 생성·결제·신원 확인·2FA는 원리적으로 자동화할 수 없다. 이 스킬은 그 "1회 세팅"을 점검하고 **자동화 가능한 것은 직접 만든다**.

> 이 스킬은 **auto mode의 예외**다 — `auto-mode.json`이 만들어지기 **전에** 실행되므로 AskUserQuestion을 자유롭게 쓴다. 사람만 답할 수 있는 값을 여기서 한 번에 받아두는 것이 이 스킬의 존재 이유다.

체크리스트 원본: `docs/preflight.md`

## Usage

- `$ARGUMENTS` = `tier1` → Tier 1만 점검 (빠른 확인)
- `$ARGUMENTS` = `full` 또는 비어 있음 → Tier 1 + Tier 2 전체

---

## Phase 1: Tier 1 — 기획·구현 전제

```bash
# repo
git remote get-url origin | grep -qiE '[:/]product-engineer-community/shippen(\.git)?$' && echo "T1_REPO=VENDOR" || echo "T1_REPO=OK"
# 툴체인
node -v >/dev/null 2>&1 && echo "T1_NODE=OK" || echo "T1_NODE=MISSING"
pnpm -v >/dev/null 2>&1 && echo "T1_PNPM=OK" || echo "T1_PNPM=MISSING"
# 에뮬레이터
adb devices 2>/dev/null | grep -q "device$" && echo "T1_DEVICE=OK" || echo "T1_DEVICE=NONE"
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
ls "$SDK/emulator" >/dev/null 2>&1 && \
  ("$SDK/emulator/emulator" -list-avds | head -1 | grep -q . && echo "T1_AVD=OK" || echo "T1_AVD=NONE") \
  || echo "T1_AVD=NO_SDK"
# AVD 가 없을 때 자동 생성이 가능한가 (cmdline-tools 설치 여부)
(command -v avdmanager >/dev/null 2>&1 || ls "$SDK"/cmdline-tools/*/bin/avdmanager >/dev/null 2>&1) \
  && echo "T1_AVDMGR=OK" || echo "T1_AVDMGR=MISSING"
# 스킬 shadowing — 개인 스킬(~/.claude/skills/)이 파이프라인 스킬을 가리는지
# (가려지면 auto mode 가 낡은 사본을 실행하거나, disable-model-invocation 으로 그 자리에서 죽는다)
bash scripts/doctor-skills.sh >/dev/null 2>&1 && echo "T1_SKILLS=OK" || echo "T1_SKILLS=SHADOWED"
# Supabase
test -f .mcp.json && grep -q supabase .mcp.json && echo "T1_MCP=OK" || echo "T1_MCP=MISSING"
# 스킴을 https 로 단정하지 않는다 — 로컬 Supabase 스택은 http://10.0.2.2:54321 이다
grep -qE "^EXPO_PUBLIC_SUPABASE_URL=https?://.+" apps/mobile/.env.development 2>/dev/null && echo "T1_SUPA_ENV=OK" || echo "T1_SUPA_ENV=MISSING"
```

판정과 조치:

| 결과 | 조치 |
|---|---|
| `T1_REPO=VENDOR` | **중단**. README Quick Start로 자기 repo를 만들고 origin을 재지정하게 안내한다 (이대로 진행하면 push 대상이 없고 org 파싱도 벤더로 잡힌다) |
| `T1_NODE/PNPM=MISSING` | `./scripts/initial-setup.sh`가 설치한다고 알리고 계속 |
| `T1_AVD=NONE` + `T1_AVDMGR=OK` | `bash scripts/ensure-emulator.sh` 가 자동 생성한다. 그대로 진행 |
| `T1_AVD=NONE` + `T1_AVDMGR=MISSING` | 자동 생성 불가. AskUserQuestion — "Android Studio > SDK Manager > SDK Tools 에서 'Android SDK Command-line Tools' 설치 후 AVD 생성" / "에뮬레이터 없이 진행(앱 기동 검증 스킵 — 빌드 검증만)" |
| `T1_SKILLS=SHADOWED` | **자동 해소한다**: `bash scripts/doctor-skills.sh --fix` (개인 사본은 `~/.claude/skills-shadowed-backup/`로 백업된다). 그 뒤 `bash scripts/doctor-skills.sh`로 `SKILLS_OK`를 확인한다. 해소하지 않으면 auto mode 가 파이프라인 도중 죽는다 — 실측 결함이다 |
| `T1_MCP=MISSING` (인증 쓰는 앱) | `bash scripts/provision-supabase.sh` 실행 여부를 묻고 실행 |

### Phase 1.5: MCP 재시작 안내 (차단 아님)

`provision-supabase.sh`를 **이번 실행에서** 돌렸다면 `.mcp.json`이 새로 생겼다. 새 MCP 서버는 현재 세션에 로드되지 않는다.

**이것으로 auto mode 진입을 막지 않는다.** `db-implement` 에이전트가 Supabase CLI 폴백
(`pnpm dlx supabase db push`)으로 마이그레이션을 적용하도록 되어 있고, CLI 도 적용 이력을 남기므로 안전하다.

> 과거에는 여기서 하드 중단했다. 그 결과 auto mode 가 "한 줄 요구사항 → 완주"라는 계약을 첫 단계부터
> 어기고 사용자에게 세션 재시작을 요구했다 (runner-log 실측: 사용자가 이 게이트를 수동으로 넘겨야 했다).

아래 한 줄만 남기고 계속 진행한다:

```
참고: Supabase MCP를 새로 설정했습니다. 이번 세션에는 로드되지 않으므로 DB 작업은 Supabase CLI로 적용됩니다.
      다음 세션부터 MCP가 사용됩니다.
```

---

## Phase 2: Tier 2 — 배포·출시 전제

`$ARGUMENTS`가 `tier1`이면 이 Phase를 스킵한다.

```bash
# 인프라
ORACLE_HOST=$(grep -m1 '^ORACLE_HOST=' infra/oracle/.deploy-state 2>/dev/null | cut -d= -f2)
[ -n "$ORACLE_HOST" ] && echo "T2_ORACLE=OK($ORACLE_HOST)" || echo "T2_ORACLE=MISSING"
PAGES_PROJECT=$(grep -m1 '^PAGES_PROJECT=' infra/oracle/.deploy-state 2>/dev/null | cut -d= -f2)
[ -n "$PAGES_PROJECT" ] && echo "T2_PAGES=OK($PAGES_PROJECT)" || echo "T2_PAGES=MISSING"
wrangler whoami >/dev/null 2>&1 && echo "T2_CF_AUTH=OK" || echo "T2_CF_AUTH=MISSING"

# Android 서명
test -f apps/mobile/keystore.properties && echo "T2_KEYSTORE_PROPS=OK" || echo "T2_KEYSTORE_PROPS=MISSING"

# iOS
test -f .appstoreconnect.env && echo "T2_ASC_ENV=OK" || echo "T2_ASC_ENV=MISSING"
ls ~/.appstoreconnect/AuthKey_*.p8 >/dev/null 2>&1 && echo "T2_ASC_KEY=OK" || echo "T2_ASC_KEY=MISSING"
xcodebuild -version >/dev/null 2>&1 && echo "T2_XCODE=OK" || echo "T2_XCODE=MISSING"

# Play
test -f google-service-account.json && echo "T2_PLAY_SA=OK" || echo "T2_PLAY_SA=MISSING"
node scripts/play-store.mjs status >/dev/null 2>&1 && echo "T2_PLAY_APP=OK" || echo "T2_PLAY_APP=MISSING_OR_NO_PERMISSION"

# 선언 데이터 + 아이콘
test -f docs/store-declarations.yaml && echo "T2_DECL=OK" || echo "T2_DECL=MISSING"
ls assets/icon-source.png assets/icon-source.jpg assets/branding/icon-source.* 2>/dev/null | head -1 || echo "T2_ICON=MISSING"

# 콘솔 브라우저 세션 (선택 — launch 단계에서만 필요)
curl -s --max-time 2 http://localhost:9222/json 2>/dev/null | grep -qE 'appstoreconnect|play.google.com/console' && echo "T2_CONSOLE_TAB=OK" || echo "T2_CONSOLE_TAB=NONE"
python3 -c "import websocket" 2>/dev/null && echo "T2_PCDP_DEP=OK" || echo "T2_PCDP_DEP=MISSING"
```

`T2_PLAY_APP=MISSING_OR_NO_PERMISSION`은 두 원인을 구분해서 안내한다: ① 콘솔에 앱 미등록 ② 서비스계정에 **앱별 권한** 미부여(403). 둘 다 콘솔 수동 작업이다.

---

## Phase 3: 자동 생성 가능한 것 만들기

### 3-1. Android keystore (`T2_KEYSTORE_PROPS=MISSING`일 때)

**자동 생성한다.** 앱 이름·조직은 `apps/mobile/app.json`과 git remote에서 가져오고, 비밀번호는 무작위 생성한다.

```bash
APP_NAME=$(node -e "console.log(require('./apps/mobile/app.json').expo.name)")
ORG=$(git remote get-url origin | sed -E 's#.*[:/]([^/]+)/[^/]+$#\1#')
PW=$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)

keytool -genkeypair -v -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 \
  -keystore apps/mobile/release.jks -alias release \
  -dname "CN=${APP_NAME}, OU=${ORG}, O=${ORG}, L=Seoul, S=Seoul, C=KR" \
  -storepass "$PW" -keypass "$PW"

cat > apps/mobile/keystore.properties <<EOF
storeFile=release.jks
storePassword=${PW}
keyAlias=release
keyPassword=${PW}
EOF
chmod 600 apps/mobile/keystore.properties
```

생성 후 **반드시** 사용자에게 경고한다:

```
⚠️ Android 서명 키를 생성했습니다: apps/mobile/release.jks

이 키를 잃으면 같은 앱을 다시 업데이트할 수 없습니다 (Play가 서명 일치를 요구).
지금 안전한 곳에 백업하세요 — 두 파일 모두 git에 올라가지 않습니다:
  - apps/mobile/release.jks
  - apps/mobile/keystore.properties  (비밀번호 포함)
```

### 3-2. `docs/store-declarations.yaml` (`T2_DECL=MISSING`일 때)

`docs/store-declarations.example.yaml`을 복사한 뒤, **사람만 답할 수 있는 값**을 AskUserQuestion으로 받아 채운다. 값을 추론해서 채우지 않는다.

받아야 하는 최소 항목 (한 번에 몰아서 묻되, 질문당 하나의 결정):

1. **사업자/개발자 정보** — 표시명, 이메일, 주소(Play 공개 필수). 개인 개발자면 "개인 개발자" 옵션을 제공하고 이름/이메일만 받는다.
2. **가격** — 무료 / 유료
3. **광고 포함 여부** — `app.config.ts`의 AdMob 설정과 **반드시 일치**해야 한다. `EXPO_PUBLIC_ADMOB_*`가 설정돼 있으면 기본값 true를 제시한다.
4. **수집 데이터** — `docs/features/data-model.md`가 있으면 그걸 근거로 후보를 제시하고 **확인**을 받는다 (제시는 AI, 확정은 사용자). 없으면 인증 방식만으로 최소 후보(email, user_id)를 제시.
5. **연령 등급** — 앱 설명을 근거로 "전 항목 없음(none)"을 기본 제시하고 확인받는다. 폭력·성적 콘텐츠·도박 요소가 있으면 해당 항목만 조정.
6. **타겟 연령대** — 18+ / 13-17 포함 / 13세 미만 포함 (13세 미만은 아동 정책 단계가 크게 늘어난다고 안내)

`submit_policy`는 기본 `first-app-manual`로 쓴다 (C안). 두 번째 앱 이후 사용자가 `auto`로 바꾼다.

### 3-3. 데모 계정 비밀번호 파일

`app_access.demo_account.seed=true`이고 `.launch-demo-account`가 없으면 생성해 둔다 (실제 시딩은 `/launch` Phase 3):

```bash
[ -f .launch-demo-account ] || { openssl rand -base64 18 | tr -d '/+=' | head -c 18 > .launch-demo-account; chmod 600 .launch-demo-account; }
```

---

## Phase 4: 결과 기록

```bash
mkdir -p docs/progress
cat > docs/progress/preflight.json <<EOF
{
  "checked_at": "$(date +%Y-%m-%dT%H:%M:%S%z)",
  "tier1_ok": {true|false},
  "skills_ok": {true|false},
  "release_ready": {true|false},
  "generated": ["keystore", "store-declarations"],
  "blockers": [
    {"item": "T2_PLAY_APP", "reason": "Play Console 앱 미등록", "manual_action": "콘솔에서 앱 만들기 + 서비스계정 앱 권한 부여"}
  ],
  "notes": []
}
EOF
```

- `tier1_ok` = Tier 1 필수 항목(repo, 툴체인, 인증 쓰는 앱의 MCP)이 모두 OK
- `skills_ok` = `T1_SKILLS=OK` (개인 스킬이 파이프라인 스킬을 가리지 않음). `false`면 auto mode를 켜지 않는다 — 파이프라인이 중간에 죽는다
- `release_ready` = Tier 2에서 **인프라·서명·스토어 계정·선언 데이터**가 모두 OK (아이콘·콘솔 탭은 제외 — 없어도 출시는 가능)

---

## Phase 5: 보고

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Preflight {통과 / 일부 미비}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Tier 1 (기획·구현)   ✔ 통과 / ❌ {항목}
  Tier 2 (배포·출시)   ✔ 통과 / ⚠ {n}건 미비

  자동 생성:  keystore ✔ / store-declarations.yaml ✔
  남은 수동:  {항목} → {조치}

  {release_ready=true }  auto mode가 스토어 제출까지 진행합니다.
  {release_ready=false}  auto mode는 앱 빌드 + 에뮬레이터 동작확인(verify)까지 자동 완주하고,
                         deploy/build/launch 만 연기합니다.
                         남은 항목을 준비한 뒤 /continue 로 재개하세요.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Interaction Rules

1. **선언값을 창작하지 않는다.** 근거(데이터 모델·앱 설정)로 후보를 제시하고 확정은 사용자에게 받는다. 이 파일 하나가 계정 정지 리스크를 좌우한다.
2. Tier 2 미비는 **실패가 아니다.** `release_ready: false`로 기록하고 진행한다 — 기획·구현·빌드·동작검증(`verify` phase)은 계정 없이도 전부 자동으로 돌아간다. 라우터가 `deploy`/`build`/`launch` 만 건너뛴다.
3. keystore 생성 후 백업 경고를 **반드시** 출력한다.
4. `T1_REPO=VENDOR`는 유일한 하드 중단 조건이다.
5. 이 스킬은 다음 스킬로 체이닝하지 않는다. 호출자(`/setup`)가 결과를 보고 auto mode 진입을 결정한다.
