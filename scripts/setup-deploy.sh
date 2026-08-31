#!/bin/bash
set -euo pipefail

# =============================================================================
# Deploy Setup Script (Oracle Cloud + Cloudflare + Supabase)
# =============================================================================
# Orchestrates the full deploy infrastructure provisioning.
# Guides through account signup, then runs automated provisioning scripts.

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Colors
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

print_step()    { echo -e "\n${YELLOW}▶ $1${NC}"; }
print_success() { echo -e "${GREEN}✔ $1${NC}"; }
print_info()    { echo -e "${CYAN}ℹ $1${NC}"; }
print_error()   { echo -e "${RED}✘ $1${NC}"; }

# Local deploy state written by provision-oracle.sh (gitignored)
STATE_FILE="$REPO_ROOT/infra/oracle/.deploy-state"

read_state() {
  # read_state <KEY> — prints the value from .deploy-state, empty if missing
  [ -f "$STATE_FILE" ] || return 0
  sed -n "s/^$1=//p" "$STATE_FILE" | head -1
}

# =============================================================================
# Step 1: Oracle Cloud — Signup + API Key
# =============================================================================
print_header "Step 1/3: Oracle Cloud Setup"
echo ""
echo "  Oracle Cloud hosts your NestJS server (Free Tier)."
echo ""

# Check if OCI CLI is already configured
if command -v oci &>/dev/null && oci iam region list &>/dev/null 2>&1; then
  print_success "OCI CLI already configured"
else
  echo -e "${CYAN}  Prerequisites (one-time, via web console):${NC}"
  echo ""
  echo "  1. Sign up at https://cloud.oracle.com"
  echo "     Free Tier: 2 AMD VMs (1/8 OCPU, 1GB RAM each)"
  echo ""
  echo "  2. Install OCI CLI:"
  echo "     brew install oci-cli        # macOS"
  echo "     pip install oci-cli          # pip"
  echo ""
  echo "  3. Configure OCI CLI:"
  echo "     oci setup config"
  echo ""
  echo "  4. Add API Key in Oracle Console:"
  echo "     Profile → API Keys → Add API Key → Paste public key"
  echo ""
  read -rp "  Press Enter when OCI CLI is configured (or Ctrl+C to exit)..."
fi

print_step "Running Oracle VM provisioning..."
bash "$REPO_ROOT/scripts/provision-oracle.sh"

# Read VM connection info from the state file provision-oracle.sh just wrote.
# GitHub secrets are write-only — they are checked for existence only.
ORACLE_HOST=$(read_state ORACLE_HOST)
ORACLE_SSH_KEY_PATH=$(read_state SSH_KEY_PATH)

if [ -n "$ORACLE_HOST" ]; then
  print_success "Oracle VM IP (from .deploy-state): $ORACLE_HOST"
else
  print_error "No Oracle VM IP in $STATE_FILE — provision-oracle.sh may have failed"
fi
if command -v gh &>/dev/null && gh secret list 2>/dev/null | grep -q ORACLE_HOST; then
  print_success "GitHub secret ORACLE_HOST is set"
fi
export ORACLE_HOST

# =============================================================================
# Step 2: Cloudflare — Signup + API Token
# =============================================================================
print_header "Step 2/3: Cloudflare Setup"
echo ""
echo "  Cloudflare handles domain, DNS, CDN, and WebView hosting (Pages)."
echo ""

if [ -n "${CLOUDFLARE_API_TOKEN:-}" ]; then
  print_success "CLOUDFLARE_API_TOKEN found in environment"
else
  echo -e "${CYAN}  Prerequisites (one-time, via web console):${NC}"
  echo ""
  echo "  1. Sign up at https://dash.cloudflare.com/sign-up"
  echo ""
  echo "  2. Register or transfer your domain"
  echo "     Domain Registration → Register Domains"
  echo ""
  echo "  3. Create an API Token:"
  echo "     My Profile → API Tokens → Create Token"
  echo "     Template: 'Edit zone DNS' + add 'Cloudflare Pages: Edit'"
  echo ""
  read -rp "  Press Enter when you have your API Token ready..."
fi

print_step "Running Cloudflare provisioning..."
bash "$REPO_ROOT/scripts/provision-cloudflare.sh"

# =============================================================================
# Step 3: Supabase Deploy Secrets (GitHub + Oracle VM)
# =============================================================================
print_header "Step 3/3: Supabase Deploy Secrets"
echo ""

# provision-supabase.sh should have already run during implement phase.
# Read values from local .env files and push to GitHub Secrets + Oracle VM.

SUPABASE_URL=$(grep 'EXPO_PUBLIC_SUPABASE_URL=' "$REPO_ROOT/apps/mobile/.env.development" 2>/dev/null | cut -d= -f2- || true)
SUPABASE_ANON_KEY=$(grep 'EXPO_PUBLIC_SUPABASE_KEY=' "$REPO_ROOT/apps/mobile/.env.development" 2>/dev/null | cut -d= -f2- || true)
SUPABASE_SECRET_KEY=$(grep 'SUPABASE_SECRET_KEY=' "$REPO_ROOT/apps/server/.env.development" 2>/dev/null | cut -d= -f2- || true)

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
  print_info "Supabase credentials not found in local .env. Running provision-supabase.sh..."
  bash "$REPO_ROOT/scripts/provision-supabase.sh"
  # Re-read after provisioning
  SUPABASE_URL=$(grep 'EXPO_PUBLIC_SUPABASE_URL=' "$REPO_ROOT/apps/mobile/.env.development" 2>/dev/null | cut -d= -f2- || true)
  SUPABASE_ANON_KEY=$(grep 'EXPO_PUBLIC_SUPABASE_KEY=' "$REPO_ROOT/apps/mobile/.env.development" 2>/dev/null | cut -d= -f2- || true)
  SUPABASE_SECRET_KEY=$(grep 'SUPABASE_SECRET_KEY=' "$REPO_ROOT/apps/server/.env.development" 2>/dev/null | cut -d= -f2- || true)
fi

if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_ANON_KEY" ]; then
  print_success "Supabase URL: $SUPABASE_URL"

  # GitHub Secrets
  if command -v gh &>/dev/null; then
    gh secret set SUPABASE_URL --body "$SUPABASE_URL"
    gh secret set SUPABASE_ANON_KEY --body "$SUPABASE_ANON_KEY"
    gh secret set VITE_SUPABASE_URL --body "$SUPABASE_URL"
    gh secret set VITE_SUPABASE_KEY --body "$SUPABASE_ANON_KEY"
    [ -n "$SUPABASE_SECRET_KEY" ] && gh secret set SUPABASE_SECRET_KEY --body "$SUPABASE_SECRET_KEY"
    print_success "GitHub secrets set: Supabase URL + keys"
  fi

  # Oracle VM .env
  ORACLE_HOST="${ORACLE_HOST:-$(read_state ORACLE_HOST)}"
  ORACLE_SSH_KEY_PATH="${ORACLE_SSH_KEY_PATH:-$(read_state SSH_KEY_PATH)}"
  if [ -n "$ORACLE_HOST" ]; then
    APP_SLUG=$(node -e "const c=require('$REPO_ROOT/apps/mobile/app.json').expo; console.log(c.slug.replace(/-mobile$/,''))" 2>/dev/null || echo "myapp")
    if [ -z "$ORACLE_SSH_KEY_PATH" ] || [ ! -f "$ORACLE_SSH_KEY_PATH" ]; then
      for key in "$HOME/.ssh/oracle_${APP_SLUG}" "$HOME/.ssh/id_ed25519" "$HOME/.ssh/id_rsa"; do
        [ -f "$key" ] && ORACLE_SSH_KEY_PATH="$key" && break
      done
    fi
    SSH_KEY=""
    [ -n "$ORACLE_SSH_KEY_PATH" ] && SSH_KEY="-i $ORACLE_SSH_KEY_PATH"

    # SERVER_IMAGE for docker-compose interpolation on the VM
    # (deploy.yml injects the same value on every CI deploy)
    SERVER_IMAGE=""
    if command -v gh &>/dev/null; then
      GHCR_OWNER=$(gh repo view --json owner -q '.owner.login' 2>/dev/null | tr '[:upper:]' '[:lower:]' || true)
      IMAGE_NAME=$(sed -n 's|.*ghcr\.io/\${{ github\.repository_owner }}/\([^:]*\):.*|\1|p' "$REPO_ROOT/.github/workflows/deploy.yml" | head -1)
      if [ -n "$GHCR_OWNER" ] && [ -n "$IMAGE_NAME" ]; then
        SERVER_IMAGE="ghcr.io/${GHCR_OWNER}/${IMAGE_NAME}:latest"
      fi
    fi

    ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no $SSH_KEY ubuntu@"$ORACLE_HOST" bash -s <<REMOTE_EOF
set -e
cd /home/ubuntu/app && touch .env
{ grep -v '^SUPABASE_URL=' .env | grep -v '^SUPABASE_ANON_KEY=' | grep -v '^SUPABASE_SECRET_KEY=' | grep -v '^SERVER_IMAGE=' || true; } > .env.tmp
mv .env.tmp .env
echo "SUPABASE_URL=$SUPABASE_URL" >> .env
echo "SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY" >> .env
echo "SUPABASE_SECRET_KEY=${SUPABASE_SECRET_KEY}" >> .env
if [ -n "$SERVER_IMAGE" ]; then echo "SERVER_IMAGE=$SERVER_IMAGE" >> .env; fi
REMOTE_EOF
    print_success "Oracle VM .env updated with Supabase credentials${SERVER_IMAGE:+ + SERVER_IMAGE}"
  else
    print_error "Oracle VM IP unknown — run scripts/provision-oracle.sh, then re-run this script"
  fi
else
  print_error "Supabase credentials missing. Run: bash scripts/provision-supabase.sh"
fi

# =============================================================================
# Verification
# =============================================================================
print_header "Verification"

PASS=0
FAIL=0

# Oracle VM SSH
print_step "Checking Oracle VM SSH..."
if [ -z "${ORACLE_HOST:-}" ]; then
  echo -e "${RED}  ✘ Oracle VM SSH: SKIPPED (no IP in $STATE_FILE)${NC}"
  FAIL=$((FAIL + 1))
else
  SSH_KEY=""
  [ -n "${ORACLE_SSH_KEY_PATH:-}" ] && [ -f "${ORACLE_SSH_KEY_PATH:-}" ] && SSH_KEY="-i $ORACLE_SSH_KEY_PATH"
  if ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no $SSH_KEY ubuntu@"$ORACLE_HOST" "echo OK" &>/dev/null; then
    print_success "Oracle VM SSH: OK"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}  ✘ Oracle VM SSH: FAILED${NC}"
    FAIL=$((FAIL + 1))
  fi
fi

# GitHub secrets count
if command -v gh &>/dev/null; then
  SECRET_COUNT=$(gh secret list 2>/dev/null | wc -l | tr -d ' ' || echo 0)
  print_info "GitHub secrets configured: $SECRET_COUNT"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Deploy Setup Complete ($PASS passed, $FAIL failed)${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}  Next:${NC}"
echo "  Run /deploy to start the deployment pipeline."
echo ""
