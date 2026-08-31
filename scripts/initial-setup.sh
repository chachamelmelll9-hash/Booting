#!/bin/bash
set -euo pipefail

# =============================================================================
# Shippen — Initial Setup
# Single purpose: org scope replacement + dependency installation + env files
# App branding (name, bundle ID) is handled separately by branding.sh
# =============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}  $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_step() { echo -e "\n${YELLOW}▶ $1${NC}"; }
print_success() { echo -e "${GREEN}✔ $1${NC}"; }
print_error() { echo -e "${RED}✖ $1${NC}"; }
print_info() { echo -e "${CYAN}ℹ $1${NC}"; }

# Cross-platform sed -i
sedi() {
  if [[ "$OSTYPE" == darwin* ]]; then
    sed -i '' "$@"
  else
    sed -i "$@"
  fi
}

# Escape helpers so replacement strings are safe inside sed expressions
escape_sed_pattern() { printf '%s' "$1" | sed 's/[][\.*^$/]/\\&/g'; }
escape_sed_replacement() { printf '%s' "$1" | sed 's/[\/&]/\\&/g'; }

# =============================================================================
# Welcome
# =============================================================================
clear
print_header "Shippen — Initial Setup"
echo ""
echo "  This script sets up the org scope and installs dependencies."
echo "  App name/branding is handled separately by branding.sh"
echo ""

# =============================================================================
# Prerequisites (auto-install if missing)
# =============================================================================
print_step "Checking prerequisites..."

ensure_node() {
  if command -v node &> /dev/null; then
    print_success "node found ($(node -v))"
    return 0
  fi

  print_info "Installing Node.js LTS..."
  local OS ARCH EXT TAR_FLAG
  case "$(uname -s)" in
    Darwin) OS="darwin" ;;
    Linux)  OS="linux" ;;
    MINGW*|MSYS*|CYGWIN*)
      print_error "Windows detected. Please install Node.js manually: https://nodejs.org"
      exit 1 ;;
    *)
      print_error "Unsupported OS: $(uname -s). Please install Node.js manually: https://nodejs.org"
      exit 1 ;;
  esac

  case "$(uname -m)" in
    x86_64|amd64) ARCH="x64" ;;
    arm64|aarch64) ARCH="arm64" ;;
    *)
      print_error "Unsupported architecture: $(uname -m)"
      exit 1 ;;
  esac

  if [ "$OS" = "darwin" ]; then EXT="tar.gz"; TAR_FLAG="z"; else EXT="tar.xz"; TAR_FLAG="J"; fi

  local LTS_VERSION
  LTS_VERSION=$(curl -fsSL https://nodejs.org/dist/index.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for r in data:
    if r.get('lts'):
        print(r['version']); break
" || true)

  if [ -z "$LTS_VERSION" ]; then
    print_error "Failed to determine Node.js LTS version."
    exit 1
  fi

  print_info "Node.js ${LTS_VERSION} will be installed into /usr/local — this requires sudo."
  if [ ! -t 0 ]; then
    print_error "Cannot prompt for a sudo password in a non-interactive shell."
    print_info "Install Node.js LTS manually (https://nodejs.org or 'brew install node'), then re-run this script."
    exit 1
  fi
  if ! sudo -v; then
    print_error "sudo authentication failed."
    print_info "Install Node.js LTS manually (https://nodejs.org or 'brew install node'), then re-run this script."
    exit 1
  fi

  print_info "Downloading Node.js ${LTS_VERSION}..."
  local URL="https://nodejs.org/dist/${LTS_VERSION}/node-${LTS_VERSION}-${OS}-${ARCH}.${EXT}"
  curl -fsSL "$URL" | sudo tar -x${TAR_FLAG} -C /usr/local --strip-components=1

  if command -v node &> /dev/null; then
    print_success "node installed ($(node -v))"
  else
    print_error "Node.js installation failed."
    exit 1
  fi
}

ensure_pnpm() {
  if command -v pnpm &> /dev/null; then
    print_success "pnpm found ($(pnpm -v))"
    return 0
  fi

  print_info "Installing pnpm..."
  if command -v corepack &> /dev/null; then
    corepack enable && corepack prepare pnpm@latest --activate 2>/dev/null
  fi
  if ! command -v pnpm &> /dev/null; then
    npm install -g pnpm
  fi

  if command -v pnpm &> /dev/null; then
    print_success "pnpm installed ($(pnpm -v))"
  else
    print_error "pnpm installation failed."
    exit 1
  fi
}

ensure_node
ensure_pnpm

# =============================================================================
# Parse CLI arguments
# =============================================================================
CLI_ORG=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --org) CLI_ORG="${2:?--org requires a value}"; shift 2 ;;
    *) shift ;;
  esac
done

# =============================================================================
# Collect org input
# =============================================================================
if [ -n "$CLI_ORG" ]; then
  ORG_NAME="$CLI_ORG"
  ORG_NAME_LOWER=$(echo "$ORG_NAME" | tr '[:upper:]' '[:lower:]' | tr -d ' ')

  print_header "Settings"
  echo ""
  echo "  Organization:   $ORG_NAME_LOWER"
  echo "  NPM Scope:      @${ORG_NAME_LOWER}-service"
  echo ""
else
  print_header "Organization"
  echo ""
  echo -e "${CYAN}Organization / Company Name${NC}"
  echo "   Used in package names. Use lowercase letters only."
  echo "   Example: mycompany, acme, johndoe"
  read -p "   Organization Name: " ORG_NAME

  if [ -z "$ORG_NAME" ]; then
    print_error "Organization name is required."
    exit 1
  fi

  ORG_NAME_LOWER=$(echo "$ORG_NAME" | tr '[:upper:]' '[:lower:]' | tr -d ' ')

  print_header "Confirm Settings"
  echo ""
  echo "  Organization:   $ORG_NAME_LOWER"
  echo "  NPM Scope:      @${ORG_NAME_LOWER}-service"
  echo ""
  read -p "Proceed? (Y/n): " CONFIRM
  CONFIRM="${CONFIRM:-Y}"
  if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
  fi
fi

# =============================================================================
# Execute: NPM Scope Replacement
# =============================================================================
print_header "Updating Files..."

# The current scope is read from the root package.json (source of truth),
# so re-running this script after a previous setup still works.
CURRENT_ORG=""
if [ -f "package.json" ]; then
  CURRENT_ORG=$(node -e "const m=(require('./package.json').name||'').match(/^@([^/]+)\//); process.stdout.write(m?m[1]:'')" 2>/dev/null || true)
fi
OLD_ORG="${CURRENT_ORG:-myorg-service}"
PLACEHOLDER_ORG="myorg-service"
NEW_ORG="${ORG_NAME_LOWER}-service"

# Files/dirs never touched by scope replacement:
# - initial-setup.sh: this running script (contains the placeholder as a fallback)
# - SKILL.md: skill instruction docs describe the replacement itself
SCOPE_GREP_ARGS=(-rIlF --exclude-dir=node_modules --exclude-dir=.git --exclude=initial-setup.sh --exclude=SKILL.md)

# Replaces @$1 with @$2 in every text file of the repo (covers package.json,
# tsconfig, jest.preset.js moduleNameMapper, apps/server-e2e/jest.config.js
# displayName, .github/workflows/*.yml turbo --filter args, source imports,
# .claude/agents/*.md, apps/mobile-e2e/README.md, docs, pnpm-lock.yaml, ...).
REPLACED_COUNT=0
replace_scope() {
  local old="$1" new="$2"
  local old_re new_re file
  REPLACED_COUNT=0
  old_re=$(escape_sed_pattern "@${old}")
  new_re=$(escape_sed_replacement "@${new}")
  while IFS= read -r file; do
    sedi "s/${old_re}/${new_re}/g" "$file"
    print_success "${file#./}"
    REPLACED_COUNT=$((REPLACED_COUNT + 1))
  done < <(grep "${SCOPE_GREP_ARGS[@]}" "@${old}" . 2>/dev/null || true)
}

print_step "Replacing NPM scope (@${OLD_ORG} → @${NEW_ORG})..."

TOTAL_REPLACED=0
if [ "$OLD_ORG" != "$NEW_ORG" ]; then
  replace_scope "$OLD_ORG" "$NEW_ORG"
  TOTAL_REPLACED=$REPLACED_COUNT
else
  print_info "Root package.json already uses @${NEW_ORG}; skipping primary scope replacement"
fi

# Catch boilerplate placeholders that may remain in docs/agents even when the
# root package.json scope was already replaced by a previous run.
if [ "$PLACEHOLDER_ORG" != "$OLD_ORG" ] && [ "$PLACEHOLDER_ORG" != "$NEW_ORG" ]; then
  replace_scope "$PLACEHOLDER_ORG" "$NEW_ORG"
  TOTAL_REPLACED=$((TOTAL_REPLACED + REPLACED_COUNT))
fi

if [ "$TOTAL_REPLACED" -eq 0 ]; then
  print_info "No files contained the old scope — nothing to replace"
fi

# Verification gate: the old scope must not survive anywhere.
print_step "Verifying scope replacement..."

verify_scope_gone() {
  local scope="$1" leftover
  leftover=$(grep "${SCOPE_GREP_ARGS[@]}" "@${scope}" . 2>/dev/null || true)
  if [ -n "$leftover" ]; then
    print_error "Old scope @${scope} still present in:"
    echo "$leftover" | sed 's/^/    /'
    return 1
  fi
  return 0
}

SCOPE_OK=true
if [ "$OLD_ORG" != "$NEW_ORG" ]; then
  verify_scope_gone "$OLD_ORG" || SCOPE_OK=false
fi
if [ "$PLACEHOLDER_ORG" != "$NEW_ORG" ]; then
  verify_scope_gone "$PLACEHOLDER_ORG" || SCOPE_OK=false
fi

if [ "$SCOPE_OK" = true ]; then
  print_success "No old scope references remain"
else
  print_error "Scope replacement is incomplete. Fix the files above and re-run."
  exit 1
fi

# CI/CD GitHub org path references (placeholder-based boilerplate values)
for workflow in .github/workflows/deploy.yml .github/workflows/deploy-webview.yml .github/workflows/deploy-mobile.yml .github/workflows/rotate-apple-secret.yml; do
  if [ -f "$workflow" ] && grep -q "myorg/" "$workflow" 2>/dev/null; then
    sedi "s/myorg\//${ORG_NAME_LOWER}\//g" "$workflow"
    print_success "$workflow"
  fi
done

DOCKER_COMPOSE="infra/oracle/docker-compose.yml"
if [ -f "$DOCKER_COMPOSE" ] && grep -q "myorg/" "$DOCKER_COMPOSE" 2>/dev/null; then
  sedi "s/myorg\//${ORG_NAME_LOWER}\//g" "$DOCKER_COMPOSE"
  print_success "$DOCKER_COMPOSE"
fi

if [ -d "docs" ]; then
  find docs -name "*.md" | while IFS= read -r file; do
    if grep -q "myorg/" "$file" 2>/dev/null; then
      sedi "s/myorg\//${ORG_NAME_LOWER}\//g" "$file"
    fi
  done
fi

if [ -f "shippen-license.json" ]; then
  print_info "Preserved shippen-license.json"
fi

# =============================================================================
# Create required directories & reset progress logs
# =============================================================================
mkdir -p docs/features

print_step "Resetting progress logs..."
mkdir -p docs/progress
for progress_log in pipeline.jsonl features.jsonl deploys.jsonl; do
  : > "docs/progress/${progress_log}"
done
print_success "docs/progress/{pipeline,features,deploys}.jsonl reset"

# =============================================================================
# Install Dependencies
# =============================================================================
print_header "Installing Dependencies..."
pnpm install
print_success "Dependencies installed"

# =============================================================================
# Normalize import order after the scope rename
# =============================================================================
# simple-import-sort orders imports alphabetically by the literal specifier, so
# renaming the scope (@myorg-service -> @<org>-service) can invalidate the order
# that was correct in the template. Measured: an org sorting before "features"
# or after "shared" produces lint errors in 3 mobile files, which husky's
# pre-commit gate then turns into "every commit is blocked".
# Re-sorting here keeps a freshly generated project lint-clean from commit one.
print_step "Normalizing import order for the new scope..."
NORMALIZED_OK=true
for lint_app in apps/mobile apps/server apps/webview; do
  [ -d "$lint_app/src" ] || continue
  if (cd "$lint_app" && pnpm exec eslint src --fix --quiet >/dev/null 2>&1); then
    print_success "${lint_app} import order normalized"
  else
    print_info "${lint_app}: eslint --fix reported remaining problems (run 'pnpm lint' to inspect)"
    NORMALIZED_OK=false
  fi
done
[ "$NORMALIZED_OK" = true ] || print_info "Setup continues; the remaining lint problems are unrelated to the scope rename"

# =============================================================================
# Copy environment files
# =============================================================================
print_step "Setting up environment files..."

for env_pair in \
  "apps/mobile/.env.example:apps/mobile/.env.development" \
  "apps/server/.env.example:apps/server/.env.development" \
  "apps/webview/.env.example:apps/webview/.env.development"; do
  SRC="${env_pair%%:*}"
  DST="${env_pair##*:}"
  if [ -f "$SRC" ] && [ ! -f "$DST" ]; then
    cp "$SRC" "$DST"
    print_success "$DST"
  elif [ -f "$DST" ]; then
    print_info "$DST already exists, skipped"
  fi
done

# Set default URLs for Android emulator
MOBILE_ENV="apps/mobile/.env.development"
if [ -f "$MOBILE_ENV" ]; then
  if grep -q "^EXPO_PUBLIC_SERVER_URL=$" "$MOBILE_ENV"; then
    sedi "s|^EXPO_PUBLIC_SERVER_URL=.*|EXPO_PUBLIC_SERVER_URL=http://10.0.2.2:3000/api|" "$MOBILE_ENV"
    print_success "Set EXPO_PUBLIC_SERVER_URL=http://10.0.2.2:3000/api (Android emulator)"
  fi
  if grep -q "^EXPO_PUBLIC_WEBVIEW_URL=$" "$MOBILE_ENV"; then
    sedi "s|^EXPO_PUBLIC_WEBVIEW_URL=.*|EXPO_PUBLIC_WEBVIEW_URL=http://10.0.2.2:4200|" "$MOBILE_ENV"
    print_success "Set EXPO_PUBLIC_WEBVIEW_URL=http://10.0.2.2:4200 (Android emulator)"
  fi
fi

# =============================================================================
# Ensure ANDROID_HOME
# =============================================================================
print_step "Checking Android SDK..."

ensure_android_home() {
  # Already set and valid
  if [ -n "${ANDROID_HOME:-}" ] && [ -d "${ANDROID_HOME:-}" ]; then
    print_success "ANDROID_HOME=$ANDROID_HOME"
    return 0
  fi
  if [ -n "${ANDROID_SDK_ROOT:-}" ] && [ -d "${ANDROID_SDK_ROOT:-}" ]; then
    export ANDROID_HOME="$ANDROID_SDK_ROOT"
    print_success "ANDROID_HOME=$ANDROID_HOME (from ANDROID_SDK_ROOT)"
  else
    # Auto-detect from known paths
    local SDK_PATH=""
    if [[ "$OSTYPE" == "darwin"* ]] && [ -d "$HOME/Library/Android/sdk" ]; then
      SDK_PATH="$HOME/Library/Android/sdk"
    elif [[ "$OSTYPE" == "linux"* ]] && [ -d "$HOME/Android/Sdk" ]; then
      SDK_PATH="$HOME/Android/Sdk"
    fi

    if [ -z "$SDK_PATH" ]; then
      print_error "Android SDK not found. Install Android Studio or set ANDROID_HOME."
      return 1
    fi

    export ANDROID_HOME="$SDK_PATH"
    print_success "Detected ANDROID_HOME=$ANDROID_HOME"
  fi

  # Persist to shell profile
  local SHELL_RC=""
  if [ -f "$HOME/.zshrc" ]; then
    SHELL_RC="$HOME/.zshrc"
  elif [ -f "$HOME/.bashrc" ]; then
    SHELL_RC="$HOME/.bashrc"
  elif [ -f "$HOME/.bash_profile" ]; then
    SHELL_RC="$HOME/.bash_profile"
  fi

  if [ -n "$SHELL_RC" ]; then
    if ! grep -q "export ANDROID_HOME=" "$SHELL_RC" 2>/dev/null; then
      echo "" >> "$SHELL_RC"
      echo "# Android SDK (added by shippen setup)" >> "$SHELL_RC"
      echo "export ANDROID_HOME=\"$ANDROID_HOME\"" >> "$SHELL_RC"
      echo 'export PATH="$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools"' >> "$SHELL_RC"
      print_success "Added ANDROID_HOME to $SHELL_RC"
    else
      print_info "ANDROID_HOME already in $SHELL_RC"
    fi
  fi
}

ensure_android_home

# Check adb availability
if [ -n "${ANDROID_HOME:-}" ] && [ -d "${ANDROID_HOME:-}" ]; then
  if [ -x "$ANDROID_HOME/platform-tools/adb" ]; then
    print_success "adb found ($ANDROID_HOME/platform-tools/adb)"
  else
    print_error "adb not found. Install platform-tools in Android Studio:"
    echo "         Android Studio → Settings → SDK Manager → SDK Tools → Android SDK Platform-Tools"
  fi
fi

# =============================================================================
# Cleanup
# =============================================================================
print_step "Cleaning up temporary files..."
find . -name "*.bak" -type f -delete 2>/dev/null || true
find . -name "*''" -type f -delete 2>/dev/null || true

# =============================================================================
# Complete
# =============================================================================
print_header "Initial Setup Complete!"
echo ""
echo "  Organization:   $ORG_NAME_LOWER"
echo "  NPM Scope:      @${NEW_ORG}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  ${CYAN}/setup${NC}  — Supabase, Kakao, build, emulator"
echo -e "  ${CYAN}/start${NC}  — App name, branding, feature planning"
echo ""
