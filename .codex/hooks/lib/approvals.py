from __future__ import annotations

import re
from dataclasses import dataclass

from .progress import ProgressSnapshot, active_iteration, auto_mode_enabled, iteration_events, latest_event


DESTRUCTIVE_GIT_PATTERNS = [
    re.compile(r"\bgit\s+reset\s+--hard\b"),
    re.compile(r"\bgit\s+checkout\s+--\b"),
    re.compile(r"\bgit\s+clean\b.*\b-f\b"),
]

GLOBAL_INSTALL_PATTERNS = [
    re.compile(r"\bbrew\s+(install|upgrade)\b"),
    re.compile(r"\bnpm\s+(install|i)\s+-g\b"),
    re.compile(r"\bpnpm\s+add\s+-g\b"),
    re.compile(r"\byarn\s+global\s+add\b"),
    re.compile(r"\bpip(?:3)?\s+install\b.*\b(-U|--upgrade)\b"),
]

REMOTE_DB_PATTERNS = [
    re.compile(r"\bsupabase\b.*\b(db\s+push|migration\s+up|link)\b"),
    re.compile(r"\bpsql\b"),
    re.compile(r"\bdbmate\b"),
    re.compile(r"\bbash\s+scripts/provision-supabase\.sh\b"),
]

DEPLOY_PATTERNS = [
    re.compile(r"\bbash\s+scripts/setup-deploy\.sh\b"),
    re.compile(r"\b(node|pnpm)\b.*(deploy|deploy-webview)"),
    re.compile(r"\bgh\b.*\bworkflow\b.*\bdeploy\b"),
    re.compile(r"\bwrangler\s+pages\s+deploy\b"),
]

PRODUCTION_BUILD_PATTERNS = [
    re.compile(r"\bbash\s+scripts/build-android\.sh\b"),
    re.compile(r"\bbash\s+scripts/build-ios\.sh\b"),
]

STORE_PATTERNS = [
    re.compile(r"\bbash\s+scripts/submit-ios\.sh\b"),
    re.compile(r"\bnode\s+scripts/app-store\.mjs\b"),
    re.compile(r"\bnode\s+scripts/play-store\.mjs\b"),
    re.compile(r"\bnode\s+scripts/upload-images\.mjs\b"),
]


@dataclass
class GuardDecision:
    allow: bool
    reason: str | None = None


def evaluate_command(command: str, snapshot: ProgressSnapshot) -> GuardDecision:
    normalized = " ".join(command.split())

    for pattern in DESTRUCTIVE_GIT_PATTERNS:
        if pattern.search(normalized):
            return GuardDecision(
                allow=False,
                reason="Destructive git command blocked by repository policy.",
            )

    for pattern in GLOBAL_INSTALL_PATTERNS:
        if pattern.search(normalized):
            return GuardDecision(
                allow=False,
                reason="Global CLI install or upgrade requires explicit human approval.",
            )

    iter_state = active_iteration(snapshot)
    events = iteration_events(snapshot, iter_state.name)
    current_phase = None
    latest = latest_event(events)
    if latest:
        current_phase = str(latest.get("phase") or "")

    if matches_any(normalized, REMOTE_DB_PATTERNS):
        if auto_mode_enabled(snapshot) and current_phase in {"setup", "deploy"}:
            return GuardDecision(allow=True)
        return GuardDecision(
            allow=False,
            reason="Remote DB action blocked outside approved setup/deploy auto-mode scope.",
        )

    if matches_any(normalized, DEPLOY_PATTERNS):
        if auto_mode_enabled(snapshot) and current_phase in {"deploy", "build"}:
            return GuardDecision(allow=True)
        return GuardDecision(
            allow=False,
            reason="Deploy action blocked outside approved deploy/build phase.",
        )

    if matches_any(normalized, PRODUCTION_BUILD_PATTERNS):
        if auto_mode_enabled(snapshot) and current_phase in {"deploy", "build"}:
            return GuardDecision(allow=True)
        return GuardDecision(
            allow=False,
            reason="Production build blocked outside approved deploy/build phase.",
        )

    if matches_any(normalized, STORE_PATTERNS):
        if auto_mode_enabled(snapshot) and current_phase in {"build", "launch"}:
            return GuardDecision(allow=True)
        return GuardDecision(
            allow=False,
            reason="Store submission action blocked outside approved launch flow.",
        )

    return GuardDecision(allow=True)


def matches_any(command: str, patterns: list[re.Pattern[str]]) -> bool:
    return any(pattern.search(command) for pattern in patterns)
