from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .common import (
    BUILD_SUBPHASE_SKILLS,
    ICON_SOURCE_CANDIDATES,
    PHASE_TO_SKILL,
    PIPELINE_PHASES,
    RELEASE_GATED_PHASES,
    RELEASE_SCREENSHOT_GLOB,
    auto_mode_path,
    deploys_path,
    features_path,
    pipeline_path,
    read_json,
    read_jsonl,
)


@dataclass
class ProgressSnapshot:
    auto_mode: dict[str, Any] | None
    pipeline_events: list[dict[str, Any]]
    feature_events: list[dict[str, Any]]
    deploy_events: list[dict[str, Any]]


@dataclass
class ActiveIteration:
    name: str
    completed: bool


@dataclass
class BuildSubphaseStatus:
    skill: str
    required: bool
    completed: bool
    started: bool
    blocked: bool
    blocked_reason: str | None


def load_snapshot(root: Path) -> ProgressSnapshot:
    return ProgressSnapshot(
        auto_mode=read_json(auto_mode_path(root)),
        pipeline_events=read_jsonl(pipeline_path(root)),
        feature_events=read_jsonl(features_path(root)),
        deploy_events=read_jsonl(deploys_path(root)),
    )


def auto_mode_enabled(snapshot: ProgressSnapshot) -> bool:
    return bool(snapshot.auto_mode and snapshot.auto_mode.get("enabled"))


def release_ready(snapshot: ProgressSnapshot) -> bool:
    """스토어 출시 전제(외부 계정·인프라·크레덴셜)가 모두 갖춰졌는가.

    false 여도 파이프라인은 `verify` phase까지 (빌드 + 에뮬레이터 동작확인)
    끝까지 자동으로 완주한다. 막히는 건 deploy/build/launch 뿐이다.
    """
    return bool(snapshot.auto_mode and snapshot.auto_mode.get("release_ready") is True)


def phase_is_release_gated(phase: str) -> bool:
    return phase in RELEASE_GATED_PHASES


def active_iteration(snapshot: ProgressSnapshot) -> ActiveIteration:
    events = snapshot.pipeline_events
    if not events:
        return ActiveIteration(name="initial", completed=False)

    latest_completed_idx = -1
    for idx, event in enumerate(events):
        if event.get("event") == "iteration_completed":
            latest_completed_idx = idx

    for idx in range(len(events) - 1, latest_completed_idx, -1):
        event = events[idx]
        if event.get("event") == "iteration_started":
            name = str(event.get("iter") or "initial")
            return ActiveIteration(name=name, completed=False)

    if latest_completed_idx != -1:
        latest_completed = events[latest_completed_idx]
        name = str(latest_completed.get("iter") or "initial")
        return ActiveIteration(name=name, completed=True)

    return ActiveIteration(name="initial", completed=False)


def iteration_events(snapshot: ProgressSnapshot, iter_name: str) -> list[dict[str, Any]]:
    return [event for event in snapshot.pipeline_events if str(event.get("iter") or "initial") == iter_name]


def latest_event(events: list[dict[str, Any]]) -> dict[str, Any] | None:
    return events[-1] if events else None


def latest_phase_event(events: list[dict[str, Any]], phase: str, skill: str | None = None) -> dict[str, Any] | None:
    for event in reversed(events):
        if event.get("phase") != phase:
            continue
        if skill is not None and event.get("skill") != skill:
            continue
        if event.get("event") in {
            "phase_started",
            "phase_completed",
            "phase_blocked",
            "phase_skipped",
            "phase_deferred",
        }:
            return event
    return None


def latest_completed_phase(events: list[dict[str, Any]]) -> str | None:
    for phase in reversed(PIPELINE_PHASES):
        for event in reversed(events):
            if event.get("phase") == phase and event.get("event") == "phase_completed":
                return phase
    return None


def _terminal_index_after(events: list[dict[str, Any]], start_idx: int, phase: str) -> bool:
    """`start_idx` 이후에 파이프라인이 이 phase 를 지나갔다는 증거가 있는가.

    같은 phase 의 종료 이벤트든, PIPELINE_PHASES 상 더 뒤 phase 의 종료 이벤트든
    하나라도 있으면 그 `phase_started` 는 버려진 기록이다.
    """
    try:
        order = PIPELINE_PHASES.index(phase)
    except ValueError:
        order = -1
    terminal = {"phase_completed", "phase_skipped", "phase_deferred"}
    for event in events[start_idx + 1 :]:
        if event.get("event") not in terminal:
            continue
        other = str(event.get("phase") or "")
        if other == phase:
            return True
        try:
            if PIPELINE_PHASES.index(other) > order >= 0:
                return True
        except ValueError:
            continue
    return False


def interrupted_phase(events: list[dict[str, Any]]) -> tuple[str, str] | None:
    """중단된 채 남은 phase 를 찾는다 — 단, 이미 지나간 phase 로 되감지 않는다.

    실측: setup 이 완료된 뒤 뒤늦게 `setup phase_started` 가 append 되어, 그 사이
    `start` 가 완료됐는데도 라우터가 setup 으로 되돌아갔다. 진행이 없으면 정체 감지에
    걸려 파이프라인이 멈출 수 있다. 더 뒤 phase 가 이미 끝났다면 그 시작 기록은 버린다.
    """
    for phase in PIPELINE_PHASES:
        if phase == "build":
            continue
        idx = None
        for i in range(len(events) - 1, -1, -1):
            e = events[i]
            # phase_blocked 를 반드시 포함한다. 빠뜨리면 blocked 된 phase 의
            # 그 이전 phase_started 를 찾아내 "중단된 phase"로 오인하고 재라우팅한다.
            if e.get("phase") == phase and e.get("event") in {
                "phase_started", "phase_completed", "phase_skipped",
                "phase_deferred", "phase_blocked",
            }:
                idx = i
                break
        if idx is None:
            continue
        latest = events[idx]
        if latest.get("event") != "phase_started":
            continue
        if _terminal_index_after(events, idx, phase):
            continue
        skill = str(latest.get("skill") or PHASE_TO_SKILL.get(phase, phase))
        return phase, skill

    for skill in BUILD_SUBPHASE_SKILLS:
        latest = latest_phase_event(events, "build", skill)
        if latest and latest.get("event") == "phase_started":
            return "build", skill

    return None


def unresolved_blocker(
    events: list[dict[str, Any]],
    *,
    ready: bool = True,
) -> dict[str, Any] | None:
    """마지막 이벤트가 미해결 blocker 면 그것을 돌려준다.

    단, `release_ready=false` 상태에서 release-gated phase(deploy/build/launch)가
    막힌 것은 blocker 로 보지 않는다 — 라우터가 그 phase 들을 건너뛰고
    로컬 완주(`verify`)로 진행해야 하기 때문이다. 과거에는 이 경우가 파이프라인을
    영구 정지시켜, 계정이 없다는 이유로 빌드·동작확인까지 못 하고 멈췄다.
    """
    latest = latest_event(events)
    if not latest or latest.get("event") != "phase_blocked":
        return None
    if not ready and str(latest.get("phase") or "") in RELEASE_GATED_PHASES:
        return None
    return latest


def build_subphase_statuses(root: Path, events: list[dict[str, Any]]) -> list[BuildSubphaseStatus]:
    icon_required = icon_source_available(root)
    statuses: list[BuildSubphaseStatus] = []

    statuses.append(
        status_for_build_skill(
            events=events,
            skill="setup-icons",
            required=icon_required,
        )
    )
    statuses.append(
        status_for_build_skill(
            events=events,
            skill="setup-landing",
            required=True,
        )
    )
    statuses.append(
        status_for_build_skill(
            events=events,
            skill="make-aso-images",
            required=True,
        )
    )
    return statuses


def status_for_build_skill(
    *,
    events: list[dict[str, Any]],
    skill: str,
    required: bool,
) -> BuildSubphaseStatus:
    latest = latest_phase_event(events, "build", skill)
    blocked_reason = None
    event_name = latest.get("event") if latest else None
    if event_name == "phase_blocked":
        detail = latest.get("detail") or {}
        blocked_reason = str(detail.get("reason") or detail.get("blocker") or "")
    return BuildSubphaseStatus(
        skill=skill,
        required=required,
        # phase_deferred = 외부 전제 부재로 이번 회차에서 의도적으로 넘긴 subphase.
        # completed 로 치지 않으면 라우터가 같은 subphase 를 무한 재라우팅한다.
        completed=event_name in {"phase_completed", "phase_deferred"}
        or (not required and skill == "setup-icons"),
        started=event_name == "phase_started",
        blocked=event_name == "phase_blocked",
        blocked_reason=blocked_reason or None,
    )


def icon_source_available(root: Path) -> bool:
    for candidate in ICON_SOURCE_CANDIDATES:
        if (root / candidate).exists():
            return True
    return False


def release_screenshots_available(root: Path) -> bool:
    return any(root.glob(RELEASE_SCREENSHOT_GLOB))
