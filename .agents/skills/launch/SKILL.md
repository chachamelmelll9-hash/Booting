---
name: launch
description: Coordinate release preparation and store submission using Codex custom agents after deploy artifacts are ready.
---

# launch

Use this skill after deploy artifacts, `make-aso-images` outputs or equivalent release image assets, and store prerequisites are ready.

## Auto Mode

When `docs/progress/auto-mode.json` exists and `enabled=true`:

- default the launch mode to `initial` when none is provided
- treat the release approval boundary as pre-approved
- **load store declarations from `docs/store-declarations.yaml` and never generate or infer those values.**
  Age rating (IARC), data safety, target audience, export compliance, pricing, countries, and business contact
  details are declarations the user makes as true; a wrong one risks account termination, not just a rejection.
  If the file is missing, append `phase_blocked` and stop with a pointer to `preflight`.
- honor `submit_policy` from that file: `first-app-manual` (default) fills every listing/console field automatically
  but stops before the irreversible submit and asks once; `auto` submits, downgrading to manual if any required
  declaration field is empty
- if store authentication or another external credential step blocks submission, report it as a manual blocker and finish instead of waiting forever
- disable `docs/progress/auto-mode.json` at the end of the launch flow and append `iteration_completed` to `docs/progress/pipeline.jsonl`
- if a manual external blocker prevents launch completion, append `phase_blocked` before stopping

## Inputs

- launch mode: `initial` or `update`
- deploy outputs
- store credentials and listing prerequisites
- release image assets prepared outside deploy when required by the active store flow

## Workflow

1. Resolve launch mode:
   - explicit input wins
   - auto mode with no input: use `initial`
2. Verify release prerequisites and summarize blockers.
3. Handle the release approval boundary:
   - interactive mode: stop for approval
   - auto mode: treat the release plan as approved and continue immediately
4. After approval or auto-mode release kickoff:
   - spawn `launch-orchestrator`
   - coordinate listing copy, legal docs, landing page, release image assets, and submission through the current repository script family:
     - `bash scripts/submit-ios.sh`
     - `node scripts/app-store.mjs`
     - `node scripts/play-store.mjs`
     - `node scripts/upload-images.mjs`
5. Report release status and unresolved blockers.
6. If auto mode is active, perform cleanup:
   - set `docs/progress/auto-mode.json` `enabled` to `false`
   - add `completed_at`
   - append `iteration_completed` to `docs/progress/pipeline.jsonl`

## Codex Notes

- Use `.agents/codex/runtime/launch-flow.md`.
- Browser and store interactions should stay evidence-driven and bounded.
- Keep the main Codex session responsible for the approval stop.
- Honor `docs/progress/auto-mode.json` when deciding whether to pause at release approval.
- `launch-orchestrator` owns release progress events in `docs/progress/pipeline.jsonl` and `docs/progress/deploys.jsonl`.
