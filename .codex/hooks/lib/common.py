from __future__ import annotations

import json
import os
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


PIPELINE_PHASES = [
    "setup",
    "start",
    "clarify",
    "define-pages",
    "wireframes",
    "architecture",
    "test-scenarios",
    "implement",
    "verify",
    "deploy",
    "build",
    "launch",
]

# 외부 계정/인프라/크레덴셜이 있어야만 가능한 phase.
# `auto-mode.json`의 release_ready 가 true 가 아니면 라우터가 건너뛴다.
# (계정이 없다는 이유로 로컬에서 100% 자동화 가능한 빌드·동작검증까지 막지 않는다)
RELEASE_GATED_PHASES = {"deploy", "build", "launch"}

# release_ready 와 무관하게 항상 도달해야 하는 마지막 phase.
# 여기까지 끝나면 "앱이 빌드되고 동작이 확인된" 상태다.
LOCAL_COMPLETION_PHASE = "verify"

PHASE_TO_SKILL = {
    "setup": "setup",
    "start": "start",
    "clarify": "clarify-core-feature",
    "define-pages": "define-pages",
    "wireframes": "design-wireframes",
    "architecture": "design-architecture",
    "test-scenarios": "write-test-scenarios",
    "implement": "implement-feature",
    "verify": "verify-app",
    "deploy": "deploy",
    "launch": "launch",
}

BUILD_SUBPHASE_SKILLS = [
    "setup-icons",
    "setup-landing",
    "make-aso-images",
]

ICON_SOURCE_CANDIDATES = [
    "assets/icon-source.png",
    "assets/icon-source.jpg",
    "assets/icon-source.jpeg",
    "assets/icon-source.webp",
    "assets/branding/icon-source.png",
    "assets/branding/icon-source.jpg",
    "assets/branding/icon-source.jpeg",
    "assets/branding/icon-source.webp",
    "docs/branding/icon-source.png",
    "docs/branding/icon-source.jpg",
    "docs/branding/icon-source.jpeg",
    "docs/branding/icon-source.webp",
]

RELEASE_SCREENSHOT_GLOB = "assets/screenshots/android/*/*.png"


@dataclass
class HookContext:
    payload: dict[str, Any]
    cwd: Path
    root: Path

    @property
    def turn_id(self) -> str | None:
        value = self.payload.get("turn_id")
        return str(value) if value is not None else None

    @property
    def hook_event_name(self) -> str:
        return str(self.payload.get("hook_event_name", ""))


def read_payload() -> dict[str, Any]:
    try:
        raw = sys.stdin.read().strip()
    except Exception:
        return {}
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


def git_root(cwd: str | os.PathLike[str]) -> Path | None:
    try:
        output = subprocess.check_output(
            ["git", "rev-parse", "--show-toplevel"],
            cwd=str(cwd),
            stderr=subprocess.DEVNULL,
            text=True,
        ).strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None
    return Path(output)


def build_context(payload: dict[str, Any]) -> HookContext | None:
    cwd = Path(str(payload.get("cwd") or os.getcwd()))
    root = git_root(cwd)
    if root is None:
        return None
    return HookContext(payload=payload, cwd=cwd, root=root)


def now_iso() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def read_json(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError:
        return None


def write_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=True, indent=2) + "\n")


def append_jsonl(path: Path, row: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(row, ensure_ascii=True) + "\n")


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    rows: list[dict[str, Any]] = []
    with path.open(encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            if isinstance(row, dict):
                rows.append(row)
    return rows


def auto_mode_path(root: Path) -> Path:
    return root / "docs" / "progress" / "auto-mode.json"


def pipeline_path(root: Path) -> Path:
    return root / "docs" / "progress" / "pipeline.jsonl"


def features_path(root: Path) -> Path:
    return root / "docs" / "progress" / "features.jsonl"


def deploys_path(root: Path) -> Path:
    return root / "docs" / "progress" / "deploys.jsonl"


def state_dir(root: Path) -> Path:
    return root / ".codex" / "state"


def router_state_path(root: Path) -> Path:
    return state_dir(root) / "hook-router.json"


def phase_event_row(
    *,
    iter_name: str,
    phase: str,
    skill: str,
    event: str,
    detail: dict[str, Any] | None = None,
    output: str | None = None,
    feature: str | None = None,
) -> dict[str, Any]:
    row: dict[str, Any] = {
        "ts": now_iso(),
        "iter": iter_name,
        "feature": feature,
        "phase": phase,
        "skill": skill,
        "event": event,
        "detail": detail or {},
    }
    if output is not None:
        row["output"] = output
    return row
