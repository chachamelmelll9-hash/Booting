# Deploy Flow

## Entry

Use `deploy` after implementation and verification are accepted.

If `docs/progress/auto-mode.json` exists with `enabled=true`, default to `initial` mode when the parent skill does not pass an explicit scope and treat `Deploy Approval` as already granted.

## Mode Resolution

- `initial`: full deploy across DB, server, webview, and production mobile builds
- `incremental`: deploy only the components affected by the approved feature scope

## Phase 0: Prerequisites Summary

Before `Deploy Approval`, gather and summarize:

1. Derived identifiers. Do not hardcode them.
   - `GHCR_IMAGE` from `.github/workflows/deploy.yml`
   - `ORACLE_HOST`, `SSH_KEY_PATH`, `PAGES_PROJECT`, `SERVER_DOMAIN` from `infra/oracle/.deploy-state`
     (single source of truth, written by `provision-oracle.sh` / `provision-cloudflare.sh`)
   - `SERVER_DOMAIN` falls back to `infra/oracle/Caddyfile` line 1; treat `api.example.com` as unprovisioned
   - `PAGES_PROJECT` falls back to `expo.slug` with the `-mobile` suffix removed (same rule as the provision script)
   - `SERVER_URL` from `SERVER_DOMAIN`; `WEBVIEW_URL` from `PAGES_PROJECT`
   - `ANDROID_PACKAGE` from `apps/mobile/app.json`
   - Do not derive the Pages project from `.github/workflows/deploy-webview.yml` — that value is the literal
     `${{ vars.CF_PAGES_PROJECT_NAME }}` expression, not a project name
2. Infra provisioning state.
   - verify Oracle, Cloudflare, and Supabase deploy prerequisites
   - if missing, use `bash scripts/setup-deploy.sh`
3. Required tools and auth state.
   - `ssh`, `docker`, `wrangler`, `adb`, `gh`
   - `wrangler whoami`
4. Required secrets, env files, and credentials.
   - GitHub deploy secrets and variables
   - Oracle VM `/home/ubuntu/app/.env`
   - `apps/webview/.env` or `.env.production`
   - Android signing: `apps/mobile/keystore.properties`
   - iOS signing: `.appstoreconnect.env` and `~/.appstoreconnect/AuthKey_{ASC_KEY_ID}.p8`
5. Production mobile config safety.
   - validate `apps/mobile/app.config.ts` with `PRODUCTION_BUILD=true npx tsx -e ...`
   - block deploy if cleartext or ATS bypass flags remain enabled
6. Summarize blockers, recommend the default deploy path, then stop at `Deploy Approval` unless auto mode is active.

## After Deploy Approval

1. Recheck only the prerequisites that matter for the approved scope.
2. Apply DB migrations only if the approval explicitly covers remote DB changes.
3. Deploy server.
   - default: trigger `.github/workflows/deploy.yml` with `gh workflow run` and wait
   - fallback: local Docker build and Oracle SSH restart
   - verify with `${SERVER_URL}/api`
4. Deploy webview.
   - default: trigger `.github/workflows/deploy-webview.yml` with `gh workflow run` and wait
   - fallback: `pnpm build:webview` or `cd apps/webview && pnpm build`, then `wrangler pages deploy`
   - verify with `${WEBVIEW_URL}`
5. Run dev-compatible smoke verification.
   - install or refresh a dev-compatible Android build with `cd apps/mobile && npx expo run:android`
   - run `adb-smoke` against the deployed backend
   - verify any in-scope client path that consumes the deployed server or webview
6. Build production mobile artifacts when included in the approved scope.
   - Android: `bash scripts/build-android.sh`
   - iOS: `bash scripts/build-ios.sh`
7. Run production Android smoke verification.
   - install a release APK derived from the AAB or an existing release APK
   - rerun `adb-smoke`
8. Report results and stop.

In auto mode, the parent skill should stop after this report. The hook router will continue into the `build` release-prep subphases.

`Deploy Approval` is not complete until the deployed-environment smoke passes or the skipped item, exact reason, and user-approved scope boundary are recorded.

## Output Expectations

- per-component deploy status
- migration actions taken or skipped
- health-check results
- Android artifact path: `apps/mobile/build-*.aab`
- iOS artifact path: `apps/mobile/build/ipa/*.ipa`
- dev smoke summary
- production smoke summary
- skipped smoke items with reasons, if any
- exact next release action

## Constraints

- main branch remains the default deployment target unless the parent agent says otherwise
- do not collect store screenshots during deploy
- legal-doc and listing preparation stay outside the deploy flow
- stop immediately on missing approval coverage for remote DB, production deploy, or production mobile build steps

## Delegation Model

- main Codex owns approval and user communication
- `deploy-orchestrator` coordinates the deploy task graph
- `adb-smoke` and other bounded verifiers collect evidence
- `adb-verify` remains the pre-deploy scenario verifier and is not a substitute for deploy smoke coverage
