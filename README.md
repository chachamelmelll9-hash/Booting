# Shippen

Production-ready monorepo boilerplate that builds mobile apps with AI Agents.

Just describe your idea and AI Agents automatically handle planning, design, implementation, build, and store submission.

## Quick Start

Shippen is a template. Create **your own repository** from it first — do not build your app directly on a clone of the vendor repo (`product-engineer-community/shippen`), or your work will have nowhere to push.

**Option A — GitHub "Use this template" (recommended)**

1. On the Shippen GitHub page, click **Use this template → Create a new repository**
2. Clone your new repository:

```bash
git clone git@github.com:<your-username>/<your-app>.git
cd <your-app>
```

**Option B — gh CLI**

```bash
gh repo create <your-username>/<your-app> --private \
  --template product-engineer-community/shippen --clone
cd <your-app>
```

**Already cloned the vendor repo?** Re-point `origin` to your own repository before starting:

```bash
gh repo create <your-username>/<your-app> --private --source . --push
# or manually:
git remote set-url origin git@github.com:<your-username>/<your-app>.git
git push -u origin main
```

Then start the pipeline in the AI Agent:

- **Full auto** — `/setup auto: {해결하고 싶은 문제}` — runs `/preflight` first (accounts, credentials, signing key, store declarations), then chains planning → implementation → **local build & verification** → deploy → store submission. Without store accounts it still runs autonomously all the way to a built, verified app.
- **Step by step** — `/setup` (no `auto:`) asks at each checkpoint, then chains to `/start`.

`/start` alone skips environment setup; use it only when `/setup` has already run.

## Pipeline

Start with `/setup` (or `/setup auto: ...`) and each phase chains automatically. If a session ends mid-pipeline, the `Stop` hook routes the next phase; `/continue` also resumes explicitly.

### 1. Planning

```
/setup -> /start -> /clarify-core-feature -> /define-pages
```

| Command | What It Does |
|---------|-------------|
| `/start` | Recommend app name, generate bundle ID, run `initial-setup.sh` in background (50+ file replacements + dependency install), then auto-chain to `/clarify-core-feature` |
| `/clarify-core-feature` | Break down core idea into 3-4 features, design user journeys per feature, derive data model. Confirm UX spec through interactive questions |
| `/define-pages` | Derive full screen list from feature specs, design tab structure, map Expo Router routes |

**Output**: Feature specs, data model, page map under `docs/features/`

### 2. Design

```
/design-wireframes -> /design-architecture -> /write-test-scenarios
```

| Command | What It Does |
|---------|-------------|
| `/design-wireframes` | Generate text wireframes from page map, apply premium UX rules (touch targets, spacing, state handling) |
| `/design-architecture` | Design folder structure and components for mobile (Clean FSD) + server (Clean Architecture) |
| `/write-test-scenarios` | Generate E2E test scenarios based on user journeys |

**Output**: Wireframes, architecture docs, test scenarios

### 3. Implementation

```
/implement-feature
```

| Command | What It Does |
|---------|-------------|
| `/implement-feature` | TDD-based auto implementation. Iterates through Supabase migration, server API, mobile UI with build, type check, and test cycles |

**Output**: Working code + tests

### 4. Local Verification

```
/verify-app
```

| Command | What It Does |
|---------|-------------|
| `/verify-app` | Builds the app and proves it runs — dev build on the Android emulator, app launch + crash check, ADB smoke against the local server, and a signed release APK when a local keystore exists |

**Output**: A built, running app + evidence in `test-results/verify/`

> This phase needs **no cloud accounts, no store credentials, and no deploy infrastructure**.
> `/setup auto:` always runs through to here, even when `release_ready` is false —
> the phases after this one (`/deploy`, `/launch`) are the ones that need external accounts,
> and the router skips them rather than stopping the pipeline.

### 5. Deployment

```
/deploy -> /make-aso-images
```

| Command | What It Does |
|---------|-------------|
| `/deploy` | Deploy in order: DB, server, webview. Two rounds of ADB smoke tests (dev build verification, then production build + screenshot capture) |
| `/make-aso-images` | Overlay frames and text on captured screenshots to generate store-ready ASO images |

**Output**: Production deployment complete, AAB/IPA, store screenshots

### 6. Launch

```
/launch
```

| Command | What It Does |
|---------|-------------|
| `/launch` | Generate legal documents (privacy policy, etc.), write store listings, deploy landing page, auto-submit to App Store + Play Store, monitor review status |

**Output**: App Store and Play Store launch complete

### Resume Anytime

```
/continue
```

Run `/continue` at any point to auto-analyze project state and immediately execute the next phase.

## Pipeline Health

The auto-mode pipeline has its own regression suite. Run it after changing any skill, agent, or hook:

```bash
bash scripts/test-pipeline.sh
```

It checks three things:

| Check | What it catches |
|---|---|
| Router regression | Phase routing, release gating, blocked-vs-deferred handling — replayed against a real failed pipeline log |
| Skill/agent consistency | Broken skill or agent references, wrong template paths, `disable-model-invocation` creeping back in, server health checks hitting the always-404 root, ad-hoc emulator launches |
| Skill shadowing | A personal skill in `~/.claude/skills/` masking this repo's pipeline skill |

Two helper scripts back it:

```bash
bash scripts/doctor-skills.sh          # detect masked pipeline skills
bash scripts/doctor-skills.sh --fix    # back up and remove them
bash scripts/ensure-emulator.sh        # prepare an emulator that can actually be screenshotted
```

`ensure-emulator.sh` is the only supported way to start an emulator for the pipeline — it
handles software rendering (host-GPU mode produces blank screenshots on Apple Silicon),
screen wake, AVD locks, process detachment, and the `adb reverse` mappings Metro needs.

## Structure

```
apps/
├── mobile/          # React Native + Expo (Auth, Tab Navigation, AdMob)
├── server/          # NestJS API (JWT Auth, Supabase)
└── webview/         # React WebView

packages/
├── i18n/            # Internationalization (English/Korean)
├── supabase/        # Supabase Client
└── webview-bridge/  # Mobile-WebView Bridge
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native, Expo, Expo Router, Zustand |
| Backend | NestJS, Supabase (PostgreSQL), JWT |
| WebView | React, Vite |
| Monorepo | Turborepo, pnpm |
| CI/CD | GitHub Actions, Docker, Oracle Cloud, Cloudflare |

## Development Servers

```bash
pnpm serve:server                  # Backend
cd apps/mobile && npx expo start   # Mobile
pnpm dev:webview                   # WebView (optional)
```

## License

See [LICENSE](./LICENSE). Redistribution, resale, and sublicensing are prohibited.
