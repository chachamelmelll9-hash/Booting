---
name: define-pages
description: Turn approved feature specs into a unified page inventory, route map, and navigation structure.
---

# define-pages

Use this skill after `Spec Approval`.

## Auto Mode

When `docs/progress/auto-mode.json` exists and `enabled=true`:

- ask no extra route-clarification questions unless the route map is genuinely ambiguous
- auto-accept the recommended tab and navigation structure
- auto-apply `ux-ui-designer` review improvements for page structure
- write `docs/features/page-map.md` and emit a brief summary
- finish only the `define-pages` phase and let the `Stop` hook route `design-wireframes`

## Progress Tracking (JSONL)

- use `docs/progress/SCHEMA.md`
- append `phase_started` to `docs/progress/pipeline.jsonl` when `define-pages` begins
- append `phase_completed` to `docs/progress/pipeline.jsonl` after `docs/features/page-map.md` is written
- use the active `iter`, `feature=null`, `phase="define-pages"`, and `skill="define-pages"`

## Inputs

- `docs/features/feature-summary.md`
- optional `docs/features/data-model.md`
- existing route structure under `apps/mobile/app/` and `apps/webview/src/`

## Workflow

1. Read the feature summary and optional data model.
2. Propose the tab structure and major navigation grouping.
3. Derive the unified page list, separating reused screens from extended screens and net-new screens.
4. Validate the proposed structure:
   - interactive mode: use normal chat for the minimum route-ambiguity follow-up questions
   - auto mode: choose the recommended routing decisions directly
5. Run a UX review pass with `ux-ui-designer`:
   - spawn a read-only persistent `ux-ui-designer` custom agent
   - send `mode=page-structure` plus the draft tab structure, page list, and the relevant feature-summary or data-model context
   - if the review grade is `A`, continue
   - if the review grade is `B` or `C`, revise the structure locally in the main Codex session and rerun one bounded follow-up review when needed
   - interactive mode: show the review to the user before applying non-trivial changes
   - auto mode: apply the recommended improvements directly
6. Write `docs/features/page-map.md`.
7. Present a `Pages Approval` checkpoint summary:
   - interactive mode: stop for approval
   - auto mode: keep the summary brief and stop; the `Stop` hook will route `design-wireframes`

## Outputs

- `docs/features/page-map.md`

## Codex Notes

- Use normal chat instead of `AskUserQuestion`.
- Keep Expo Router path conventions aligned with `.claude/skills/define-pages/SKILL.md`.
- Prefer reusing boilerplate screens before inventing new ones.
- Use Codex multi-agent orchestration with the `ux-ui-designer` custom agent instead of Claude agent-team semantics.
- Honor `docs/progress/auto-mode.json` when deciding whether to pause at `Pages Approval`.
- In hook-driven auto mode, this skill must not manually continue into `design-wireframes`.
- Keep `pipeline.jsonl` progress events aligned with the source page-definition flow.
