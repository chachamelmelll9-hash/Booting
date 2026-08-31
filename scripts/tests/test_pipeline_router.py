#!/usr/bin/env python3
"""auto mode 라우터 회귀 테스트.

이 테스트가 지키는 계약 (실측 결함에서 유래한다 — runner-log, 2026-08-19):

  1. `release_ready=false` 여도 파이프라인은 `verify`(빌드+동작확인)까지 완주한다.
     계정·인프라가 없다는 이유로 로컬 자동화 구간이 막히면 안 된다.
  2. release-gated phase 가 blocked 로 기록돼도 파이프라인이 죽지 않는다.
  3. 로컬 phase 의 진짜 blocker 는 여전히 파이프라인을 세운다 (안전장치 보존).
  4. 라우터 프롬프트는 개인 스킬 shadowing 우회 지침을 담는다.
  5. 모든 phase 가 끝나면 finalize 턴으로 보고 + iteration_completed 를 남긴다.

실행: python3 scripts/tests/test_pipeline_router.py   (저장소 루트에서)
"""
from __future__ import annotations

import json
import shutil
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / ".codex" / "hooks"))

from lib.common import PIPELINE_PHASES, RELEASE_GATED_PHASES  # noqa: E402
from lib.progress import load_snapshot  # noqa: E402
from lib.router import determine_route  # noqa: E402

LOCAL_PHASES = [
    "setup", "start", "clarify", "define-pages", "wireframes",
    "architecture", "test-scenarios", "implement", "verify",
]

failures: list[str] = []


def check(name: str, got, want) -> None:
    ok = got == want
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else f"  got={got!r} want={want!r}"))
    if not ok:
        failures.append(name)


def make_repo(events: list[dict], auto_mode: dict) -> Path:
    d = Path(tempfile.mkdtemp())
    (d / "docs" / "progress").mkdir(parents=True)
    (d / "docs" / "progress" / "pipeline.jsonl").write_text(
        "".join(json.dumps(e, ensure_ascii=False) + "\n" for e in events)
    )
    (d / "docs" / "progress" / "auto-mode.json").write_text(json.dumps(auto_mode))
    return d


def event(phase: str, name: str, skill: str | None = None, detail: dict | None = None) -> dict:
    return {
        "ts": "2026-08-26T10:00:00+0900", "iter": "initial", "feature": None,
        "phase": phase, "skill": skill or phase, "event": name, "detail": detail or {},
    }


def route(events: list[dict], *, ready: bool = False):
    d = make_repo(events, {"enabled": True, "problem": "테스트 앱", "release_ready": ready})
    try:
        return determine_route(d, load_snapshot(d))
    finally:
        shutil.rmtree(d, ignore_errors=True)


# --- 계약 0: phase 순서 자체 ---
check("verify 가 파이프라인에 있다", "verify" in PIPELINE_PHASES, True)
check("verify 는 implement 다음", PIPELINE_PHASES.index("verify"), PIPELINE_PHASES.index("implement") + 1)
check("verify 는 deploy 앞", PIPELINE_PHASES.index("verify") < PIPELINE_PHASES.index("deploy"), True)
check("release-gated = deploy/build/launch", RELEASE_GATED_PHASES, {"deploy", "build", "launch"})
check("verify 는 release-gated 아님", "verify" in RELEASE_GATED_PHASES, False)

# --- 계약 1: release_ready=false 에서도 로컬 구간을 끝까지 라우팅한다 ---
done: list[dict] = []
for i, phase in enumerate(LOCAL_PHASES):
    r = route(done, ready=False)
    check(f"release_ready=false: {phase} 로 라우팅", r.phase, phase)
    done = done + [event(phase, "phase_completed")]

# --- 계약 5: 로컬 완주 후 finalize ---
r = route(done, ready=False)
check("로컬 완주 후 finalize", r.phase, "finalize")
check("finalize 는 진행 액션", r.action, "continue")
check("finalize 프롬프트가 iteration_completed 지시", "iteration_completed" in (r.prompt or ""), True)
check("finalize 프롬프트가 연기 사유 설명", "release_ready" in (r.prompt or ""), True)
check("finalize 프롬프트가 증거 위조를 금지", "fabricate" in (r.prompt or ""), True)

r = route(done + [{"ts": "t", "iter": "initial", "event": "iteration_completed", "detail": {}}], ready=False)
check("iteration_completed 후 done", r.action, "done")

# --- 계약 1b: release_ready=true 면 deploy 로 이어진다 ---
r = route(done, ready=True)
check("release_ready=true: deploy 로 진행", r.phase, "deploy")

# --- 계약 2: release-gated phase 의 blocked 가 파이프라인을 죽이지 않는다 ---
#     (runner-log 실측 회귀: deploy 가 release_ready=false 로 blocked 되어 영구 정지했다)
partial = [event(p, "phase_completed") for p in LOCAL_PHASES[:8]]  # implement 까지
regression = partial + [event("deploy", "phase_blocked", detail={"reason": "release_ready=false"})]
r = route(regression, ready=False)
check("runner-log 회귀: deploy blocked 여도 죽지 않음", r.action, "continue")
check("runner-log 회귀: verify 로 진행", r.phase, "verify")

# --- 계약 2b: deferred 된 phase 는 재라우팅하지 않는다 ---
r = route(done + [event("deploy", "phase_deferred", detail={"reason": "no infra"})], ready=True)
check("deferred 된 deploy 는 재라우팅 안 함", r.phase, "build")

# --- 계약 3: 로컬 phase 의 진짜 blocker 는 파이프라인을 세운다 ---
r = route([event("setup", "phase_completed"),
           event("start", "phase_blocked", detail={"reason": "branding.sh 실패"})], ready=False)
check("로컬 blocker 는 파이프라인 정지", r.action, "blocked")
r = route([event("setup", "phase_completed"),
           event("start", "phase_blocked", detail={"reason": "branding.sh 실패"})], ready=True)
check("로컬 blocker 는 release_ready 와 무관하게 정지", r.action, "blocked")

# --- 계약 2c: blocked 된 phase 를 "중단된 phase"로 오인하지 않는다 ---
#     phase_started 직후 phase_blocked 가 오는 것이 정상 흐름이다. 이벤트 집합에서
#     phase_blocked 를 빠뜨리면 그 앞의 phase_started 를 찾아내 무한 재라우팅한다.
r = route(partial + [event("deploy", "phase_started"),
                     event("deploy", "phase_blocked", detail={"reason": "release_ready=false"})],
          ready=False)
check("blocked phase 를 중단으로 오인하지 않음", r.phase, "verify")

# --- runner-log 실제 데이터 전 구간 재생 ---
import os
_real = "/Users/hwang-gyeongchan/sideproject/runner-log/docs/progress/pipeline.jsonl"
if os.path.exists(_real):
    _events = [json.loads(l) for l in open(_real).read().splitlines() if l.strip()]
    _r = route(_events, ready=False)
    check("runner-log 실측 데이터: verify 로 진행", _r.phase, "verify")

# --- 계약 7: release_ready=true 면 launch 까지 전 구간을 라우팅한다 ---
#     (build 는 subphase 3개로 쪼개져 있으므로 스킬 이름으로 확인한다)
seq, evs = [], []
for _ in range(20):
    _r = route(evs, ready=True)
    if _r.action != "continue":
        break
    seq.append(_r.skill)
    if _r.phase == "finalize":
        evs = evs + [{"ts": "t", "iter": "initial", "event": "iteration_completed", "detail": {}}]
    else:
        evs = evs + [event(_r.phase, "phase_completed", skill=_r.skill)]
expected = [
    "setup", "start", "clarify-core-feature", "define-pages", "design-wireframes",
    "design-architecture", "write-test-scenarios", "implement-feature", "verify-app",
    "deploy", "setup-landing", "make-aso-images", "launch", "finalize",
]
check("release_ready=true 전 구간 라우팅", seq, expected)

# --- 계약 4: shadowing 우회 지침 ---
r = route(partial, ready=False)
prompt = r.prompt or ""
check("프롬프트: 정본 파일 경로 명시", ".claude/skills/verify-app/SKILL.md" in prompt, True)
check("프롬프트: Skill 도구 실패 우회", "disable-model-invocation" in prompt, True)
check("프롬프트: 저장소 외부 정의 거부", "outside this repository" in prompt, True)
check("로컬 phase 프롬프트가 클라우드 blocker 금지 명시",
      "Do NOT record `phase_blocked` for missing" in prompt, True)

# --- 계약 4b: 중단된 phase 는 재개된다 ---
r = route([event("setup", "phase_completed"), event("start", "phase_started")], ready=False)
check("중단된 phase 재개", (r.action, r.phase), ("continue", "start"))

# --- 계약 6: 이미 지나간 phase 로 되감지 않는다 ---
#     실측: setup 완료 후 뒤늦은 `setup phase_started` 가 들어왔고 그 사이 start 가
#     완료됐는데도 라우터가 setup 으로 되돌아갔다.
rewind = [
    event("setup", "phase_completed"),
    event("setup", "phase_started"),      # 뒤늦게 들어온 기록
    event("start", "phase_completed"),    # 그 사이 파이프라인은 이미 전진했다
]
r = route(rewind, ready=False)
check("지나간 phase 로 되감지 않음", r.phase, "clarify")

# 반대로, 뒤 phase 가 끝나지 않았다면 정상적으로 재개해야 한다
r = route([event("setup", "phase_completed"), event("setup", "phase_started")], ready=False)
check("종료 증거가 없으면 재개한다", (r.action, r.phase), ("continue", "setup"))

# --- 계약 8: worker 진행(features.jsonl)도 "진행"으로 센다 ---
#     implement 처럼 여러 턴에 걸치는 phase 는 pipeline.jsonl 에 phase_started 하나만 쓰고
#     그 뒤 진행은 features.jsonl 에 남긴다. 지문이 pipeline 만 보면 정상 작업 중인데도
#     "진행 없음"으로 판정되어 정체 감지가 파이프라인을 조기 중단시킨다.
def _fingerprint(pipeline_events, feature_events):
    d = Path(tempfile.mkdtemp())
    (d / "docs" / "progress").mkdir(parents=True)
    (d / "docs" / "progress" / "pipeline.jsonl").write_text(
        "".join(json.dumps(e, ensure_ascii=False) + "\n" for e in pipeline_events))
    (d / "docs" / "progress" / "features.jsonl").write_text(
        "".join(json.dumps(e, ensure_ascii=False) + "\n" for e in feature_events))
    (d / "docs" / "progress" / "auto-mode.json").write_text(
        json.dumps({"enabled": True, "release_ready": False}))
    try:
        return determine_route(d, load_snapshot(d)).fingerprint
    finally:
        shutil.rmtree(d, ignore_errors=True)

_pipe = [event(p, "phase_completed") for p in LOCAL_PHASES[:7]] + [event("implement", "phase_started")]
_w1 = [{"ts": "t1", "iter": "initial", "phase": "implement", "agent": "db-implement",
        "event": "worker_completed", "detail": {"tables": 8}}]
_w2 = _w1 + [{"ts": "t2", "iter": "initial", "phase": "implement", "agent": "server-implement",
              "event": "worker_completed", "detail": {"endpoints": 31}}]
check("worker 진행이 지문을 바꾼다", _fingerprint(_pipe, _w1) != _fingerprint(_pipe, _w2), True)
check("진행이 없으면 지문이 같다", _fingerprint(_pipe, _w1) == _fingerprint(_pipe, _w1), True)

# --- 계약 9: 산출물 파일 변화도 "진행"으로 센다 ---
#     기획 phase 들은 phase 시작/종료 때만 이벤트를 쓰고 그 사이 진행은 파일로만 나타난다.
#     실측: wireframes 가 UX 리뷰어를 기다리는 동안 stale_count 가 올라가 중단 직전까지 갔다.
from lib.router import compute_progress_fingerprint as _fp
_d = Path(tempfile.mkdtemp())
(_d / "docs" / "progress").mkdir(parents=True)
(_d / "docs" / "features").mkdir(parents=True)
(_d / "docs" / "progress" / "pipeline.jsonl").write_text(
    "".join(json.dumps(e, ensure_ascii=False) + "\n" for e in _pipe))
(_d / "docs" / "progress" / "auto-mode.json").write_text(json.dumps({"enabled": True, "release_ready": False}))
_before = _fp(_d, load_snapshot(_d), "initial")
(_d / "docs" / "features" / "wireframe-home.md").write_text("# home\n")
_after = _fp(_d, load_snapshot(_d), "initial")
check("산출물 파일이 늘면 지문이 바뀐다", _before != _after, True)
shutil.rmtree(_d, ignore_errors=True)

print()
# --- 계약: 뒤 phase 가 끝났으면 기록이 빈 앞 phase 로 되돌아가지 않는다 ---
# 실측: implement 가 사용량 한도로 중단돼 phase_completed 를 못 남겼는데,
# 재개해 verify 를 완료했는데도 라우터가 계속 implement 로 되돌아갔다.
# 기록 공백 하나로 이미 지나간 구간을 무한 재실행하게 된다.
_gap = [
    event("test-scenarios", "phase_completed"),
    event("implement", "phase_started", skill="implement-feature"),
    event("verify", "phase_started", skill="verify-app"),
    event("verify", "phase_completed", skill="verify-app"),
]
check("기록 공백: 앞 phase 로 되돌아가지 않음", route(_gap).phase != "implement", True)
check("기록 공백: finalize 로 진행", route(_gap).phase, "finalize")

# 반대로, 뒤 phase 가 아직 안 끝났으면 중단된 phase 를 정상 재개한다
_resume = [
    event("test-scenarios", "phase_completed"),
    event("implement", "phase_started", skill="implement-feature"),
]
check("중단된 phase 는 그대로 재개", route(_resume).phase, "implement")


# --- 계약 6: rate-limit 게이트 (run4 실측, 2026-08-26) ---
# supervisor 가 pause 를 걸면 Stop 훅은 다음 phase 를 주입하지 않고, PreToolUse 훅은 새 Agent spawn 을 거부한다.
import os as _os
import subprocess as _sp
from datetime import datetime as _dt, timedelta as _td, timezone as _tz

from lib.ratelimit import pause_reason, write_rate_limit  # noqa: E402

_now = _dt.now(_tz.utc)
_d = Path(tempfile.mkdtemp())
(_d / "docs" / "progress").mkdir(parents=True)
check("rate-limit 파일 없음 → pause 아님", pause_reason(_d, _now), None)
write_rate_limit(_d, utilization=0.9, status="allowed_warning", resets_at=int((_now + _td(hours=1)).timestamp()), paused=True)
check("paused=true + 신선 + 리셋 전 → pause", pause_reason(_d, _now) is not None, True)
check("pause 사유에 이용률", "90%" in (pause_reason(_d, _now) or ""), True)
write_rate_limit(_d, paused=True, resets_at=int((_now - _td(minutes=1)).timestamp()))
check("resets_at 경과 → pause 해제", pause_reason(_d, _now), None)
write_rate_limit(_d, paused=True, resets_at=int((_now + _td(hours=1)).timestamp()))
check("6시간 뒤 평가 → 오래된 pause 무시", pause_reason(_d, _now + _td(hours=6)), None)
write_rate_limit(_d, paused=False)
check("paused=false → pause 아님", pause_reason(_d, _now), None)
shutil.rmtree(_d, ignore_errors=True)


def _hook_repo(paused: bool) -> Path:
    d = make_repo(
        [event("setup", "phase_completed"), event("start", "phase_started")],
        {"enabled": True, "problem": "테스트 앱", "release_ready": False},
    )
    shutil.copytree(ROOT / ".codex" / "hooks", d / ".codex" / "hooks")
    _sp.run(["git", "init", "-q"], cwd=d, check=True)
    if paused:
        write_rate_limit(d, utilization=0.9, status="allowed_warning",
                         resets_at=int((_now + _td(hours=1)).timestamp()), paused=True)
    return d


def _run_hook(script: str, d: Path, payload: dict) -> dict:
    out = _sp.run(["python3", str(ROOT / ".claude" / "hooks" / script)], cwd=d, input=json.dumps(payload),
                  capture_output=True, text=True, env={**_os.environ, "CLAUDE_PROJECT_DIR": str(d)})
    try:
        return json.loads(out.stdout.strip() or "{}")
    except json.JSONDecodeError:
        return {"_raw": out.stdout, "_err": out.stderr}


_p = _hook_repo(paused=True)
_r = _run_hook("stop_pipeline_router.py", _p, {"cwd": str(_p)})
check("Stop 훅: pause 중엔 다음 phase 주입 안 함", _r.get("continue"), False)
check("Stop 훅: pause 안내 메시지", "일시정지" in _r.get("systemMessage", ""), True)
check("Stop 훅: pause 는 stall 카운터를 올리지 않음", (_p / ".claude" / "state" / "hook-router.json").exists(), False)
_g = _run_hook("pre_tool_rate_gate.py", _p, {"cwd": str(_p), "tool_name": "Agent", "tool_input": {"subagent_type": "mobile-implement"}})
check("PreToolUse 훅: pause 중 Agent spawn 거부", _g.get("hookSpecificOutput", {}).get("permissionDecision"), "deny")
check("PreToolUse 훅: 거부 사유에 RATE_LIMIT_PAUSE", "RATE_LIMIT_PAUSE" in _g.get("hookSpecificOutput", {}).get("permissionDecisionReason", ""), True)
_g2 = _run_hook("pre_tool_rate_gate.py", _p, {"cwd": str(_p), "tool_name": "Bash", "tool_input": {"command": "ls"}})
check("PreToolUse 훅: Agent 외 도구는 건드리지 않음", _g2, {})
shutil.rmtree(_p, ignore_errors=True)

_n = _hook_repo(paused=False)
_r = _run_hook("stop_pipeline_router.py", _n, {"cwd": str(_n)})
check("Stop 훅: pause 없으면 정상 라우팅", _r.get("decision"), "block")
_g = _run_hook("pre_tool_rate_gate.py", _n, {"cwd": str(_n), "tool_name": "Agent", "tool_input": {}})
check("PreToolUse 훅: pause 없으면 허용", _g, {})
shutil.rmtree(_n, ignore_errors=True)

# 모니터: stream-json 의 rate_limit_event 를 게이트 파일로 옮기고 임계치에서 pause 를 건다
_m = Path(tempfile.mkdtemp()); (_m / "docs" / "progress").mkdir(parents=True)
_lines = [
    {"type": "assistant"},
    {"type": "rate_limit_event", "rate_limit_info": {"status": "allowed", "unifiedWindows": {"five_hour": {"utilization": 0.5, "resetsAt": 9999999999}}}},
    {"type": "rate_limit_event", "rate_limit_info": {"status": "allowed_warning", "unifiedWindows": {"five_hour": {"utilization": 0.9, "resetsAt": 9999999999}}}},
]
_out = _sp.run(["python3", str(ROOT / "scripts" / "lib" / "rate_limit_monitor.py"), "--log", str(_m / "log.jsonl"), "--root", str(_m)],
               input="".join(json.dumps(x) + "\n" for x in _lines), capture_output=True, text=True)
check("모니터: 임계치 도달 시 exit 75", _out.returncode, 75)
_rl = json.loads((_m / "docs" / "progress" / "rate-limit.json").read_text())
check("모니터: paused=true 기록", _rl.get("paused"), True)
check("모니터: utilization 기록", _rl.get("utilization"), 0.9)
check("모니터: 로그 tee", len((_m / "log.jsonl").read_text().splitlines()), 3)
_out = _sp.run(["python3", str(ROOT / "scripts" / "lib" / "rate_limit_monitor.py"), "--log", str(_m / "log2.jsonl"), "--root", str(_m)],
               input=json.dumps(_lines[1]) + "\n", capture_output=True, text=True)
check("모니터: 임계치 미만이면 exit 0", _out.returncode, 0)
shutil.rmtree(_m, ignore_errors=True)

# --- 계약 7: supervisor 모드 — phase 마다 새 프로세스 (MAIN 컨텍스트 누적 방지, run4 49K→339K) ---
from lib.ratelimit import supervisor_active, write_supervisor, read_supervisor  # noqa: E402

_s = Path(tempfile.mkdtemp()); (_s / "docs" / "progress").mkdir(parents=True)
check("supervisor 파일 없음 → 비활성", supervisor_active(_s), False)
write_supervisor(_s, pid=_os.getpid())
check("살아있는 pid → 활성", supervisor_active(_s), True)
write_supervisor(_s, pid=2**22 + 12345)
check("죽은 pid → 비활성 (파일 잔존 사고 방지)", supervisor_active(_s), False)
write_supervisor(_s, pid=_os.getpid())
check("한참 뒤 평가 → 비활성", supervisor_active(_s, _now + _td(hours=30)), False)
shutil.rmtree(_s, ignore_errors=True)

_v = _hook_repo(paused=False)
write_supervisor(_v, pid=_os.getpid(), stalled=None)
_r = _run_hook("stop_pipeline_router.py", _v, {"cwd": str(_v)})
check("Stop 훅: supervisor 모드에선 다음 phase 를 주입하지 않음", _r, {})
check("Stop 훅: supervisor 에 다음 phase 기록", read_supervisor(_v).get("next_phase"), "start")
# 같은 지문으로 stall 상한까지 반복 → stalled 기록
for _ in range(3):
    _r = _run_hook("stop_pipeline_router.py", _v, {"cwd": str(_v)})
check("Stop 훅: 정체 시 supervisor.stalled 기록", bool(read_supervisor(_v).get("stalled")), True)
check("Stop 훅: 정체 메시지는 그대로", _r.get("continue"), False)
shutil.rmtree(_v, ignore_errors=True)

# 런타임 파일은 진행 지문을 바꾸지 않는다 (바꾸면 supervisor 모드에서 정체 감지가 영구 무력화)
from lib.ratelimit import write_rate_limit as _wrl  # noqa: E402
from lib.router import compute_progress_fingerprint as _cpf  # noqa: E402
_f = make_repo([event("setup", "phase_completed")], {"enabled": True, "problem": "x", "release_ready": False})
_fp1 = _cpf(_f, load_snapshot(_f), "initial")
write_supervisor(_f, pid=_os.getpid()); _wrl(_f, utilization=0.5)
(_f / "docs" / "progress" / "runs").mkdir(); (_f / "docs" / "progress" / "runs" / "run-1.jsonl").write_text("{}\n")
_fp2 = _cpf(_f, load_snapshot(_f), "initial")
check("런타임 파일(supervisor/rate-limit/runs)은 지문 불변", _fp1 == _fp2, True)
(_f / "docs" / "progress" / "checkpoints").mkdir(); (_f / "docs" / "progress" / "checkpoints" / "m.md").write_text("done")
check("체크포인트는 진행 → 지문 변경", _cpf(_f, load_snapshot(_f), "initial") != _fp2, True)
shutil.rmtree(_f, ignore_errors=True)

if failures:
    print(f"FAILED ({len(failures)}): " + ", ".join(failures))
    sys.exit(1)
print("ALL PASS")
