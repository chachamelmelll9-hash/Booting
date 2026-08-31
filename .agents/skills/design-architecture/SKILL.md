---
name: design-architecture
description: Turn approved specs, pages, and wireframes into an implementation architecture with API contracts, DB draft, and execution order.
---

# design-architecture

Use this skill after `Wireframes Approval`.

## Auto Mode

When `docs/progress/auto-mode.json` exists and `enabled=true`:

- auto-accept the recommended mobile and server architecture direction unless a real contradiction appears
- auto-apply `ux-ui-designer` component-architecture review improvements
- keep the approval summary brief
- finish only the `architecture` phase and let the `Stop` hook route `write-test-scenarios`

## Progress Tracking (JSONL)

- use `docs/progress/SCHEMA.md`
- append `phase_started` to `docs/progress/pipeline.jsonl` when `design-architecture` begins
- append `phase_completed` to `docs/progress/pipeline.jsonl` after `docs/features/architecture.md` is written
- use the active `iter`, `feature=null`, `phase="architecture"`, and `skill="design-architecture"`

## Inputs

- `docs/features/*.md`
- `docs/features/page-map.md`
- `docs/features/wireframe-*.md`
- current code structure under `apps/mobile`, `apps/server`, `apps/webview`, and `packages`

## Workflow

1. Read the approved planning docs.
2. Inspect the existing codebase structure and naming patterns.
3. Design the mobile, server, and optional webview architecture.
4. Run a UX or design-system review pass with `ux-ui-designer`:
   - spawn a read-only `ux-ui-designer` custom agent
   - send `mode=component-architecture` plus the mobile file tree, proposed shared-ui surface, and the common-component signals from the wireframes
   - if the review grade is `A`, continue
   - if the review grade is `B` or `C`, revise the mobile component architecture, shared-ui surface, or token strategy locally in the main Codex session
   - interactive mode: show the review to the user before applying non-trivial structural changes
   - auto mode: apply the recommended improvements directly
5. Draft API contracts and DB changes without applying them.
6. Define implementation order and likely worker ownership.
7. Write:
   - `docs/features/{feature-name}-architecture.md`
   - `docs/features/architecture.md` as the active alias for downstream tools
8. Present an `Architecture Approval` checkpoint summary:
   - interactive mode: stop for approval
   - auto mode: stop after the summary; the `Stop` hook will route `write-test-scenarios`

## Outputs

- `docs/features/{feature-name}-architecture.md`
- `docs/features/architecture.md`

## Codex Notes

- Reuse `.claude/skills/design-architecture/references/mobile-fsd-guide.md`.
- Reuse `.claude/skills/design-architecture/references/server-clean-arch.md`.
- Keep new files minimal and aligned with repo patterns.
- Use Codex multi-agent orchestration with the `ux-ui-designer` custom agent for design-system review.
- Honor `docs/progress/auto-mode.json` when deciding whether to pause at `Architecture Approval`.
- In hook-driven auto mode, this skill must not manually continue into `write-test-scenarios`.
- Keep `pipeline.jsonl` event names aligned with the source architecture flow.
