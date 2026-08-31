# Codex Workflow

This repository uses a checkpoint-first semi-automation workflow for Codex.

## Default Operating Mode

- The main Codex agent owns user communication, scope control, and checkpoint decisions.
- Subagents are used only for bounded implementation or verification tasks.
- Work advances one phase at a time. After each phase, Codex stops, summarizes the artifact, and asks for user confirmation before moving on.
- Repository-defined Codex skills and agents are first-class workflow assets.
- Codex repo-local skills live under `.agents/skills/`.
- Codex custom agents live under `.codex/agents/`.
- Codex workflow and porting docs live under `.agents/codex/`.
- `.claude/` remains the source repository for dual-runtime prompt assets until a different source strategy is adopted.

## Auto Mode Exception

- `setup auto: ...` is an explicit opt-in to the source-aligned full auto pipeline.
- When `docs/progress/auto-mode.json` exists with `enabled=true`, Codex should:
  - auto-select recommended checkpoint defaults
  - chain to the next pipeline skill without waiting for manual confirmation
  - let the repo-local Codex `Stop` hook continue the pipeline through `continue`
- This opt-in counts as the user's approval to advance the repository-defined pipeline checkpoints, including deploy and launch steps, unless a skill explicitly downgrades or exits because of a manual external blocker such as missing credentials or required third-party login.
- Auto mode should clean itself up at launch completion by disabling `docs/progress/auto-mode.json` and recording pipeline completion in `docs/progress/pipeline.jsonl`.

## Repository Codex Assets

- Define Codex-native skills under `.agents/skills/`.
- Define Codex-native agents under `.codex/agents/`.
- Keep Codex runtime docs under `.agents/codex/runtime/`.
- Keep Codex porting and compatibility docs under `.agents/codex/porting/`.
- Keep Codex reference material under `.agents/codex/references/`.
- Keep Codex migration progress under `.agents/codex/progress/`.
- Keep repository-owned skill and agent contracts in sync with this file.
- Do not assume compatibility with other agent runtimes unless the asset is intentionally written as a shared, runtime-agnostic spec.

## Required Checkpoints

Every feature follows these approval gates:

1. `Spec Approval`
2. `Pages Approval`
3. `Wireframes Approval`
4. `Architecture Approval`
5. `Implementation Kickoff`
6. `Verification Approval`
7. `Deploy Approval` when deployment work is later added

At each checkpoint, Codex must provide:

- A short summary of what changed
- Open decisions or blockers
- A recommended default
- The exact next action if the user approves

## High-Risk Actions

These actions require explicit user approval before execution:

- Applying remote DB changes
- Seeding shared environments
- Installing or upgrading global CLIs
- Deploying server, webview, or mobile builds
- Submitting to app stores
- Destructive git operations

## Deploy Verification Rule

- `Deploy Approval` is not complete until post-deploy smoke verification has been run against the deployed environment or a concrete blocker has been reported and accepted by the user.
- Post-deploy verification must cover both:
  - the artifacts that were deployed
  - any in-scope user-facing client that consumes those deployed artifacts
- If server or webview is deployed and the mobile app consumes those live endpoints, Codex must run a post-deploy mobile smoke against the deployed URLs before closing `Deploy Approval`, unless the user explicitly narrows or waives that verification.
- If any deploy verification item is skipped, Codex must record the exact skipped item and reason in the progress logs before moving to the next phase.

## Repository Rules

- Mobile package installs:
  - Run `npx expo install <package>` inside `apps/mobile`
- Server and webview package installs:
  - Run `pnpm add <package>` in the target app directory
- Workspace-wide installs:
  - Run `pnpm install -w <package>` from the repo root
- Type checking:
  - Mobile: `cd apps/mobile && npx tsc -p tsconfig.app.json --noEmit`
  - Server: `cd apps/server && npx tsc --noEmit`
- Build and lint:
  - Prefer root scripts such as `pnpm lint`, `pnpm build`, `pnpm serve:server`, `pnpm dev:webview`

## Database Rule

- Schema changes follow a single policy: execute via Supabase MCP `apply_migration`, and always record the identical SQL as `supabase/migrations/{timestamp}_{name}.sql` for reproducibility (deploy applies these files in order).
- Default Codex behavior is to design schema changes and write the migration SQL file locally first.
- If Supabase MCP or another DB execution path is available, do not apply changes automatically. Ask for approval first; once approved, apply via MCP `apply_migration` and keep the migration file in sync.
- Keep DB guidance in Codex-owned assets once a repository-native DB skill or reference is added.

## Progress Tracking

Progress is tracked via JSONL files in `docs/progress/` (schema: `docs/progress/SCHEMA.md`):

- `pipeline.jsonl` — pipeline phase transitions (all iterations)
- `features.jsonl` — implementation details: worker status, static tests, E2E, errors
- `deploys.jsonl` — deploy, build, store submission, OTA, releases
- Approval history

Verification status must explicitly distinguish:

- typecheck / lint status
- server e2e status
- mobile device smoke status
- runtime manual smoke status
- post-deploy smoke status
- whether each item was executed, skipped, or blocked

## Skill Trigger Notes

- Trigger the local skill that matches the user's current phase instead of trying to run an end-to-end autonomous pipeline.
- If the user asks to "just build it", Codex should still enforce the required checkpoints and confirm before high-risk operations.
- When a `.claude` asset is ported, prefer the Codex-native asset for Codex execution and keep the naming aligned where practical.

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:ca08a54f -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->
