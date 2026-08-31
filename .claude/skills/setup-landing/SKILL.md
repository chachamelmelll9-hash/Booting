---
name: setup-landing
description: Generate a landing page for the app by analyzing the codebase and deploying to Cloudflare Pages. Use when the user wants to create or update the app's landing page.
argument-hint: "[language] [description]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(pnpm *), Bash(npx wrangler *), Bash(wrangler *), Bash(cd apps/*), Bash(cat *), Bash(grep *), Bash(node *), Bash(mkdir *), Bash(echo *), Bash(curl *), Bash(test *)
---

## Auto Mode

`docs/progress/auto-mode.json` 파일이 존재하고 `enabled=true`이면:

- 이 스킬은 `build` phase의 subphase다 (setup-icons 다음, make-aso-images 이전)
- **Phase 2 사용자 확인을 스킵**한다. 대신 아래 순서로 값을 확정한다:
  1. `docs/store-declarations.yaml`의 `landing.tagline` / `landing.target_audience` / `business.*`
  2. 없으면 `docs/features/feature-summary.md` + `docs/features/core-idea.md`에서 근거 있는 요약을 도출
  3. **값을 창작하지 않는다** — 사업자명·연락처는 `store-declarations.yaml`에만 의존하고, 없으면 해당 섹션을 랜딩에서 생략한다
- 스토어 링크는 아직 미출시이므로 `#` placeholder를 쓰고, launch Phase 4.5에서 실제 링크로 교체된다
- Pages 배포는 auto mode 승인 계약에 포함된다 (`AGENTS.md` Auto Mode Exception)
- wrangler 미인증 등 **외부 수동 blocker**를 만나면 `phase_deferred`를 기록하고 이 subphase만 넘긴다 (`phase_blocked`가 아니다 — 랜딩 배포는 release-gated 작업이고, 앱의 빌드·동작과 무관하다)
- 이 subphase만 끝내고 다음 스킬을 직접 호출하지 않는다 (Stop 훅 라우터가 다음 subphase를 지정한다)

**Progress Tracking** (스키마: `docs/progress/SCHEMA.md`):

```bash
mkdir -p docs/progress
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":null,"phase":"build","skill":"setup-landing","event":"phase_started","detail":{}}' >> docs/progress/pipeline.jsonl
```

```bash
echo '{"ts":"'"$(date +%Y-%m-%dT%H:%M:%S%z)"'","iter":"initial","feature":null,"phase":"build","skill":"setup-landing","event":"phase_completed","detail":{"artifacts":["apps/webview/src/pages/landing/LandingPage.tsx"],"url":"{deployed-url}"}}' >> docs/progress/pipeline.jsonl
```

> `iter` 값은 출시 후 이터레이션에서 활성 iter로 치환한다 — `docs/progress/SCHEMA.md` 참조.

---

## Arguments

$ARGUMENTS

Parse the arguments for:
- **language**: `ko`, `en`, etc. (default: `ko`)
- Any additional description or keywords the user wants to emphasize

Example: `/setup-landing ko` or `/setup-landing en "AI-powered fitness tracker"`

---

## Phase 1: Codebase Analysis

Automatically scan the project to extract app information:

1. **Read `apps/mobile/app.json`** → app name, slug, scheme, bundle ID
2. **Read `apps/mobile/package.json`** → dependencies (detect features from packages)
3. **Scan `apps/mobile/app/` directory structure** → identify screens and navigation
4. **Scan `apps/mobile/src/features/`** → identify feature modules
5. **Read `apps/server/src/`** → identify API modules and capabilities
6. **Read `packages/i18n/src/locales/`** → extract existing translations for feature names
7. **Check `apps/mobile/assets/images/icon.png`** → app icon exists?
8. **Check `apps/webview/public/logo.png`** → logo exists?

Build a feature summary from the analysis:
- App name and purpose
- Core features (from feature modules and API endpoints)
- User roles (from auth/roles if detected)
- Platform support (iOS, Android, Web)

## Phase 2: User Confirmation

**Auto mode**: 스킵. 위 "Auto Mode" 섹션의 값 확정 순서를 따른다.

**Interactive mode**: Present the extracted information to the user and ask:
- "Is this feature list accurate? Anything to add/remove/reword?"
- "What is the one-line tagline for the app?"
- "Who is the target audience?"
- "Are there App Store / Play Store URLs yet?" (use `#` placeholder if not)

## Phase 3: Generate Landing Page

Create the landing page files based on analysis + user input:

### File: `apps/webview/src/pages/landing/LandingPage.tsx`

Design a unique, visually compelling landing page. Do NOT use a fixed template — adapt the design to the app's character, audience, and features. Consider:

- Visual hierarchy: hero → features → how-it-works → CTA
- Typography: choose appropriate font weights and sizes for the app's tone
- Color: derive from the app's existing color palette if available, or create a fitting one
- Imagery: use the app logo if available (`/logo.png`)
- Responsive: mobile-first, works on all screen sizes
- Animations: subtle CSS animations for polish (fade-in, slide-up on scroll)
- Download CTAs: App Store + Google Play buttons (use placeholder URLs if not provided)

Content should be in the selected language.

### File: `apps/webview/src/pages/landing/landing.css`

Self-contained CSS with:
- CSS custom properties for easy theming
- Responsive breakpoints (mobile, tablet, desktop)
- Smooth animations and transitions
- No external CSS framework dependencies

### Route Registration

Check `apps/webview/src/app/routes.tsx` and add the landing page route if not already registered:
```tsx
{ path: '/landing', element: <LandingPage /> }
```

Add the import statement for LandingPage at the top of the routes file.

## Phase 4: Build & Deploy

1. **Check Vite base path** in `apps/webview/vite.config.mts`
   - If `base` is set, note it for deployment
   - If not set, default to `/`

2. **Build the webview app**:
   ```bash
   pnpm turbo run build --filter=*webview*
   ```
   If turbo is not available:
   ```bash
   cd apps/webview && pnpm build
   ```

3. **Deploy to Cloudflare Pages**:

   프로젝트명은 **절대 새로 만들지 않는다** — WebView(법적문서 `/privacy`·`/terms`·`/support` 포함)와 **같은 Pages 프로젝트**에 배포해야 한다. 별도 `-webview` 프로젝트를 만들면 스토어에 제출한 법적문서 URL과 앱이 바라보는 URL이 갈라진다.

   ```bash
   # Cloudflare Pages 프로젝트명 — 단일 소스 (deploy/launch/setup-landing 공통 규칙)
   PAGES_PROJECT=$(grep -m1 '^PAGES_PROJECT=' infra/oracle/.deploy-state 2>/dev/null | cut -d= -f2)
   PAGES_PROJECT="${PAGES_PROJECT:-$(node -e "console.log(require('./apps/mobile/app.json').expo.slug.replace(/-mobile\$/,''))")}"
   echo "Pages project: $PAGES_PROJECT"

   npx wrangler pages deploy apps/webview/dist --project-name="$PAGES_PROJECT" --branch=main
   ```
   - `.deploy-state`의 `PAGES_PROJECT`가 정본이다 (`scripts/provision-cloudflare.sh`가 기록). 없을 때만 `expo.slug`에서 `-mobile` 접미사를 제거한 값으로 폴백한다 — 이 폴백은 provision 스크립트의 파생 규칙과 동일하다.
   - If wrangler is not authenticated: **interactive mode**는 `npx wrangler login` 안내, **auto mode**는 `phase_deferred` 기록 후 이 subphase만 종료

4. **Report the deployment URL** to the user

## Phase 5: Verify

- Open the deployed URL and confirm the landing page renders correctly
- Check that logo/favicon are loading
- Verify responsive layout works
- Print final summary with the live URL
