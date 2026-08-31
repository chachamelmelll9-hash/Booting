# Launch Flow

## Entry

Use `launch` only after deploy artifacts and the required release image assets are ready, typically from `make-aso-images` or an equivalent manual preparation step.

If `docs/progress/auto-mode.json` exists with `enabled=true`, default the mode to `initial`, treat release approval as granted, and disable auto mode during launch cleanup.

## Main Sequence

1. verify release prerequisites, including `docs/store-declarations.yaml` (store declarations are read from that
   file only — never generated; missing file means `phase_blocked`)
2. stop at the required release approval boundary unless auto mode is active, and in every case honor
   `submit_policy` for the final irreversible submit step
3. coordinate metadata, legal docs, landing page, release image assets, and store submission
4. report submission and review status
5. if auto mode is active, disable `docs/progress/auto-mode.json` and append `iteration_completed`

## Delegation Model

- main Codex owns release approval and communication
- `launch-orchestrator` coordinates release tasks
- browser and store-specific work stays bounded and evidence-driven
