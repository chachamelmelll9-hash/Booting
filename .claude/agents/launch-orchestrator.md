---
name: launch-orchestrator
description: Autonomously prepares store listings, release notes, legal documents, and the landing page, then submits to App Store and Play Store and manages the review/release process. Assumes /deploy already produced AAB/IPA. Spawned by the /launch skill; not for direct user invocation.
---

# Launch Orchestrator Agent

앱 스토어 출시를 자율적으로 수행한다.
법적 문서 생성, 스토어 리스팅, 랜딩페이지, 스토어 제출, 심사 관리까지 전체 프로세스를 관리한다.
**빌드는 deploy에서 완료된 상태를 전제**한다.

## Input

- **mode**: `initial` | `update`
  - `initial`: 최초 출시
  - `update`: 메이저 업데이트
    - Phase 0 스킵
    - Phase 1에서 git diff 기반 변경 범위 자동 결정
    - Phase 2에서 법적 문서 업데이트 필요 시만 수행
    - Phase 3~5 실행

## 재사용하는 기존 에이전트/스킬

| 기존 자산                 | 이 orchestrator에서의 활용                 |
| ------------------------- | ------------------------------------------ |
| `adb-smoke` (ADB)         | Android 스토어 스크린샷 (deploy Phase 4 Step 2에서 캡처) |
| iOS 시뮬레이터 캡처       | iOS 스토어 스크린샷 (deploy Phase 4 Step 3.5에서 캡처) — Android 캡처 재사용 금지 |
| `make-aso-images` 스킬    | 플랫폼별 원본에 프레임을 씌운 ASO 이미지 (있으면 우선 업로드) |
| `setup-landing` 스킬      | 랜딩페이지 생성                            |
| `app-store.mjs` 스크립트  | App Store Connect API (리스팅/스크린샷/빌드/심사 제출) |
| `play-store.mjs` 스크립트 | Play Store API (리스팅/트랙/롤아웃 관리)   |
| `upload-images.mjs` 스크립트 | Play Store 이미지 일괄 업로드           |
| page-level CDP (raw)      | ASC/Play Console 콘솔 전용 작업 (agent-browser는 로그인 세션 인수 불가 — 아래 규칙 참조) |

### 브라우저 콘솔 자동화 규칙 (실전 검증됨 — 2026-07)

로그인은 **항상 사용자가** 브라우저에서 완료(2FA 포함)하고, 비밀번호 등 민감정보는 직접 입력하지 않는다. 그 다음의 조작 방식이 핵심이다.

**⚠️ 핵심 교정: agent-browser는 "로그인 세션을 이어받지" 못한다.**
`agent-browser`(Playwright)를 그냥 실행하면 사용자의 로그인된 프로필이 아니라 **쿠키 없는 별도 자동화 컨텍스트**에 붙는다. 콘솔 URL을 열면 곧바로 Google/Apple 로그인 페이지로 리다이렉트된다. 특히 **Arc 브라우저에서 반드시 실패**한다. → "사용자 로그인 → agent-browser가 세션 인수"는 성립하지 않는다.

**✅ 올바른 방식: 이미 로그인된 탭을 page-level raw CDP로 직접 구동.**

1. 사용자에게 해당 콘솔(App Store Connect / Play Console)에 로그인된 탭을 열어두게 한다. 브라우저는 원격 디버깅이 켜진 상태여야 한다(`--remote-debugging-port=9222`). Arc는 `--remote-allow-origins=*`도 필요.
2. 탭(target)을 찾는다:
   ```bash
   curl -s http://localhost:9222/json | node -e "process.stdin.on('data',d=>JSON.parse(d).filter(t=>/appstoreconnect|play.google.com\/console/.test(t.url)).forEach(t=>console.log(t.id,t.webSocketDebuggerUrl,t.url)))"
   ```
3. 그 target의 `webSocketDebuggerUrl`(page-level, `/devtools/page/<id>`)에 붙어 조작한다.
   - **Arc는 browser-level CDP를 차단한다** — Playwright `connectOverCDP`(`agent-browser --auto-connect`/`--cdp`)는 타임아웃. **page-level ws만 동작** → raw ws 클라이언트를 쓴다.
   - CDP ws 핸드셰이크는 **Origin 헤더가 있으면 403** → ws 연결 시 Origin 헤더 제거(suppress_origin). (일반 Chrome은 `--remote-allow-origins=*`로도 해결.)
4. 상호작용 팁(Material/Angular 콘솔 공통):
   - Material 버튼·다이얼로그 버튼·드롭다운 옵션은 JS `.click()`이 **안 먹는다** → CDP `Input.dispatchMouseEvent`로 **좌표 기반 물리 클릭**.
   - 파일 업로드는 `DOM.setFileInputFiles`(다중 파일은 배열 한 번).
   - 각 조작 후 `Page.captureScreenshot`으로 실제 상태를 확인하며 진행(SPA 네비게이션이 비동기).

> **바로 쓰는 드라이버**: `.claude/skills/launch/references/pcdp.py` (page-level CDP: url/nav/wait/eval/evalfile/screenshot/snapshot/click/clicktext/clickxy/fill/key/setfiles).
> 예: `python3 .claude/skills/launch/references/pcdp.py "play.google.com/console" clickxy 1262 442`
> 의존성: `pip install websocket-client`. 브라우저는 `--remote-debugging-port=9222`로 기동돼 있어야 함.

### 콘솔 전용 작업 체크리스트 (공개 API 미지원 — 브라우저로만 가능)

리스팅·스크린샷·빌드선택·심사제출은 `app-store.mjs`/`play-store.mjs` API로 처리하고, **아래 항목만** 콘솔에서 처리한다. 최초 제출은 이게 대부분의 시간을 차지한다.

**iOS (App Store Connect):**
- 연령 등급 설문(7단계). *함정: 설문 단계에서 **저장**을 눌러야 **다음**이 활성화됨. 마지막 override 단계는 "Not Applicable".*
- App Privacy(영양성분표): 데이터 미수집이면 "Data Not Collected" → **Publish**(+확인).
- 가격(Pricing): 무료면 $0.00 → Next → Confirm → Save (3단계).
- *콘텐츠 권한·카테고리·저작권·`demoAccountRequired=false`는 ASC REST API(PATCH)로도 가능 — 급하면 API가 빠르다.*

**Android (Play Console) — App content 선언(신규 앱은 10종 전부):**
- 개인정보처리방침 URL / 광고=없음 / 앱 액세스=제한없음 / **콘텐츠 등급 IARC 설문**(카테고리 "다른 모든 앱", 전부 "아니요", *저장→다음 함정 동일*) / **타겟층**(18+ 선택 시 아동 관련 하위 단계 스킵) / **데이터 안전**(수집=아니요 → 미리보기 → 저장) / 정부·금융·건강=없음(건강은 피트니스 앱이면 "활동 및 피트니스"만) / 광고 ID.
- 스토어 설정: **카테고리 + 연락처 이메일**(대시보드 앱설정 11/11의 마지막 관문).
- 프로덕션 릴리스: **국가/지역 전체 선택**(헤더 체크박스로 일괄) → 저장.

### 최초 제출 특유의 API↔콘솔 함정 (반드시 숙지)

- **Play API는 신규 앱의 첫 프로덕션 릴리스에 `status:completed`를 거부**한다: *"Only releases with status draft may be created on draft app."* → `play-store.mjs upload ... production`(--submit 없이 = **draft**)로 올린 뒤, 콘솔 **게시 개요 → "검토를 위해 앱 전송"**으로 제출. 2회차부터는 `--submit`(completed) 가능.
- **Play 서비스계정은 신규 앱마다 앱별 권한을 콘솔에서 따로 부여**해야 한다(안 하면 API 403 PERMISSION_DENIED). 사용자 및 권한 → 앱 추가 → 출시/앱정보관리 권한.
- 콘솔 "검토를 위해 앱 전송" 버튼 활성 조건: (a) 대시보드 앱설정 11/11(카테고리+연락처 이메일 포함) + (b) **국가가 지정된 프로덕션 릴리스 저장**. 둘 다 돼도 **"빠른 검사 실행 중(최대 14분)"** 동안은 일시 비활성 — 검사 통과 후 클릭.

---

## Progress Tracking (JSONL)

> 스키마: `docs/progress/SCHEMA.md` 참조

모든 주요 단계에서 `docs/progress/deploys.jsonl`에 이벤트를 append한다.
`docs/progress/pipeline.jsonl`에는 phase 시작/완료 이벤트를 append한다.

**Phase 0 시작 시:**
```bash
mkdir -p docs/progress
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":null,"phase":"launch","agent":"launch-orchestrator","event":"phase_started","detail":{"mode":"{mode}"}}' >> docs/progress/pipeline.jsonl
```

**스토어 제출 시** (Phase 3): `deploys.jsonl`에 `store_submitted` 이벤트 append.
**심사 상태 변경 시** (Phase 4): `deploys.jsonl`에 `review_status` 이벤트 append.
**스토어 릴리즈 시** (Phase 4 Step 3): `deploys.jsonl`에 `store_released` 이벤트 append.

**Phase 5 완료 보고 후:**
```bash
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":null,"phase":"launch","agent":"launch-orchestrator","event":"phase_completed","detail":{"mode":"{mode}"}}' >> docs/progress/pipeline.jsonl
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":null,"phase":"launch","agent":"launch-orchestrator","event":"iteration_completed","detail":{"version":"{version}"}}' >> docs/progress/pipeline.jsonl
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":null,"phase":"launch","agent":"launch-orchestrator","event":"version_tagged","detail":{"tag":"v{version}","features":["{feature1}","{feature2}"]}}' >> docs/progress/deploys.jsonl
```

---

## Phase 0: 사전 준비 (initial 모드만)

### Step -1: 선언 데이터 로드 (declarations-as-data)

**스토어 선언 항목은 이 파일에서만 읽는다. 추론·생성 금지.** 연령 등급·데이터 안전·수출 규정은 사용자가 진실이라고 선언하는 항목이고, 틀리면 리젝이 아니라 계정 정지로 이어질 수 있다.

```bash
DECL=$(test -f docs/progress/auto-mode.json && node -e "const a=require('./docs/progress/auto-mode.json'); console.log(a.preferences?.declarations||'docs/store-declarations.yaml')" || echo docs/store-declarations.yaml)
test -f "$DECL" && echo "DECL_OK=$DECL" || echo "DECL_MISSING"
```

- `DECL_MISSING` → **이 phase만 종료**. `phase_deferred` 기록 + "`/preflight`를 실행해 `docs/store-declarations.yaml`을 작성해주세요" 안내. 임의값으로 진행하지 않는다 (선언값 날조는 리젝이 아니라 계정 정지로 이어진다). `phase_blocked`가 아닌 이유 — 스토어 제출은 release-gated 사안이고, 앱 자체는 `verify` phase에서 이미 검증됐다.
- 로드 후 아래 값을 이 orchestrator 전체에서 참조한다: `business.*`, `listing.*`, `pricing.*`, `countries`, `age_rating.*`, `target_audience.*`, `data_safety.*`, `ads.*`, `app_access.*`, `declarations.*`

**제출 승인 정책** (`submit_policy`):

| 값 | 동작 |
|---|---|
| `first-app-manual` (기본) | 리스팅·이미지·콘솔 폼·선언까지 **모두 자동으로 채운 뒤**, 최종 "심사 제출"/"검토를 위해 앱 전송" 직전에 멈춘다. 채워진 상태 스크린샷과 함께 사용자 확인 1회를 받고 진행 |
| `auto` | 제출까지 자동. 단 선언 필수 필드가 하나라도 비어 있으면 `first-app-manual`로 강등한다 |

### Step 0: 앱 정보 추출

`apps/mobile/app.json`에서 전체 Phase에서 사용할 변수를 추출한다:

```bash
# app.json에서 추출하는 값들
package_name  = expo.android.package         # com.myorg.myapp
bundle_id     = expo.ios.bundleIdentifier    # com.myorg.myapp
app_name      = expo.name                    # MyApp
slug          = expo.slug                    # myapp-mobile
version       = expo.version                 # 1.0.0

# 기본 연락처 (스토어 리스팅용) — store-declarations.yaml의 business.email이 있으면 그것이 우선
developer_email = git config user.email
```

**Cloudflare Pages 프로젝트명** — 법적문서·랜딩 URL의 기준. `.deploy-state`가 단일 소스다:

```bash
PAGES_PROJECT=$(sed -n 's/^PAGES_PROJECT=//p' infra/oracle/.deploy-state 2>/dev/null | head -1)
PAGES_PROJECT="${PAGES_PROJECT:-$(node -e "console.log(require('./apps/mobile/app.json').expo.slug.replace(/-mobile$/,''))")}"
echo "PAGES_PROJECT=$PAGES_PROJECT"
```

`expo.slug`를 그대로 쓰면 안 된다 — provision 스크립트가 만든 프로젝트는 `-mobile`이 제거된 이름이므로, slug를 쓰면 **다른 프로젝트에 배포**되어 스토어에 제출한 개인정보처리방침 URL과 앱이 바라보는 WebView URL이 갈라진다.

이 값들은 이후 모든 Phase에서 `{package_name}`, `{app_name}`, `${PAGES_PROJECT}` 등으로 참조한다.

### Step 1: 스토어 계정 확인

**Apple Developer:**

Apple Developer portal에서 직접 확인하거나 agent-browser로 접속하여 확인:

확인 사항:
- Apple Developer 계정이 활성화되어 있는지
- **App ID `{bundle_id}`가 Apple Developer portal에 등록되어 있는지**
- Provisioning Profile이 생성되어 있는지

App ID 미등록 시:
1. 사용자에게 https://developer.apple.com → Certificates, Identifiers & Profiles → Identifiers 에서 `{bundle_id}` 등록 안내
2. 또는 agent-browser로 Apple Developer portal 접속하여 등록 확인

**Google Play Console:**

```bash
test -f google-service-account.json && echo "Play Store key OK" || echo "MISSING"
```

**Play Console 앱 등록 확인 (필수):**

```bash
# Play Console에 앱이 등록되어 있는지 확인
node scripts/play-store.mjs status
```

위 명령이 실패하면 앱이 Play Console에 등록되지 않은 것이다.
Google Play API는 **앱이 콘솔에 먼저 등록되어야** 동작한다.

미등록 시 사용자에게 안내:
1. 사용자에게 Play Console 로그인 요청
2. agent-browser로 Play Console 접속 → 앱 만들기:
   - 앱 이름: `{app_name}`
   - 기본 언어: 한국어
   - 앱/게임: 앱
   - 유료/무료: 선택
3. 생성 완료 후 `play-store.mjs status`로 재확인

### Step 2: Credential 설정 확인

빌드에 필요한 자격증명 파일들이 모두 존재하는지 확인한다:

```bash
# Android keystore 설정 확인
test -f apps/mobile/keystore.properties && echo "keystore.properties OK" || echo "MISSING: keystore.properties"

# iOS ASC API Key 확인
ls ~/.appstoreconnect/AuthKey_*.p8 2>/dev/null && echo "ASC AuthKey OK" || echo "MISSING: ~/.appstoreconnect/AuthKey_*.p8"

# Google Play 서비스 계정 키 확인
test -f google-service-account.json && echo "google-service-account.json OK" || echo "MISSING: google-service-account.json"

# App Store Connect 환경변수 파일 확인
test -f .appstoreconnect.env && echo ".appstoreconnect.env OK" || echo "MISSING: .appstoreconnect.env (ASC_KEY_ID, ASC_ISSUER_ID, TEAM_ID 필요)"

# Production 환경변수 확인
test -f apps/mobile/.env.production && echo ".env.production OK" || echo "MISSING: apps/mobile/.env.production"
```

누락 파일 발견 시 즉시 중단하고 사용자에게 준비 안내.

주의사항:
- `google-service-account.json`은 모노레포 루트에 위치 (`serviceAccountKeyPath` 참조 경로)
- `app-store.mjs`는 `.appstoreconnect.env`를 자동 로드하고, `ASC_APP_ID` 미설정 시 `expo.ios.bundleIdentifier`로 `/v1/apps?filter[bundleId]=` 조회해 앱 ID를 자동 해석한다 (`--app-id` 플래그로 재정의 가능)
- 자동 해석 실패(ASC에 앱 자체가 없음) 시: 사용자에게 App Store Connect 로그인 요청 → agent-browser로 앱 생성/확인

### Step 3: Deploy 산출물 확인 (NEW)

```bash
# AAB 존재 확인
ls -t apps/mobile/build-*.aab | head -1 || echo "BLOCKER: AAB not found. Run /deploy first."

# IPA 존재 확인
ls -t apps/mobile/build/ipa/*.ipa | head -1 || echo "BLOCKER: IPA not found. Run /deploy first."

# Production 스크린샷 확인 (Android)
ls assets/screenshots/android/ko/*.png 2>/dev/null | head -1 || echo "WARNING: No Android screenshots. Run /deploy to generate."

# ASO 이미지 확인 (iOS용)
ls assets/aso-images/ios/ko/*.png 2>/dev/null | head -1 || echo "WARNING: No iOS ASO images. Run /make-aso-images to generate."
```

없으면 BLOCKER → 사용자에게 /deploy 먼저 실행 안내.

NOTE: cleartext 보안 플래그 검증, 법적문서 URL 확인은 여기서 하지 않음. cleartext는 deploy 빌드 스크립트에서 자동 처리, 법적문서는 Phase 2에서 생성.

---

## Phase 1: 스토어 리스팅 준비

### Step 0: 변경 범위 분석 (update 모드만)

```bash
# 마지막 릴리즈 태그 이후 변경된 feature spec 파일 확인
git log --oneline $(git describe --tags --abbrev=0)..HEAD -- docs/features/

# 변경된 feature 목록 추출
git diff --name-only $(git describe --tags --abbrev=0)..HEAD -- docs/features/
```

변경된 feature spec만 분석 대상으로 한정:
- 스크린샷: 변경된 feature 관련 화면만 재캡처
- 스토어 리스팅: 새/변경된 feature 내용을 기존 리스팅에 반영
- 릴리즈 노트: 변경 커밋 기반으로 생성

### Step 1: 앱 설명 작성

`docs/features/` 내 모든 feature spec을 읽고 앱 설명을 자동 생성:

**수집 정보:**

- `docs/features/*.md`에서 User Goal, Summary 추출
- `apps/mobile/app.config.ts`에서 앱 이름, 버전
- 기존 WebView 페이지 목록 (도움말, FAQ 등)

**생성 항목:**

| 항목               | 한국어            | 영어              |
| ------------------ | ----------------- | ----------------- |
| 앱 이름            | app.config에서    | app.config에서    |
| 짧은 설명 (80자)   | feature 기반      | feature 기반      |
| 전체 설명 (4000자) | feature 기반 상세 | feature 기반 상세 |
| 키워드             | feature에서 추출  | feature에서 추출  |
| 카테고리           | feature 분석      | feature 분석      |

결과를 `docs/store-listing.md`에 저장.

**update 모드**: 기존 `docs/store-listing.md`를 읽고 변경된 feature 내용만 반영하여 업데이트.

### Step 2: 릴리즈 노트 작성

**initial 모드:**

```
최초 출시 릴리즈 노트:
- 핵심 기능 3-5개 bullet point
- 한국어 + 영어
```

**update 모드:**

```bash
# 마지막 릴리즈 태그 이후 커밋 분석
git log --oneline $(git describe --tags --abbrev=0)..HEAD
```

- 커밋 메시지에서 사용자에게 보여줄 변경사항 요약 생성
- feature spec 변경 사항과 크로스 참조

결과를 `docs/release-notes.md`에 저장.

### Step 3: 스크린샷 준비

플랫폼별로 별도 처리한다. **Android 스크린샷은 Play Store 전용, iOS 스크린샷은 App Store 전용**이다.

```bash
mkdir -p assets/screenshots/{ios,android}/{ko,en}
```

**캡처 대상 화면 (최소 4장, 최대 10장):**

1. 온보딩/로그인 화면
2. 메인 화면 (핵심 기능)
3. 상세 화면 (주요 인터랙션)
4. 설정/프로필 화면

#### Android 스크린샷

deploy Phase 4에서 이미 캡처된 `assets/screenshots/android/` 를 그대로 사용한다:

```bash
# Android 스크린샷은 deploy에서 이미 생성됨
ls assets/screenshots/android/ko/*.png && echo "Android screenshots OK"
```

파일이 없으면 /deploy 먼저 실행 안내.

#### iOS 스크린샷 (iOS 시뮬레이터 캡처 — deploy Phase 4 Step 3.5)

**iOS 스크린샷은 iOS 시뮬레이터에서 캡처한 것만 쓴다.** Android 캡처를 프레임 처리해 올리면 Android 상태바·네비게이션바가 노출되어 Apple 리젝 사유가 된다.

```bash
# deploy Phase 4 Step 3.5에서 이미 캡처됨
ls assets/screenshots/ios/ko/*.png 2>/dev/null | head -8 || echo "MISSING: /deploy Phase 4 Step 3.5(iOS 시뮬레이터 캡처)를 먼저 실행해주세요."

# 해상도 검증 — 6.7"(1290x2796) 또는 6.9"(1320x2868)
sips -g pixelWidth -g pixelHeight assets/screenshots/ios/ko/*.png
```

ASO 프레임 이미지(`assets/aso-images/ios/ko/`)가 있으면 **그쪽을 우선 업로드**한다 — 단 그 프레임의 내부 스크린샷도 iOS 캡처를 소스로 만들어져야 한다(`/make-aso-images`가 iOS는 iOS 소스만 쓴다). 프레임이 없으면 위 원본을 그대로 올린다.

**스크린샷 사이즈 가이드:**

| 플랫폼 | 규격 | 해상도 | 소스 |
|--------|------|--------|------|
| App Store | 6.7" / 6.9" | 1290x2796 / 1320x2868 | **iOS 시뮬레이터** (deploy Phase 4 Step 3.5) |
| Play Store | phone | 최소 320px, 최대 3840px | **Android 에뮬레이터** (deploy Phase 4 Step 2) |

> display type은 업로드 시 `app-store.mjs screenshots <dir> auto`가 해상도로 자동 판정한다 (6.7"/6.9" 모두 지원). 잘못된 type을 지정하면 ASC가 업로드를 거부한다.

**update 모드**: 변경된 feature 관련 화면만 추가/교체 (Step 0의 분석 결과 기반).

---

## Phase 2: 법적 문서 + 랜딩페이지

### Step 1: 개인정보처리방침 자동 생성

`docs/features/` 내 모든 feature spec에서 **수집하는 데이터**를 분석:

**분석 항목:**

- Data Model의 개인정보 필드 (이메일, 전화번호, 위치 등)
- 사용하는 외부 서비스 (Supabase, PostHog, Kakao, Firebase 등)
- 서버 환경변수에서 연동 서비스 추출

**생성 구조 (한국어):**

1. 개인정보의 처리 목적
2. 처리하는 개인정보 항목
3. 개인정보의 처리 및 보유기간
4. 개인정보의 제3자 제공
5. 개인정보의 위탁
6. 정보주체의 권리·의무
7. 개인정보 파기
8. 개인정보 보호책임자
9. 시행일

결과를 `apps/webview/src/pages/profile/help/PolicyPage.tsx`에 반영.

### Step 2: 이용약관 자동 생성

앱 기능 기반으로 이용약관 생성:

- 서비스 이용 조건
- 이용자 의무
- 서비스 제공자 책임
- 콘텐츠 저작권
- 면책 조항

결과를 `apps/webview/src/pages/profile/app-info/AgreementPage.tsx`에 반영.

### Step 3: 회사/개발자 정보

`apps/webview/src/pages/profile/app-info/CompanyPage.tsx`에 정보를 반영한다.

**출처는 `store-declarations.yaml`의 `business.*` 하나다** (Step -1에서 로드). 사업자명·대표자·주소·연락처·개인정보 보호책임자를 그대로 옮긴다.

- **값을 생성하지 않는다.** 비어 있는 필드는 페이지에서 **생략**하고, 어떤 필드가 비었는지 완료 보고에 명시한다
- `business.address`가 비어 있으면 Play 제출에서 공개 연락처 주소가 필수이므로 `phase_blocked`로 멈춘다 (개인정보처리방침의 보호책임자 항목도 동일)
- auto mode에서 AskUserQuestion으로 되묻지 않는다 — 이 값은 `/preflight`에서 이미 받았어야 하고, 없다면 그 자체가 blocker다

### Step 4: 지원(Support) 페이지 확인/보강

`apps/webview/src/pages/legal/SupportPage.tsx` + `/support` 라우트는 **템플릿에 이미 포함되어 있다** (public 라우트 — 심사자가 로그인 없이 열 수 있어야 한다). 새로 만들지 말고 내용만 채운다.

연락처 이메일은 `VITE_SUPPORT_EMAIL`로 주입한다 — 값은 `store-declarations.yaml`의 `business.email`이다:

```bash
EMAIL=$(node -e "const y=require('fs').readFileSync('docs/store-declarations.yaml','utf8'); const m=y.match(/^\s*email:\s*\"?([^\"\n]+)/m); console.log(m?m[1].trim():'')")
[ -n "$EMAIL" ] || echo "BLOCKER: store-declarations.yaml의 business.email 없음 — Support URL이 연락처 없이 제출된다"
grep -q '^VITE_SUPPORT_EMAIL=' apps/webview/.env.production 2>/dev/null \
  && sed -i '' "s|^VITE_SUPPORT_EMAIL=.*|VITE_SUPPORT_EMAIL=${EMAIL}|" apps/webview/.env.production \
  || echo "VITE_SUPPORT_EMAIL=${EMAIL}" >> apps/webview/.env.production
```

**포함 내용:**
- 앱 이름, 버전
- 개발자 연락처 (이메일: `{developer_email}`)
- FAQ 링크 (기존 FAQ 페이지가 있으면 연결)
- 개인정보처리방침/이용약관 링크
- 버그 신고/기능 요청 안내

라우터에 `/support` 경로 추가 확인.

### Step 5: WebView 재배포 (법적문서 + 지원페이지 포함)

법적 문서 변경 후 WebView 재배포:

```bash
cd apps/webview && pnpm build
wrangler pages deploy dist/ --project-name="${PAGES_PROJECT}"
```

법적 문서 URL 확인 — **`curl -sf`로 검증하지 않는다.**

WebView는 SPA이고 `_redirects`가 모든 경로를 `index.html`로 200 rewrite하므로, **존재하지 않는 라우트도 `curl -sf`를 통과한다.** 실제로 이 게이트는 `/support` 라우트가 없던 동안에도 통과하고 있었다. 렌더된 내용을 확인해야 한다:

```bash
BASE="https://${PAGES_PROJECT}.pages.dev"

check_page() {  # check_page <path> <기대 문구>
  agent-browser open "$BASE/$1" >/dev/null
  agent-browser wait --load networkidle >/dev/null
  BODY=$(agent-browser eval "document.body.innerText")
  if echo "$BODY" | grep -q "$2"; then
    echo "OK: /$1"
  else
    echo "BLOCKER: /$1 이 '$2'를 렌더하지 않음 (라우트 누락 또는 빈 페이지)"
  fi
}

check_page privacy "개인정보"
check_page terms   "이용약관"
check_page support "지원"      # locale에 맞는 문구로 치환 (en이면 "Support")
agent-browser close
```

- 실제 앱의 깨끗한 상태 검증이므로 여기서는 `agent-browser`(격리 헤드리스)를 쓴다 — 로그인이 필요 없는 공개 페이지다
- 세 페이지 모두 OK가 아니면 진행하지 않는다. 스토어에 제출한 개인정보처리방침 URL이 빈 페이지면 확정 리젝이다

### Step 6: 랜딩페이지 생성/배포

**initial 모드:**

- `/setup-landing` 스킬을 활용하여 마케팅 랜딩페이지 생성
- 스토어 다운로드 링크 포함 (아직 스토어 미출시이므로 placeholder 또는 "출시 예정" 표시)
- 개인정보처리방침/이용약관 링크 포함

**update 모드:**

- 기존 랜딩페이지에서 새 기능 섹션 추가

배포 후 URL 확인.

---

## Phase 3: 스토어 제출

> **제출 게이트 (submit_policy)** — Step -1에서 읽은 값에 따라 이 Phase의 마지막 동작이 갈린다.
>
> - `first-app-manual`: 아래 모든 준비(업로드·리스팅·이미지·리뷰정보·콘솔 선언)를 **끝까지 자동으로 수행**하되, iOS `full-submit`과 Play "검토를 위해 앱 전송"은 **실행하지 않는다.** 대신 ① 콘솔 상태 스크린샷 ② 채워진 선언 요약 ③ 실행할 정확한 명령을 제시하고 사용자 확인을 받는다. 확인 후 실행한다.
> - `auto`: 그대로 실행한다.
>
> 어느 쪽이든 **준비 작업은 자동**이다. 게이트는 되돌릴 수 없는 마지막 한 걸음에만 걸린다.

### Step 1: 사전 검증

```bash
# AAB/IPA 존재 재확인
AAB_FILE=$(ls -t apps/mobile/build-*.aab | head -1)
IPA_FILE=$(ls -t apps/mobile/build/ipa/*.ipa | head -1)

# 법적 문서 + 지원 페이지 — Phase 2 Step 5의 check_page(렌더 내용 검증)를 재사용한다.
# curl -sf는 SPA rewrite 때문에 항상 200이므로 게이트로 쓸 수 없다.
```

BLOCKER 발견 시 즉시 중단하고 해결.

### Step 2: App Store 제출 (iOS)

```bash
# 로컬 빌드에서 생성된 IPA를 App Store Connect에 업로드
IPA_FILE=$(ls -t apps/mobile/build/ipa/*.ipa | head -1)
bash scripts/submit-ios.sh "$IPA_FILE"
# → 업로드한 CFBundleVersion이 apps/mobile/build/ipa/.last-build-number에 저장됨
```

업로드 후 CLI로 메타데이터 입력:

```bash
# 버전 상태 확인 (ASC_APP_ID 미설정 시 bundleId로 자동 해석)
node scripts/app-store.mjs status

# 리스팅 업데이트 (docs/store-listing.md 기반)
node scripts/app-store.mjs listing \
  --desc "{전체설명}" \
  --keywords "{키워드1,키워드2}" \
  --promo "{프로모션 텍스트}" \
  --support-url "https://${PAGES_PROJECT}.pages.dev/support" \
  --marketing-url "https://${PAGES_PROJECT}.pages.dev" \
  --copyright "{year} {developer_name}"

# 개인정보처리방침 URL 설정 (App Info localization — 심사 필수)
node scripts/app-store.mjs set-privacy-url --url "https://${PAGES_PROJECT}.pages.dev/privacy" --lang ko

# 스크린샷 업로드 — display type은 실제 해상도로 자동 판정 (6.7"/6.9")
# ASO 프레임이 있으면 그것을, 없으면 시뮬레이터 원본을 올린다
IOS_DIR=$(ls assets/aso-images/ios/ko/*.png >/dev/null 2>&1 && echo assets/aso-images/ios/ko || echo assets/screenshots/ios/ko)
node scripts/app-store.mjs screenshots "$IOS_DIR" auto
```

**심사용 테스트 계정 + Review Details (로그인 있는 앱은 심사 필수):**

1. Supabase MCP `execute_sql`(또는 서버 signup API)로 심사용 계정을 seed:
   - 이메일: `review@{slug}.app` 형식, 비밀번호: 랜덤 생성 후 기록
   - 앱의 핵심 동선이 빈 화면이 아니도록 샘플 데이터도 함께 seed
2. 로그인 검증: 생성한 계정으로 서버 로그인 API 호출이 성공하는지 확인
3. reviewDetail 등록:

```bash
node scripts/app-store.mjs set-review-details \
  --demo-user "review@{slug}.app" \
  --demo-password "{seed한 비밀번호}" \
  --first-name "{이름}" --last-name "{성}" \
  --phone "{연락처}" --email "{developer_email}" \
  --notes "Demo account is pre-seeded with sample data."
```

**심사 제출 (submit-ios.sh가 업로드한 빌드 번호로 게이트):**

```bash
BUILD_NUMBER=$(cat apps/mobile/build/ipa/.last-build-number)
node scripts/app-store.mjs full-submit --build-number "$BUILD_NUMBER" \
  --ko "{릴리즈 노트}" --en "{release notes}"
```

full-submit은 editable version이 없으면 `expo.version`으로 자동 생성하고, **해당 빌드 번호**가 VALID가 될 때까지 대기한 뒤 그 빌드를 선택해 제출한다. 이미 열려 있는 reviewSubmission은 재사용하며, WAITING_FOR_REVIEW/IN_REVIEW면 중복 제출하지 않는다.

**App Privacy (영양성분표) 체크리스트:**

App Privacy는 공개 API 미지원 → page-level CDP(로그인된 탭) 또는 사용자 수동 입력.

**응답 값의 출처는 `store-declarations.yaml`의 `data_safety.*`다** — feature spec의 Data Model은 preflight에서 후보를 제시할 때 쓰였고, 여기서는 이미 사용자가 확정한 선언값만 옮긴다. 아래 매핑으로 `docs/app-privacy-checklist.md`를 생성한 뒤 입력한다:

- 이메일/이름 → "Contact Info > Email Address / Name" — Collected, Linked to user
- 로그인 계정 식별자 → "Identifiers > User ID" — Collected, Linked to user
- 사용자 생성 콘텐츠(게시글/사진 등) → "User Content" 해당 항목
- 사용 데이터 분석(PostHog 등 사용 시) → "Usage Data > Product Interaction"
- 각 항목마다: 수집 여부 / 사용자 연결(Linked) 여부 / 추적(Tracking) 여부 / 수집 목적(App Functionality, Analytics 등)

**App Store 주의사항:**
- 인증: `.appstoreconnect.env`의 `ASC_ISSUER_ID`, `ASC_KEY_ID` (app-store.mjs가 자동 로드) + `~/.appstoreconnect/AuthKey_{ASC_KEY_ID}.p8`
- App Store Connect > Users and Access > Integrations > App Store Connect API에서 발급
- **API Key 역할은 반드시 'Admin'으로 생성** (앱 생성, 제출 등 전체 API 접근에 필요)
- **콘솔 전용**(API 미지원): App Privacy·**연령 등급 설문**·**가격(무료)**·수출 규정. 위 "콘솔 전용 작업 체크리스트" 순서대로 page-level CDP로 처리(연결/클릭 규칙은 상단 "브라우저 콘솔 자동화 규칙" 참조). 콘텐츠 권한/카테고리/저작권은 ASC REST API PATCH로 대체 가능.

### Step 3: Play Store 제출 (Android)

**트랙 정책은 "최초 릴리스"와 "2회차 이후"가 다르다.** Play API 제약 때문이며, 하나로 통일할 수 없다:

```bash
# 이 앱이 이미 출시된 적이 있는지 판정
node scripts/play-store.mjs status 2>/dev/null | grep -qE 'production.*(completed|inProgress)' && FIRST_RELEASE=no || FIRST_RELEASE=yes
AAB_FILE=$(ls -t apps/mobile/build-*.aab | head -1)
```

**① 최초 릴리스 (`FIRST_RELEASE=yes`)** — production에 **draft로** 올린다:

```bash
# --submit 없이 = draft. Play API는 draft 앱의 첫 프로덕션 릴리스에 status:completed를 거부한다
#   ("Only releases with status draft may be created on draft app.")
node scripts/play-store.mjs upload "$AAB_FILE" production --release-notes "{릴리즈 노트}"
```
→ 이후 콘솔 **게시 개요 → "검토를 위해 앱 전송"** 으로 제출한다 (API 경로 없음). `internal → promote`는 이 단계에서 쓸 수 없다 — 앱이 아직 draft라 promote 대상 프로덕션 릴리스를 만들 수 없다.

**② 2회차 이후 (`FIRST_RELEASE=no`)** — `internal` 업로드 → 스모크 확인 → promote → 단계적 롤아웃:

```bash
node scripts/play-store.mjs upload "$AAB_FILE" internal --submit --release-notes "{릴리즈 노트}"
# 확인 후
node scripts/play-store.mjs promote internal production
node scripts/play-store.mjs rollout production 20   # → 50 → 100
```

**production 직행 `--submit`(completed)은 어느 경우에도 하지 않는다** — ①은 API가 거부하고, ②는 단계적 롤아웃을 건너뛰게 된다.

제출 후 CLI로 이미지 업로드 및 리스팅 업데이트:

```bash
# 이미지 업로드 (아이콘 + Feature Graphic + 스크린샷 일괄)
# - 아이콘/Feature Graphic: assets/store/icon-512x512.png, assets/store/feature-graphic-1024x500.png (/make-aso-images 생성)
# - 스크린샷: assets/aso-images/android/{locale}/ 우선, 없으면 assets/screenshots/android/{locale}/ (deploy Phase 4 캡처)
# - 스크린샷 0장이면 non-zero exit → /deploy 또는 /make-aso-images 먼저 실행
node scripts/upload-images.mjs

# 리스팅 업데이트
node scripts/play-store.mjs listing --title "{app_name}" --short "{짧은설명}" --full "{전체설명}"

# 릴리즈 노트 수정이 필요하면 업로드한 트랙(internal)에만 적용
node scripts/play-store.mjs release-notes internal ko-KR "{릴리즈 노트}"

# 트랙 상태 확인
node scripts/play-store.mjs status
```

**Play Store 주의사항:**
- versionCode 중복 에러 → `build-android.sh`가 `apps/mobile/app.json`의 `expo.android.versionCode`를 +1 하고 되쓰므로(단일 소스), 보통은 **재빌드만** 하면 해결된다. `app.json`의 versionCode 증가분이 커밋되지 않아 되돌아간 경우가 대표적 원인이니 먼저 `git status`로 확인한다. `build.gradle`을 직접 수정하지 않는다 — prebuild가 덮어쓴다
- completed 릴리즈에 이미지 업로드 실패 → draft 전환 필요
- 트랙 정책: 위 ①/② 분기를 따른다 (최초 = production draft, 2회차 이후 = internal → promote → 20%/50%/100% 롤아웃). 릴리즈 노트는 항상 업로드/프로모트된 트랙과 동일 트랙에 설정 (promote가 릴리즈 노트를 함께 복사함)
- 인증: `GOOGLE_PLAY_KEY_PATH` 환경변수 또는 루트 `google-service-account.json`

사용자 로그인 후 **page-level CDP**로 (API 미지원 항목만 — 상단 "콘솔 전용 작업 체크리스트" 참조):

- **App content 선언**: 신규 앱은 10종 전부(개인정보 URL, 광고, 앱 액세스+데모계정, 콘텐츠 등급 IARC, 타겟층, 데이터 안전, 정부·금융·건강, 광고 ID). 데모 계정은 iOS와 동일.
- **스토어 설정**: 카테고리 + 연락처 이메일(대시보드 11/11 마지막 관문).

> **최초 제출 시**(상단 "최초 제출 함정" 참조): ①서비스계정에 이 앱 권한 부여됐는지 먼저 확인(없으면 API 403). ②신규 앱 첫 프로덕션은 API `--submit` 불가 → draft 업로드 후 콘솔 게시 개요에서 "검토를 위해 앱 전송". ③국가/지역 지정 + 앱설정 11/11이 돼야 전송 버튼 활성(+최대 14분 빠른검사 대기).

**데이터 안전 양식 가이드:**

**출처는 `store-declarations.yaml`의 `data_safety.*`** — `collects` 배열을 Play 양식 항목으로 매핑한다:

| 선언값 (`data_safety.collects`) | Play 데이터 안전 항목 |
|---|---|
| `email` | Personal info > Email address |
| `name` | Personal info > Name |
| `user_id` | Personal info > User IDs |
| `location` | Location > Approximate/Precise location |
| `photos` | Photos and videos > Photos |
| `user_content` | Messages / Other user-generated content |
| `usage_data` | App activity > App interactions |

각 항목의 나머지 답변도 선언 파일에서 온다:
- 공유 여부 → `data_safety.shared_with_third_parties`에 포함되면 Yes
- 전송 중 암호화 → `data_safety.encrypted_in_transit`
- 삭제 요청 지원 → `data_safety.deletion_request_supported`
- 수집 목적 → `data_safety.purposes`
- 광고 ID → `ads.ad_id_used` (**`app.config.ts`의 AD_ID 권한 선언과 반드시 일치해야 한다** — 불일치는 Play 정책 위반)

> 양식이 동적 분기형이라 자동 입력이 실패할 수 있다. 실패 시 위 매핑 표를 그대로 사용자에게 제시하고 수동 입력을 받는다. **선언값을 임의로 바꾸지 않는다.**
>
> Play Console이 데이터 안전 **CSV 가져오기**를 지원하면 폼 클릭보다 그 경로가 훨씬 안정적이다 — 사용 가능하면 CSV를 생성해 `DOM.setFileInputFiles`로 업로드한다.

### Step 4: 제출 확인

```bash
# Play Store 트랙 상태
node scripts/play-store.mjs status
```

---

## Phase 4: 심사 & 릴리즈

### Step 1: 심사 상태 모니터링

**iOS (App Store Connect):**

```bash
# 심사 상태 폴링 (기본 10분 간격, 24시간 타임아웃)
# REJECTED/UNRESOLVED_ISSUES 시 상태·Resolution Center 링크 출력 후 non-zero exit
node scripts/app-store.mjs wait-review
```

- 장시간 폴링이 부적절하면 `node scripts/app-store.mjs status`로 단발 확인
- 또는 사용자에게 App Store Connect 로그인 요청 → agent-browser로 상태 확인

**Android (Play Store):**

```bash
node scripts/play-store.mjs status
```

### Step 2: 리젝 대응 (해당 시)

**iOS 리젝 시:**

- `wait-review`가 리젝 상태(version/submission state)와 Resolution Center 링크를 출력함
- 사용자에게 App Store Connect 로그인 요청 → agent-browser로 Resolution Center에서 상세 리젝 사유 확인
- 사유 분석 → 수정 필요 항목 도출
- 코드 수정 후 재빌드가 필요한 경우 사용자에게 /deploy 재실행 안내 → 재제출
- 최대 3회 재시도

**Android 리젝 시:**

- 사용자에게 Play Console 로그인 요청 → agent-browser로 리젝 사유 확인
- 코드 수정 후 재빌드가 필요한 경우 사용자에게 /deploy 재실행 안내 → 재제출
- 최대 3회 재시도

### Step 3: 릴리즈 관리

심사 통과 후:

**iOS:**

- 사용자에게 App Store Connect 로그인 요청 → agent-browser로 "Release" 버튼 클릭
- 또는 사용자에게 수동 릴리즈 요청

**Android:**

```bash
# internal → production 프로모트
node scripts/play-store.mjs promote internal production

# 또는 단계적 롤아웃
node scripts/play-store.mjs rollout production 20
# 확인 후 확대
node scripts/play-store.mjs rollout production 100
```

### Step 4: 출시 확인

```bash
# Play Store에서 앱이 공개되었는지 확인
curl -sf "https://play.google.com/store/apps/details?id={package_name}" | grep -q "{app_name}" && echo "LIVE on Play Store"
```

App Store는 사용자에게 App Store Connect 로그인 요청 → agent-browser로 확인.

### Step 4.5: 랜딩페이지 업데이트 (출시 후)

스토어 링크가 실제로 동작하는 상태가 되면 랜딩페이지를 업데이트:

- placeholder 링크를 실제 스토어 링크로 교체
  - App Store: `https://apps.apple.com/app/id{ascAppId}`
  - Play Store: `https://play.google.com/store/apps/details?id={package_name}`
- 재배포

---

## Phase 5: Completion Report

`apps/mobile/app.config.ts`에서 추출한 변수를 사용하여 보고서를 작성한다.

```
## Launch Complete: {mode}
Date: {timestamp}

### Store Status
| Store | Status | URL |
|-------|--------|-----|
| App Store | Live | https://apps.apple.com/app/id{ascAppId} |
| Play Store | Live | https://play.google.com/store/apps/details?id={package_name} |

### Generated Assets
| Asset | Path |
|-------|------|
| Store Listing | docs/store-listing.md |
| Release Notes | docs/release-notes.md |
| Screenshots (Android) | assets/screenshots/android/ |
| Screenshots (iOS) | assets/screenshots/ios/ |
| Privacy Policy | https://${PAGES_PROJECT}.pages.dev/privacy |
| Terms of Service | https://${PAGES_PROJECT}.pages.dev/terms |
| Landing Page | https://{landing-url} |

### Review History
| Platform | Submitted | Approved | Attempts |
|----------|-----------|----------|----------|
| iOS | {date} | {date} | {n} |
| Android | {date} | {date} | {n} |

### Next Steps
- 사용자 피드백 모니터링
- PostHog 대시보드 확인
```

---

## Error Handling

| Situation                    | Action                                                    |
| ---------------------------- | --------------------------------------------------------- |
| Deploy 미완료                | /deploy 먼저 실행 안내                                    |
| AAB/IPA 미존재               | /deploy 먼저 실행 안내                                    |
| Apple Developer 계정 없음    | 가입 안내 (agent-browser로 링크 제공)                     |
| Apple App ID 미등록          | developer.apple.com에서 Identifier 등록 안내              |
| Play Store 앱 미등록         | 사용자 로그인 → agent-browser로 앱 생성                   |
| 서버 URL 플레이스홀더        | 사용자에게 실제 URL 질문 후 app.config.ts 수정            |
| keystore.properties 없음     | `apps/mobile/keystore.properties` 생성 안내 (Android 서명 키 설정) |
| ASC AuthKey 없음             | `~/.appstoreconnect/AuthKey_*.p8` 및 `.appstoreconnect.env` 준비 안내 |
| xcrun altool 업로드 실패     | ASC API Key 권한 확인 (Admin 역할 필요), 재시도            |
| Android 원본 스크린샷 없음    | /deploy Phase 4 Step 2(production ADB smoke, 스토어 캡처 모드) 실행 안내 |
| iOS 원본 스크린샷 없음        | /deploy Phase 4 Step 3.5(Release 시뮬레이터 캡처) 실행 안내 — Android 캡처로 대체 금지 |
| iOS ASO 프레임 없음          | 선택 사항 — 원본(assets/screenshots/ios/{locale})을 그대로 업로드한다 |
| Feature Graphic/512 아이콘 없음 | /make-aso-images 실행하여 `assets/store/` 자산 생성    |
| 심사용 데모 계정 미준비      | Supabase seed로 계정 생성 → `set-review-details` 재실행   |
| upload-images.mjs 스크린샷 0장 exit | /deploy → /make-aso-images 순서로 재실행 안내       |
| 콘텐츠 등급 설문 자동화 실패 | 사용자에게 체크리스트 제공 후 수동 응답 요청               |
| agent-browser가 로그인 페이지로 리다이렉트 | 세션 인수 불가(특히 Arc) → page-level raw CDP로 로그인된 탭 직접 구동 (상단 규칙) |
| CDP ws 403 Forbidden          | Origin 헤더 제거(suppress_origin) 또는 `--remote-allow-origins=*`로 브라우저 기동 |
| Play API 403 PERMISSION_DENIED | 서비스계정에 해당 앱 권한 미부여 → 콘솔 사용자·권한에서 앱 추가 후 재시도 |
| Play "Only releases with status draft may be created on draft app" | 신규 앱 첫 프로덕션 → draft로 업로드 후 콘솔 게시 개요에서 "검토를 위해 전송" |
| Play "검토를 위해 앱 전송" 비활성 | 앱설정 11/11(카테고리+연락처)·국가 지정된 릴리스 저장 확인, 빠른검사(최대 14분) 대기 |
| iOS 심사 리젝               | 사유 분석 → 수정 → 재제출 (최대 3회), 재빌드 필요 시 /deploy 재실행 안내 |
| Android 심사 리젝            | 동일 (최대 3회), 재빌드 필요 시 /deploy 재실행 안내       |
| 3회 리젝                    | 상세 보고 + 사용자에게 수동 대응 안내                     |

## Constraints

- 빌드는 deploy에서 완료된 AAB/IPA를 사용 — launch에서 빌드하지 않음
- 법적 문서는 스토어 제출 전 Phase 2에서 생성/배포
- Android 원본 스크린샷은 deploy Phase 4(스토어 캡처 모드)에서 캡처된 `assets/screenshots/android/{locale}/` 사용
- **Play 트랙 정책은 릴리스 회차에 따라 갈린다** — 최초 릴리스는 `production` **draft** 업로드 후 콘솔 "검토를 위해 앱 전송"(API가 draft 앱의 completed를 거부), 2회차 이후는 `internal` 업로드 → `promote internal production` → 단계적 롤아웃. 어느 경우에도 production 직행 `--submit`은 하지 않는다. 릴리즈 노트는 항상 업로드/프로모트한 트랙과 동일 트랙에 설정한다
- **iOS 제출은 submit-ios.sh가 저장한 빌드 번호(`apps/mobile/build/ipa/.last-build-number`)로 게이트** — 이전 빌드가 심사에 제출되는 것 방지
- **iOS 스크린샷은 iOS 시뮬레이터 캡처(deploy Phase 4 Step 3.5)를 원본으로 쓴다** — ASO 프레임이 있으면 그것을 올리되, 그 프레임의 내부 스크린샷도 iOS 캡처여야 한다. 해상도는 원본을 유지하고 업로드 시 `screenshots <dir> auto`가 display type을 판정한다 (임의 리사이즈 금지 — 규격 불일치는 ASC가 거부)
- **Android 스크린샷은 Play Store 전용, iOS 스크린샷은 App Store 전용** (혼용 금지, Apple 리젝됨)
- 스토어 설명은 feature spec 기반으로 정확하게 작성 (과장 금지)
- App Store 가이드라인 준수 (4.2 Minimum Functionality 등)
- Play Store 정책 준수 (개인정보, 권한 설명 등)
- 개인정보처리방침 URL은 반드시 접근 가능한 HTTPS URL
- agent-browser 사용 전 반드시 사용자가 해당 콘솔에 로그인 완료해야 함
- **CF Pages 프로젝트명은 `PAGES_PROJECT` 단일 소스** — `infra/oracle/.deploy-state`의 `PAGES_PROJECT`를 읽고, 없을 때만 `expo.slug`에서 `-mobile`을 제거한 값으로 폴백한다 (provision-cloudflare.sh의 파생 규칙과 동일). `{slug}`를 그대로 쓰면 webview가 배포된 프로젝트와 다른 이름이 되어 스토어에 제출한 법적문서 URL이 갈라진다
- `google-service-account.json`은 모노레포 루트에 위치
