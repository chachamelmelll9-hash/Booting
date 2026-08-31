#!/bin/bash
set -euo pipefail

# =============================================================================
# Branding Script — Replace app name and bundle ID across all files
# Called by /start skill after app name is decided.
# Assumes initial-setup.sh already ran (org scope replacement is done there;
# this script only handles app name / bundle ID).
# Current values are read from apps/mobile/app.json, so re-branding works.
# =============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_step() { echo -e "\n${YELLOW}▶ $1${NC}"; }
print_success() { echo -e "${GREEN}✔ $1${NC}"; }
print_error() { echo -e "${RED}✖ $1${NC}"; }

# Cross-platform sed -i
sedi() {
  if [[ "$OSTYPE" == darwin* ]]; then
    sed -i '' "$@"
  else
    sed -i "$@"
  fi
}

# Escape helpers so arbitrary app names are safe inside sed expressions
escape_sed_pattern() { printf '%s' "$1" | sed 's/[][\.*^$/]/\\&/g'; }
escape_sed_replacement() { printf '%s' "$1" | sed 's/[\/&]/\\&/g'; }

# Parse arguments
APP_NAME=""
BUNDLE_ID=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --name) APP_NAME="${2:?--name requires a value}"; shift 2 ;;
    --bundle-id) BUNDLE_ID="${2:?--bundle-id requires a value}"; shift 2 ;;
    *) shift ;;
  esac
done

if [ -z "$APP_NAME" ] || [ -z "$BUNDLE_ID" ]; then
  print_error "Usage: ./scripts/branding.sh --name \"AppName\" --bundle-id \"com.org.appname\""
  exit 1
fi

# Validate bundle ID format
if ! [[ "$BUNDLE_ID" =~ ^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$ ]]; then
  print_error "Invalid Bundle ID format: $BUNDLE_ID"
  echo "  Only lowercase letters, numbers, and dots (.) are allowed."
  echo "  Each segment must start with a letter."
  exit 1
fi

APP_JSON="apps/mobile/app.json"
if [ ! -f "$APP_JSON" ]; then
  print_error "$APP_JSON not found. Run this script from the repo root."
  exit 1
fi

# Derive variants
APP_NAME_LOWER=$(echo "$APP_NAME" | tr '[:upper:]' '[:lower:]')
APP_NAME_LOWER_NO_SPACE=$(echo "$APP_NAME_LOWER" | tr -d ' ')

# Old values are read from app.json (source of truth) so the script can
# re-brand an already-branded project, not just the boilerplate defaults.
OLD_APP_NAME=$(node -e "process.stdout.write(require('./apps/mobile/app.json').expo.name || '')" 2>/dev/null || true)
OLD_BUNDLE_ID=$(node -e "process.stdout.write((require('./apps/mobile/app.json').expo.ios || {}).bundleIdentifier || '')" 2>/dev/null || true)
OLD_SLUG=$(node -e "process.stdout.write(require('./apps/mobile/app.json').expo.slug || '')" 2>/dev/null || true)
OLD_APP_NAME="${OLD_APP_NAME:-MyApp}"
OLD_BUNDLE_ID="${OLD_BUNDLE_ID:-com.myorg.myapp}"
OLD_SLUG="${OLD_SLUG:-myapp-mobile}"
OLD_PREFIX="${OLD_SLUG%-mobile}"

# Pre-escaped sed fragments
OLD_APP_NAME_RE=$(escape_sed_pattern "$OLD_APP_NAME")
APP_NAME_REPL=$(escape_sed_replacement "$APP_NAME")
OLD_BUNDLE_ID_RE=$(escape_sed_pattern "$OLD_BUNDLE_ID")
BUNDLE_ID_REPL=$(escape_sed_replacement "$BUNDLE_ID")
OLD_PREFIX_RE=$(escape_sed_pattern "$OLD_PREFIX")
NEW_PREFIX_REPL=$(escape_sed_replacement "$APP_NAME_LOWER_NO_SPACE")

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  Rebranding: ${OLD_APP_NAME} → ${APP_NAME}${NC}"
echo -e "${CYAN}  Bundle ID:  ${OLD_BUNDLE_ID} → ${BUNDLE_ID}${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# -----------------------------------------------------------------------------
# 1/3. App Identity (app.json + branding)
# -----------------------------------------------------------------------------
print_step "1/3 Updating app identity & branding..."

# app.json (name, slug, scheme, bundleIdentifier, package)
sedi "s/\"name\": \"${OLD_APP_NAME_RE}\"/\"name\": \"${APP_NAME_REPL}\"/g" "$APP_JSON"
sedi "s/${OLD_PREFIX_RE}-mobile/${NEW_PREFIX_REPL}-mobile/g" "$APP_JSON"
sedi "s/${OLD_BUNDLE_ID_RE}/${BUNDLE_ID_REPL}/g" "$APP_JSON"
print_success "$APP_JSON"

# i18n brand name
if [ -d "packages/i18n/src/locales" ]; then
  find packages/i18n/src/locales -name "*.json" | while IFS= read -r file; do
    if grep -qF "${OLD_APP_NAME}" "$file" 2>/dev/null; then
      sedi "s/${OLD_APP_NAME_RE}/${APP_NAME_REPL}/g" "$file"
    fi
    if grep -q "RoboPet" "$file" 2>/dev/null; then
      sedi "s/RoboPet/${APP_NAME_REPL}/g" "$file"
    fi
  done
  print_success "i18n locales"
fi

# Hardcoded UI strings (old app name / RoboPet)
UI_FILES=(
  "apps/webview/src/pages/profile/help/FaqPage.tsx"
  "apps/webview/src/pages/profile/help/GuidePage.tsx"
  "apps/webview/src/pages/profile/help/NoticePage.tsx"
  "apps/webview/src/pages/profile/app-info/AgreementPage.tsx"
  "apps/webview/src/pages/profile/app-info/CompanyPage.tsx"
  "apps/webview/src/app/routes.tsx"
  "apps/mobile/app/(tabs)/profile/app-info/about.tsx"
)

for file in "${UI_FILES[@]}"; do
  if [ -f "$file" ]; then
    if grep -qF "${OLD_APP_NAME}" "$file" 2>/dev/null; then
      sedi "s/${OLD_APP_NAME_RE}/${APP_NAME_REPL}/g" "$file"
    fi
    if grep -q "RoboPet" "$file" 2>/dev/null; then
      sedi "s/RoboPet/${APP_NAME_REPL}/g" "$file"
    fi
  fi
done
print_success "UI source files"

# -----------------------------------------------------------------------------
# 2/3. CI/CD & Deployment (app-name specific)
# -----------------------------------------------------------------------------
print_step "2/3 Updating CI/CD & deployment..."

# GitHub workflows
for workflow in .github/workflows/deploy.yml .github/workflows/deploy-webview.yml .github/workflows/deploy-mobile.yml .github/workflows/rotate-apple-secret.yml; do
  if [ -f "$workflow" ]; then
    sedi "s/${OLD_PREFIX_RE}-/${NEW_PREFIX_REPL}-/g" "$workflow"
    sedi "s/${OLD_BUNDLE_ID_RE}/${BUNDLE_ID_REPL}/g" "$workflow"
    print_success "$workflow"
  fi
done

# Infra (Oracle Cloud docker-compose)
DOCKER_COMPOSE="infra/oracle/docker-compose.yml"
if [ -f "$DOCKER_COMPOSE" ]; then
  sedi "s/${OLD_PREFIX_RE}-/${NEW_PREFIX_REPL}-/g" "$DOCKER_COMPOSE"
  print_success "$DOCKER_COMPOSE"
fi

# Auth service deep links
AUTH_SERVICE="apps/server/src/auth/auth.service.ts"
if [ -f "$AUTH_SERVICE" ]; then
  sedi "s/${OLD_PREFIX_RE}-mobile/${NEW_PREFIX_REPL}-mobile/g" "$AUTH_SERVICE"
  print_success "$AUTH_SERVICE"
fi

# -----------------------------------------------------------------------------
# 3/3. Documentation (app-name specific)
# -----------------------------------------------------------------------------
print_step "3/3 Updating documentation..."

if [ -f "README.md" ]; then
  sedi "s/${OLD_PREFIX_RE}-server/${NEW_PREFIX_REPL}-server/g" "README.md"
  print_success "README.md"
fi

# docs/archive holds pre-template historical documents — excluded on purpose
if [ -d "docs" ]; then
  find docs -path docs/archive -prune -o -name "*.md" -print | while IFS= read -r file; do
    if grep -qF "${OLD_APP_NAME}" "$file" 2>/dev/null; then
      sedi "s/${OLD_APP_NAME_RE}/${APP_NAME_REPL}/g" "$file"
    fi
    if grep -q "RoboPet" "$file" 2>/dev/null; then
      sedi "s/RoboPet/${APP_NAME_REPL}/g" "$file"
    fi
    if grep -q "${OLD_PREFIX_RE}-mobile" "$file" 2>/dev/null; then
      sedi "s/${OLD_PREFIX_RE}-mobile/${NEW_PREFIX_REPL}-mobile/g" "$file"
    fi
    if grep -q "${OLD_PREFIX_RE}-server" "$file" 2>/dev/null; then
      sedi "s/${OLD_PREFIX_RE}-server/${NEW_PREFIX_REPL}-server/g" "$file"
    fi
  done
  print_success "docs/**/*.md"
fi

# Cleanup stray sed backup files (defensive; sedi does not create them)
find . -name "*.bak" -type f -delete 2>/dev/null || true

echo ""
echo -e "${GREEN}✔ Rebranding complete: ${APP_NAME} (${BUNDLE_ID})${NC}"
echo ""
