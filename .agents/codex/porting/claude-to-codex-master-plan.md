# Claude To Codex Master Plan

## Goal

Port the workflow implemented under `.claude/` into Codex-native assets while keeping `.claude/` intact as the source repository for dual-runtime prompt assets.

The target outcome is:

- Claude Code can continue to run from `.claude/`
- Codex can run the same end-to-end workflow from `.agents/skills/` and `.codex/agents/`
- Naming and output artifacts stay aligned across both runtimes

## Approved Decisions

- Source strategy: `.claude/` stays authoritative for dual-runtime prompt assets.
- Codex skill location: `.agents/skills/`
- Codex custom agent location: `.codex/agents/`
- Codex workflow docs: `.agents/codex/`
- Naming policy: preserve `.claude` names where practical
- Output artifacts: keep filenames aligned across Claude and Codex
- Approval model: checkpoint model `2`
  - `Implementation Kickoff` approval allows continuous work inside implementation
  - `Verification Approval` and `Deploy Approval` remain separate checkpoints
- Deploy and launch are included in scope
- Deploy and launch keep orchestrator naming, but the internals follow Codex-style bounded custom agents
- Custom agent config inherits the session defaults unless a later change is needed

## Target Structure

```text
.claude/
  skills/
  agents/

.agents/
  skills/
  codex/
    porting/
    runtime/
    references/
    progress/

.codex/
  agents/
  config.toml
```

## Porting Strategy

1. Create Codex runtime docs and sync rules
2. Port planning skills
3. Port implementation and verification agents
4. Port deploy and launch workflow
5. Validate discovery, agent wiring, checkpoint behavior, and artifact parity

## Execution Order

1. `setup`
2. `start`
3. `clarify-core-feature`
4. `define-pages`
5. `design-wireframes`
6. `design-architecture`
7. `write-test-scenarios`
8. `implement-feature`
9. verification agents
10. `deploy`
11. `launch`

## Success Criteria

- Codex discovers all intended skills from `.agents/skills/`
- Codex can spawn all intended custom agents from `.codex/agents/`
- Codex keeps `init` as a backward-compatible alias while the canonical source-aligned entry flow becomes `setup` -> `start`
- Skill names, output docs, and phase ordering match `.claude` closely enough for dual maintenance
- Checkpoints stop in the agreed places
- Deploy and launch paths are runnable after approval
