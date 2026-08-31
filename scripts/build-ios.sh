#!/bin/bash
set -euo pipefail

# iOS production local build
# Usage: bash scripts/build-ios.sh

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE_DIR="$REPO_ROOT/apps/mobile"
IOS_DIR="$MOBILE_DIR/ios"
ARCHIVE_PATH="$MOBILE_DIR/build/app.xcarchive"
EXPORT_DIR="$MOBILE_DIR/build/ipa"
EXPORT_OPTIONS_TEMPLATE="$REPO_ROOT/scripts/ExportOptions.plist"
EXPORT_OPTIONS="$MOBILE_DIR/build/ExportOptions.plist"

echo "=== iOS Production Local Build ==="

# --- 0. Extract app info from app.json ---
BUNDLE_ID=$(node -e "const c = require('$MOBILE_DIR/app.json'); console.log(c.expo.ios.bundleIdentifier)")
APP_NAME=$(node -e "const c = require('$MOBILE_DIR/app.json'); console.log(c.expo.name)")
echo "Bundle ID: $BUNDLE_ID"
echo "App: $APP_NAME"

# --- 0.1. Guard: credentials must never be tracked by git ---
for TRACKED_SECRET in .appstoreconnect.env keystore.properties apps/mobile/keystore.properties google-service-account.json; do
  if git -C "$REPO_ROOT" ls-files --error-unmatch "$TRACKED_SECRET" >/dev/null 2>&1; then
    echo "ERROR: $TRACKED_SECRET is tracked by git. Store credentials must not be committed."
    echo "  Fix: git rm --cached $TRACKED_SECRET  (it is covered by .gitignore afterwards)"
    exit 1
  fi
done

# --- 1. App Store Connect API key check ---
ASC_KEY_ID="${ASC_KEY_ID:-}"
ASC_ISSUER_ID="${ASC_ISSUER_ID:-}"
TEAM_ID="${TEAM_ID:-}"

# Try to load from config file if env vars not set
ASC_CONFIG="$REPO_ROOT/.appstoreconnect.env"
if [ -f "$ASC_CONFIG" ]; then
  set -a
  source "$ASC_CONFIG"
  set +a
fi

if [ -z "$ASC_KEY_ID" ] || [ -z "$ASC_ISSUER_ID" ] || [ -z "$TEAM_ID" ]; then
  echo "ERROR: App Store Connect API credentials not configured."
  echo ""
  echo "Set environment variables or create .appstoreconnect.env in project root:"
  echo "  ASC_KEY_ID=YOUR_KEY_ID"
  echo "  ASC_ISSUER_ID=YOUR_ISSUER_ID"
  echo "  TEAM_ID=YOUR_TEAM_ID"
  echo ""
  echo "API key file should be at: ~/.appstoreconnect/AuthKey_\${ASC_KEY_ID}.p8"
  echo ""
  echo "To get these values:"
  echo "  1. Go to App Store Connect → Users and Access → Integrations → App Store Connect API"
  echo "  2. Create a new key with 'Admin' role"
  echo "  3. Download the .p8 file to ~/.appstoreconnect/"
  echo "  4. Note the Key ID and Issuer ID"
  echo "  5. Team ID is in Apple Developer → Membership"
  exit 1
fi

ASC_KEY_FILE="$HOME/.appstoreconnect/AuthKey_${ASC_KEY_ID}.p8"

if [ ! -f "$ASC_KEY_FILE" ]; then
  echo "ERROR: App Store Connect API key not found at $ASC_KEY_FILE"
  echo "Download from App Store Connect → Users and Access → Integrations"
  exit 1
fi

# --- 2. Prepare ExportOptions.plist with Team ID ---
if [ -f "$EXPORT_OPTIONS_TEMPLATE" ]; then
  mkdir -p "$(dirname "$EXPORT_OPTIONS")"
  cp "$EXPORT_OPTIONS_TEMPLATE" "$EXPORT_OPTIONS"
  /usr/libexec/PlistBuddy -c "Set :teamID $TEAM_ID" "$EXPORT_OPTIONS"
else
  echo "ERROR: ExportOptions.plist not found at $EXPORT_OPTIONS_TEMPLATE"
  exit 1
fi

# --- 3. Load production environment variables ---
echo "[1/7] Loading production environment variables..."
ENV_FILE="$MOBILE_DIR/.env.production"
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found."
  echo "Production builds require apps/mobile/.env.production:"
  echo "  cp apps/mobile/.env.example apps/mobile/.env.production"
  echo "Then fill in the production values."
  exit 1
fi
set -a
source "$ENV_FILE"
set +a
echo "  Loaded from $ENV_FILE"

REQUIRED_ENV_VARS=(
  EXPO_PUBLIC_SUPABASE_URL
  EXPO_PUBLIC_SUPABASE_KEY
  EXPO_PUBLIC_SERVER_URL
  EXPO_PUBLIC_WEBVIEW_URL
)
MISSING_ENV_VARS=""
for VAR_NAME in "${REQUIRED_ENV_VARS[@]}"; do
  if [ -z "${!VAR_NAME:-}" ]; then
    MISSING_ENV_VARS="$MISSING_ENV_VARS $VAR_NAME"
  fi
done
if [ -n "$MISSING_ENV_VARS" ]; then
  echo "ERROR: Required production variables are missing or empty in $ENV_FILE:"
  for VAR_NAME in $MISSING_ENV_VARS; do
    echo "  - $VAR_NAME"
  done
  echo "A store build with these unset would point at localhost/placeholder backends."
  exit 1
fi

# OTA update configuration check (informational — projectId issuance is a manual step)
if grep -q "__EAS_PROJECT_ID__" "$MOBILE_DIR/app.json"; then
  echo ""
  echo "  WARNING: app.json still contains the __EAS_PROJECT_ID__ placeholder."
  echo "  OTA updates (expo-updates) will NOT work in this build."
  echo "  To enable OTA: cd apps/mobile && npx eas-cli init  (issues a project ID only, no EAS build)"
  echo "  Continuing — the app will simply never receive OTA updates."
  echo ""
fi

# Set production build flag (used by app.config.ts)
export PRODUCTION_BUILD=true

# --- 4. Build number increment (source of truth: app.json) ---
# Must happen BEFORE prebuild so the generated Info.plist picks up the new value.
NEW_BUILD=$(node -e "
const fs = require('fs');
const path = '$MOBILE_DIR/app.json';
const config = JSON.parse(fs.readFileSync(path, 'utf8'));
const next = (parseInt(config.expo.ios.buildNumber, 10) || 0) + 1;
config.expo.ios.buildNumber = String(next);
fs.writeFileSync(path, JSON.stringify(config, null, 2) + '\n');
console.log(next);
")
echo "[2/7] Build number: $((NEW_BUILD - 1)) -> $NEW_BUILD"
echo "  NOTE: apps/mobile/app.json was updated. Commit this change so build numbers keep increasing."

# --- 5. Expo prebuild ---
echo "[3/7] Running expo prebuild..."
cd "$MOBILE_DIR"
npx expo prebuild --platform ios --clean

# --- 5.1. Detect scheme/workspace from generated project ---
WORKSPACE=$(ls -d "$IOS_DIR"/*.xcworkspace 2>/dev/null | head -1)
if [ -z "$WORKSPACE" ]; then
  echo "ERROR: No .xcworkspace found in $IOS_DIR after prebuild"
  exit 1
fi
SCHEME=$(basename "$WORKSPACE" .xcworkspace)
echo "  Detected scheme: $SCHEME"

# --- 6. Pod install ---
echo "[4/7] Installing CocoaPods..."
cd "$IOS_DIR"
pod install

# --- 6.1. Verify prebuild propagated the build number from app.json ---
INFO_PLIST="$IOS_DIR/$SCHEME/Info.plist"
PLIST_BUILD=$(/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" "$INFO_PLIST")
if [ "$PLIST_BUILD" != "$NEW_BUILD" ]; then
  echo "  WARNING: Info.plist has CFBundleVersion $PLIST_BUILD; forcing $NEW_BUILD"
  /usr/libexec/PlistBuddy -c "Set :CFBundleVersion $NEW_BUILD" "$INFO_PLIST"
fi

# --- 7. Archive ---
echo "[5/7] Archiving..."
mkdir -p "$(dirname "$ARCHIVE_PATH")"
xcodebuild archive \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration Release \
  -archivePath "$ARCHIVE_PATH" \
  -destination "generic/platform=iOS" \
  -allowProvisioningUpdates \
  -authenticationKeyPath "$ASC_KEY_FILE" \
  -authenticationKeyID "$ASC_KEY_ID" \
  -authenticationKeyIssuerID "$ASC_ISSUER_ID" \
  DEVELOPMENT_TEAM="$TEAM_ID" \
  CODE_SIGN_STYLE="Automatic" \
  | tail -5

# --- 8. Export IPA ---
echo "[6/7] Exporting IPA..."
mkdir -p "$EXPORT_DIR"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_DIR" \
  -exportOptionsPlist "$EXPORT_OPTIONS" \
  -allowProvisioningUpdates \
  -authenticationKeyPath "$ASC_KEY_FILE" \
  -authenticationKeyID "$ASC_KEY_ID" \
  -authenticationKeyIssuerID "$ASC_ISSUER_ID" \
  | tail -5

echo "[7/7] Locating IPA..."
IPA_FILE=$(ls -t "$EXPORT_DIR"/*.ipa 2>/dev/null | head -1)

if [ -z "$IPA_FILE" ]; then
  echo "ERROR: IPA file not found"
  exit 1
fi

echo ""
echo "=== Build Complete ==="
echo "Archive: $ARCHIVE_PATH"
echo "IPA: $IPA_FILE"
echo "Bundle ID: $BUNDLE_ID"
echo "Build number: $NEW_BUILD"
echo ""
echo "REMINDER: commit the buildNumber bump in apps/mobile/app.json."
echo ""
echo "To submit to App Store:"
echo "  bash scripts/submit-ios.sh \"$IPA_FILE\""
echo "  node scripts/app-store.mjs full-submit --ko \"릴리스 노트\" --en \"Release notes\""
