# Compatibility Matrix

## Skills

| Claude Asset | Codex Target | Status | Notes |
| --- | --- | --- | --- |
| `.claude/skills/setup` | `.agents/skills/setup` | Ported | Source-aligned bootstrap entrypoint added for Codex, including `setup auto:` initialization, conditional Supabase or server bring-up, persisted `auto-mode.json`, and onboarding Maestro auth smoke parity |
| `.claude/skills/start` | `.agents/skills/start` | Ported | Source-aligned planning kickoff added for Codex, including persisted auto-mode defaults, Kakao Maestro login verification parity, and automatic handoff to clarify |
| `.claude/skills/continue` | `.agents/skills/continue` | Ported | JSONL-driven resume flow synced to `docs/progress/*.jsonl`, with Stop-hook-driven auto continuation and persisted auto-mode handling |
| `.claude/skills/clarify-core-feature` | `.agents/skills/clarify-core-feature` | Ported | Source phase structure synced, `AskUserQuestion` replaced with normal chat in interactive mode, and Claude auto-mode agent teams replaced with Codex multi-agent orchestration |
| `.claude/skills/define-pages` | `.agents/skills/define-pages` | Ported | Validation stays in standard Codex dialog and source `ux-ui-designer` page-structure review is mapped to Codex multi-agent flow |
| `.claude/skills/design-wireframes` | `.agents/skills/design-wireframes` | Ported | Batch validation preserved without Claude-only primitives, with per-tab `ux-ui-designer` review mapped to a persistent Codex custom agent |
| `.claude/skills/mobile-ux-ui-design` | `.agents/skills/mobile-ux-ui-design` | Ported | Codex skill entry added; source reference library stays under `.claude/` |
| `.claude/skills/design-architecture` | `.agents/skills/design-architecture` | Ported | Codebase inspection stays local, auto-mode chaining is restored, and source `ux-ui-designer` component-architecture review is mapped to Codex multi-agent flow |
| `.claude/skills/write-test-scenarios` | `.agents/skills/write-test-scenarios` | Ported | ADB references synced to use `uiautomator dump` as the primary UI evidence path |
| `.claude/skills/implement-feature` | `.agents/skills/implement-feature` | Ported | Codex checkpoints remain available in interactive mode, while source-style auto-mode bypass and deploy chaining are restored |
| `.claude/skills/deploy` | `.agents/skills/deploy` | Ported | Deploy flow expanded with Actions-first execution, build-script parity, and auto-mode chaining to ASO image prep |
| `.claude/skills/make-aso-images` | `.agents/skills/make-aso-images` | Ported | Release handoff synced to the current repository store CLI family, with auto-mode chaining to launch restored |
| `.claude/skills/launch` | `.agents/skills/launch` | Ported | Skill delegates to Codex custom agents after approval in interactive mode, and now also performs source-style auto-mode cleanup |
| `.claude/skills/setup-icons` | `.agents/skills/setup-icons` | Ported | Minimal runtime adaptation |
| `.claude/skills/setup-landing` | `.agents/skills/setup-landing` | Ported | Deploy boundary made explicit |
| `.claude/skills/agent-browser` | `.agents/skills/agent-browser` | Ported | Guidance kept nearly unchanged |
| `.claude/skills/supabase-postgres-best-practices` | `.agents/skills/supabase-postgres-best-practices` | Ported | Reference skill |

## Agents

| Claude Asset | Codex Target | Status | Notes |
| --- | --- | --- | --- |
| `.claude/agents/implement-orchestrator.md` | `.codex/agents/implement-orchestrator.toml` | Ported | Coordinator role narrowed for Codex, env-check evidence synced to UI dumps, and JSONL progress ownership aligned to `docs/progress/*` |
| `.claude/agents/server-implement.md` | `.codex/agents/server-implement.toml` | Ported | Bounded server implementation worker with `features.jsonl` completion/failure logging |
| `.claude/agents/mobile-implement.md` | `.codex/agents/mobile-implement.toml` | Ported | Bounded mobile implementation worker with `features.jsonl` completion/failure logging |
| `.claude/agents/webview-implement.md` | `.codex/agents/webview-implement.toml` | Ported | Bounded webview implementation worker with `features.jsonl` completion/failure logging |
| `.claude/agents/db-implement.md` | `.codex/agents/db-implement.toml` | Ported | DB worker with approval-boundary awareness and `features.jsonl` completion/failure logging |
| `.claude/agents/e2e-verify.md` | `.codex/agents/e2e-verify.toml` | Ported | Server verification worker with `error_logged` parity |
| `.claude/agents/adb-verify.md` | `.codex/agents/adb-verify.toml` | Ported | Mobile verification worker synced to UI-dump-first evidence collection |
| `.claude/agents/adb-smoke.md` | `.codex/agents/adb-smoke.toml` | Ported | Device smoke worker synced to UI-dump-first evidence collection |
| `.claude/agents/clarifying-plan-agent.md` | `.codex/agents/clarifying-plan-agent.toml` | Ported | Read-only PM advisor for `clarify-core-feature` auto mode, adapted to Codex multi-agent orchestration |
| `.claude/agents/ux-ui-designer.md` | `.codex/agents/ux-ui-designer.toml` | Ported | Read-only senior mobile UX/UI advisor for page structure, wireframes, and component architecture reviews |
| `.claude/agents/webview-verify.md` | `.codex/agents/webview-verify.toml` | Ported | Deprecated compatibility alias that redirects to the current verification agents |
| `.claude/agents/deploy-orchestrator.md` | `.codex/agents/deploy-orchestrator.toml` | Ported | Coordinator with bounded child delegation and deploy JSONL progress ownership |
| `.claude/agents/launch-orchestrator.md` | `.codex/agents/launch-orchestrator.toml` | Ported | Coordinator updated to the current repository launch scripts and release JSONL progress ownership |
| `.claude/agents/development-orchestrator.md` | Replaced by `.codex/agents/implement-orchestrator.toml` | Retired in source | Old name removed during source refactor |
| `.claude/agents/maestro-verify.md` | Replaced by `.codex/agents/adb-verify.toml` | Retired in source | Mobile verification moved from Maestro to ADB |
