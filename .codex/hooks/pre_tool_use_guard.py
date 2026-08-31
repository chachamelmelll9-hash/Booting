#!/usr/bin/env python3

from __future__ import annotations

import json
import sys
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(CURRENT_DIR))

from lib.approvals import evaluate_command  # noqa: E402
from lib.common import build_context, read_payload  # noqa: E402
from lib.progress import load_snapshot  # noqa: E402


def main() -> int:
    payload = read_payload()
    context = build_context(payload)
    if context is None:
        return 0

    command = str((payload.get("tool_input") or {}).get("command") or "")
    snapshot = load_snapshot(context.root)
    decision = evaluate_command(command, snapshot)
    if decision.allow:
        return 0

    sys.stdout.write(
        json.dumps(
            {
                "decision": "block",
                "reason": decision.reason or "Command blocked by repository policy.",
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": decision.reason or "Command blocked by repository policy.",
                },
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
