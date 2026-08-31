#!/bin/bash
set -euo pipefail

# Android production local build
# Usage: bash scripts/build-android.sh

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE_DIR="$REPO_ROOT/apps/mobile"
ANDROID_DIR="$MOBILE_DIR/android"
KEYSTORE_PROPS="$MOBILE_DIR/keystore.properties"
KEYSTORE_PROPS_FALLBACK="$ANDROID_DIR/keystore.properties"

sed_in_place() {
  if sed --version >/dev/null 2>&1; then
    sed -i "$@"
  else
    sed -i '' "$@"
  fi
}

echo "=== Android Production Local Build ==="

# --- 0. Extract app info from app.json ---
PACKAGE_NAME=$(node -e "const c = require('$MOBILE_DIR/app.json'); console.log(c.expo.android.package)")
APP_NAME=$(node -e "const c = require('$MOBILE_DIR/app.json'); console.log(c.expo.name)")
echo "Package: $PACKAGE_NAME"
echo "App: $APP_NAME"

# --- 0.1. Guard: credentials must never be tracked by git ---
for TRACKED_SECRET in keystore.properties apps/mobile/keystore.properties google-service-account.json; do
  if git -C "$REPO_ROOT" ls-files --error-unmatch "$TRACKED_SECRET" >/dev/null 2>&1; then
    echo "ERROR: $TRACKED_SECRET is tracked by git. Signing credentials must not be committed."
    echo "  Fix: git rm --cached $TRACKED_SECRET  (it is covered by .gitignore afterwards)"
    exit 1
  fi
done

# --- 1. Keystore check ---
if [ ! -f "$KEYSTORE_PROPS" ] && [ -f "$KEYSTORE_PROPS_FALLBACK" ]; then
  KEYSTORE_PROPS="$KEYSTORE_PROPS_FALLBACK"
fi

if [ ! -f "$KEYSTORE_PROPS" ]; then
  echo ""
  echo "ERROR: keystore.properties not found at $KEYSTORE_PROPS"
  echo ""
  echo "Create apps/mobile/keystore.properties with:"
  echo "  storeFile=<relative-path-to-keystore.jks>"
  echo "  storePassword=<your-store-password>"
  echo "  keyAlias=<your-key-alias>"
  echo "  keyPassword=<your-key-password>"
  echo ""
  echo "If you don't have a keystore yet, generate one:"
  echo "  keytool -genkeypair -v -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 \\"
  echo "    -keystore apps/mobile/release.jks -alias release"
  exit 1
fi

# Verify keystore file exists
STORE_FILE=$(grep 'storeFile' "$KEYSTORE_PROPS" | cut -d= -f2)
RESOLVED_KEYSTORE="$ANDROID_DIR/app/$STORE_FILE"
if [ ! -f "$RESOLVED_KEYSTORE" ]; then
  echo "WARNING: Keystore file not found at $RESOLVED_KEYSTORE (will be available after prebuild)"
fi

# --- 2. Load production environment variables ---
echo "[1/6] Loading production environment variables..."
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

# --- 3. Version code increment (source of truth: app.json) ---
# Must happen BEFORE prebuild so the generated build.gradle picks up the new value.
NEW_VERSION_CODE=$(node -e "
const fs = require('fs');
const path = '$MOBILE_DIR/app.json';
const config = JSON.parse(fs.readFileSync(path, 'utf8'));
const current = Number(config.expo.android.versionCode) || 0;
const next = current + 1;
config.expo.android.versionCode = next;
fs.writeFileSync(path, JSON.stringify(config, null, 2) + '\n');
console.log(next);
")
echo "[2/6] Version code: $((NEW_VERSION_CODE - 1)) -> $NEW_VERSION_CODE"
echo "  NOTE: apps/mobile/app.json was updated. Commit this change so version codes keep increasing."

# --- 4. Expo prebuild (regenerate native project) ---
echo "[3/6] Running expo prebuild..."
cd "$MOBILE_DIR"
npx expo prebuild --platform android --clean

# Keep an android/ mirror for deploy preflight checks without making it the source of truth.
mkdir -p "$ANDROID_DIR/app"
cp "$KEYSTORE_PROPS" "$ANDROID_DIR/keystore.properties"

# Copy keystore into android/app/ (prebuild --clean deletes it)
STORE_FILE_SRC="$MOBILE_DIR/$STORE_FILE"
if [ -f "$STORE_FILE_SRC" ]; then
  cp "$STORE_FILE_SRC" "$ANDROID_DIR/app/$STORE_FILE"
  echo "  Copied keystore to $ANDROID_DIR/app/$STORE_FILE"
fi

# --- 5. Patch build.gradle with release signing config ---
echo "[4/6] Patching release signing config..."
GRADLE_FILE="$ANDROID_DIR/app/build.gradle"

# Verify prebuild propagated the versionCode from app.json
GRADLE_VERSION_CODE=$(grep -o 'versionCode [0-9]*' "$GRADLE_FILE" | head -1 | grep -o '[0-9]*' || true)
if [ -z "$GRADLE_VERSION_CODE" ]; then
  echo "ERROR: versionCode not found in $GRADLE_FILE after prebuild."
  exit 1
fi
if [ "$GRADLE_VERSION_CODE" != "$NEW_VERSION_CODE" ]; then
  echo "  WARNING: prebuild wrote versionCode $GRADLE_VERSION_CODE; forcing $NEW_VERSION_CODE"
  sed_in_place "s/versionCode $GRADLE_VERSION_CODE/versionCode $NEW_VERSION_CODE/" "$GRADLE_FILE"
fi

# Re-verify keystore after prebuild
RESOLVED_KEYSTORE="$ANDROID_DIR/app/$STORE_FILE"
if [ ! -f "$RESOLVED_KEYSTORE" ]; then
  echo "ERROR: Keystore file not found at $RESOLVED_KEYSTORE"
  exit 1
fi

# Inject release signingConfig block after debug signingConfig
sed_in_place '/signingConfigs {/,/^    }/ {
  /^    }/i\
\        release {\
\            def keystorePropsFile = file("../keystore.properties")\
\            if (!keystorePropsFile.exists()) {\
\                keystorePropsFile = file("../../keystore.properties")\
\            }\
\            if (keystorePropsFile.exists()) {\
\                def keystoreProps = new Properties()\
\                keystoreProps.load(new FileInputStream(keystorePropsFile))\
\                storeFile file(keystoreProps["storeFile"])\
\                storePassword keystoreProps["storePassword"]\
\                keyAlias keystoreProps["keyAlias"]\
\                keyPassword keystoreProps["keyPassword"]\
\            }\
\        }
}' "$GRADLE_FILE"

# Replace only the release buildType's signingConfig (not debug)
sed_in_place '/buildTypes/,/^    }/ {
  /release {/,/}/ s/signingConfig signingConfigs.debug/signingConfig signingConfigs.release/
}' "$GRADLE_FILE"

# Verify the sed patches actually landed — otherwise the AAB would be silently debug-signed
if ! grep -q 'keystoreProps' "$GRADLE_FILE"; then
  echo "ERROR: Failed to inject release signing config into $GRADLE_FILE."
  echo "  The signingConfigs block pattern did not match (Expo template may have changed)."
  echo "  Aborting to avoid producing a debug-signed AAB."
  exit 1
fi
if ! grep -q 'signingConfig signingConfigs.release' "$GRADLE_FILE"; then
  echo "ERROR: release buildType still uses the debug signing config in $GRADLE_FILE."
  echo "  Aborting to avoid producing a debug-signed AAB."
  exit 1
fi

# --- 6. Gradle build ---
# AAB는 스토어 제출용, APK는 프로덕션 스모크 검증용(deploy Phase 4).
# 에뮬레이터에 AAB를 직접 설치할 수 없으므로 동일 서명·동일 versionCode의 release APK를
# 함께 만든다. 이게 없으면 bundletool 의존이 생기고, 스토어 스크린샷 캡처 단계가 막힌다.
echo "[5/6] Building release AAB + APK..."
cd "$ANDROID_DIR"
./gradlew bundleRelease assembleRelease

# --- 7. Copy output ---
echo "[6/6] Copying output..."
AAB_SOURCE="$ANDROID_DIR/app/build/outputs/bundle/release/app-release.aab"
APK_SOURCE="$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"
TIMESTAMP=$(date +%s)
AAB_OUTPUT="$MOBILE_DIR/build-${TIMESTAMP}.aab"
APK_OUTPUT="$MOBILE_DIR/build-${TIMESTAMP}.apk"

if [ ! -f "$AAB_SOURCE" ]; then
  echo "ERROR: AAB not found at $AAB_SOURCE"
  exit 1
fi

cp "$AAB_SOURCE" "$AAB_OUTPUT"

if [ -f "$APK_SOURCE" ]; then
  cp "$APK_SOURCE" "$APK_OUTPUT"
else
  # assembleRelease가 산출물 경로를 바꾼 경우(splits 등) 탐색 폴백
  FOUND_APK=$(find "$ANDROID_DIR/app/build/outputs/apk/release" -name "*.apk" 2>/dev/null | head -1 || true)
  if [ -n "$FOUND_APK" ]; then
    cp "$FOUND_APK" "$APK_OUTPUT"
  else
    echo "WARNING: release APK not found — deploy Phase 4 프로덕션 스모크를 수행할 수 없다."
    APK_OUTPUT=""
  fi
fi

echo ""
echo "=== Build Complete ==="
echo "Output (store):  $AAB_OUTPUT"
[ -n "$APK_OUTPUT" ] && echo "Output (smoke):  $APK_OUTPUT"
echo "Package: $PACKAGE_NAME"
echo "Version code: $NEW_VERSION_CODE"
echo ""
echo "REMINDER: commit the versionCode bump in apps/mobile/app.json."
echo ""
echo "To submit to Google Play:"
echo "  node scripts/play-store.mjs upload $AAB_OUTPUT"
