# Preflight — auto mode 진입 전 1회 세팅

auto mode(`/setup auto: ...`)는 기획부터 스토어 제출까지 자동으로 진행한다. 다만 **개발자 계정·결제·신원 확인·2FA는 원리적으로 자동화할 수 없다.** 이 문서는 그 "1회 세팅"을 모아둔 체크리스트다.

핵심 구분:

| | 1회 (계정/머신당) | 앱당 (반복) |
|---|---|---|
| 계정·결제·신원 | Apple Developer($99/년), Play Console($25 + 신원확인), Oracle Cloud, 도메인 | — |
| 크레덴셜 | ASC API Key, Play 서비스계정, keystore, OCI/CF 토큰 | 없음 |
| 브라우저 | 원격 디버깅 기동 + 콘솔 로그인 + 2FA | 세션 유지 확인만 |
| 선언 | `docs/store-declarations.yaml` 최초 작성 | 앱별 차이만 갱신 |
| **실제 작업** | — | **전부 자동** |

`/preflight`가 아래 항목을 자동 점검하고, 가능한 것은 자동 생성한다.

---

## Tier 1 — 기획·구현에 필요 (없으면 auto mode 진입 불가)

| 항목 | 확인 | 없을 때 |
|---|---|---|
| 자기 repo origin | `git remote get-url origin`이 벤더 repo(`product-engineer-community/shippen`)가 아님 | README Quick Start로 repo 생성 후 origin 재지정 |
| node / pnpm | `node -v`, `pnpm -v` | `scripts/initial-setup.sh`가 설치 |
| Android SDK + AVD | `adb devices`, `emulator -list-avds` | Android Studio에서 AVD 1개 생성 |
| Supabase (인증 쓰는 앱) | `supabase projects list` 성공 + `.mcp.json`에 supabase | `bash scripts/provision-supabase.sh` |
| **Supabase MCP 활성화** | `/mcp`에서 supabase 연결 상태 | **`.mcp.json` 생성 후 세션 재시작 필요** — 재시작 전에는 `apply_migration`을 쓸 수 없다 |
| Kakao 로그인 (쓸 경우만) | `apps/mobile/app.json`의 `nativeAppKey`가 placeholder 아님 | `/start`가 브라우저로 등록, 또는 `preferences.kakao_login=false`로 스킵 |

> **MCP 재시작 주의** — Supabase를 새로 프로비저닝했다면 auto mode를 시작하기 **전에** 세션을 재시작한다. 구현 단계(db-implement)가 MCP `apply_migration`을 쓰는데, 같은 세션에서는 새 MCP 서버가 로드되지 않는다.

## Tier 2 — 배포·출시에 필요 (없으면 기획·구현까지만 자동 진행)

Tier 2가 비어 있어도 auto mode는 시작하고, **앱 빌드 + 에뮬레이터 동작확인(`verify` phase)까지 자동으로 완주한다.**
`auto-mode.json`에 `release_ready: false`로 기록되고, 라우터가 `deploy`/`build`/`launch`만 건너뛴다.

> Tier 2는 **출시**의 전제이지 **개발·빌드·동작확인**의 전제가 아니다. 계정이 없다는 이유로 로컬에서
> 100% 자동화 가능한 구간까지 막혀서는 안 된다 (실측 결함: 과거 이 자리에서 파이프라인 전체가 죽었다).

### 인프라

| 항목 | 확인 | 준비 |
|---|---|---|
| Oracle Cloud VM | `infra/oracle/.deploy-state`의 `ORACLE_HOST` + SSH 접속 | `bash scripts/provision-oracle.sh` (계정·카드 필요) |
| Cloudflare | `wrangler whoami` + `.deploy-state`의 `PAGES_PROJECT` | `bash scripts/provision-cloudflare.sh` (도메인 보유 필요) |
| 도메인 | Cloudflare에 zone 등록됨 | 구매 후 네임서버 이전 |

### Android 서명 키

`keytool`로 **자동 생성 가능**하다. `/preflight`가 없으면 만든다:

```bash
# 1) keystore 생성 (비밀번호는 무작위 생성해 keystore.properties에만 기록)
keytool -genkeypair -v -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 \
  -keystore apps/mobile/release.jks -alias release \
  -dname "CN=<앱 이름>, OU=<조직>, O=<조직>, L=Seoul, S=Seoul, C=KR" \
  -storepass "<생성한 비밀번호>" -keypass "<생성한 비밀번호>"

# 2) apps/mobile/keystore.properties (gitignore 대상)
cat > apps/mobile/keystore.properties <<EOF
storeFile=release.jks
storePassword=<생성한 비밀번호>
keyAlias=release
keyPassword=<생성한 비밀번호>
EOF
```

> **이 키를 잃으면 같은 앱을 다시 업데이트할 수 없다.** `release.jks`와 `keystore.properties`를 별도 보관(1Password 등)하라. 둘 다 `.gitignore` 대상이다.

### iOS

| 항목 | 확인 | 준비 |
|---|---|---|
| Apple Developer Program | 가입 상태 | developer.apple.com ($99/년, 조직은 D-U-N-S 필요) |
| App ID | `expo.ios.bundleIdentifier`가 Identifiers에 등록 | 콘솔 등록 (또는 `-allowProvisioningUpdates`가 자동 생성) |
| ASC API Key (**Admin 역할**) | `~/.appstoreconnect/AuthKey_{KEY_ID}.p8` | ASC → Users and Access → Integrations |
| `.appstoreconnect.env` | `ASC_KEY_ID`, `ASC_ISSUER_ID`, `TEAM_ID` | 위 발급 화면의 값 |
| Xcode | `xcodebuild -version` | App Store에서 설치 |

### Android 스토어

| 항목 | 확인 | 준비 |
|---|---|---|
| Play Console 계정 | 신원·주소 확인 완료 | play.google.com/console ($25, 신분증 필요) |
| **앱 등록** | `node scripts/play-store.mjs status` 성공 | 콘솔에서 앱 만들기 — API는 앱이 이미 있어야 동작 |
| 서비스계정 + **앱별 권한** | 같은 명령이 403이 아님 | 콘솔 → 사용자 및 권한 → 앱 추가 (출시/앱정보관리) |
| `google-service-account.json` | 루트에 존재 | GCP 서비스계정 키 다운로드 |
| `apps/mobile/google-services.json` | 존재 (Firebase 쓰는 경우) | Firebase 콘솔 |

### 브라우저 콘솔 세션 (콘솔 전용 항목 자동화용)

공개 API가 없는 항목(연령 등급 설문, App Privacy, 데이터 안전, "검토를 위해 앱 전송")은 **이미 로그인된 탭**을 page-level CDP로 구동한다.

```bash
# 브라우저를 원격 디버깅으로 기동 (Arc는 --remote-allow-origins=* 도 필요)
# 그리고 App Store Connect / Play Console에 로그인(2FA 포함)해 탭을 열어둔다
curl -s http://localhost:9222/json | grep -o '"url": "[^"]*"' | grep -E 'appstoreconnect|play.google.com/console'

# 드라이버 의존성
pip install websocket-client
```

- `agent-browser`는 **로그인 세션을 이어받지 못한다** (쿠키 없는 별도 컨텍스트, Arc에서는 확실히 실패). 콘솔 작업에 쓰지 않는다.
- 드라이버: `.claude/skills/launch/references/pcdp.py`

### 선언 데이터

| 항목 | 확인 | 준비 |
|---|---|---|
| `docs/store-declarations.yaml` | 존재 + 필수 필드 채워짐 | `docs/store-declarations.example.yaml` 복사 후 작성 (`/preflight`가 대화형으로 생성) |
| 아이콘 소스 이미지 | `assets/icon-source.png` (1024×1024 권장) | 없으면 `/setup-icons`가 스킵되고 템플릿 아이콘으로 출시된다 |

---

## 완료 판정

```bash
# /preflight가 기록한 결과
cat docs/progress/preflight.json
```

- `tier1_ok: true` → auto mode 진입 가능
- `release_ready: true` → `deploy`·`build`·`launch`(스토어 제출)까지 자동 진행 가능
- `release_ready: false` → 기획·구현·빌드·동작확인(`verify`)까지 자동 완주, `deploy`/`build`/`launch`는 `phase_deferred`로 연기
