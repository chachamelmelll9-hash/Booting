from __future__ import annotations

import hashlib
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .common import PHASE_TO_SKILL, PIPELINE_PHASES, RELEASE_GATED_PHASES
from .progress import (
    ActiveIteration,
    ProgressSnapshot,
    active_iteration,
    auto_mode_enabled,
    build_subphase_statuses,
    interrupted_phase,
    iteration_events,
    latest_completed_phase,
    release_ready,
    unresolved_blocker,
)


@dataclass
class RouteDecision:
    action: str
    iter_name: str
    phase: str | None = None
    skill: str | None = None
    prompt: str | None = None
    reason: str | None = None
    fingerprint: str | None = None


def compute_progress_fingerprint(root: Path, snapshot: ProgressSnapshot, iter_name: str) -> str:
    """"진행이 있었는가"를 나타내는 지문.

    `pipeline.jsonl` 만 보면 안 된다. `implement` 처럼 여러 턴에 걸치는 phase 는
    시작할 때 `phase_started` 하나만 쓰고 그 뒤로는 worker 진행을 `features.jsonl` 에
    기록한다. pipeline 이벤트만 지문에 넣으면 그런 phase 가 정상 작업 중인데도
    "진행 없음"으로 보여 정체 감지가 파이프라인을 조기 중단시킨다.
    worker/배포 진행도 실제 진행이므로 함께 넣는다.
    """
    items: list[str] = [
        "iter=" + iter_name,
        "auto=" + str(snapshot.auto_mode.get("enabled") if snapshot.auto_mode else False),
    ]

    def _fold(prefix: str, events: list[dict[str, Any]]) -> None:
        for event in events[-12:]:
            items.append(
                prefix
                + "|".join(
                    [
                        str(event.get("ts", "")),
                        str(event.get("phase", "")),
                        str(event.get("skill", "") or event.get("agent", "")),
                        str(event.get("event", "")),
                        str(event.get("detail", "")),
                    ]
                )
            )

    _fold("p:", iteration_events(snapshot, iter_name))
    _fold("f:", snapshot.feature_events)
    _fold("d:", snapshot.deploy_events)

    # 산출물 변화도 "진행"이다.
    # 기획 phase 들(clarify/define-pages/wireframes/architecture/test-scenarios)은
    # 이벤트를 phase 시작·종료 때만 쓰고, 그 사이 진행은 파일로만 나타난다.
    # 이벤트만 보면 정상 작업 중인데도 정체로 판정되어 파이프라인이 중단된다
    # (실측: wireframes 가 UX 리뷰어를 기다리는 동안 stale_count 가 올라갔다).
    # supervisor 런타임 파일은 진행이 아니다 — 훅·supervisor 가 턴마다 갱신하므로 지문에 넣으면
    # 정체가 영원히 감지되지 않는다 (supervisor 모드 도입 시 실측).
    runtime_names = {"supervisor.json", "rate-limit.json"}
    runtime_dirs = {root / "docs" / "progress" / "runs"}
    for rel in ("docs/features", "docs/progress", "test-results"):
        base = root / rel
        if not base.is_dir():
            continue
        try:
            paths = sorted(base.rglob("*"))[:200]
        except OSError:
            continue
        for path in paths:
            try:
                if not path.is_file():
                    continue
                if path.name in runtime_names or any(d in path.parents for d in runtime_dirs):
                    continue
                st = path.stat()
                items.append(f"a:{path.relative_to(root)}|{st.st_size}|{int(st.st_mtime)}")
            except OSError:
                continue

    digest = hashlib.sha256("\n".join(items).encode("utf-8")).hexdigest()
    return digest


def determine_route(root: Path, snapshot: ProgressSnapshot) -> RouteDecision:
    iter_state = active_iteration(snapshot)
    iter_name = iter_state.name

    if not auto_mode_enabled(snapshot):
        return RouteDecision(action="idle", iter_name=iter_name, reason="auto mode disabled")

    if iter_state.completed:
        return RouteDecision(action="done", iter_name=iter_name, reason="iteration already completed")

    events = iteration_events(snapshot, iter_name)
    ready = release_ready(snapshot)
    blocked = unresolved_blocker(events, ready=ready)
    if blocked:
        detail = blocked.get("detail") or {}
        reason = str(detail.get("reason") or detail.get("blocker") or "phase blocked")
        return RouteDecision(action="blocked", iter_name=iter_name, reason=reason)

    interrupted = interrupted_phase(events)
    if interrupted:
        phase, skill = interrupted
        prompt = continuation_prompt(
            snapshot=snapshot,
            iter_state=iter_state,
            phase=phase,
            skill=skill,
            resume=True,
        )
        return RouteDecision(
            action="continue",
            iter_name=iter_name,
            phase=phase,
            skill=skill,
            prompt=prompt,
            fingerprint=compute_progress_fingerprint(root, snapshot, iter_name),
        )

    phase = next_phase(root, snapshot, iter_state, ready=ready)
    if phase is None:
        # 남은 phase 가 없다. 아직 마무리 보고를 안 했다면 마지막 한 턴을 준다 —
        # 그래야 파이프라인이 "조용히 끝나는" 대신 결과 보고 + iteration_completed 를 남긴다.
        if not any(e.get("event") == "iteration_completed" for e in events):
            return RouteDecision(
                action="continue",
                iter_name=iter_name,
                phase="finalize",
                skill="finalize",
                prompt=finalize_prompt(snapshot=snapshot, iter_state=iter_state, ready=ready),
                fingerprint=compute_progress_fingerprint(root, snapshot, iter_name),
            )
        reason = (
            "local pipeline complete (verify done; deploy/build/launch deferred - release_ready=false)"
            if not ready
            else "no remaining phase"
        )
        return RouteDecision(action="done", iter_name=iter_name, reason=reason)

    if phase == "build":
        skill = next_build_skill(root, snapshot, iter_name)
        if skill is None:
            return RouteDecision(action="done", iter_name=iter_name, reason="build phase already satisfied")
    else:
        skill = PHASE_TO_SKILL[phase]

    prompt = continuation_prompt(
        snapshot=snapshot,
        iter_state=iter_state,
        phase=phase,
        skill=skill,
        resume=False,
    )
    return RouteDecision(
        action="continue",
        iter_name=iter_name,
        phase=phase,
        skill=skill,
        prompt=prompt,
        fingerprint=compute_progress_fingerprint(root, snapshot, iter_name),
    )


def next_phase(
    root: Path,
    snapshot: ProgressSnapshot,
    iter_state: ActiveIteration,
    *,
    ready: bool = True,
) -> str | None:
    events = iteration_events(snapshot, iter_state.name)
    # phase_completed 뿐 아니라 phase_skipped / phase_deferred 도 "더 볼 일 없음"으로 친다.
    # (deferred = 외부 전제가 없어 이번 회차에서 의도적으로 미룬 phase)
    completed = {
        event.get("phase")
        for event in events
        if event.get("event") in {"phase_completed", "phase_deferred"}
        and event.get("phase") != "build"
    }
    if build_complete(root, snapshot, iter_state.name):
        completed.add("build")

    # 뒤 phase 가 끝났으면 그 앞 phase 들도 지나간 것으로 친다.
    #
    # 근거(실측): `implement` 가 사용량 한도로 중단돼 `phase_completed` 를 못 남긴 채
    # 세션이 죽었다. 이후 재개해 `verify` 를 완료했는데도 라우터가 계속 `implement` 로
    # 되돌아갔다 — 기록 공백 하나 때문에 이미 지나간 구간을 무한 재실행하게 된다.
    # `interrupted_phase` 는 같은 판단을 이미 하고 있었으므로 여기만 어긋나 있었다.
    last_done = -1
    for event in events:
        if event.get("event") not in {"phase_completed", "phase_deferred"}:
            continue
        try:
            last_done = max(last_done, PIPELINE_PHASES.index(str(event.get("phase") or "")))
        except ValueError:
            continue
    if last_done >= 0:
        completed.update(PIPELINE_PHASES[:last_done])

    for phase in PIPELINE_PHASES:
        if phase in completed:
            continue
        # release_ready=false 면 외부 계정·인프라가 필요한 phase 는 통째로 건너뛴다.
        # 로컬에서 자동화 가능한 구간(~verify)은 절대 막지 않는다.
        if not ready and phase in RELEASE_GATED_PHASES:
            continue
        return phase
    return None


def build_complete(root: Path, snapshot: ProgressSnapshot, iter_name: str) -> bool:
    statuses = build_subphase_statuses(root, iteration_events(snapshot, iter_name))
    return all(status.completed for status in statuses if status.required)


def next_build_skill(root: Path, snapshot: ProgressSnapshot, iter_name: str) -> str | None:
    for status in build_subphase_statuses(root, iteration_events(snapshot, iter_name)):
        if not status.required:
            continue
        if status.completed:
            continue
        return status.skill
    return None


def continuation_prompt(
    *,
    snapshot: ProgressSnapshot,
    iter_state: ActiveIteration,
    phase: str,
    skill: str,
    resume: bool,
) -> str:
    last_completed = latest_completed_phase(iteration_events(snapshot, iter_state.name))
    mode = "Resume" if resume else "Run"
    lines = [
        "Hook-driven auto mode is active for this repository.",
        f"{mode} phase `{phase}` now, defined by the skill `{skill}`.",
        # --- skill shadowing 면역 ---
        # 같은 이름의 개인 스킬(~/.claude/skills/)이 프로젝트 스킬을 가릴 수 있고,
        # 그 사본에 disable-model-invocation 이 붙어 있으면 Skill() 호출 자체가 에러난다.
        # (실측: runner-log 파이프라인이 implement 단계에서 이 이유로 사망)
        # 따라서 "프로젝트 파일이 정본"임을 항상 명시하고, 실패 시 우회 경로를 준다.
        f"AUTHORITATIVE DEFINITION: `.claude/skills/{skill}/SKILL.md` in THIS repository.",
        f"Read that file with the Read tool and execute it. You may call Skill(skill=\"{skill}\") as a shortcut,",
        "but ONLY if it loads the definition from this repository's .claude/skills/ directory.",
        "If the Skill tool errors (e.g. disable-model-invocation), or reports a base directory outside this repository,",
        "ignore it and execute the repository file you just read — that file is the contract, not the tool call.",
        "Execute only this phase.",
        "Do not manually chain to any later skill when this phase ends.",
        "The Stop hook will route the next phase after this turn.",
        f"Active iteration: `{iter_state.name}`.",
    ]
    if last_completed:
        lines.append(f"Last completed phase: `{last_completed}`.")
    auto_mode = snapshot.auto_mode or {}
    problem = auto_mode.get("problem")
    if problem and phase in {"setup", "start"}:
        lines.append(f"Persisted problem: {problem}")
    if phase in RELEASE_GATED_PHASES:
        lines.append(
            "This phase needs external accounts/infrastructure. If a prerequisite is missing, append a "
            "`phase_deferred` event (NOT `phase_blocked`) to `docs/progress/pipeline.jsonl` with the missing items, "
            "then stop this phase — the router will move on."
        )
    else:
        lines.append(
            "This phase must be completable with local tooling only. Do NOT record `phase_blocked` for missing "
            "cloud accounts, store credentials, or deploy infrastructure — those are irrelevant here. "
            "Record `phase_blocked` only if a genuinely local prerequisite is impossible to satisfy automatically."
        )
    lines.append(
        "Always append `phase_completed` (or `phase_blocked`/`phase_deferred`) to `docs/progress/pipeline.jsonl` "
        "before ending the turn — the router has no other input."
    )
    return " ".join(lines)


def finalize_prompt(
    *,
    snapshot: ProgressSnapshot,
    iter_state: ActiveIteration,
    ready: bool,
) -> str:
    """모든 phase 가 끝난 뒤 딱 한 턴 — 결과 보고 + 이터레이션 종료 기록."""
    lines = [
        "Hook-driven auto mode: every routable phase for this iteration is finished.",
        "Do NOT start another phase. Do this finalization turn only:",
        "(0) FIRST verify the recorded progress against the actual repository state.",
        "If `pipeline.jsonl` claims a phase completed but its artifacts are absent",
        "(no `docs/features/*`, no `test-results/verify/*`, no implemented feature code),",
        "the record is wrong. Do NOT write a completion report and do NOT fabricate evidence.",
        "Instead append ONE `phase_blocked` event to `docs/progress/pipeline.jsonl` with",
        'phase `finalize` and detail.reason naming exactly which artifacts are missing,',
        "state the mismatch to the user in one short paragraph, and stop. Do not repeat this",
        "explanation if the hook fires again — the blocked event is the terminal answer.",
        "(1) Otherwise, write a completion report to the user: what the app is, what was built,",
        "and the evidence that it runs (emulator smoke result, screenshots, build artifacts).",
        "(2) Append an `iteration_completed` event to `docs/progress/pipeline.jsonl`",
        f'for iteration `{iter_state.name}`.',
        "(3) Set `enabled` to false in `docs/progress/auto-mode.json` so the router stops routing.",
    ]
    if not ready:
        lines.append(
            "NOTE: `release_ready` is false, so `deploy`, `build` and `launch` were intentionally "
            "skipped (they need external accounts/infrastructure). Say so explicitly in the report, "
            "list exactly which prerequisites are missing (from `docs/progress/preflight.json`), and "
            "state that the app itself is built and verified locally. Do not present this as a failure."
        )
    lines.append("(4) Commit and push the repository.")
    return " ".join(lines)
