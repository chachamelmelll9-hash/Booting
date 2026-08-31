---
name: implement-feature
description: Coordinate feature implementation from approved docs using the Codex checkpoint model and bounded custom agents.
---

# implement-feature

Use this skill after scenario documents are ready and the user wants implementation work to start.

## Auto Mode

When `docs/progress/auto-mode.json` exists and `enabled=true`:

- treat `Implementation Kickoff` and `Verification Approval` as pre-approved
- keep the implementation summary brief
- finish only the `implement` phase and let the `Stop` hook route `verify`

## Inputs

- approved feature specs
- `docs/features/data-model.md`
- `docs/features/page-map.md`
- `docs/features/wireframe-*.md`
- `docs/features/architecture.md`
- `docs/features/test-scenarios.md`

## Workflow

1. Resolve the feature name from the explicit user input when available. Otherwise derive it from the canonical or alias test-scenarios document.
2. Validate that all required planning documents and aliases exist.
3. Restore any existing implementation state from:
   - `docs/progress/pipeline.jsonl`
   - `docs/progress/features.jsonl`
   using `docs/progress/SCHEMA.md`
4. Summarize the implementation slices, worker ownership, RED verification artifact plan, local static check plan, and current JSONL progress state.
5. Handle `Implementation Kickoff`:
   - interactive mode: stop for approval
   - auto mode: treat kickoff as approved and continue immediately
6. After approval or auto-mode kickoff:
   - ensure `docs/progress/` exists
   - append `phase_started` to `docs/progress/pipeline.jsonl` for `phase="implement"` and the active `iter`
   - spawn `implement-orchestrator`
   - if auto mode is active, tell `implement-orchestrator` that `Verification Approval` is already granted so it completes the verify loop before returning
   - allow continuous implementation work only inside the approved scope
   - let the orchestrator run the initialize -> RED -> GREEN -> static-check -> review -> static-recheck loop while appending implementation events to `docs/progress/features.jsonl`
   - keep the main Codex session responsible for checkpoint communication and high-risk approvals
7. Present the `Verification Approval` summary:
   - completed slices
   - pending slices or blockers
   - checks run
   - latest relevant `impl_status`, `worker_*`, `static_test`, `e2e_result`, and `adb_result` events from `docs/progress/features.jsonl`
   - RED artifact locations for `e2e-verify` and `adb-verify`
   - exact verification commands and environment assumptions
   - interactive mode: stop at `Verification Approval`
   - auto mode: keep the summary brief and stop; the `Stop` hook will route `verify`

## Outputs

- `docs/progress/pipeline.jsonl`
- `docs/progress/features.jsonl`

## Codex Notes

- Use `.agents/codex/runtime/implementation-flow.md`.
- Respect `.agents/codex/runtime/approval-boundaries.md`.
- `adb-verify` replaces the older mobile Maestro path in the Codex runtime.
- Use `iter="initial"` for the first release pipeline and the feature name for post-launch iterations.
- Honor `docs/progress/auto-mode.json` when deciding whether to pause at implementation checkpoints.
- In hook-driven auto mode, this skill must not manually continue into `verify` or `deploy`.
- `verify` comes next, not `deploy`: it builds the app and proves it runs using local tooling only. `deploy` is release-gated and the router skips it when `release_ready` is false.
- Verification execution is a separate checkpoint. Do not silently run it during kickoff preparation.
- Do not silently expand scope beyond the approved architecture.
