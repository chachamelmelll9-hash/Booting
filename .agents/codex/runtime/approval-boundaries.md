# Approval Boundaries

## Principle

High-risk actions still require explicit approval, but approval can be bundled into the relevant top-level checkpoint when the scope is clear.

If `docs/progress/auto-mode.json` exists with `enabled=true`, the explicit `setup auto: ...` opt-in counts as approval for the repository-defined pipeline checkpoints. Skills may continue automatically until the auto-mode contract says to degrade or finish.

In hook-driven auto mode, the `PreToolUse` hook is the enforcement point for these boundaries. Skills should not re-ask for approvals that the auto-mode contract already covers unless a manual external blocker forces the flow to degrade.

## Boundary Rules

- `Architecture Approval`
  - approves the design only
  - does not approve implementation

- `Implementation Kickoff`
  - approves local implementation work for the approved scope
  - may approve local migration file creation and code changes
  - does not by itself approve deployment or store submission

- `Verification Approval`
  - approves local verification and device or emulator checks
  - does not by itself approve production deployment

- `Deploy Approval`
  - approves the deployment actions defined in the approved plan
  - may include remote DB apply, server deploy, webview deploy, and production build steps when explicitly described

## Mandatory Explicit Approval Cases

- remote DB apply on shared environments
- seeding shared environments
- global CLI installation or upgrade
- production deployment
- store submission
- destructive git operations

## Reporting Requirement

Before any approved high-risk action runs, Codex must restate:

- target environment
- exact action class
- expected artifacts or side effects
