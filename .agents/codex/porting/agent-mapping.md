# Agent Mapping

## Naming Rule

Keep Codex custom agent names aligned with `.claude` agent names where practical.

## Mapping

| Source | Codex | Target Path | Role Type |
| --- | --- | --- | --- |
| `implement-orchestrator` | `implement-orchestrator` | `.codex/agents/implement-orchestrator.toml` | coordinator |
| `server-implement` | `server-implement` | `.codex/agents/server-implement.toml` | worker |
| `mobile-implement` | `mobile-implement` | `.codex/agents/mobile-implement.toml` | worker |
| `webview-implement` | `webview-implement` | `.codex/agents/webview-implement.toml` | worker |
| `db-implement` | `db-implement` | `.codex/agents/db-implement.toml` | worker |
| `e2e-verify` | `e2e-verify` | `.codex/agents/e2e-verify.toml` | verifier |
| `adb-verify` | `adb-verify` | `.codex/agents/adb-verify.toml` | verifier |
| `adb-smoke` | `adb-smoke` | `.codex/agents/adb-smoke.toml` | verifier |
| `clarifying-plan-agent` | `clarifying-plan-agent` | `.codex/agents/clarifying-plan-agent.toml` | read-only product advisor |
| `ux-ui-designer` | `ux-ui-designer` | `.codex/agents/ux-ui-designer.toml` | read-only mobile UX/UI advisor |
| `webview-verify` | `webview-verify` | `.codex/agents/webview-verify.toml` | deprecated verifier alias |
| `deploy-orchestrator` | `deploy-orchestrator` | `.codex/agents/deploy-orchestrator.toml` | coordinator |
| `launch-orchestrator` | `launch-orchestrator` | `.codex/agents/launch-orchestrator.toml` | coordinator |

## Retired Source Agents

- `development-orchestrator` was replaced by `implement-orchestrator`
- `maestro-verify` was replaced by `adb-verify`

## Rewrite Rules

- Coordinators keep the checkpoint contract with the main Codex agent.
- Workers own bounded write scopes or bounded verification scopes.
- Deprecated compatibility agents should redirect to the active workflow instead of reviving removed automation.
- Verification agents do not silently fix code unless explicitly redirected.
- Remote operations must honor the approval rules in `.agents/codex/runtime/approval-boundaries.md`.
