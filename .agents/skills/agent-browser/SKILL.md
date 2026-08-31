---
name: agent-browser
description: Browser automation CLI for navigating pages, extracting data, filling forms, clicking elements, and collecting screenshots.
---

# agent-browser

Use this skill whenever the user needs browser automation or browser-based verification.

## Core Loop

1. `agent-browser open <url>`
2. `agent-browser snapshot -i`
3. interact with `@eN` refs
4. re-snapshot after navigation or DOM changes

## Standard Commands

- navigation: `open`, `close`
- state capture: `snapshot -i`, `screenshot`, `pdf`
- interaction: `click`, `fill`, `type`, `select`, `check`, `press`
- info: `get text`, `get url`, `get title`
- waiting: `wait`, `wait --load networkidle`, `wait --url`

## Codex Notes

- Reuse the full command reference in `.claude/skills/agent-browser/SKILL.md`.
- Chain commands only when no intermediate parsing is required.
- After page changes, always refresh the snapshot before using stale refs.

