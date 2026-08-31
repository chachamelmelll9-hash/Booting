---
name: verify-app
description: Build the app locally and prove it runs — dev build on an Android emulator, launch and crash checks, ADB smoke against the local server, and a signed release APK when a local keystore exists. Needs no cloud accounts or store credentials.
---

# verify-app

Runs the `verify` phase, between `implement` and `deploy`.

After `implement`, the code exists but nothing has proven the app **starts and works**.
This phase produces that proof, and it can always be produced with local tooling alone.

> **Hard rule**: this phase never depends on Oracle Cloud, Cloudflare, Play Console,
> App Store Connect, or a wrangler login. Recording `phase_blocked` because one of those
> is missing is a defect — those belong to `deploy`/`build`/`launch`, and the hook router
> already skips those phases when `release_ready` is false.

## Auto Mode

When `docs/progress/auto-mode.json` exists and `enabled=true`:

- never ask the user a question
- on failure, diagnose and retry autonomously (max 3 attempts)
- finish only the `verify` phase and let the hook router pick the next one

## Workflow

1. Append `phase_started` for phase `verify` to `docs/progress/pipeline.jsonl`.

2. Read identifiers from `apps/mobile/app.json` — never hardcode:
   `expo.android.package`, `expo.name`.

3. Confirm the local runtime is up. The server root is **404 by design**
   (`apps/server/src/main.ts` calls `setGlobalPrefix('api')`), so gate on `/api`:

   ```bash
   curl -sf --max-time 5 http://localhost:3000/api   # liveness gate
   curl -sf --max-time 5 http://localhost:4200       # webview
   ```

   If either is down, restart `pnpm dev` and wait up to 3 minutes. Restarting dev servers
   is normal work for this phase, not a blocker.

4. Prepare the emulator with the shared script — never launch `emulator` directly:

   ```bash
   bash scripts/ensure-emulator.sh
   ```

   It handles GPU rendering mode, screen wake, AVD locks, process detachment, and the
   `adb reverse` mappings (8081/3000/4200/54321). Skipping it makes `screencap` and
   `uiautomator` return empty results, which reads as an app bug and wastes retries.
   Proceed only on `EMULATOR_READY=<serial>`; on `EMULATOR_FAILED=*` retry once with
   `--restart`, then record the reason verbatim.

5. Build and install the dev build (`npx expo run:android --variant debug`), launch it,
   and decide whether it actually rendered:

   - `adb shell dumpsys activity top` must show the package
   - `adb logcat` must show no `FATAL EXCEPTION`
   - capture `test-results/verify/01-launch.png` and inspect it
   - reject blank evidence: a real render is ~1.4MB, a blank screen ~10KB, and the
     `uiautomator` dump must contain more than a couple of nodes

6. Run the `adb-smoke` agent against `docs/features/test-scenarios.md` core flows,
   pointing at the local server, writing evidence under `test-results/verify/adb-smoke/`.

7. If `apps/mobile/keystore.properties` exists, also produce a signed release build
   (`pnpm build:android`) and launch the release APK once. The keystore is generated
   locally by `/preflight`, so this needs no account. A release build failure does **not**
   block this phase — record `release_build: "failed"` and continue; release signing is a
   `deploy` concern.

8. On failure, diagnose from logcat / Metro / server logs, fix the **app code**, and retry
   from step 5. After 3 attempts, record `phase_blocked` with the real stack trace or error
   output in `detail.reason` — never a summary like "build failed".

9. Append `phase_completed` with measured values only:
   `dev_build`, `app_launch`, `smoke`, `release_build`, `evidence`.

10. Report the result table and stop. Do not call the next skill — the hook router routes it.
