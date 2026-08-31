from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from lib.progress import load_snapshot
from lib.router import determine_route


class RouterTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmpdir = tempfile.TemporaryDirectory()
        self.root = Path(self.tmpdir.name)
        (self.root / "docs" / "progress").mkdir(parents=True, exist_ok=True)
        (self.root / ".codex" / "state").mkdir(parents=True, exist_ok=True)
        (self.root / "docs" / "progress" / "auto-mode.json").write_text(
            json.dumps({"enabled": True, "problem": "test problem"}) + "\n"
        )

    def tearDown(self) -> None:
        self.tmpdir.cleanup()

    def write_pipeline(self, rows: list[dict[str, object]]) -> None:
        path = self.root / "docs" / "progress" / "pipeline.jsonl"
        path.write_text("".join(json.dumps(row) + "\n" for row in rows))

    def snapshot(self):
        return load_snapshot(self.root)

    def test_routes_to_setup_when_pipeline_is_empty(self) -> None:
        route = determine_route(self.root, self.snapshot())
        self.assertEqual(route.action, "continue")
        self.assertEqual(route.phase, "setup")
        self.assertEqual(route.skill, "setup")

    def test_routes_to_start_after_setup_completion(self) -> None:
        self.write_pipeline(
            [
                phase_row("setup", "setup", "phase_started"),
                phase_row("setup", "setup", "phase_completed"),
            ]
        )
        route = determine_route(self.root, self.snapshot())
        self.assertEqual(route.phase, "start")
        self.assertEqual(route.skill, "start")

    def test_resumes_interrupted_phase(self) -> None:
        self.write_pipeline(
            [
                phase_row("setup", "setup", "phase_started"),
                phase_row("setup", "setup", "phase_completed"),
                phase_row("start", "start", "phase_started"),
            ]
        )
        route = determine_route(self.root, self.snapshot())
        self.assertEqual(route.phase, "start")
        self.assertEqual(route.skill, "start")
        self.assertIn("Resume", route.prompt or "")

    def test_routes_to_setup_landing_when_build_begins_without_icon_source(self) -> None:
        self.write_pipeline(
            [
                phase_row("setup", "setup", "phase_completed"),
                phase_row("start", "start", "phase_completed"),
                phase_row("clarify", "clarify-core-feature", "phase_completed"),
                phase_row("define-pages", "define-pages", "phase_completed"),
                phase_row("wireframes", "design-wireframes", "phase_completed"),
                phase_row("architecture", "design-architecture", "phase_completed"),
                phase_row("test-scenarios", "write-test-scenarios", "phase_completed"),
                phase_row("implement", "implement-feature", "phase_completed"),
                phase_row("deploy", "deploy", "phase_completed"),
            ]
        )
        route = determine_route(self.root, self.snapshot())
        self.assertEqual(route.phase, "build")
        self.assertEqual(route.skill, "setup-landing")

    def test_routes_to_make_aso_images_after_landing_completion(self) -> None:
        self.write_pipeline(
            [
                phase_row("setup", "setup", "phase_completed"),
                phase_row("start", "start", "phase_completed"),
                phase_row("clarify", "clarify-core-feature", "phase_completed"),
                phase_row("define-pages", "define-pages", "phase_completed"),
                phase_row("wireframes", "design-wireframes", "phase_completed"),
                phase_row("architecture", "design-architecture", "phase_completed"),
                phase_row("test-scenarios", "write-test-scenarios", "phase_completed"),
                phase_row("implement", "implement-feature", "phase_completed"),
                phase_row("deploy", "deploy", "phase_completed"),
                phase_row("build", "setup-landing", "phase_completed"),
            ]
        )
        route = determine_route(self.root, self.snapshot())
        self.assertEqual(route.phase, "build")
        self.assertEqual(route.skill, "make-aso-images")

    def test_routes_to_setup_icons_when_icon_source_exists(self) -> None:
        (self.root / "assets").mkdir(exist_ok=True)
        (self.root / "assets" / "icon-source.png").write_text("icon")
        self.write_pipeline(
            [
                phase_row("setup", "setup", "phase_completed"),
                phase_row("start", "start", "phase_completed"),
                phase_row("clarify", "clarify-core-feature", "phase_completed"),
                phase_row("define-pages", "define-pages", "phase_completed"),
                phase_row("wireframes", "design-wireframes", "phase_completed"),
                phase_row("architecture", "design-architecture", "phase_completed"),
                phase_row("test-scenarios", "write-test-scenarios", "phase_completed"),
                phase_row("implement", "implement-feature", "phase_completed"),
                phase_row("deploy", "deploy", "phase_completed"),
            ]
        )
        route = determine_route(self.root, self.snapshot())
        self.assertEqual(route.phase, "build")
        self.assertEqual(route.skill, "setup-icons")

    def test_stops_when_phase_is_blocked(self) -> None:
        self.write_pipeline(
            [
                phase_row("setup", "setup", "phase_completed"),
                {
                    **phase_row("start", "start", "phase_blocked"),
                    "detail": {
                        "reason": "manual Kakao login required",
                        "manual_action": "log into Kakao console",
                    },
                },
            ]
        )
        route = determine_route(self.root, self.snapshot())
        self.assertEqual(route.action, "blocked")
        self.assertIn("manual Kakao login required", route.reason or "")

    def test_returns_done_after_iteration_completion(self) -> None:
        self.write_pipeline(
            [
                phase_row("launch", "launch", "phase_completed"),
                {
                    "ts": "2026-04-07T00:01:00+09:00",
                    "iter": "initial",
                    "feature": None,
                    "phase": None,
                    "skill": "launch",
                    "event": "iteration_completed",
                    "detail": {},
                },
            ]
        )
        route = determine_route(self.root, self.snapshot())
        self.assertEqual(route.action, "done")


def phase_row(phase: str, skill: str, event: str) -> dict[str, object]:
    return {
        "ts": "2026-04-07T00:00:00+09:00",
        "iter": "initial",
        "feature": None,
        "phase": phase,
        "skill": skill,
        "event": event,
        "detail": {},
    }


if __name__ == "__main__":
    unittest.main()
