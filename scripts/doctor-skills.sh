#!/bin/bash
# =============================================================================
# doctor-skills.sh — 개인 스킬이 이 저장소의 파이프라인 스킬을 가리는지 점검한다.
#
# 왜 필요한가:
#   Claude Code 는 개인 스킬(~/.claude/skills/)과 프로젝트 스킬(.claude/skills/)을
#   같은 이름공간에서 해석한다. 예전 템플릿에서 복사해 둔 개인 스킬이 남아 있으면
#   auto mode 가 그 낡은 사본을 실행한다. 그 사본에 `disable-model-invocation: true`
#   가 있으면 Skill() 호출 자체가 에러나서 파이프라인이 그 자리에서 죽는다.
#
#   실측 사례(runner-log): implement 단계에서 아래 에러로 자동 진행이 중단됐다.
#     "Skill implement-feature cannot be used with Skill tool due to
#      disable-model-invocation. Ask the user to run /implement-feature themselves"
#   같은 세션에서 write-test-scenarios 는 개인 사본이 실행됐다 (auto mode 지침 없는 구버전).
#
# 사용:
#   bash scripts/doctor-skills.sh          # 점검만
#   bash scripts/doctor-skills.sh --fix    # 가리는 개인 사본을 백업 후 비활성화
# =============================================================================
set -uo pipefail

FIX=false
[ "${1:-}" = "--fix" ] && FIX=true

# 파이프라인 스킬만 대상으로 한다. agent-browser·mobile-ux-ui-design 처럼
# 사용자가 독립적으로 관리하는 범용 스킬은 이름이 겹쳐도 건드리지 않는다.
PIPELINE_SKILLS="setup start clarify-core-feature define-pages design-wireframes design-architecture write-test-scenarios implement-feature verify-app deploy setup-icons setup-landing make-aso-images launch preflight continue"

REPO_SKILLS=".claude/skills"
USER_SKILLS="$HOME/.claude/skills"
BACKUP="$HOME/.claude/skills-shadowed-backup"

[ -d "$REPO_SKILLS" ] || { echo "SKIP: $REPO_SKILLS 없음 (저장소 루트에서 실행해야 한다)"; exit 0; }
[ -d "$USER_SKILLS" ] || { echo "OK: 개인 스킬 디렉토리가 없어 shadowing 위험 없음"; exit 0; }

shadowed=0
blocking=0

for name in $PIPELINE_SKILLS; do
  [ -d "$REPO_SKILLS/$name" ] || continue
  personal="$USER_SKILLS/$name/SKILL.md"
  [ -f "$personal" ] || continue

  shadowed=$((shadowed + 1))
  if grep -q '^disable-model-invocation:[[:space:]]*true' "$personal" 2>/dev/null; then
    blocking=$((blocking + 1))
    echo "BLOCKING  $name  — 개인 사본에 disable-model-invocation: true (auto mode 가 이 단계에서 죽는다)"
  else
    echo "SHADOW    $name  — 개인 사본이 프로젝트 정본을 가린다 (구버전일 수 있음)"
  fi
  echo "          personal: $personal"

  if [ "$FIX" = true ]; then
    mkdir -p "$BACKUP"
    mv "$USER_SKILLS/$name" "$BACKUP/$name.$(date +%Y%m%d%H%M%S)"
    echo "          -> 백업 후 제거: $BACKUP/"
  fi
done

echo
if [ "$shadowed" -eq 0 ]; then
  echo "SKILLS_OK: 가려진 파이프라인 스킬 없음"
  exit 0
fi

echo "SKILLS_SHADOWED=$shadowed BLOCKING=$blocking"
if [ "$FIX" = true ]; then
  echo "해소 완료. 새 Claude Code 세션에서 프로젝트 스킬이 정본으로 로드된다."
  exit 0
fi
echo "해소: bash scripts/doctor-skills.sh --fix   (개인 사본은 $BACKUP 로 백업된다)"
[ "$blocking" -gt 0 ] && exit 2
exit 1
