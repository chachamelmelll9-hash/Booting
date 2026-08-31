#!/usr/bin/env python3

from __future__ import annotations

import json
import sys
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(CURRENT_DIR))

from lib.common import build_context, read_payload  # noqa: E402
from lib.progress import active_iteration, load_snapshot  # noqa: E402
from lib.router import determine_route  # noqa: E402


def main() -> int:
    payload = read_payload()
    context = build_context(payload)
    if context is None:
        return 0

    snapshot = load_snapshot(context.root)
    route = determine_route(context.root, snapshot)
    iter_state = active_iteration(snapshot)

    details = [
        "This repository uses hook-driven auto-mode orchestration.",
        "Skills must complete only their own phase and must not manually chain to later skills.",
        f"Active iteration: `{iter_state.name}`.",
    ]
    if route.action == "continue" and route.phase and route.skill:
        details.append(f"Current router target: `{route.skill}` for phase `{route.phase}`.")
    elif route.action == "blocked" and route.reason:
        details.append(f"Auto pipeline is blocked: {route.reason}")

    sys.stdout.write(
        json.dumps(
            {
                "hookSpecificOutput": {
                    "hookEventName": "SessionStart",
                    "additionalContext": " ".join(details),
                }
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
