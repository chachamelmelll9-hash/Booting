from __future__ import annotations

import unittest

from lib.approvals import evaluate_command
from lib.progress import ProgressSnapshot


class ApprovalTests(unittest.TestCase):
    def test_blocks_destructive_git(self) -> None:
        decision = evaluate_command("git reset --hard HEAD", snapshot_with_phase("implement"))
        self.assertFalse(decision.allow)

    def test_blocks_global_install(self) -> None:
        decision = evaluate_command("brew install gh", snapshot_with_phase("setup"))
        self.assertFalse(decision.allow)

    def test_allows_deploy_style_command_in_build_phase(self) -> None:
        decision = evaluate_command(
            "wrangler pages deploy dist",
            snapshot_with_phase("build"),
        )
        self.assertTrue(decision.allow)

    def test_blocks_store_submit_outside_launch_flow(self) -> None:
        decision = evaluate_command(
            "node scripts/play-store.mjs upload",
            snapshot_with_phase("implement"),
        )
        self.assertFalse(decision.allow)


def snapshot_with_phase(phase: str) -> ProgressSnapshot:
    return ProgressSnapshot(
        auto_mode={"enabled": True},
        pipeline_events=[
            {
                "ts": "2026-04-07T00:00:00+09:00",
                "iter": "initial",
                "feature": None,
                "phase": phase,
                "skill": phase,
                "event": "phase_started",
                "detail": {},
            }
        ],
        feature_events=[],
        deploy_events=[],
    )


if __name__ == "__main__":
    unittest.main()
