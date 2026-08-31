#!/usr/bin/env python3
"""`claude -p --output-format stream-json` 출력을 읽어 rate-limit 게이트 파일을 갱신한다.

사용: claude -p ... --output-format stream-json --verbose | python3 scripts/lib/rate_limit_monitor.py --log <file> [--pid <claude pid>]

동작 (run4 실측에 맞춘 2단 임계치):
  utilization >= PAUSE (기본 0.85) → rate-limit.json paused=true
      → Stop 훅은 다음 phase 를 주입하지 않고, PreToolUse 훅은 새 Agent spawn 을 거부한다.
        이미 도는 워커는 체크포인트를 남기고 끝난다. (run4 는 89% 에서 리뷰어 3개를 새로 띄우다 죽었다)
  utilization >= KILL (기본 0.97) 또는 status=rejected → --pid 에 SIGTERM
      → 더 기다려도 남는 건 rejected 로 유실될 작업뿐이다.

종료 코드: 0 정상 종료 / 75 pause 발동(창 리셋 대기 필요) / 76 rejected 관측
환경변수: AUTO_PAUSE_UTIL, AUTO_KILL_UTIL
"""
from __future__ import annotations

import argparse
import json
import os
import signal
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / ".codex" / "hooks"))
from lib.ratelimit import write_rate_limit  # noqa: E402

EXIT_PAUSED = 75
EXIT_REJECTED = 76


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--log", required=True)
    ap.add_argument("--pid", type=int, default=0)
    ap.add_argument("--root", default=str(ROOT))
    ap.add_argument("--pause", type=float, default=float(os.environ.get("AUTO_PAUSE_UTIL", "0.85")))
    ap.add_argument("--kill", type=float, default=float(os.environ.get("AUTO_KILL_UTIL", "0.97")))
    a = ap.parse_args()
    root = Path(a.root)
    rc = 0
    killed = False
    with open(a.log, "a") as log:
        for line in sys.stdin:
            log.write(line)
            log.flush()
            try:
                o = json.loads(line)
            except json.JSONDecodeError:
                continue
            if o.get("type") != "rate_limit_event":
                continue
            info = o.get("rate_limit_info") or o
            win = (info.get("unifiedWindows") or {}).get("five_hour") or {}
            util = win.get("utilization", info.get("utilization"))
            status = info.get("status")
            resets = win.get("resetsAt", info.get("resetsAt"))
            if not isinstance(util, (int, float)):
                continue
            fields = {"utilization": util, "status": status, "resets_at": resets}
            if status == "rejected":
                fields.update(paused=True, reason=f"five_hour rejected (utilization {util:.0%})")
                rc = EXIT_REJECTED
            elif util >= a.pause:
                fields.update(paused=True, reason=f"five_hour utilization {util:.0%} >= pause {a.pause:.0%}")
                rc = rc or EXIT_PAUSED
            write_rate_limit(root, **fields)
            if not killed and a.pid and (status == "rejected" or util >= a.kill):
                print(f"[monitor] utilization {util:.0%} status={status} → SIGTERM {a.pid}", file=sys.stderr)
                try:
                    os.kill(a.pid, signal.SIGTERM)
                except ProcessLookupError:
                    pass
                killed = True
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
