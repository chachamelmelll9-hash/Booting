---
name: setup
description: Bootstrap the local development environment, conditionally provision Supabase, and complete the setup phase for the hook-driven auto pipeline.
argument-hint: '[auto: problem-description]'
---

# setup

Use this skill for the first local bootstrap of a new app from this monorepo.

## Auto Mode Initialization

- If the incoming request starts with `auto:`, extract the trailing text as `{PROBLEM}`.
- **Run `preflight` before creating `docs/progress/auto-mode.json`.** Auto mode forbids user questions, so everything only
  a human can answer (accounts, credentials, business contact, age rating, data safety, pricing) must be collected first.
  - `tier1_ok: false` in `docs/progress/preflight.json` -> do not enable auto mode; report the blocking item and stop.
  - Supabase MCP configured during this run -> do not enable auto mode; ask for a session restart first, because the new
    MCP server is not loaded into the running session and `apply_migration` would fail during implementation.
- Then create `docs/progress/auto-mode.json` with:
  - `enabled: true`
  - `problem: {PROBLEM}`
  - `release_ready: {preflight.json release_ready}` — false means planning/implementation still run automatically while
    `deploy` stops early with `phase_blocked`
  - `preferences.use_supabase`, `preferences.kakao_login`, `preferences.locale`
  - `preferences.icon_source` — resolved icon source path or null (null skips the `setup-icons` subphase)
  - `preferences.declarations` — store declaration file path (default `docs/store-declarations.yaml`)
- Treat that file as the persistent auto-mode contract for downstream skills and the Codex Stop hook.
- Never fill store declaration values from inference — they live in `docs/store-declarations.yaml` and belong to the user.

## Auto Mode

When `docs/progress/auto-mode.json` exists and `enabled=true`:

- use the saved preferences instead of waiting for routine checkpoint confirmations
- choose the recommended default when the source flow would normally ask a multiple-choice question
- keep the status report brief
- if onboarding Maestro auth smoke cannot be completed, report it as blocked or deferred but do not stall the auto pipeline
- finish only the `setup` phase and let the `Stop` hook route the next phase
- if a manual external blocker prevents setup from continuing, append `phase_blocked` to `docs/progress/pipeline.jsonl` and stop

## Progress Tracking (JSONL)

- use `docs/progress/SCHEMA.md`
- append `phase_started` to `docs/progress/pipeline.jsonl` when `setup` begins
- append `phase_completed` to `docs/progress/pipeline.jsonl` after the environment status report
- use `iter="initial"`, `feature=null`, `phase="setup"`, and `skill="setup"`

## Inputs

- optional `auto: problem-description`
- optional confirmation that emulator boot can be skipped if no AVD is available when auto mode is off
- whether the app needs user authentication when auto mode is off

## Workflow

1. If the request starts with `auto:`, initialize `docs/progress/auto-mode.json` and keep `{PROBLEM}` for the `start` handoff.
2. Derive the GitHub owner from `git remote get-url origin`. If parsing fails:
   - auto mode: fall back to `app`
   - interactive mode: ask the user in normal chat
3. Before running bootstrap commands, explain what `scripts/initial-setup.sh --org "{org}"` will do:
   - replace the workspace org scope
   - install dependencies
   - create local env files
   If the setup would install or upgrade global prerequisites outside the repo, stop for approval under `AGENTS.md`.
4. Run `scripts/initial-setup.sh --org "{org}"` and wait for completion.
5. Determine `{USE_SUPABASE}`:
   - auto mode: read `preferences.use_supabase` from `docs/progress/auto-mode.json`
   - interactive mode: ask the user in normal chat whether the app needs user authentication
6. Perform environment bring-up:
   - verify an attached emulator or start one if available
   - if no AVD exists:
     - auto mode: continue without an emulator and note that device verification is deferred
     - interactive mode: ask whether to create an AVD first or continue without an emulator
   - if `{USE_SUPABASE}` is true, run `bash scripts/provision-supabase.sh`
   - if `{USE_SUPABASE}` is true, start the server with `pnpm serve:server` and confirm `http://localhost:3000`
   - if `{USE_SUPABASE}` is false, skip both Supabase provisioning and server bring-up
7. If an emulator is available, run `cd apps/mobile && npx expo run:android` so prebuild, Gradle build, Metro, install, and launch happen in one flow. If auto mode continued without an emulator, complete the local bootstrap without blocking on launch.
8. Capture setup evidence when available:
   - save a device screenshot to `docs/setup-complete.png`
   - verify the installed package from `apps/mobile/app.json`
9. Report the environment status, including whether Supabase and the server were completed or skipped.
10. Run the onboarding auth smoke flow with Maestro when a device is available:
   - derive `{DEVICE_ID}` from `adb devices`
   - derive `{PACKAGE_NAME}` from `apps/mobile/app.json` `expo.android.package`
   - run `cd apps/mobile-e2e && maestro --device {DEVICE_ID} test --env APP_ID={PACKAGE_NAME} maestro/auth-smoke.yaml`
   - if that passes, run:
     - `cd apps/mobile-e2e && maestro --device {DEVICE_ID} test --env APP_ID={PACKAGE_NAME} maestro/auth/email-signup.yaml`
     - `cd apps/mobile-e2e && maestro --device {DEVICE_ID} test --env APP_ID={PACKAGE_NAME} maestro/auth/email-login.yaml`
   - for `auth-smoke` failures, inspect Maestro debug output, fix the relevant UI issue such as missing `testID` or mismatched text, and retry up to 3 times without rebuilding when Metro reload is sufficient
   - for signup or login failures, inspect whether the issue is API, validation, navigation, or state handling; fix the mobile or server code, restart the server if needed, and retry up to 3 times
   - if no emulator or connected device is available because launch was skipped, record the Maestro auth checks as blocked or deferred instead of pretending they passed
   - if the retries still fail, mark the onboarding auth smoke as blocked and continue; auto mode should not stop here
11. End the phase:
   - auto mode: stop after the `setup` summary; the `Stop` hook will route `start`
   - interactive mode: stop unless the user explicitly asks to proceed immediately

## Outputs

- `docs/progress/auto-mode.json` when auto mode is initialized
- `docs/setup-complete.png` when device capture succeeds

## Codex Notes

- Use normal chat instead of `AskUserQuestion`.
- If no AVD exists, ask the user to create one or explicitly approve continuing without an emulator.
- Keep Supabase provisioning and server startup conditional on the user's authentication requirement.
- Treat `setup auto:` as the Codex-native entrypoint for the source full-auto pipeline.
- In hook-driven auto mode, never hand off to `start` from inside this skill.
- Keep the source onboarding Maestro auth smoke parity for `setup`, even though the later implementation and deploy verification runtime is ADB-based.
- Keep `pipeline.jsonl` event names aligned with `.claude/skills/setup/SKILL.md`.
- Keep behavior aligned with `.claude/skills/setup/SKILL.md`.
