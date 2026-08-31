# Implementation Flow

## Entry

Use `implement-feature` after the required planning docs exist and have `Architecture Approval`.

If `docs/progress/auto-mode.json` exists with `enabled=true`, treat both `Implementation Kickoff` and `Verification Approval` as already granted by the parent skill.

## Kickoff Preparation

1. validate docs and the relevant JSONL progress state
2. summarize implementation scope
3. stop at `Implementation Kickoff` unless auto mode is active

## After Kickoff Approval

1. ensure `docs/progress/` exists and append `phase_started` to `docs/progress/pipeline.jsonl` for the active `iter` and feature
2. initialize or refresh the active feature state in `docs/progress/features.jsonl`
3. generate RED verification artifacts first:
   - `e2e-verify` in `write` mode
   - `adb-verify` in `write` mode
4. implement GREEN slices in the approved order:
   - `db-implement` first
   - `server-implement`, `mobile-implement`, `webview-implement` as needed after DB work
5. run local static checks:
   - `pnpm lint`
   - `pnpm build`
   - `cd apps/mobile && npx tsc -p tsconfig.app.json --noEmit`
   - `cd apps/server && npx tsc --noEmit`
6. route failures back to the owning worker and repeat only the necessary loop
7. perform the in-scope review loop and rerun local static checks
8. append the latest implementation summary to `docs/progress/features.jsonl` and `phase_completed` to `docs/progress/pipeline.jsonl` when the pre-verification implementation loop is complete
9. prepare the `Verification Approval` summary and stop; in auto mode, the `Stop` hook will route the next phase after the summary turn ends

## Delegation Model

- main Codex owns user communication and checkpoint stops
- `implement-orchestrator` coordinates implementation tasks
- bounded workers own concrete code or verification scopes
- `implement-orchestrator` owns aggregate `features.jsonl` events; bounded workers own their completion/failure and verification-error events

## After Verification Approval

1. start required local services and test prerequisites
2. run `e2e-verify` in `verify` mode
3. run `adb-verify` in `verify` mode
4. for failures: delegate targeted fixes, rerun relevant static checks, then rerun only the failed scenarios
5. use `deploy` for post-deploy smoke and release work, not this flow

In auto mode, the parent skill should stop after the verification summary. The `Stop` hook will route `deploy`.

## Preferred Worker Order

1. `e2e-verify` (`write`)
2. `adb-verify` (`write`)
3. `db-implement`
4. `server-implement`
5. `mobile-implement`
6. `webview-implement`
7. `e2e-verify` (`verify`)
8. `adb-verify` (`verify`)
