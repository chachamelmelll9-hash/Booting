---
name: make-aso-images
description: Generate store-ready framed release images from prepared raw screenshots for Android and iOS listings.
---

# make-aso-images

Use this skill after raw release screenshots are available and before `launch`.

## Auto Mode

When `docs/progress/auto-mode.json` exists and `enabled=true`:

- skip headline confirmation and use the strongest generated headline set
- skip screenshot-mapping confirmation and use the best-match selection
- keep the summary brief
- finish only the `build` phase work owned by `make-aso-images` and let the `Stop` hook route `launch`

## Progress Tracking (JSONL)

- use `docs/progress/SCHEMA.md`
- append `phase_started` to `docs/progress/pipeline.jsonl` when `make-aso-images` begins
- append `phase_completed` to `docs/progress/pipeline.jsonl` after the framed Android and iOS outputs are generated
- use the active `iter`, `feature=null`, `phase="build"`, and `skill="make-aso-images"`

## Inputs

- optional locale, default `ko`
- raw screenshots under `assets/screenshots/android/{locale}/` (Android) and `assets/screenshots/ios/{locale}/` (iOS)
  - both are produced by `deploy`; iOS frames must use the iOS captures, never the Android ones (Apple rejection)
  - if iOS captures are missing, frame Android only and report the skip
- feature specs or another approved feature summary source

## Workflow

1. Resolve the locale from the explicit user input. Default to `ko`.
2. Validate prerequisites:
   - `assets/screenshots/android/{locale}/` contains source PNG files
   - feature specs or release messaging inputs exist
   - if the screenshots are missing in auto mode, append `phase_blocked` to `docs/progress/pipeline.jsonl` with the missing prerequisite and stop
3. Read the feature specs and choose the top 3-4 store-facing features using:
   - user value
   - differentiation
   - visual impact
   - conversion relevance
4. Match each selected feature to the most suitable raw screenshot.
5. Present an approval-ready summary with:
   - selected features
   - proposed headlines
   - screenshot mapping
   - theme assumptions
   - recommended default
   - exact next action if approved: generate framed images
   - interactive mode: stop for approval
   - auto mode: treat the proposed mapping as approved and continue immediately
6. After approval or auto-mode confirmation:
   - derive theme colors from app config or shared styles
   - generate framed image outputs for Android and iOS
   - validate output dimensions
   - clean temporary files
7. Report output paths and the exact next release step:
   - interactive mode: stop after the report
   - auto mode: stop after the report; the `Stop` hook will route `launch`
   The release handoff should mention the current repository store CLI family:
   - iOS screenshots: `node scripts/app-store.mjs screenshots ...`
   - Android listing and track work: `node scripts/play-store.mjs ...`
   - Android image upload: `node scripts/upload-images.mjs`

## Outputs

- `assets/aso-images/android/{locale}/*.png`
- `assets/aso-images/ios/{locale}/*.png`

## Codex Notes

- Use local references in `.agents/skills/make-aso-images/references/`.
- Use normal chat for headline or screenshot-mapping confirmation.
- Do not assume deploy captured the raw screenshots. This skill only consumes screenshots that already exist.
- Honor `docs/progress/auto-mode.json` when deciding whether to pause for approval.
- In hook-driven auto mode, this skill must not manually continue into `launch`.
- The repository currently uploads Android store images through `scripts/upload-images.mjs`; do not assume `scripts/play-store.mjs screenshots` exists unless the script is extended later.
- Keep the framed layout tight: minimal gap between headline and device screenshot.
- Keep `pipeline.jsonl` progress events aligned with the source ASO-image flow.
