# Checkpoint Policy

## Active Model

This repository uses checkpoint model `2`.

## Required Checkpoints

1. `Spec Approval`
2. `Pages Approval`
3. `Wireframes Approval`
4. `Architecture Approval`
5. `Implementation Kickoff`
6. `Verification Approval`
7. `Deploy Approval`

## Behavior

- The main Codex session owns checkpoint communication.
- A checkpoint response must include:
  - short summary
  - open decisions or blockers
  - recommended default
  - exact next action if approved

## Auto Mode Exception

When `docs/progress/auto-mode.json` exists with `enabled=true`:

- keep the checkpoint summary brief
- treat the recommended default as approved
- stop after the current phase summary and let the `Stop` hook route the next pipeline skill instead of waiting for a manual reply

## Continuous Execution Rule

After `Implementation Kickoff` is approved:

- implementation slices may continue without per-slice approval stops
- bounded workers may run in sequence or in parallel
- the workflow still stops before the `Verification Approval` checkpoint

After `Verification Approval` is approved:

- local verification may continue without extra approval
- the workflow still stops before `Deploy Approval`

In auto mode, those intermediate stops are skipped and the hook router continues the flow until launch cleanup disables auto mode.
