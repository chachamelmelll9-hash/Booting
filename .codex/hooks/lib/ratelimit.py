"""Rate-limit 게이트 상태 — supervisor(scripts/run-auto.sh)와 훅이 공유하는 단일 파일.

run4(pace-share, 2026-08-26) 실측: 5시간 창 이용률이 14%에서 시작해 거의 선형으로 올라
21:28 에 rejected. 리뷰어 3개 + 워커 4개가 동시에 돌던 중 죽어 6분치 작업이 통째로 유실됐다.
Claude Code 자체는 rate limit 을 "감지해서 기다리는" 기능이 없으므로, 밖에서 감시하는
supervisor 가 임계치에서 이 파일에 `paused: true` 를 쓰고 훅이 그걸 읽어 **새 작업을 시작하지
않게** 한다. (이미 도는 작업은 체크포인트를 남기고 스스로 끝낸다 — 워커 규약 참조)

파일: docs/progress/rate-limit.json
{
  "ts": "2026-08-26T21:24:00+0900",   # supervisor 가 마지막으로 갱신한 시각 (ISO)
  "utilization": 0.91,                 # five_hour 창 이용률 (0~1)
  "status": "allowed_warning",         # allowed | allowed_warning | rejected
  "resets_at": 1787752800,             # epoch seconds
  "paused": true,                      # 임계치 도달 — 새 phase/worker 시작 금지
  "reason": "five_hour utilization 0.91 >= 0.85"
}

신선도: `ts` 가 MAX_AGE 보다 오래됐으면 무시한다 (supervisor 가 죽은 채 파일만 남는 사고 방지).
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

RATE_LIMIT_FILE = "docs/progress/rate-limit.json"
# supervisor(scripts/run-auto.sh) 가 살아 있음을 알리는 파일. {"pid":…, "ts":…, "stalled": null|str}
# 존재+pid 생존이면 "phase 마다 새 프로세스" 모드: Stop 훅은 다음 phase 를 같은 세션에 주입하지 않고
# 턴을 끝내며, supervisor 가 라우터 프롬프트로 재기동한다 (MAIN 컨텍스트가 phase 를 넘어 누적되지 않는다).
SUPERVISOR_FILE = "docs/progress/supervisor.json"
# 5시간 창보다 오래된 pause 는 무효 — 창이 리셋됐는데 파일이 남아 파이프라인을 영구 정지시키면 안 된다.
MAX_AGE_SECONDS = 5 * 60 * 60


def rate_limit_path(root: Path) -> Path:
    return root / RATE_LIMIT_FILE


def read_rate_limit(root: Path) -> dict[str, Any]:
    path = rate_limit_path(root)
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text())
    except (json.JSONDecodeError, OSError):
        return {}
    return data if isinstance(data, dict) else {}


def _age_seconds(ts: str | None, now: datetime | None = None) -> float | None:
    if not ts:
        return None
    try:
        parsed = datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    now = now or datetime.now(timezone.utc)
    return (now - parsed).total_seconds()


def pause_reason(root: Path, now: datetime | None = None) -> str | None:
    """pause 가 유효하면 사유 문자열, 아니면 None.

    유효 조건: paused=true 이고, ts 가 MAX_AGE 이내이며, resets_at 이 아직 지나지 않았다.
    """
    data = read_rate_limit(root)
    if not data.get("paused"):
        return None
    age = _age_seconds(data.get("ts"), now)
    if age is None or age > MAX_AGE_SECONDS:
        return None
    resets_at = data.get("resets_at")
    now_ts = (now or datetime.now(timezone.utc)).timestamp()
    if isinstance(resets_at, (int, float)) and resets_at <= now_ts:
        return None
    util = data.get("utilization")
    util_txt = f"{float(util):.0%}" if isinstance(util, (int, float)) else "?"
    when = ""
    if isinstance(resets_at, (int, float)):
        when = datetime.fromtimestamp(resets_at).astimezone().strftime(" (resets %H:%M %Z)")
    return data.get("reason") or f"rate-limit pause: five_hour utilization {util_txt}{when}"


def write_rate_limit(root: Path, **fields: Any) -> None:
    path = rate_limit_path(root)
    path.parent.mkdir(parents=True, exist_ok=True)
    data = read_rate_limit(root)
    data.update(fields)
    data["ts"] = datetime.now().astimezone().isoformat(timespec="seconds")
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def supervisor_path(root: Path) -> Path:
    return root / SUPERVISOR_FILE


def read_supervisor(root: Path) -> dict[str, Any]:
    path = supervisor_path(root)
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text())
    except (json.JSONDecodeError, OSError):
        return {}
    return data if isinstance(data, dict) else {}


def _pid_alive(pid: Any) -> bool:
    if not isinstance(pid, int) or pid <= 0:
        return False
    try:
        import os

        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    except OSError:
        return False
    return True


def supervisor_active(root: Path, now: datetime | None = None) -> bool:
    """supervisor 가 살아 있으면 True. 파일만 남고 프로세스가 죽었으면 False (파일 잔존 사고 방지)."""
    data = read_supervisor(root)
    if not data:
        return False
    age = _age_seconds(data.get("ts"), now)
    if age is None or age > MAX_AGE_SECONDS * 4:
        return False
    return _pid_alive(data.get("pid"))


def write_supervisor(root: Path, **fields: Any) -> None:
    path = supervisor_path(root)
    path.parent.mkdir(parents=True, exist_ok=True)
    data = read_supervisor(root)
    data.update(fields)
    data["ts"] = datetime.now().astimezone().isoformat(timespec="seconds")
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
