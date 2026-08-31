---
name: deploy
description: Coordinate production deployment and post-deploy ADB smoke verification using Codex custom agents after explicit deployment approval.
---

# deploy

Use this skill after implementation and verification are accepted.

## Auto Mode

When `docs/progress/auto-mode.json` exists and `enabled=true`:

- default the deploy mode to `initial` when none is provided
- treat `Deploy Approval` as pre-approved
- keep the deploy summary brief
- finish only the `deploy` phase and let the hook router continue into the `build` release-prep subphases

## Inputs

- deploy mode: `initial` or feature-scoped incremental deploy
- approved implementation outputs
- relevant test scenarios
- approved deploy target and environment scope

## Workflow

1. Determine deploy mode:
   - `initial`: full deploy across DB, server, webview, and mobile production builds
   - feature name: incremental deploy scoped to the changed components for that feature
   - auto mode with no explicit input: use `initial`
   - for feature-scoped deploys, verify `docs/features/{feature-name}-test-scenarios.md` or the active alias exists so smoke scope can be derived
2. Validate deploy prerequisites and summarize:
   - derived identifiers and URLs
   - blocking infra or credential gaps
   - recommended default deploy path
   - exact next action for `Deploy Approval`
3. Handle `Deploy Approval`:
   - interactive mode: stop for approval
   - auto mode: treat the deploy plan as approved and continue immediately
4. After approval or auto-mode deploy kickoff:
   - spawn `deploy-orchestrator`
   - execute the approved deploy flow
   - verify any in-scope client that consumes the deployed environment, not only the deployed artifact itself
   - run ADB smoke verification on a dev-compatible installed build and again on the production Android artifact
5. Report:
   - component deploy status
   - URLs and health checks
   - migration actions
   - Android and iOS build artifact paths
   - ADB smoke results for dev and production passes
   - unresolved blockers
   - exact next release step
   - auto mode: stop after the report; the `Stop` hook will route the first remaining `build` subphase

## Codex Notes

- Use `.agents/codex/runtime/deploy-flow.md`.
- Treat remote DB apply, production deploy, production mobile builds, and store submission prerequisites as high-risk actions.
- Keep the main Codex session responsible for the approval stop.
- Honor `docs/progress/auto-mode.json` when deciding whether to pause at `Deploy Approval`.
- `deploy-orchestrator` owns `docs/progress/pipeline.jsonl` and `docs/progress/deploys.jsonl` updates after approval.
- Prefer repository scripts and workflows over ad hoc shell sequences:
  - `bash scripts/setup-deploy.sh`
  - `bash scripts/build-android.sh`
  - `bash scripts/build-ios.sh`
  - `.github/workflows/deploy.yml`
  - `.github/workflows/deploy-webview.yml`
- **Deploy owns raw store screenshot capture — it is the only production point.** `make-aso-images` only frames
  existing raw captures; it cannot capture. Platform sources differ and must not be mixed:
  - Android: production ADB smoke in store-capture mode -> `assets/screenshots/android/{locale}/NN-name.png`
  - iOS: Release simulator capture after the launch-gate smoke -> `assets/screenshots/ios/{locale}/NN-name.png`
  Reusing Android captures for iOS listings exposes the Android status bar and is an Apple rejection reason.
- Release image prep (`build` subphases) happens after deploy and before launch, consuming those raw captures.
- After deploy completes in auto mode, the hook router continues release prep in order:
  1. `setup-icons` — 앱 아이콘 생성/교체 (소스 이미지가 있는 경우)
  2. `setup-landing` — 랜딩 페이지 생성 및 배포
  3. `make-aso-images` — 스토어 ASO 스크린샷 생성
