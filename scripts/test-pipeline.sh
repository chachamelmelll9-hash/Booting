#!/bin/bash
# auto mode 파이프라인 회귀 테스트 전체 실행.
#   bash scripts/test-pipeline.sh
set -uo pipefail
cd "$(dirname "$0")/.."
rc=0
echo "=== 1/4 라우터 회귀 ==="; python3 scripts/tests/test_pipeline_router.py || rc=1
echo; echo "=== 2/4 스킬·에이전트 정합성 ==="; python3 scripts/tests/test_pipeline_consistency.py >/dev/null && echo "ALL PASS" || { python3 scripts/tests/test_pipeline_consistency.py | grep FAIL; rc=1; }
echo; echo "=== 3/4 개인 스킬 shadowing ==="; bash scripts/doctor-skills.sh || rc=1
echo; echo "=== 4/4 워크스페이스 스코프 정합 ==="; bash scripts/tests/test_scope_consistency.sh || rc=1
echo; [ $rc -eq 0 ] && echo "PIPELINE TESTS: ALL PASS" || echo "PIPELINE TESTS: FAILURES"
exit $rc
