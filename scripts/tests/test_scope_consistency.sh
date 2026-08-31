#!/usr/bin/env bash
# 소스가 import 하는 워크스페이스 스코프가 실제 패키지 이름과 일치하는지 검사한다.
#
# 근거(실측): 테스트 프로젝트에서 고친 파일을 템플릿으로 되가져오면서 그 프로젝트의
# 스코프(@app-service/)가 템플릿(@{org}-service/)에 섞여 들어왔다. 타입체크가 깨졌고
# husky 가 커밋을 막을 때까지 아무도 몰랐다. 스코프는 org 치환 대상이라 눈으로는 안 보인다.
set -uo pipefail
cd "$(dirname "$0")/../.." || exit 1

SCOPE=$(node -e "console.log(require('./packages/i18n/package.json').name.split('/')[0])")
echo "정본 스코프: $SCOPE"

BAD=$(grep -rhoE "@[a-z0-9-]+-service/" --include="*.ts" --include="*.tsx" apps packages 2>/dev/null \
      | sed 's|/$||' | sort -u | grep -v "^${SCOPE}$" || true)

if [ -n "$BAD" ]; then
  echo "FAIL: 정본과 다른 스코프가 소스에 있다:"
  echo "$BAD" | sed 's/^/  /'
  echo "  → 다른 프로젝트에서 파일을 되가져왔을 가능성이 높다"
  exit 1
fi
echo "SCOPE_OK: 모든 워크스페이스 import 가 $SCOPE 로 일치"
