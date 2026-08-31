#!/bin/bash
set -euo pipefail

# Submit IPA to App Store Connect
# Usage: bash scripts/submit-ios.sh <path-to-ipa>

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IPA_FILE="${1:-}"

if [ -z "$IPA_FILE" ]; then
  echo "Usage: bash scripts/submit-ios.sh <path-to-ipa>"
  echo "Example: bash scripts/submit-ios.sh apps/mobile/build/ipa/app.ipa"
  exit 1
fi

if [ ! -f "$IPA_FILE" ]; then
  echo "ERROR: IPA file not found: $IPA_FILE"
  exit 1
fi

# --- Load ASC credentials ---
ASC_KEY_ID="${ASC_KEY_ID:-}"
ASC_ISSUER_ID="${ASC_ISSUER_ID:-}"

ASC_CONFIG="$REPO_ROOT/.appstoreconnect.env"
if [ -f "$ASC_CONFIG" ]; then
  set -a
  source "$ASC_CONFIG"
  set +a
fi

if [ -z "$ASC_KEY_ID" ] || [ -z "$ASC_ISSUER_ID" ]; then
  echo "ERROR: ASC_KEY_ID and ASC_ISSUER_ID required."
  echo "Set env vars or create .appstoreconnect.env in project root."
  exit 1
fi

ASC_KEY_FILE="$HOME/.appstoreconnect/AuthKey_${ASC_KEY_ID}.p8"
if [ ! -f "$ASC_KEY_FILE" ]; then
  echo "ERROR: API key not found at $ASC_KEY_FILE"
  exit 1
fi

# --- Extract build number from IPA (gates full-submit on this exact build) ---
BUILD_NUMBER=""
TMP_DIR="$(mktemp -d)"
if unzip -o -q "$IPA_FILE" 'Payload/*.app/Info.plist' -d "$TMP_DIR" 2>/dev/null; then
  PLIST_FILE=$(find "$TMP_DIR/Payload" -maxdepth 2 -name Info.plist 2>/dev/null | head -1)
  if [ -n "$PLIST_FILE" ]; then
    BUILD_NUMBER=$(/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" "$PLIST_FILE" 2>/dev/null || true)
  fi
fi
rm -rf "$TMP_DIR"

# --- Upload ---
echo "=== Uploading to App Store Connect ==="
echo "IPA: $IPA_FILE"
[ -n "$BUILD_NUMBER" ] && echo "CFBundleVersion: $BUILD_NUMBER"

xcrun altool --upload-app \
  --type ios \
  --file "$IPA_FILE" \
  --apiKey "$ASC_KEY_ID" \
  --apiIssuer "$ASC_ISSUER_ID"

echo ""
echo "=== Upload Complete ==="
echo ""
if [ -n "$BUILD_NUMBER" ]; then
  BUILD_NUMBER_FILE="$REPO_ROOT/apps/mobile/build/ipa/.last-build-number"
  mkdir -p "$(dirname "$BUILD_NUMBER_FILE")"
  echo "$BUILD_NUMBER" > "$BUILD_NUMBER_FILE"
  echo "Build number $BUILD_NUMBER saved to apps/mobile/build/ipa/.last-build-number"
  echo "(app-store.mjs full-submit / wait-build read it automatically)"
  echo ""
  echo "Next: node scripts/app-store.mjs full-submit --build-number $BUILD_NUMBER --ko \"릴리스 노트\" --en \"Release notes\""
else
  echo "WARNING: could not read CFBundleVersion from IPA."
  echo "Pass the uploaded build number explicitly to avoid submitting a stale build:"
  echo "Next: node scripts/app-store.mjs full-submit --build-number <CFBundleVersion> --ko \"릴리스 노트\" --en \"Release notes\""
fi
