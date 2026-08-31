#!/usr/bin/env python3

from __future__ import annotations

import json
import sys
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(CURRENT_DIR))

from lib.common import build_context, read_payload  # noqa: E402
from lib.progress import auto_mode_enabled, load_snapshot  # noqa: E402


def extract_exit_code(tool_response: object) -> int | None:
    if isinstance(tool_response, dict):
        code = tool_response.get("exit_code")
        if isinstance(code, int):
            return code
    if isinstance(tool_response, str):
        try:
            parsed = json.loads(tool_response)
        except json.JSONDecodeError:
            return None
        if isinstance(parsed, dict):
            code = parsed.get("exit_code")
            if isinstance(code, int):
                return code
    return None


def main() -> int:
    payload = read_payload()
    context = build_context(payload)
    if context is None:
        return 0

    snapshot = load_snapshot(context.root)
    if not auto_mode_enabled(snapshot):
        return 0

    command = str((payload.get("tool_input") or {}).get("command") or "")
    exit_code = extract_exit_code(payload.get("tool_response"))
    if exit_code in (None, 0):
        return 0

    sys.stdout.write(
        json.dumps(
            {
                "hookSpecificOutput": {
                    "hookEventName": "PostToolUse",
                    "additionalContext": (
                        "The last Bash command failed. "
                        f"Inspect the error, fix the root cause, and retry before moving on. Command: {command}"
                    ),
                }
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
