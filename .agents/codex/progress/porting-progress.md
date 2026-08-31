# Codex Porting Progress

## Status

PORTING_RUNTIME_VALIDATED

## Completed

- target directory structure created
- root `AGENTS.md` aligned with Codex runtime layout
- Codex runtime and porting docs created
- Codex skill ports created under `.agents/skills/`
- Codex custom agent ports created under `.codex/agents/`
- `.codex/agents/*.toml` syntax validated
- source rename sync completed for `implement-orchestrator` and `adb-verify`
- Codex-native `write-test-scenarios` references added for ADB flow and output templates
- implementation and deploy runtime docs updated for ADB-first mobile verification
- deploy runtime synced with Actions-first deploy, actual signing credential paths, and no-screenshot deploy behavior
- `make-aso-images` skill ported with local frame-generation references and release-flow linkage
- source `setup` and `start` split synced into Codex-native skills, with `init` retained as a compatibility alias
- source `setup` Supabase conditional branch synced so Codex asks whether auth is required before provisioning Supabase or starting the server
- source onboarding Maestro auth smoke in `setup` and Kakao Maestro login verification in `start` synced to the Codex skill contracts
- source `clarifying-plan-agent` ported as a Codex custom agent and `clarify-core-feature` synced to the source phase structure plus Codex multi-agent auto mode
- source `ux-ui-designer` ported as a Codex custom agent and the page, wireframe, and architecture planning skills synced to the newer design-review loop
- source JSONL progress model synced across Codex pipeline skills, `continue`, implementation flow, and deploy or launch orchestrators
- source `setup auto:` full-auto contract synced into Codex with persisted `docs/progress/auto-mode.json`, repo-local Codex Stop hooks, and end-to-end skill auto-chaining through launch cleanup
- ADB verification and smoke guidance synced to the newer `uiautomator dump` primary-evidence model
- deprecated `webview-verify` source agent ported as a Codex compatibility alias
- launch orchestration synced to the current repository store script family (`submit-ios.sh`, `app-store.mjs`, `play-store.mjs`, `upload-images.mjs`)
- live Codex run validated repo-local skill discovery for all 18 skills
- live Codex run validated repo-local custom agent discovery for all 12 agents
- live Codex run validated custom agent spawning after raising `.codex/config.toml` `max_threads` to `12`
- live Codex run validated `adb-verify`, `adb-smoke`, and `implement-orchestrator` responses against the updated `uiautomator dump` guidance
- live Codex run validated `clarifying-plan-agent` delegation and `clarify-core-feature` multi-agent guidance
- live Codex run validated JSONL progress guidance for `continue`, `implement-feature`, and deploy or launch orchestration
- home `~/.codex/skills/` broken symlink cleanup completed

## Notes

- repo-local `.agents/skills/` and `.codex/agents/` discovery is clean after home-directory broken symlink cleanup
