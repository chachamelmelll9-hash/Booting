---
name: setup-icons
description: Replace mobile and webview icon assets from a single source image using the repository icon conventions.
---

# setup-icons

Use this skill when the user wants to regenerate app icons from one source asset, or when the hook-driven release-prep flow detects an icon source image.

## Auto Mode

When `docs/progress/auto-mode.json` exists and `enabled=true`:

- treat this as the optional first `build` subphase
- if no icon source image is available, report the skip clearly and stop
- finish only this subphase and let the `Stop` hook route the next remaining release-prep step

## Progress Tracking (JSONL)

- use `docs/progress/SCHEMA.md`
- append `phase_started` to `docs/progress/pipeline.jsonl` when `setup-icons` begins
- append `phase_completed` to `docs/progress/pipeline.jsonl` after icon generation succeeds
- use the active `iter`, `feature=null`, `phase="build"`, and `skill="setup-icons"`

## Inputs

- source image path

## Workflow

1. Validate that the source image exists.
   - if no source path was given directly, look for a repository-known icon source image first
2. Inspect dimensions and file format with `sips`.
3. Generate the required mobile icon assets.
4. Generate webview assets when `apps/webview/public/` exists.
5. Verify the generated dimensions and report the results.

## Outputs

- updated icon assets under `apps/mobile/assets/images/`
- optional webview assets under `apps/webview/public/`

## Codex Notes

- Keep behavior aligned with `.claude/skills/setup-icons/SKILL.md`.
- Warn when the input is too small for store-grade assets.
