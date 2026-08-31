---
name: start
description: Collect the problem statement, brand the app, configure Kakao login, and complete the start phase for the hook-driven auto pipeline.
---

# start

Use this skill after `setup`, or when the repo is already bootstrapped and the user wants to begin planning.

## Auto Mode

When `docs/progress/auto-mode.json` exists and `enabled=true`:

- use `problem` from that file when no direct argument is passed
- skip routine confirmation prompts and choose the recommended default
- honor `preferences.kakao_login`; when it is `false`, skip Kakao setup cleanly
- if Kakao Maestro verification cannot be completed, report it as blocked or skipped but do not stall the auto pipeline
- finish only the `start` phase and let the `Stop` hook route `clarify-core-feature`
- if a manual external blocker prevents progress, append `phase_blocked` to `docs/progress/pipeline.jsonl` and stop

## Progress Tracking (JSONL)

- use `docs/progress/SCHEMA.md`
- append `phase_started` to `docs/progress/pipeline.jsonl` when `start` begins
- append `phase_completed` to `docs/progress/pipeline.jsonl` after `docs/features/core-idea.md` is written
- use `iter="initial"`, `feature=null`, `phase="start"`, and `skill="start"`

## Inputs

- optional problem description from the user

## Workflow

1. Resolve the problem description:
   - direct argument wins
   - otherwise, if auto mode is active, read `problem` from `docs/progress/auto-mode.json`
   - otherwise ask in normal chat what problem the app should solve
2. Derive a single-line core feature statement in the form `{problem} -> {solution}`:
   - auto mode: continue without an extra confirmation turn
   - interactive mode: confirm it in chat
3. Propose three app names with short rationale and derive:
   - `ORG` from `git remote get-url origin`
   - `BUNDLE_ID` as `com.{org_lower}.{app_name_lower_no_space}`
   - auto mode: choose the first solid candidate
   - interactive mode: confirm the chosen name
4. Run `scripts/branding.sh --name "{app_name}" --bundle-id "{bundle_id}"`.
5. Check whether `apps/mobile/app.json` still contains `__KAKAO_NATIVE_APP_KEY__`.
6. If Kakao is not configured yet:
   - auto mode and `preferences.kakao_login=false`: skip this step
   - derive the Android debug key hash from `~/.android/debug.keystore`
   - use the `agent-browser` skill to open `https://developers.kakao.com` in a headed browser
   - ask the user to complete login manually if required, or explicitly skip
   - create or configure the Kakao app, register the Android platform, and enable Kakao Login plus OpenID Connect
   - replace the placeholder native app key in `apps/mobile/app.json`
   - rebuild and relaunch the Android debug app so the new branding and Kakao key are applied
7. Write `docs/features/core-idea.md`.
8. When Kakao login is configured and a device is available, run the Kakao Maestro login verification:
   - derive `{DEVICE_ID}` from `adb devices`
   - derive `{PACKAGE_NAME}` from `apps/mobile/app.json` `expo.android.package`
   - run `cd apps/mobile-e2e && maestro --device {DEVICE_ID} test --env APP_ID={PACKAGE_NAME} maestro/auth/kakao-login.yaml`
   - on failure, inspect Maestro debug output and fix the relevant cause before retrying up to 3 times:
     - invalid or missing Kakao key in `apps/mobile/app.json`
     - Kakao console misconfiguration that prevents the OAuth screen from appearing
     - selector drift inside `apps/mobile-e2e/maestro/auth/kakao-login.yaml`
     - callback or token-persistence issues that prevent reaching the post-login home screen
   - if Kakao setup was skipped, the app was already configured but no device is available, or the retries still fail, report the Kakao login E2E as skipped or blocked and continue
9. Report the app name, bundle ID, Kakao setup status, and Kakao Maestro verification status.
10. End the phase:
   - auto mode: stop after the `start` summary; the `Stop` hook will route `clarify-core-feature`
   - interactive mode: stop unless the user explicitly asks to continue

## Outputs

- `docs/features/core-idea.md`

## Codex Notes

- Use normal chat instead of `AskUserQuestion`.
- Reuse `.claude/skills/start/SKILL.md` for the detailed Kakao setup flow and field sequence.
- Use `.agents/skills/agent-browser/SKILL.md` for browser automation mechanics.
- Keep `docs/progress/auto-mode.json` as the source of truth for persisted full-auto preferences.
- In hook-driven auto mode, never hand off to `clarify-core-feature` from inside this skill.
- Keep the source Kakao Maestro login verification parity for `start`, even though the later implementation and deploy verification runtime is ADB-based.
- Keep `pipeline.jsonl` progress events aligned with `.claude/skills/start/SKILL.md`.
