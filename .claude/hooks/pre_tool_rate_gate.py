#!/usr/bin/env python3
"""Claude Code `PreToolUse` hook (matcher: Agent) — rate-limit pause 중 새 서브에이전트 spawn 차단.

Stop 훅 라우터는 **턴이 끝나야** 동작한다. 그런데 implement phase 는 orchestrator 한 턴이 수 시간이라
그 안에서 rate limit 이 터진다 (run4: 리뷰어 3개 + 워커 4개 동시 실행 중 rejected).
이 훅은 supervisor 가 pause 를 건 뒤에는 **새 Agent spawn 만** 거부해 fan-out 을 멈춘다.
이미 도는 워커는 계속 돌고, 체크포인트 규약대로 스스로 마무리한다.

거부 사유가 orchestrator 에게 전달되므로 orchestrator 는 재시도하지 않고 현재 상태를 기록한 뒤 반환한다.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path


def main() -> int:
    try:
        payload = json.loads(sys.stdin.read() or "{}")
    except json.JSONDecodeError:
        payload = {}
    if payload.get("tool_name") != "Agent":
        return 0
    cwd = str(payload.get("cwd") or os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd())
    try:
        root = Path(
            subprocess.check_output(
                ["git", "rev-parse", "--show-toplevel"], cwd=cwd, stderr=subprocess.DEVNULL, text=True
            ).strip()
        )
    except (subprocess.CalledProcessError, FileNotFoundError):
        return 0
    hooks_dir = root / ".codex" / "hooks"
    if not (hooks_dir / "lib" / "ratelimit.py").exists():
        return 0
    sys.path.insert(0, str(hooks_dir))
    try:
        from lib.progress import auto_mode_enabled, load_snapshot  # type: ignore
        from lib.ratelimit import pause_reason  # type: ignore
    except Exception:
        return 0
    if not auto_mode_enabled(load_snapshot(root)):
        return 0
    reason = pause_reason(root)
    if not reason:
        return 0
    print(
        json.dumps(
            {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": (
                        f"RATE_LIMIT_PAUSE: {reason}. 새 worker/reviewer 를 spawn 하지 말 것. "
                        "재시도하지 말고 현재까지의 진행을 docs/progress/features.jsonl 에 기록한 뒤 "
                        "즉시 반환하라. supervisor 가 창 리셋 후 /continue 로 재개한다."
                    ),
                }
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
