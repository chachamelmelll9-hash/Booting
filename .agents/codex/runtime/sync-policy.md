# Sync Policy

## Source Of Truth

- `.claude/` is the current source repository for dual-runtime prompt assets.
- Codex assets under `.agents/skills/` and `.codex/agents/` are maintained as derived runtime assets.

## Update Rule

When a relevant `.claude` asset changes:

1. review the changed `.claude` file
2. update the mapped Codex asset manually
3. update the compatibility or mapping docs if the contract changed
4. note the change in `.agents/codex/progress/porting-progress.md`

## Naming Rule

- keep skill names aligned between Claude and Codex
- keep agent names aligned between Claude and Codex
- keep output artifact filenames aligned unless a runtime limitation forces divergence

## Reference Reuse Rule

- prefer linking to `.claude/.../references` for large reference libraries
- duplicate reference material only when Codex needs a runtime-local copy
- keep runtime-active templates and command references local when Codex skills rely on them directly during execution
