#!/usr/bin/env python3
"""Claude Code `Stop` hook — auto-mode 파이프라인 phase 라우터.

Codex의 `.codex/hooks/lib/`(phase 순서·blocker 판정·build subphase 규칙)를 그대로
재사용한다. 두 런타임이 라우팅 로직을 이중 관리하면 반드시 어긋나므로, 이 파일은
**Claude 런타임 어댑터**만 담당한다:

  - Codex hook payload → Claude Stop hook payload 차이 흡수
  - Codex는 `stop_hook_active`에서 즉시 종료하지만 Claude는 그러면 사용자 턴당
    한 phase만 진행된다. 따라서 Claude에서는 종료하지 않고, 진행도 fingerprint
    정체(stale)와 연속 block 상한으로 무한 루프를 막는다.
  - 출력 스키마: 계속 → {"decision":"block","reason":...}
                 차단 → {"continue":false,"systemMessage":...}
                 완료/비활성 → {} (exit 0)

auto-commit은 settings.json의 별도 Stop 훅이 담당한다 (이 파일은 커밋하지 않는다).
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

# 진행이 없는데 같은 skill을 반복 라우팅한 횟수 상한.
# 진행 지문은 pipeline/features/deploys 이벤트 + docs·test-results 산출물 상태를 본다
# (router.compute_progress_fingerprint). 그래도 순수 추론만 하는 턴이 이어질 수 있으므로
# 2 는 지나치게 빡빡했다 — 실측에서 wireframes 가 리뷰어 대기 중 중단 직전까지 갔다.
# 폭주 방지의 실질 백스톱은 MAX_CONSECUTIVE_BLOCKS 다.
MAX_STALE_REPEATS = 3
# 한 이터레이션에서 허용하는 연속 block 상한 (폭주 방지 백스톱)
MAX_CONSECUTIVE_BLOCKS = 60


def read_payload() -> dict[str, Any]:
    try:
        raw = sys.stdin.read().strip()
    except Exception:
        return {}
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def git_root(cwd: str) -> Path | None:
    try:
        out = subprocess.check_output(
            ["git", "rev-parse", "--show-toplevel"],
            cwd=cwd,
            stderr=subprocess.DEVNULL,
            text=True,
        ).strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None
    return Path(out)


def resolve_root(payload: dict[str, Any]) -> Path | None:
    cwd = str(payload.get("cwd") or os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd())
    if not Path(cwd).exists():
        cwd = os.getcwd()
    return git_root(cwd)


def load_codex_lib(root: Path):
    """`.codex/hooks`를 sys.path에 올려 공용 라우팅 로직을 import한다."""
    hooks_dir = root / ".codex" / "hooks"
    if not (hooks_dir / "lib" / "router.py").exists():
        return None
    sys.path.insert(0, str(hooks_dir))
    try:
        from lib.progress import auto_mode_enabled, load_snapshot  # type: ignore
        from lib.ratelimit import pause_reason, supervisor_active, write_supervisor  # type: ignore
        from lib.router import determine_route  # type: ignore
    except Exception:
        return None
    return auto_mode_enabled, load_snapshot, determine_route, pause_reason, supervisor_active, write_supervisor


def state_path(root: Path) -> Path:
    return root / ".claude" / "state" / "hook-router.json"


def read_state(root: Path) -> dict[str, Any]:
    path = state_path(root)
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text())
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


def write_state(root: Path, data: dict[str, Any]) -> None:
    path = state_path(root)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=True, indent=2) + "\n")


def stall_reason(root: Path, route: Any) -> str | None:
    """진행도가 정체됐거나 연속 block 상한을 넘었으면 중단 사유를 돌려준다."""
    state = read_state(root)
    stale = int(state.get("stale_count", 0))
    blocks = int(state.get("block_count", 0)) + 1

    same_target = (
        state.get("last_skill") == route.skill
        and state.get("last_fingerprint") == route.fingerprint
    )
    stale = stale + 1 if same_target else 0

    write_state(
        root,
        {
            "last_skill": route.skill,
            "last_phase": route.phase,
            "last_fingerprint": route.fingerprint,
            "stale_count": stale,
            "block_count": blocks,
        },
    )

    if stale >= MAX_STALE_REPEATS:
        return (
            f"Auto mode: `{route.skill}`를 여러 번 라우팅했지만 진행 기록(pipeline.jsonl)이 "
            "변하지 않았습니다. 자동 진행을 멈춥니다. 마지막 phase 출력과 "
            "docs/progress/pipeline.jsonl을 확인한 뒤 /continue로 재개하세요."
        )
    if blocks >= MAX_CONSECUTIVE_BLOCKS:
        return (
            f"Auto mode: 연속 자동 진행 {blocks}회에 도달해 안전상 중단합니다. "
            "docs/progress/pipeline.jsonl을 확인한 뒤 /continue로 재개하세요."
        )
    return None


def main() -> int:
    payload = read_payload()
    root = resolve_root(payload)
    if root is None:
        return 0

    lib = load_codex_lib(root)
    if lib is None:
        return 0
    auto_mode_enabled, load_snapshot, determine_route, pause_reason, supervisor_active, write_supervisor = lib

    snapshot = load_snapshot(root)
    if not auto_mode_enabled(snapshot):
        # auto mode가 꺼지면 다음 회차를 위해 라우터 상태를 비운다
        if state_path(root).exists():
            write_state(root, {})
        return 0

    # rate-limit 게이트: supervisor(scripts/run-auto.sh)가 이용률 임계치에서 pause 를 걸면
    # 다음 phase 를 주입하지 않고 턴을 끝낸다. supervisor 가 resetsAt 이후 /continue 로 재기동한다.
    # stall 카운터는 건드리지 않는다 — 정체가 아니라 의도된 대기다.
    paused = pause_reason(root)
    if paused:
        print(
            json.dumps(
                {
                    "continue": False,
                    "systemMessage": (
                        f"Auto mode 일시정지 ({paused}). 진행 기록은 docs/progress/pipeline.jsonl 에 "
                        "남아 있으며 supervisor 가 창 리셋 후 /continue 로 재개합니다."
                    ),
                }
            )
        )
        return 0

    route = determine_route(root, snapshot)

    if route.action == "continue" and route.prompt:
        stall = stall_reason(root, route)
        if stall:
            if supervisor_active(root):
                write_supervisor(root, stalled=stall)
            print(json.dumps({"continue": False, "systemMessage": stall}))
            return 0
        if supervisor_active(root):
            # supervisor 모드: 다음 phase 를 이 세션에 주입하지 않는다. 턴을 끝내면 supervisor 가
            # 라우터 프롬프트로 새 프로세스를 띄운다 → phase 마다 MAIN 컨텍스트가 초기화된다.
            # (run4 실측: planning 5 phase 가 한 턴에 체이닝되어 MAIN 컨텍스트 49K→339K, 이후 모든 턴이 그걸 재독)
            write_supervisor(root, next_phase=route.phase, next_skill=route.skill)
            return 0
        # route.prompt 가 실행 계약 전문을 담는다 (정본 파일 경로 + Skill 도구 실패 시 우회 포함).
        # 여기서 Skill 도구 호출을 강제하지 않는다 — 같은 이름의 개인 스킬
        # (~/.claude/skills/)이 프로젝트 스킬을 가리거나 disable-model-invocation 으로
        # 호출을 막으면 파이프라인이 통째로 죽기 때문이다 (runner-log 실측 결함).
        print(json.dumps({"decision": "block", "reason": route.prompt}))
        return 0

    if route.action == "blocked":
        write_state(root, {})
        print(
            json.dumps(
                {
                    "continue": False,
                    "systemMessage": f"Auto 파이프라인 차단: {route.reason}",
                }
            )
        )
        return 0

    # done / idle — 상태 초기화 후 조용히 종료
    write_state(root, {})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
