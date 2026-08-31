---
name: setup-landing
description: Analyze the app, generate a landing page for the webview, and optionally deploy it after approval.
---

# setup-landing

Use this skill when the user wants a landing page created or refreshed, or when the hook-driven release-prep flow reaches the landing subphase.

## Auto Mode

When `docs/progress/auto-mode.json` exists and `enabled=true`:

- treat this as a `build` subphase
- skip routine confirmation of the extracted product summary and use the strongest grounded summary
- if deployment is in scope for the release prep flow, treat it as covered by the auto-mode approval contract
- if a manual external blocker such as missing Pages auth prevents completion, append `phase_blocked` and stop
- finish only this subphase and let the `Stop` hook route the next remaining release-prep step

## Progress Tracking (JSONL)

- use `docs/progress/SCHEMA.md`
- append `phase_started` to `docs/progress/pipeline.jsonl` when `setup-landing` begins
- append `phase_completed` to `docs/progress/pipeline.jsonl` after the landing page build or approved deploy result is complete
- use the active `iter`, `feature=null`, `phase="build"`, and `skill="setup-landing"`

## Inputs

- optional language and positioning notes

## Workflow

1. Analyze the mobile, server, i18n, and webview codebase.
2. Confirm the extracted product summary with the user.
   - auto mode: skip the extra confirmation turn and proceed with the strongest grounded summary
3. Generate the landing page code and route registration.
4. Build the webview locally.
5. If deployment is requested:
   - interactive mode: stop for approval before running a remote Pages deploy
   - auto mode: treat the deploy step as already approved by the auto-mode contract and proceed unless a manual external blocker appears
6. After approval, deploy and verify the live URL.

## Outputs

- landing page source under `apps/webview/src/pages/landing/`
- optional deploy URL

## Codex Notes

- Keep the generated page visually intentional, not template-like.
- Reuse `.claude/skills/setup-landing/SKILL.md` for analysis cues.
- In hook-driven auto mode, this skill must not manually continue into another release-prep skill.
