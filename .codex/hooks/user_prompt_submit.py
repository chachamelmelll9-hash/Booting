#!/usr/bin/env python3

from __future__ import annotations

import json
import sys
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(CURRENT_DIR))

from lib.common import build_context, read_payload  # noqa: E402
from lib.progress import auto_mode_enabled, load_snapshot  # noqa: E402


def main() -> int:
    payload = read_payload()
    context = build_context(payload)
    if context is None:
        return 0

    snapshot = load_snapshot(context.root)
    if not auto_mode_enabled(snapshot):
        return 0

    prompt = str(payload.get("prompt") or "")
    notes = [
        "Auto mode is hook-driven in this repository.",
        "Each skill should complete only its own phase.",
        "Do not manually hand off to the next skill inside the same turn.",
        "If a manual external blocker prevents progress, append `phase_blocked` to `docs/progress/pipeline.jsonl` and stop.",
    ]

    if prompt.strip().lower().startswith("continue"):
        notes.append("The `continue` skill is recovery-only. Prefer the hook router for normal progression.")

    sys.stdout.write(
        json.dumps(
            {
                "hookSpecificOutput": {
                    "hookEventName": "UserPromptSubmit",
                    "additionalContext": " ".join(notes),
                }
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
