# Artifact Conventions

## Principle

Codex artifacts should stay aligned with `.claude` outputs wherever practical.

## Planning Outputs

- feature specs: `docs/features/{feature-name}.md`
- feature summary: `docs/features/feature-summary.md`
- data model: `docs/features/data-model.md`
- page map: `docs/features/page-map.md`
- wireframes: `docs/features/wireframe-*.md`
- wireframe index: `docs/features/wireframe-index.md`

## Architecture And Scenario Aliases

The source workflow mixes feature-specific and generic filenames.
To keep both runtimes usable:

- architecture canonical: `docs/features/{feature-name}-architecture.md`
- architecture alias: `docs/features/architecture.md`
- scenarios canonical: `docs/features/{feature-name}-test-scenarios.md`
- scenarios alias: `docs/features/test-scenarios.md`

## Progress Output

- pipeline progress: `docs/progress/pipeline.jsonl`
- implementation progress: `docs/progress/features.jsonl`
- deploy progress: `docs/progress/deploys.jsonl`
- schema: `docs/progress/SCHEMA.md`

## Verification Artifacts

- server E2E code: `apps/server-e2e/`
- mobile ADB scripts: `apps/mobile-e2e/adb-tests/{feature-name}--{scenario-id}.sh`
- mobile ADB evidence: `test-results/{feature-name}/adb/`
- post-deploy smoke evidence: `test-results/{feature-name}/smoke/` or deploy report attachments

## Deploy Outputs

- Android production artifact: `apps/mobile/build-*.aab`
- iOS production artifact: `apps/mobile/build/ipa/*.ipa`
- deploy report URLs: server and webview URLs derived during deploy

## Release Image Outputs

- raw Android release screenshots: `assets/screenshots/android/{locale}/`
- framed Android release images: `assets/aso-images/android/{locale}/`
- framed iOS release images: `assets/aso-images/ios/{locale}/`
