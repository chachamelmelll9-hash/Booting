---
name: make-aso-images
description: Generate store-ready ASO (App Store Optimization) framed screenshots. Selects high-impact features, finds matching screenshots, and renders framed images with feature descriptions and app branding. Run after /deploy (which captures raw screenshots).
argument-hint: "[locale]"
allowed-tools: Read, Write, Edit, Glob, Grep, Agent, Bash(agent-browser *), Bash(mkdir *), Bash(ls *), Bash(cp *), Bash(sips *), Bash(node *), Bash(cat *), Bash(test *), Bash(rm -rf assets/aso-images/temp*), Skill(launch)
---

## Auto Mode

`docs/progress/auto-mode.json` 파일이 존재하고 `enabled=true`이면:
- 헤드라인 확인 스킵 — AI가 생성한 헤드라인 사용
- 스크린샷 매칭 확인 스킵 — AI가 best-match 자동 선택
- Completion 후 `/launch initial`을 즉시 호출

---

## Usage

If the user provided an argument, use it as the locale: $ARGUMENTS
Default locale is `ko`.

## Prerequisites

Raw screenshots must exist. **생산자는 둘 다 `/deploy` Phase 4이고, 플랫폼별로 단계가 다르다:**

| 플랫폼 | 원본 경로 | 생산 단계 |
|---|---|---|
| Android | `assets/screenshots/android/{locale}/NN-name.png` | Phase 4 **Step 2** — adb-smoke agent의 스토어 캡처 모드 (wireframe 기준 4~8장) |
| iOS | `assets/screenshots/ios/{locale}/NN-name.png` | Phase 4 **Step 3.5** — Release 시뮬레이터 캡처 (deep link 진입) |

```bash
ls assets/screenshots/android/ko/*.png 2>/dev/null | head -5 || echo "MISSING: Android 원본"
ls assets/screenshots/ios/ko/*.png 2>/dev/null | head -5 || echo "MISSING: iOS 원본"
```

- Android 원본이 없으면 → "/deploy Phase 4 Step 2(production ADB smoke, 스토어 캡처 모드)를 먼저 실행해주세요."
- iOS 원본이 없으면 → **Android 프레임만 생성하고 iOS는 스킵**한다. Android 캡처를 iOS 프레임 소스로 쓰지 않는다 (Android 상태바 노출 → Apple 리젝). 보고에 스킵 사실과 `/deploy Phase 4 Step 3.5` 안내를 명시한다.

## Progress Tracking (JSONL)

> 스키마: `docs/progress/SCHEMA.md` 참조

**스킬 시작 시** `docs/progress/pipeline.jsonl`에 append:
```bash
mkdir -p docs/progress
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":null,"phase":"build","skill":"make-aso-images","event":"phase_started","detail":{}}' >> docs/progress/pipeline.jsonl
```

**Step 5 완료 후** append:
```bash
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":null,"phase":"build","skill":"make-aso-images","event":"phase_completed","detail":{"artifacts":["assets/aso-images/android/ko/","assets/aso-images/ios/ko/"]},"output":"assets/aso-images/"}' >> docs/progress/pipeline.jsonl
```

---

## Instructions

### Step 1: Analyze Features & Select Top 3-4

Read all feature specs:

```bash
ls docs/features/*.md
```

Read each spec file and analyze from an ASO/marketing perspective:
- **사용자 가치**: 이 기능이 사용자에게 주는 즉각적인 혜택
- **차별화**: 경쟁 앱 대비 독특한 점
- **시각적 임팩트**: 스크린샷으로 보여줬을 때 매력도
- **전환 기여**: 스토어에서 다운로드 결정에 미치는 영향

핵심 기능 3~4개를 선택하고, 각각에 대해:
1. **헤드라인** (5~6단어, 한국어): 스토어에서 시선을 끄는 짧은 문구
2. **매칭 스크린샷**: 해당 기능이 가장 잘 보이는 화면

Example output:
```
1. "한눈에 보는 오늘의 설교" → 02-main.png
2. "AI가 정리한 핵심 요약" → 03-detail.png
3. "놓친 설교도 다시 듣기" → 04-archive.png
```

### Step 2: Extract App Theme

앱의 메인 컬러와 폰트 정보를 추출한다:

```bash
# 1. app.config.ts에서 primaryColor, backgroundColor 등 확인
cat apps/mobile/app.config.ts

# 2. shared styles에서 컬러 팔레트 확인
cat apps/mobile/src/shared/config/styles.ts

# 3. 테마 파일이 있으면 확인
ls apps/mobile/src/shared/config/theme* 2>/dev/null
```

추출할 값:
- `PRIMARY_COLOR`: 앱 메인 컬러 (hex)
- `BG_COLOR`: 프레임 배경색 (메인 컬러 기반, 밝거나 어둡게 조정)
- `TEXT_COLOR`: 헤드라인 텍스트 색상 (배경 대비 가독성 확보)

### Step 3: Match Screenshots to Features

Step 1에서 선정한 기능을 **플랫폼별 원본 디렉토리**에서 각각 매칭한다. deploy가 두 플랫폼에서 같은 화면 세트를 같은 순번·슬러그로 캡처하므로 파일명이 대응된다:

```bash
ls assets/screenshots/android/ko/   # Android 원본 (deploy Phase 4 Step 2)
ls assets/screenshots/ios/ko/       # iOS 원본 (deploy Phase 4 Step 3.5)
```

파일명 패턴: `01-onboarding.png`, `02-main.png`, `03-detail.png`, `04-settings.png` 등
(deploy Phase 4에서 생성된 이름)

매칭이 불분명하면 사용자에게 확인.

### Step 4: Generate Framed ASO Images

각 선정된 기능에 대해 프레임 이미지를 생성한다.

#### 4-1. HTML 프레임 생성

[references/frame-template.html](references/frame-template.html)을 기반으로, 각 스크린샷별 HTML 파일을 생성한다.

생성 위치: `assets/aso-images/temp/{platform}-frame-{N}.html` — 플랫폼마다 별도 파일을 만든다 (`android-frame-1.html`, `ios-frame-1.html`). `{{SCREENSHOT_PATH}}`와 `{{FRAME_WIDTH/HEIGHT}}`가 플랫폼별로 다르므로 하나의 HTML을 공유할 수 없다.

HTML에서 치환할 값:
- `{{BG_COLOR}}`: 배경색
- `{{TEXT_COLOR}}`: 텍스트 색상
- `{{HEADLINE}}`: 기능 설명 텍스트 (5~6단어)
- `{{SCREENSHOT_PATH}}`: 스크린샷 절대 경로
- `{{FRAME_WIDTH}}`: 타깃 해상도 너비
- `{{FRAME_HEIGHT}}`: 타깃 해상도 높이

**레이아웃 핵심 규칙:**
- 텍스트와 스크린샷 사이 간격은 최소화 (20~32px)
- 스크린샷은 프레임 높이의 75~80%를 차지
- 텍스트는 상단 영역에 중앙 정렬
- 스크린샷은 하단에 중앙 배치, 모서리 라운딩 적용

#### 4-2. agent-browser로 렌더링

각 HTML을 agent-browser로 열어 PNG 캡처한다.

> **viewport는 `set viewport <w> <h>` 서브커맨드로, open 전에 지정한다.**
> `--viewport 1290x2796`은 **존재하지 않는 플래그이며 조용히 무시된다** — agent-browser가 미지의 플래그에 에러를 내지 않아 아무도 눈치채지 못한다. 실측: `--viewport 640x480`으로 캡처하면 기본값 1512x860이 나오고, `set viewport 640 480`은 정확히 640x480이 나온다. 잘못된 크기의 스토어 이미지는 업로드 단계에서 거부되므로 캡처 후 반드시 `sips`로 검증한다.
> `--allow-file-access`는 실제 존재하는 플래그다 (`file://` 로컬 파일 접근용) — 그대로 쓴다.

**플랫폼별 소스가 다르다** (Apple 리젝 방지 — 혼용 금지):

| 출력 | 프레임 내부 스크린샷 소스 | 타깃 해상도 |
|---|---|---|
| `assets/aso-images/android/{locale}/` | `assets/screenshots/android/{locale}/` (Android 에뮬레이터) | 1080x1920 |
| `assets/aso-images/ios/{locale}/` | `assets/screenshots/ios/{locale}/` (**iOS 시뮬레이터**) | 캡처 원본과 동일 (1290x2796 또는 1320x2868) |

iOS 원본이 없으면 iOS 프레임을 **만들지 않는다** — Android 캡처로 대체하지 않고, `/deploy` Phase 4 Step 3.5를 먼저 실행하도록 안내한다.

```bash
mkdir -p assets/aso-images/android/ko assets/aso-images/ios/ko

# --- Android (소스: assets/screenshots/android/ko) ---
agent-browser set viewport 1080 1920
agent-browser --allow-file-access open "file://$(pwd)/assets/aso-images/temp/android-frame-1.html"
agent-browser wait 1000
agent-browser screenshot assets/aso-images/android/ko/01-feature.png

# --- iOS (소스: assets/screenshots/ios/ko — 해상도는 원본과 동일하게) ---
IOS_SRC=$(ls assets/screenshots/ios/ko/*.png 2>/dev/null | head -1)
if [ -n "$IOS_SRC" ]; then
  W=$(sips -g pixelWidth "$IOS_SRC" | awk '/pixelWidth/{print $2}')
  H=$(sips -g pixelHeight "$IOS_SRC" | awk '/pixelHeight/{print $2}')
  agent-browser set viewport "$W" "$H"
  agent-browser --allow-file-access open "file://$(pwd)/assets/aso-images/temp/ios-frame-1.html"
  agent-browser wait 1000
  agent-browser screenshot assets/aso-images/ios/ko/01-feature.png
else
  echo "SKIP iOS ASO: assets/screenshots/ios/ko 없음 — /deploy Phase 4 Step 3.5 먼저 실행"
fi

agent-browser close
```

각 스크린샷에 대해 반복한다. HTML은 플랫폼별로 따로 생성한다 (`temp/android-frame-N.html`, `temp/ios-frame-N.html`) — `{{SCREENSHOT_PATH}}`와 `{{FRAME_WIDTH/HEIGHT}}`가 다르기 때문이다.

#### 4-3. 해상도 검증

```bash
sips -g pixelWidth -g pixelHeight assets/aso-images/android/ko/*.png
sips -g pixelWidth -g pixelHeight assets/aso-images/ios/ko/*.png
```

| 플랫폼 | 타깃 해상도 | 스토어 규격 |
|---------|-------------|-------------|
| Android | 1080x1920 | Play Store phoneScreenshots |
| iOS 6.7" | 1290x2796 | App Store APP_IPHONE_67 |
| iOS 6.9" | 1320x2868 | App Store APP_IPHONE_69 |

iOS는 **원본 캡처 해상도를 유지**한다. 업로드 시 `app-store.mjs screenshots <dir> auto`가 해상도로 display type을 판정하므로, 두 규격 중 어느 쪽이든 그대로 통과한다. 임의 리사이즈는 하지 않는다 (규격 불일치 시 ASC가 거부).

#### 4-4. Play Store 그래픽 자산 생성 (512 아이콘 + Feature Graphic)

`scripts/upload-images.mjs`가 읽는 `assets/store/` 자산을 생성한다:

```bash
mkdir -p assets/store

# 512x512 리스팅 아이콘 (없을 때만 — /setup-icons가 이미 생성했을 수 있음)
test -f assets/store/icon-512x512.png || cp apps/mobile/assets/images/icon.png assets/store/icon-512x512.png
sips -z 512 512 assets/store/icon-512x512.png
```

**Feature Graphic (1024x500):** [references/feature-graphic-template.html](references/feature-graphic-template.html)을 기반으로 HTML을 생성해 프레임 이미지와 동일한 방식으로 렌더링한다.

치환할 값:
- `{{BG_COLOR}}`, `{{TEXT_COLOR}}`: Step 2에서 추출한 테마 컬러
- `{{APP_NAME}}`: `apps/mobile/app.json`의 `expo.name`
- `{{TAGLINE}}`: Step 1 헤드라인 중 가장 임팩트 있는 한 줄
- `{{ICON_PATH}}`: `file://$(pwd)/assets/store/icon-512x512.png`

생성 위치: `assets/aso-images/temp/feature-graphic.html`

```bash
agent-browser set viewport 1024 500
agent-browser --allow-file-access open "file://$(pwd)/assets/aso-images/temp/feature-graphic.html"
agent-browser wait 1000
agent-browser screenshot assets/store/feature-graphic-1024x500.png
agent-browser close

# 해상도 검증 (정확히 1024x500)
sips -g pixelWidth -g pixelHeight assets/store/feature-graphic-1024x500.png
```

### Step 5: Cleanup & Report

```bash
# temp HTML 삭제
rm -rf assets/aso-images/temp/
```

결과 보고:

```
## ASO Images Generated

### Features Selected
| # | Headline | Screenshot | Rationale |
|---|----------|------------|-----------|
| 1 | {headline} | {source} | {why this feature} |

### Output Files
| Platform | Path | Size | Count |
|----------|------|------|-------|
| Android | assets/aso-images/android/ko/ | 1080x1920 | {n} |
| iOS | assets/aso-images/ios/ko/ | 1290x2796 | {n} |
| Play 아이콘 | assets/store/icon-512x512.png | 512x512 | 1 |
| Feature Graphic | assets/store/feature-graphic-1024x500.png | 1024x500 | 1 |

### Next Steps
- 이미지 확인 후 `/launch` 실행
- Upload scripts:
  - iOS: `node scripts/app-store.mjs screenshots assets/aso-images/ios/ko auto` (display type은 해상도로 자동 판정 — 6.7"/6.9" 모두 지원)
  - Android: `node scripts/upload-images.mjs` (아이콘·Feature Graphic·스크린샷 일괄 업로드 — `assets/aso-images/android/{locale}/` 우선, 없으면 `assets/screenshots/android/{locale}/`)
```

### Step 5.5: Auto-Chain to Launch

`docs/progress/auto-mode.json`을 읽는다. `enabled=true`이면:
즉시 `/launch initial`을 호출한다 (`Skill(launch) initial`).

## Interaction Rules

1. Feature spec이 없으면 사용자에게 앱의 핵심 기능 3~4개를 직접 질문한다.
2. **Auto mode**: 헤드라인/스크린샷 매칭을 AI가 자율 결정. **Interactive mode**: 반드시 사용자 확인을 받는다 (AskUserQuestion 또는 채팅).
3. **Auto mode**: 스크린샷 best-match 자동 선택. **Interactive mode**: 불분명하면 사용자에게 확인한다.
4. 색상은 앱 테마에서 자동 추출하되, 결과가 부자연스러우면 조정한다.
5. 렌더링 결과를 사용자가 확인할 수 있도록 경로를 안내한다.
6. 텍스트와 스크린샷 간격이 멀어지면 안 된다 — 간격 최소화가 핵심.
