#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

TARGET="${1:-maestro/}"

# apps/mobile/app.json에서 Android 패키지명을 읽어 APP_ID로 주입 (하드코딩 금지)
APP_ID="${APP_ID:-$(node -p "require('../mobile/app.json').expo.android.package")}"
if [ -z "$APP_ID" ] || [ "$APP_ID" = "undefined" ]; then
  echo "Failed to resolve APP_ID from apps/mobile/app.json (expo.android.package)" >&2
  exit 1
fi

# 테스트 계정은 env로 주입. 미지정 시 실행마다 고유 이메일을 생성해
# signup(01) → login(02)이 같은 계정으로 이어지게 한다.
TEST_EMAIL="${TEST_EMAIL:-e2e+$(date +%s)@test.com}"
TEST_PASSWORD="${TEST_PASSWORD:-qwer1234}"

exec maestro test \
  -e APP_ID="$APP_ID" \
  -e TEST_EMAIL="$TEST_EMAIL" \
  -e TEST_PASSWORD="$TEST_PASSWORD" \
  "$TARGET"
