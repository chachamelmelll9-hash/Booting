# Skill Mapping

## Naming Rule

Keep Codex skill names aligned with `.claude` skill names unless a later incompatibility forces a rename.

## Mapping

| Source | Codex | Target Path | Primary Purpose |
| --- | --- | --- | --- |
| `setup` | `setup` | `.agents/skills/setup/SKILL.md` | local environment bootstrap entrypoint |
| `start` | `start` | `.agents/skills/start/SKILL.md` | planning kickoff after setup |
| `clarify-core-feature` | `clarify-core-feature` | `.agents/skills/clarify-core-feature/SKILL.md` | feature spec creation |
| `define-pages` | `define-pages` | `.agents/skills/define-pages/SKILL.md` | page inventory and routes |
| `design-wireframes` | `design-wireframes` | `.agents/skills/design-wireframes/SKILL.md` | text wireframes |
| `mobile-ux-ui-design` | `mobile-ux-ui-design` | `.agents/skills/mobile-ux-ui-design/SKILL.md` | mobile UI/UX design intelligence |
| `design-architecture` | `design-architecture` | `.agents/skills/design-architecture/SKILL.md` | implementation architecture |
| `write-test-scenarios` | `write-test-scenarios` | `.agents/skills/write-test-scenarios/SKILL.md` | execution-ready scenarios |
| `implement-feature` | `implement-feature` | `.agents/skills/implement-feature/SKILL.md` | implementation entry skill |
| `deploy` | `deploy` | `.agents/skills/deploy/SKILL.md` | deployment entry skill |
| `make-aso-images` | `make-aso-images` | `.agents/skills/make-aso-images/SKILL.md` | framed release image generation |
| `launch` | `launch` | `.agents/skills/launch/SKILL.md` | release entry skill |
| `setup-icons` | `setup-icons` | `.agents/skills/setup-icons/SKILL.md` | asset generation utility |
| `setup-landing` | `setup-landing` | `.agents/skills/setup-landing/SKILL.md` | landing page generation utility |
| `continue` | `continue` | `.agents/skills/continue/SKILL.md` | project status analysis and next step recommendation |
| `agent-browser` | `agent-browser` | `.agents/skills/agent-browser/SKILL.md` | browser automation reference skill |
| `supabase-postgres-best-practices` | `supabase-postgres-best-practices` | `.agents/skills/supabase-postgres-best-practices/SKILL.md` | DB guidance reference skill |

## Rewrite Rules

- Remove Claude-only metadata semantics such as `agent:` and `context: fork`.
- Replace `AskUserQuestion` with standard Codex chat questions and checkpoint stops.
- Replace Claude agent-team auto-mode flows with Codex multi-agent orchestration using custom agents and the main session as the user-facing owner.
- Preserve argument shape and output filenames where possible.
- Prefer referencing `.claude/.../references` over duplicating large reference libraries.
- `init` is retained as a Codex-only backward-compatible alias for the newer `setup` -> `start` split.
