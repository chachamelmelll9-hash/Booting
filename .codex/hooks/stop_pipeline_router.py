#!/usr/bin/env python3

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(CURRENT_DIR))

from lib.common import build_context, read_payload, read_json, router_state_path, write_json  # noqa: E402
from lib.progress import auto_mode_enabled, load_snapshot  # noqa: E402
from lib.router import RouteDecision, determine_route  # noqa: E402

COMMIT_MESSAGE = "auto: apply changes"
MAX_STALE_REPEATS = 3


def has_git_changes(root: Path) -> bool:
    result = subprocess.run(
        ["git", "status", "--porcelain"],
        cwd=root,
        capture_output=True,
        text=True,
        check=False,
    )
    return result.returncode == 0 and bool(result.stdout.strip())


def auto_commit(root: Path) -> None:
    if not has_git_changes(root):
        return
    subprocess.run(
        ["git", "add", "-A"],
        cwd=root,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    subprocess.run(
        ["git", "commit", "-m", COMMIT_MESSAGE],
        cwd=root,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )


def load_router_state(root: Path) -> dict[str, object]:
    return read_json(router_state_path(root)) or {}


def save_router_state(root: Path, data: dict[str, object]) -> None:
    write_json(router_state_path(root), data)


def stale_route_block(root: Path, route: RouteDecision) -> dict[str, str] | None:
    if route.action != "continue" or not route.skill or not route.fingerprint:
        return None

    state = load_router_state(root)
    last_skill = state.get("last_skill")
    last_fingerprint = state.get("last_fingerprint")
    stale_count = int(state.get("stale_count", 0))

    if last_skill == route.skill and last_fingerprint == route.fingerprint:
        stale_count += 1
    else:
        stale_count = 0

    save_router_state(
        root,
        {
            "last_skill": route.skill,
            "last_phase": route.phase,
            "last_fingerprint": route.fingerprint,
            "stale_count": stale_count,
        },
    )

    if stale_count >= MAX_STALE_REPEATS:
        return {
            "decision": "continue_false",
            "reason": (
                f"Auto router detected no progress after retrying `{route.skill}` multiple times. "
                "Stop auto continuation and inspect the latest phase output plus `docs/progress/pipeline.jsonl`."
            ),
        }
    return None


def stop_output_for_route(root: Path, route: RouteDecision) -> dict[str, object]:
    if route.action == "continue" and route.prompt:
        stale = stale_route_block(root, route)
        if stale:
            return {"continue": False, "systemMessage": stale["reason"]}
        return {"decision": "block", "reason": route.prompt}
    if route.action == "blocked":
        return {
            "continue": False,
            "systemMessage": f"Auto pipeline blocked: {route.reason}",
        }
    if route.action == "done":
        save_router_state(root, {})
        return {}
    return {}


def main() -> int:
    payload = read_payload()
    context = build_context(payload)
    if context is None:
        return 0

    snapshot = load_snapshot(context.root)
    if not auto_mode_enabled(snapshot):
        return 0

    auto_commit(context.root)

    if payload.get("stop_hook_active"):
        return 0

    route = determine_route(context.root, snapshot)
    sys.stdout.write(json.dumps(stop_output_for_route(context.root, route)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
