---
name: write-test-scenarios
description: Turn the approved architecture into execution-ready server, ADB-based mobile, and post-deploy smoke verification scenarios.
---

# write-test-scenarios

Use this skill after `Architecture Approval`.

## Auto Mode

When `docs/progress/auto-mode.json` exists and `enabled=true`:

- do not stop for incremental validation during drafting
- auto-accept the recommended scenario coverage
- keep the checkpoint summary brief
- finish only the `test-scenarios` phase and let the `Stop` hook route `implement-feature`

## Progress Tracking (JSONL)

- use `docs/progress/SCHEMA.md`
- append `phase_started` to `docs/progress/pipeline.jsonl` when `write-test-scenarios` begins
- append `phase_completed` to `docs/progress/pipeline.jsonl` after `docs/features/test-scenarios.md` is written
- use the active `iter`, `feature=null`, `phase="test-scenarios"`, and `skill="write-test-scenarios"`

## Inputs

- approved feature specs in `docs/features/*.md`
- `docs/features/page-map.md`
- `docs/features/wireframe-*.md`
- `docs/features/architecture.md`

## Workflow

1. Resolve the feature name from the explicit user input when available. Otherwise derive it from the most relevant `docs/features/*-architecture.md` or `docs/features/architecture.md` context.
2. Validate that the required docs exist before drafting scenarios.
3. Read all prerequisite docs before writing anything.
4. Map each user journey step to one scenario group.
5. Split assertions into three executable targets:
   - `Server E2E Checklist` for `e2e-verify` and `apps/server-e2e`
   - `Mobile ADB Checklist` for `adb-verify` and `apps/mobile-e2e/adb-tests/`
   - `Post-deploy ADB Smoke Checklist` for `adb-smoke`
6. Add ADB smoke coverage for critical happy-path flows that should still work after deploy.
7. Write:
   - `docs/features/{feature-name}-test-scenarios.md`
   - `docs/features/test-scenarios.md` as the active alias for downstream tools
8. Present a checkpoint-ready summary with:
   - scenario coverage
   - open decisions or blockers
   - recommended default
   - exact next action: `Implementation Kickoff`
   - interactive mode: stop at the checkpoint
   - auto mode: treat it as approved, stop after the summary, and let the `Stop` hook route `implement-feature`

## Outputs

- `docs/features/{feature-name}-test-scenarios.md`
- `docs/features/test-scenarios.md`

## Scenario Rules

- Journey Step = Scenario Group.
- Keep scenario IDs stable because downstream workers consume them directly.
- Separate server checks from mobile checks even when they validate the same business flow.
- Prefer visible UI assertions over hidden DB assertions unless DB confirmation is essential.
- Do not create standalone scenarios for waiting or in-progress states.
- WebView does not get its own browser E2E track in this workflow.
- Write `When` steps so they can be executed as Jest assertions or ADB shell actions without reinterpretation.
- Keep state copy aligned with the approved feature specs and State Matrix.

## Codex Notes

- Use local references in `.agents/skills/write-test-scenarios/references/`.
- The mobile verification contract is ADB-based. Do not introduce Maestro flows.
- The main Codex session owns the checkpoint summary. Do not insert extra ad hoc approval stops inside the drafting loop unless the scenario contract is blocked.
- Honor `docs/progress/auto-mode.json` when deciding whether to pause at the scenario checkpoint.
- In hook-driven auto mode, this skill must not manually continue into `implement-feature`.
- Keep `pipeline.jsonl` progress events aligned with the source scenario-writing flow.
