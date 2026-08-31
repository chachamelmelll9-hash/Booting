---
name: continue
description: Analyze current project state, sync JSONL progress logs, and report the next skill for manual recovery.
---

# continue

Use this skill when resuming work on a project manually. It restores state from `docs/progress/*.jsonl`, cross-checks the real repository state, and reports the single next skill that should run.

## Auto Mode

When `docs/progress/auto-mode.json` exists and `enabled=true`:

- keep auto mode active across the resumed turn
- do not pause at intermediate checkpoint summaries
- do not treat `continue` as the normal orchestration path; the `Stop` hook owns automatic phase progression

## Inputs

No explicit inputs. The skill inspects the repository autonomously.

## Workflow

### Step 0: Restore JSONL Progress State

Use `docs/progress/SCHEMA.md`.

#### 0-1. Pipeline State: `docs/progress/pipeline.jsonl`

If the file does not exist, treat the pipeline as unsynced and fall back to artifact inference in Step 1.

If it exists:

1. Scan backward to find the latest `iteration_completed`.
2. Check whether a later `iteration_started` exists:
   - if yes, that iteration is active
   - if not, the active iteration is `initial` unless the repo has clearly moved into a later feature iteration
3. Filter events to the active `iter`.
4. Reconstruct:
   - last completed phase from the latest `phase_completed`
   - interrupted phase when a `phase_started` exists without a matching `phase_completed`
   - next phase from the pipeline order

Pipeline order:

- initial: `setup -> start -> clarify -> define-pages -> wireframes -> architecture -> test-scenarios -> implement -> verify -> deploy -> build -> launch`
- post-launch feature iteration: `clarify -> define-pages -> wireframes -> architecture -> test-scenarios -> implement -> verify -> deploy`

Inside `build`, the hook-driven release-prep order is:

- optional `setup-icons`
- `setup-landing`
- `make-aso-images`

If an `iteration_completed` exists and no later `iteration_started` exists:

- auto mode: do not start a new iteration automatically
- interactive mode: ask the user in normal chat for the next feature description, append `iteration_started` to `docs/progress/pipeline.jsonl`, and route next to `clarify-core-feature`

#### 0-2. Implementation State: `docs/progress/features.jsonl`

Only inspect this when implementation is active or recently incomplete.

Filter by active `iter` and the relevant feature name, then restore:

- latest `impl_status`
- worker state from the latest `worker_started`, `worker_completed`, `worker_failed`, or `worker_retried`
- latest `static_test` result per tool
- latest `e2e_result` and `adb_result`
- `error_logged` history

#### 0-3. Deploy And Release State: `docs/progress/deploys.jsonl`

When deploy, build, or launch is active, filter by active `iter` and restore:

- deployed components from `component_deployed`
- failed deploy items from `component_deploy_failed`
- DB migration status from `migration_applied`
- build artifacts from `build_completed`
- smoke status from `smoke_result`
- store submission and review state from `store_submitted`, `review_status`, and `store_released`
- release tagging from `version_tagged`

When JSONL exists, use artifact scans in Step 1 as verification, not as the primary source of truth.

### Step 1: Inspect Actual Repository State

#### 1-1. Planning Artifacts

Check the existence and completeness of:

- `docs/features/core-idea.md`
- feature specs under `docs/features/*.md` excluding aliases and summary files
- `docs/features/feature-summary.md`
- `docs/features/data-model.md`
- `docs/features/page-map.md`
- `docs/features/wireframe-index.md` and `docs/features/wireframe-*.md`
- `docs/features/architecture.md`
- `docs/features/test-scenarios.md`

#### 1-2. Implementation Code

Inspect the real code shape under:

- `apps/mobile/src/features/`
- `apps/server/src/`
- `apps/webview/src/pages/`
- `supabase/migrations/`

Use this only to determine actual implementation coverage and detect drift from JSONL state.

#### 1-3. Build And Release Artifacts

Check:

- `apps/mobile/build-*.aab`
- `apps/mobile/build/ipa/*.ipa`
- `assets/screenshots/android/{locale}/`
- `assets/aso-images/android/{locale}/`
- `assets/aso-images/ios/{locale}/`
- `docs/store-listing.md`
- `docs/release-notes.md`

#### 1-4. Quick Health Checks

If implementation code exists, run only fast health checks:

- `pnpm lint`
- `cd apps/mobile && npx tsc -p tsconfig.app.json --noEmit`

Record only PASS/FAIL plus the highest-signal errors. Do not start a repair loop here.

### Step 2: Reconcile JSONL State Against Reality

#### 2-1. With Existing JSONL

If `pipeline.jsonl`, `features.jsonl`, or `deploys.jsonl` exist:

- compare restored state against actual files and artifacts
- if JSONL says complete but the artifact is missing, treat the artifact state as authoritative
- if artifacts or code exist but JSONL is stale, append correction events to the appropriate JSONL file
- if quick health checks differ from the latest recorded `static_test`, append fresh `static_test` events

#### 2-2. Without Existing JSONL

If a JSONL file is absent, infer state from artifacts and code, but do not create missing implementation logs from scratch inside `continue`.

### Step 3: Determine The Next Pipeline Skill

Map the restored and verified state onto the pipeline:

`setup -> start -> clarify-core-feature -> define-pages -> design-wireframes -> design-architecture -> write-test-scenarios -> implement-feature -> verify-app -> deploy -> build(setup-icons? -> setup-landing -> make-aso-images) -> launch`

Decide:

1. completed stages
2. current interrupted stage, if any
3. the single next skill that should run now

If a later artifact exists while an earlier stage is missing, route back to the earliest missing stage and flag the inconsistency.

### Step 4: Report And Stop

Output a concise status report that includes:

- planning artifact state
- implementation code state
- JSONL reconciliation summary
- next skill

Then stop. Do not automatically execute the next skill from inside `continue`.

## Outputs

- updated `docs/progress/pipeline.jsonl` only when correction events are required
- updated `docs/progress/features.jsonl` only when correction events are required
- updated `docs/progress/deploys.jsonl` only when correction events are required
- brief status report with the recommended next skill

## Codex Notes

- Use normal chat instead of `AskUserQuestion`.
- JSONL state is the primary progress source when it exists.
- Artifact and code scans are verification and correction inputs, not the default source of truth.
- Do not silently create a brand-new `features.jsonl` during resume analysis.
- Honor `docs/progress/auto-mode.json` when deciding whether to stop for human confirmation.
- In hook-driven auto mode, `continue` is recovery-only. Do not use it for normal phase-to-phase progression.
