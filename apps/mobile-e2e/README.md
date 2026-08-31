# Mobile E2E

This workspace verifies the mobile app end-to-end with two runners:

- **ADB shell scripts** (`adb-tests/`) — work on both dev and release builds. Used by post-deploy smoke and the implement pipeline (Phase 5).
- **Maestro flows** (`maestro/`) — **dev builds only**: flows launch the app against the local Metro server (`http://10.0.2.2:8081`). Do not run them against store/release binaries; use `adb-tests/` for those.

## Usage

Run all ADB tests (fails with non-zero exit if any script fails):

```bash
pnpm --filter ./apps/mobile-e2e e2e
```

Run the baseline smoke test:

```bash
pnpm --filter ./apps/mobile-e2e e2e:smoke
```

Run Maestro flows (dev build + Metro running required):

```bash
pnpm --filter ./apps/mobile-e2e maestro        # all flows, in numbered order
pnpm --filter ./apps/mobile-e2e maestro:auth   # auth flows only
pnpm --filter ./apps/mobile-e2e maestro:smoke  # auth screen smoke only
```

`scripts/run-maestro.sh` reads `expo.android.package` from `apps/mobile/app.json` and injects it as `APP_ID`, so flows never hardcode the package name. Test credentials are injected the same way:

```bash
TEST_EMAIL=me@example.com TEST_PASSWORD=secret pnpm --filter ./apps/mobile-e2e maestro
```

If unset, a unique email is generated per run so the signup → login flows stay consistent.

## Conventions

- Store ADB test scripts in `apps/mobile-e2e/adb-tests/{scenario-id}.sh`; each script must `exit` non-zero on failure. `adb-verify` (write mode) generates scenario scripts here.
- Maestro flows are ordered by numeric filename prefix (`01-`, `02-`, ...); later flows may depend on earlier ones (e.g. `04-tabs-smoke` assumes the session from `03-auth`).
- The Android package name is always resolved from `apps/mobile/app.json`.
- Execution logs land in `test-results/mobile-e2e/logs/`.
