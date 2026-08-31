# Codex Auto Mode

This repository supports a source-aligned full-auto pipeline in Codex.

## Entry

- Start with `setup auto: {problem description}`.
- `setup` runs `preflight` **before** creating `docs/progress/auto-mode.json`. Preflight is the only place that may
  ask the user questions, because auto mode forbids them afterwards. It checks accounts/credentials, generates the
  Android keystore when missing, and collects `docs/store-declarations.yaml`.
- `setup` then creates `docs/progress/auto-mode.json` with:
  - `release_ready` — from `docs/progress/preflight.json`. When false, auto mode still runs planning and
    implementation, and `deploy` stops early with `phase_blocked` instead of dying inside a native build.
  - `preferences.use_supabase`, `preferences.kakao_login`, `preferences.locale`
  - `preferences.icon_source` — resolved icon source path or null (null means `setup-icons` is skipped)
  - `preferences.declarations` — path to the store declaration file (default `docs/store-declarations.yaml`)

## Persistence

- `docs/progress/auto-mode.json` is the source of truth for whether full auto mode is active.
- While `enabled=true`, planning and delivery skills should auto-select the recommended default, finish only their own phase, and let the hook router choose the next phase.

## Hook Orchestration

- `.codex/config.toml` enables `features.codex_hooks = true`.
- `.codex/hooks.json` registers repo-local lifecycle hooks.
- `SessionStart` and `UserPromptSubmit` inject hook-driven orchestration context.
- `PreToolUse` enforces approval boundaries for destructive git, remote DB, deploy, production build, and store-submit commands.
- `PostToolUse` adds bounded recovery context after failed Bash commands.
- `Stop` is the phase router:
  - auto-commit repository changes with `git add -A && git commit -m "auto: apply changes"` when there is a dirty worktree
  - restore pipeline state from `docs/progress/*.jsonl`
  - continue with the single next skill for the current phase
  - stop instead when the phase recorded a manual blocker via `phase_blocked`

## Resume Contract

- `continue` restores state from `docs/progress/pipeline.jsonl`, `features.jsonl`, and `deploys.jsonl`.
- `continue` is a recovery tool, not the normal auto-mode progression path.
- In normal auto mode, the `Stop` hook resumes the next phase directly without requiring `continue`.

## Cleanup

- `launch` is responsible for ending auto mode.
- At launch completion, it should:
  - set `docs/progress/auto-mode.json` `enabled` to `false`
  - add `completed_at`
  - append `iteration_completed` to `docs/progress/pipeline.jsonl`
