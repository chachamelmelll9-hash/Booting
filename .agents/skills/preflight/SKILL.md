---
name: preflight
description: Check and prepare everything auto mode cannot automate — accounts, credentials, signing keys, console browser sessions, and the store declaration file. Runs before auto mode is enabled.
---

# preflight

Use this skill before `setup auto: ...` (setup invokes it automatically), or whenever the user asks whether the project is ready to deploy and ship.

Auto mode targets **zero manual steps per app**, but account creation, payment, identity verification, and 2FA cannot be automated at all. This skill collects that one-time setup and generates whatever is machine-generatable.

## Auto Mode Exception

This skill is the **one place that may ask the user questions during an auto-mode run**, because it executes before `docs/progress/auto-mode.json` exists. Values that only a human can supply are collected here — after this point auto mode must not ask.

## Inputs

- optional scope: `tier1` (planning/implementation prerequisites only) or `full` (default)

## Workflow

1. **Tier 1 — planning/implementation prerequisites.** Own git origin (not the vendor template repo), node/pnpm, Android SDK + one AVD, Supabase project + `.mcp.json` when the app needs auth.
   - Vendor origin is the only hard stop: without it there is nowhere to push and the org is parsed as the vendor.
   - If Supabase MCP was configured **in this run**, stop and ask for a session restart. A newly written `.mcp.json` is not loaded into the running session, so the implementation phase cannot call `apply_migration`.
2. **Tier 2 — deploy/release prerequisites.** Oracle VM + Cloudflare state in `infra/oracle/.deploy-state`, Android signing, iOS ASC key + Xcode, Play Console app registration + per-app service account permission, icon source, console browser session for API-less console work.
   - Tier 2 gaps are **not failures**. Record `release_ready: false` and let planning/implementation proceed.
3. **Generate what can be generated.**
   - Android keystore via `keytool` with a random password written only to `apps/mobile/keystore.properties`, then warn that losing it makes future updates impossible.
   - `docs/store-declarations.yaml` from `docs/store-declarations.example.yaml`, filling human-only values through questions. Propose candidates from `docs/features/data-model.md` and the app config, but the user confirms — never invent a declaration.
   - Demo account password file when the declaration asks for a seeded review account.
4. **Record** `docs/progress/preflight.json` with `tier1_ok`, `release_ready`, `generated`, and `blockers`.
5. **Report** the two tiers, what was generated, and what remains manual. Do not chain — the caller decides whether to enter auto mode.

## Outputs

- `docs/progress/preflight.json`
- `docs/store-declarations.yaml` (user-owned values)
- `apps/mobile/keystore.properties` + `apps/mobile/release.jks` when generated

## Codex Notes

- Full checklist: `docs/preflight.md` (runtime-agnostic).
- Keep behavior aligned with `.claude/skills/preflight/SKILL.md`.
- Account creation, payment, identity verification, and 2FA are out of scope by nature — report them, never attempt them.
- Treat `keytool` generation and any credential write as high-risk actions under the repository approval boundaries.
