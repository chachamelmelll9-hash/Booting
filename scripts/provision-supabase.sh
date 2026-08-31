#!/bin/bash
set -euo pipefail

# =============================================================================
# Supabase Provisioning Script (non-interactive)
# =============================================================================
# Fully automated — no interactive prompts. Defaults:
#   - Project: matches .env ref → existing project, else creates new
#   - Org: first org in account
#   - Name: repo directory name
#   - Region: ap-northeast-2
#
# Browser interactions (automatic, sequential):
#   1. CLI login   — `supabase login` opens browser for PAT (skip if logged in)
#   2. MCP OAuth   — Claude Code opens browser on first connect (skip if configured)
#
# Options:
#   --relogin  Force browser login even if already authenticated
#
# Usage:
#   bash scripts/provision-supabase.sh
#   bash scripts/provision-supabase.sh --relogin
# =============================================================================

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FORCE_RELOGIN=false

for arg in "$@"; do
  case $arg in
    --relogin) FORCE_RELOGIN=true ;;
  esac
done

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

print_step()    { echo -e "\n${YELLOW}▶ $1${NC}"; }
print_success() { echo -e "${GREEN}✔ $1${NC}"; }
print_error()   { echo -e "${RED}✘ $1${NC}"; }
print_info()    { echo -e "${CYAN}ℹ $1${NC}"; }

# Cross-platform sed -i
sedi() {
  if [[ "$OSTYPE" == darwin* ]]; then
    sed -i '' "$@"
  else
    sed -i "$@"
  fi
}

# =============================================================================
# Phase 0: Ensure Supabase CLI
# =============================================================================
if command -v supabase &>/dev/null; then
  : # already installed globally
elif command -v pnpm &>/dev/null; then
  print_info "Using supabase via pnpm dlx"
  supabase() { pnpm dlx supabase@latest "$@"; }
  export -f supabase
else
  print_error "pnpm required. Install pnpm first."
  exit 1
fi

# =============================================================================
# Phase 1: CLI Login (browser #1 — skip if already logged in)
# =============================================================================
print_step "Phase 1: CLI Authentication"

if [ "$FORCE_RELOGIN" = true ]; then
  print_info "Clearing existing credentials..."
  # macOS Keychain
  if command -v security &>/dev/null; then
    while security delete-generic-password -s "Supabase CLI" &>/dev/null; do :; done
  fi
  # File-based token
  rm -f "$HOME/.supabase/access-token" 2>/dev/null || true
  unset SUPABASE_ACCESS_TOKEN 2>/dev/null || true
  print_info "Opening browser for Supabase login..."
  supabase login
  if ! supabase projects list &>/dev/null 2>&1; then
    print_error "Login failed. Try again."
    exit 1
  fi
  print_success "CLI re-login complete"
elif supabase projects list &>/dev/null 2>&1; then
  print_success "Already logged in — skipping browser login"
else
  print_info "Opening browser for Supabase login..."
  supabase login
  # Verify login succeeded
  if ! supabase projects list &>/dev/null 2>&1; then
    print_error "Login failed. Try again."
    exit 1
  fi
  print_success "CLI login complete"
fi

# =============================================================================
# Phase 2: Project Setup (no browser)
# =============================================================================

# --- 2a. Select or create project ---
print_step "Phase 2: Project setup"

# Check if already provisioned via .mcp.json
PROJECT_REF=""
MCP_FILE="$REPO_ROOT/.mcp.json"

if [ -f "$MCP_FILE" ]; then
  PROJECT_REF=$(node -e "
    try {
      const c = require('$MCP_FILE');
      const url = c.mcpServers?.supabase?.url || '';
      const m = url.match(/project_ref=([^&]+)/);
      if (m) console.log(m[1]);
    } catch {}
  " 2>/dev/null || true)
fi

if [ -n "$PROJECT_REF" ]; then
  print_success "Using existing project: $PROJECT_REF"
else
  # Count existing projects
  PROJECTS_JSON=$(supabase projects list -o json 2>/dev/null || echo "[]")
  PROJECT_COUNT=$(echo "$PROJECTS_JSON" | node -e "process.stdin.on('data',d=>{console.log(JSON.parse(d).length)})" 2>/dev/null || echo "0")

  if [ "$PROJECT_COUNT" -eq 1 ]; then
    CANDIDATE_REF=$(echo "$PROJECTS_JSON" | node -e "process.stdin.on('data',d=>{const p=JSON.parse(d)[0]; console.log(p.id || p.ref || '')})" 2>/dev/null || echo "")
    # Check if this repo already has a project ref in .env
    ENV_REF=""
    for envfile in "$REPO_ROOT/apps/mobile/.env.development" "$REPO_ROOT/apps/server/.env.development"; do
      if [ -f "$envfile" ]; then
        ENV_REF=$(grep -oP '(?<=supabase\.co)' "$envfile" 2>/dev/null || true)
        ENV_REF=$(sed -n 's|.*https://\([a-z0-9]*\)\.supabase\.co.*|\1|p' "$envfile" | head -1)
        [ -n "$ENV_REF" ] && break
      fi
    done
    if [ -n "$ENV_REF" ] && [ "$ENV_REF" = "$CANDIDATE_REF" ]; then
      PROJECT_REF="$CANDIDATE_REF"
      print_success "Auto-selected matching project: $PROJECT_REF"
    else
      [ -z "$ENV_REF" ] && print_info "No existing project ref in .env — creating new project..." \
                        || print_info "Repo uses project '$ENV_REF' but account has '$CANDIDATE_REF' — creating new project..."
    fi
  elif [ "$PROJECT_COUNT" -gt 1 ]; then
    # Check if any existing project matches the .env ref
    ENV_REF=""
    for envfile in "$REPO_ROOT/apps/mobile/.env.development" "$REPO_ROOT/apps/server/.env.development"; do
      if [ -f "$envfile" ]; then
        ENV_REF=$(sed -n 's|.*https://\([a-z0-9]*\)\.supabase\.co.*|\1|p' "$envfile" | head -1)
        [ -n "$ENV_REF" ] && break
      fi
    done
    if [ -n "$ENV_REF" ]; then
      # Verify the env ref exists in the project list
      MATCH=$(echo "$PROJECTS_JSON" | node -e "process.stdin.on('data',d=>{const p=JSON.parse(d);const m=p.find(x=>(x.id||x.ref)==='$ENV_REF');console.log(m?'yes':'no')})" 2>/dev/null || echo "no")
      if [ "$MATCH" = "yes" ]; then
        PROJECT_REF="$ENV_REF"
        print_success "Auto-selected matching project: $PROJECT_REF"
      else
        print_info "Repo ref '$ENV_REF' not found in account — creating new project..."
      fi
    else
      print_info "No existing project ref in .env — creating new project..."
    fi
  else
    echo ""
    echo "  No projects found. Creating a new one."
  fi

  if [ -z "$PROJECT_REF" ]; then
    # Get org
    ORG_JSON=$(supabase orgs list -o json 2>/dev/null || echo "[]")
    ORG_COUNT=$(echo "$ORG_JSON" | node -e "process.stdin.on('data',d=>{console.log(JSON.parse(d).length)})" 2>/dev/null || echo "0")

    if [ "$ORG_COUNT" -eq 0 ]; then
      print_error "No orgs found. Create one at https://supabase.com/dashboard"
      exit 1
    elif [ "$ORG_COUNT" -eq 1 ]; then
      ORG_ID=$(echo "$ORG_JSON" | node -e "process.stdin.on('data',d=>{console.log(JSON.parse(d)[0].id)})" 2>/dev/null)
    else
      # Auto-select first org
      ORG_ID=$(echo "$ORG_JSON" | node -e "process.stdin.on('data',d=>{console.log(JSON.parse(d)[0].id)})" 2>/dev/null)
      print_info "Multiple orgs found — auto-selected first: $ORG_ID"
    fi

    PROJECT_NAME=$(basename "$REPO_ROOT")
    REGION="ap-northeast-2"

    DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)

    print_info "Creating project '$PROJECT_NAME'..."
    PROJECT_JSON=$(supabase projects create "$PROJECT_NAME" \
      --org-id "$ORG_ID" \
      --region "$REGION" \
      --db-password "$DB_PASSWORD" \
      -o json 2>/dev/null)

    PROJECT_REF=$(echo "$PROJECT_JSON" | node -e "
      process.stdin.on('data', d => {
        try { const p = JSON.parse(d); console.log(p.id || p.reference_id || ''); }
        catch { console.log(''); }
      });
    " 2>/dev/null || echo "")

    if [ -z "$PROJECT_REF" ]; then
      print_error "Failed to create project."
      echo "$PROJECT_JSON"
      exit 1
    fi

    print_info "Waiting for project to be ready..."
    for i in $(seq 1 30); do
      STATUS=$(supabase projects api-keys --project-ref "$PROJECT_REF" -o json 2>/dev/null || echo "")
      if [ -n "$STATUS" ] && [ "$STATUS" != "[]" ]; then
        print_success "Project is ready"
        break
      fi
      [ "$i" -eq 30 ] && { print_error "Timed out."; exit 1; }
      printf "."
      sleep 10
    done
  fi
fi

SUPABASE_URL="https://${PROJECT_REF}.supabase.co"
print_success "Project: $PROJECT_REF ($SUPABASE_URL)"

# --- 2b. Retrieve API keys ---
print_step "Retrieving API keys..."

KEYS_JSON=$(supabase projects api-keys --project-ref "$PROJECT_REF" -o json 2>/dev/null || echo "[]")

# JWT keys only — Management API keys (sb_publishable_*, sb_secret_*) are NOT needed;
# the ACCESS_TOKEN (PAT) already handles Management API calls in this script.
eval "$(echo "$KEYS_JSON" | node -e "
  let buf = '';
  process.stdin.on('data', c => buf += c);
  process.stdin.on('end', () => {
    const keys = JSON.parse(buf);
    const anon = keys.find(k => k.name === 'anon');
    const sr   = keys.find(k => k.name === 'service_role');
    console.log('SUPABASE_ANON_KEY=' + JSON.stringify(anon ? anon.api_key : ''));
    console.log('SUPABASE_SERVICE_ROLE_KEY=' + JSON.stringify(sr ? sr.api_key : ''));
  });
" 2>/dev/null)"

[ -n "$SUPABASE_ANON_KEY" ] && print_success "Anon key (JWT): ${SUPABASE_ANON_KEY:0:25}..." || print_error "No anon key found"
[ -n "$SUPABASE_SERVICE_ROLE_KEY" ] && print_success "Service role key (JWT): ${SUPABASE_SERVICE_ROLE_KEY:0:15}..." || print_error "No service_role key found"

# --- 2c. Link project ---
print_step "Linking project..."
cd "$REPO_ROOT"
LINK_ARGS=(--project-ref "$PROJECT_REF")
[ -n "${DB_PASSWORD:-}" ] && LINK_ARGS+=(--password "$DB_PASSWORD")
if supabase link "${LINK_ARGS[@]}"; then
  print_success "Project linked"
else
  print_error "supabase link failed — CLI migrations (db diff/push) will not work."
  echo "  Retry manually: pnpm dlx supabase link --project-ref $PROJECT_REF"
  exit 1
fi

# --- 2d. Disable email confirmation (dev convenience — auto-confirm signups) ---
# NOTE: dev and prod share this Supabase project unless you create a separate
# prod project. Re-enable email confirmation before production launch:
# Dashboard → Authentication → Sign In / Up → Email → "Confirm email".
print_step "Disabling email confirmation (dev only)..."

ACCESS_TOKEN=""
if [ -f "$HOME/.supabase/access-token" ]; then
  ACCESS_TOKEN=$(cat "$HOME/.supabase/access-token" 2>/dev/null || true)
fi
# macOS Keychain fallback — decode go-keyring-base64: prefix
if [ -z "$ACCESS_TOKEN" ] && command -v security &>/dev/null; then
  RAW_TOKEN=$(security find-generic-password -s "Supabase CLI" -a "supabase" -w 2>/dev/null || true)
  if [ -n "$RAW_TOKEN" ]; then
    ACCESS_TOKEN=$(echo "$RAW_TOKEN" | sed 's/^go-keyring-base64://' | base64 -d 2>/dev/null || echo "$RAW_TOKEN")
  fi
fi

if [ -n "$ACCESS_TOKEN" ]; then
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X PATCH "https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"mailer_autoconfirm": true}')
  if [ "$HTTP_STATUS" = "200" ]; then
    print_success "Email confirmation disabled (auto-confirm enabled)"
    print_info "Dev convenience only — re-enable email confirmation before production launch"
  else
    print_error "Failed to update auth config (HTTP $HTTP_STATUS) — disable manually in Dashboard"
  fi
else
  print_error "No access token found — disable email confirmation manually in Dashboard"
fi

# --- 2e. Update .env files ---
print_step "Updating .env files..."

MOBILE_ENV="$REPO_ROOT/apps/mobile/.env.development"
if [ -f "$MOBILE_ENV" ]; then
  sedi "s|^EXPO_PUBLIC_SUPABASE_URL=.*|EXPO_PUBLIC_SUPABASE_URL=$SUPABASE_URL|" "$MOBILE_ENV"
  sedi "s|^EXPO_PUBLIC_SUPABASE_KEY=.*|EXPO_PUBLIC_SUPABASE_KEY=$SUPABASE_ANON_KEY|" "$MOBILE_ENV"
  print_success "Updated $MOBILE_ENV"
fi

WEBVIEW_ENV="$REPO_ROOT/apps/webview/.env.development"
if [ -f "$WEBVIEW_ENV" ]; then
  sedi "s|^VITE_SUPABASE_URL=.*|VITE_SUPABASE_URL=$SUPABASE_URL|" "$WEBVIEW_ENV"
  sedi "s|^VITE_SUPABASE_KEY=.*|VITE_SUPABASE_KEY=$SUPABASE_ANON_KEY|" "$WEBVIEW_ENV"
  print_success "Updated $WEBVIEW_ENV"
fi

SERVER_ENV="$REPO_ROOT/apps/server/.env.development"
if [ -f "$SERVER_ENV" ]; then
  sedi "s|^SUPABASE_URL=.*|SUPABASE_URL=$SUPABASE_URL|" "$SERVER_ENV"
  [ -n "$SUPABASE_SERVICE_ROLE_KEY" ] && sedi "s|^SUPABASE_SECRET_KEY=.*|SUPABASE_SECRET_KEY=$SUPABASE_SERVICE_ROLE_KEY|" "$SERVER_ENV"
  # Server now fails fast if SUPABASE_ANON_KEY is unset (AuthGuard bootstrap).
  [ -n "$SUPABASE_ANON_KEY" ] && sedi "s|^SUPABASE_ANON_KEY=.*|SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY|" "$SERVER_ENV"
  print_success "Updated $SERVER_ENV"
fi

# Preserve the generated DB password — Supabase never shows it again.
if [ -n "${DB_PASSWORD:-}" ] && [ -f "$SERVER_ENV" ]; then
  if grep -q '^# SUPABASE_DB_PASSWORD=' "$SERVER_ENV"; then
    sedi "s|^# SUPABASE_DB_PASSWORD=.*|# SUPABASE_DB_PASSWORD=$DB_PASSWORD|" "$SERVER_ENV"
  else
    printf '\n# SUPABASE_DB_PASSWORD=%s  (generated by provision-supabase.sh — move to a password manager)\n' "$DB_PASSWORD" >> "$SERVER_ENV"
  fi
  print_success "DB password saved as comment in $SERVER_ENV (gitignored)"
fi

# =============================================================================
# Phase 3: MCP OAuth Setup (browser #2 — skip if already configured)
# =============================================================================
print_step "Phase 3: MCP connection"

MCP_URL="https://mcp.supabase.com/mcp?project_ref=${PROJECT_REF}&read_only=false"

# Check if .mcp.json already has correct OAuth config
EXISTING_MCP_URL=""
if [ -f "$MCP_FILE" ]; then
  EXISTING_MCP_URL=$(node -e "
    try {
      const c = require('$MCP_FILE');
      console.log(c.mcpServers?.supabase?.url || '');
    } catch {}
  " 2>/dev/null || true)
fi

if [ "$EXISTING_MCP_URL" = "$MCP_URL" ]; then
  print_success "MCP already configured"
else
  cat > "$MCP_FILE" <<MCPEOF
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "${MCP_URL}"
    }
  }
}
MCPEOF
  print_success ".mcp.json created (OAuth mode)"
fi

# =============================================================================
# Summary
# =============================================================================
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Supabase Provisioning Complete${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Project:  $PROJECT_REF"
echo "  URL:      $SUPABASE_URL"
echo "  MCP:      .mcp.json (OAuth)"
if [ -n "${DB_PASSWORD:-}" ]; then
  echo "  DB PW:    saved as comment in apps/server/.env.development — move to a password manager"
fi
echo ""
echo -e "${YELLOW}  [Production 주의]${NC}"
echo "  - 이 프로젝트는 dev/prod가 동일한 Supabase 프로젝트를 공유합니다."
echo "    프로덕션은 별도 Supabase 프로젝트 사용을 권장합니다."
echo "  - 이메일 확인(auto-confirm)이 dev 편의를 위해 비활성화되어 있습니다."
echo "    출시 전 Dashboard → Authentication 에서 Confirm email을 재활성화하세요."
echo "  - 서버 AuthGuard는 JWKS로 JWT를 검증하므로, 프로젝트가 비대칭 서명 키(ES256/RS256)를"
echo "    사용해야 합니다. Dashboard → Authentication → JWT Keys 에서 비대칭 키로 전환하세요"
echo "    (대칭 HS256 legacy secret만 있으면 AuthGuard가 토큰을 검증하지 못합니다)."
echo ""
echo -e "${YELLOW}  [Next Step] Supabase MCP 활성화:${NC}"
echo "  1. Claude Code를 재시작하거나 /mcp 명령어 실행"
echo "  2. 브라우저가 열리면 Supabase OAuth 인증 진행"
echo "  3. 인증 완료 후 Claude Code에서 Supabase MCP 사용 가능"
echo ""
