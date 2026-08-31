#!/bin/bash
set -euo pipefail

# =============================================================================
# Cloudflare Provisioning Script
# =============================================================================
# Automates: DNS records, Pages project, GitHub secrets
# Prerequisites: Cloudflare account + API Token (created via web console)
#
# Usage:
#   bash scripts/provision-cloudflare.sh
#   bash scripts/provision-cloudflare.sh --skip-gh-secrets

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_SLUG=$(node -e "const c=require('$REPO_ROOT/apps/mobile/app.json').expo; console.log(c.slug.replace(/-mobile$/,''))" 2>/dev/null || echo "myapp")
APP_SLUG_LOWER=$(echo "$APP_SLUG" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
SKIP_GH_SECRETS=false

for arg in "$@"; do
  case $arg in
    --skip-gh-secrets) SKIP_GH_SECRETS=true ;;
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

# =============================================================================
# Step 0: Ensure wrangler is installed
# =============================================================================
if ! command -v wrangler &>/dev/null; then
  print_info "Installing wrangler..."
  npm install -g wrangler
fi

# =============================================================================
# Step 1: Authenticate via wrangler login (browser OAuth) or existing token
# =============================================================================
print_step "Step 1: Cloudflare Authentication"

CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-}"

if [ -n "$CLOUDFLARE_API_TOKEN" ]; then
  # Verify existing token
  TOKEN_CHECK=$(curl -sf -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    "https://api.cloudflare.com/client/v4/user/tokens/verify" 2>/dev/null || echo "")
  if echo "$TOKEN_CHECK" | grep -q '"success":true'; then
    print_success "Using existing CLOUDFLARE_API_TOKEN (verified)"
  else
    print_error "Existing CLOUDFLARE_API_TOKEN is invalid. Re-authenticating..."
    CLOUDFLARE_API_TOKEN=""
  fi
fi

if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
  # Check if wrangler is already logged in
  if wrangler whoami &>/dev/null 2>&1; then
    print_success "Wrangler already authenticated"
  else
    print_info "Opening browser for Cloudflare login..."
    echo ""
    echo "  A browser window will open. Log in to your Cloudflare account."
    echo ""
    wrangler login
    print_success "Wrangler login complete"
  fi

  # Get Global API Key to create a scoped token
  # wrangler stores OAuth token at ~/.wrangler/config/default.toml
  WRANGLER_CONFIG="$HOME/.wrangler/config/default.toml"
  OAUTH_TOKEN=""

  if [ -f "$WRANGLER_CONFIG" ]; then
    OAUTH_TOKEN=$(grep 'oauth_token' "$WRANGLER_CONFIG" 2>/dev/null | cut -d'"' -f2 || true)
  fi

  # Alternative location (newer wrangler)
  if [ -z "$OAUTH_TOKEN" ]; then
    WRANGLER_CONFIG_ALT="$HOME/.config/.wrangler/config/default.toml"
    if [ -f "$WRANGLER_CONFIG_ALT" ]; then
      OAUTH_TOKEN=$(grep 'oauth_token' "$WRANGLER_CONFIG_ALT" 2>/dev/null | cut -d'"' -f2 || true)
    fi
  fi

  if [ -n "$OAUTH_TOKEN" ]; then
    # Get Account ID using OAuth token
    ACCOUNT_ID=$(curl -sf -H "Authorization: Bearer $OAUTH_TOKEN" \
      "https://api.cloudflare.com/client/v4/accounts" \
      | node -e "process.stdin.on('data',d=>{const r=JSON.parse(d);console.log(r.result[0].id)})" 2>/dev/null || echo "")

    if [ -n "$ACCOUNT_ID" ] && [ "$ACCOUNT_ID" != "null" ]; then
      print_success "Account ID: $ACCOUNT_ID"

      # Create a scoped API Token via Cloudflare API
      print_info "Creating scoped API Token (Zone DNS Edit + Pages Edit)..."

      # Get all zones for permissions
      ZONE_IDS=$(curl -sf -H "Authorization: Bearer $OAUTH_TOKEN" \
        "https://api.cloudflare.com/client/v4/zones?account.id=$ACCOUNT_ID" \
        | node -e "process.stdin.on('data',d=>{
          const zones=JSON.parse(d).result;
          console.log(JSON.stringify(zones.map(z=>({'zone_id':z.id}))))
        })" 2>/dev/null || echo "[]")

      TOKEN_RESULT=$(curl -sf -X POST \
        -H "Authorization: Bearer $OAUTH_TOKEN" \
        -H "Content-Type: application/json" \
        "https://api.cloudflare.com/client/v4/user/tokens" \
        -d "{
          \"name\": \"${APP_SLUG_LOWER}-deploy-$(date +%Y%m%d)\",
          \"policies\": [
            {
              \"effect\": \"allow\",
              \"resources\": {\"com.cloudflare.api.account.${ACCOUNT_ID}\": \"*\"},
              \"permission_groups\": [
                {\"id\": \"82e64a83756745bbbb1c9c2701bf816b\", \"name\": \"DNS Write\"},
                {\"id\": \"1a71c399035b4950a1bd1466bbe4f420\", \"name\": \"Cloudflare Pages Write\"}
              ]
            }
          ]
        }" 2>/dev/null || echo "")

      CLOUDFLARE_API_TOKEN=$(echo "$TOKEN_RESULT" | node -e "
        process.stdin.on('data',d=>{
          const r=JSON.parse(d);
          if(r.success && r.result && r.result.value) console.log(r.result.value);
          else console.log('');
        })
      " 2>/dev/null || echo "")

      if [ -n "$CLOUDFLARE_API_TOKEN" ]; then
        print_success "Scoped API Token created automatically"
      else
        print_info "Auto token creation failed. Falling back to manual input."
        echo ""
        echo "  Create an API Token at:"
        echo "    https://dash.cloudflare.com/profile/api-tokens"
        echo "  Permissions: Zone DNS Edit + Cloudflare Pages Edit"
        echo ""
        read -rp "  Paste your API Token: " CLOUDFLARE_API_TOKEN
      fi
    fi
  fi

  # Last resort: ask user to paste token
  if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo ""
    echo "  Could not auto-create token. Create manually at:"
    echo "    https://dash.cloudflare.com/profile/api-tokens"
    echo "  Permissions: Zone DNS Edit + Cloudflare Pages Edit"
    echo ""
    read -rp "  Paste your API Token: " CLOUDFLARE_API_TOKEN
  fi
fi

if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
  print_error "API Token is required."
  exit 1
fi

# Final verification
TOKEN_CHECK=$(curl -sf -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/user/tokens/verify" 2>/dev/null || echo "")

if ! echo "$TOKEN_CHECK" | grep -q '"success":true'; then
  print_error "API Token verification failed."
  exit 1
fi

print_success "API Token verified"

# =============================================================================
# Step 2: Get Account ID
# =============================================================================
print_step "Step 2: Retrieving Account ID..."

if [ -z "${ACCOUNT_ID:-}" ]; then
  ACCOUNT_ID=$(curl -sf -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    "https://api.cloudflare.com/client/v4/accounts" \
    | node -e "process.stdin.on('data',d=>{const r=JSON.parse(d);console.log(r.result[0].id)})" 2>/dev/null || echo "")
fi

if [ -z "$ACCOUNT_ID" ] || [ "$ACCOUNT_ID" = "null" ]; then
  print_error "Failed to retrieve Account ID."
  exit 1
fi

print_success "Account ID: $ACCOUNT_ID"

# =============================================================================
# Step 3: Select Domain (Zone)
# =============================================================================
print_step "Step 3: Selecting domain..."

ZONES=$(curl -sf -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones?account.id=$ACCOUNT_ID&status=active")

ZONE_COUNT=$(echo "$ZONES" | node -e "process.stdin.on('data',d=>{console.log(JSON.parse(d).result.length)})" 2>/dev/null || echo "0")

if [ "$ZONE_COUNT" = "0" ]; then
  print_error "No active domains found in your Cloudflare account."
  echo "  Register a domain at: https://dash.cloudflare.com → Domain Registration"
  exit 1
fi

echo ""
echo "$ZONES" | node -e "
  process.stdin.on('data',d=>{
    const zones=JSON.parse(d).result;
    zones.forEach((z,i)=>console.log('  '+(i+1)+'. '+z.name+' ('+z.id+')'));
  })
"
echo ""
read -rp "  Select domain number [1]: " ZONE_CHOICE
ZONE_CHOICE="${ZONE_CHOICE:-1}"

DOMAIN=$(echo "$ZONES" | node -e "
  process.stdin.on('data',d=>{
    console.log(JSON.parse(d).result[${ZONE_CHOICE}-1].name);
  })
" 2>/dev/null)

ZONE_ID=$(echo "$ZONES" | node -e "
  process.stdin.on('data',d=>{
    console.log(JSON.parse(d).result[${ZONE_CHOICE}-1].id);
  })
" 2>/dev/null)

print_success "Domain: $DOMAIN (Zone: $ZONE_ID)"

# Per-app API subdomain so multiple apps can share one zone without
# clobbering each other's DNS. Override with API_SUBDOMAIN=api for the
# legacy single-app layout.
API_SUBDOMAIN="${API_SUBDOMAIN:-api-${APP_SLUG_LOWER}}"
API_HOST="${API_SUBDOMAIN}.${DOMAIN}"
SERVER_URL="https://${API_HOST}"
print_info "Server URL will be: $SERVER_URL"

# =============================================================================
# Step 4: Add DNS Records
# =============================================================================
print_step "Step 4: Setting up DNS records..."

# Get Oracle VM IP (from provision-oracle.sh state file, env, or ask)
STATE_FILE="$REPO_ROOT/infra/oracle/.deploy-state"
ORACLE_IP="${ORACLE_HOST:-}"
ORACLE_SSH_KEY_PATH=""
if [ -f "$STATE_FILE" ]; then
  [ -z "$ORACLE_IP" ] && ORACLE_IP=$(sed -n 's/^ORACLE_HOST=//p' "$STATE_FILE" | head -1)
  ORACLE_SSH_KEY_PATH=$(sed -n 's/^SSH_KEY_PATH=//p' "$STATE_FILE" | head -1)
fi

if [ -z "$ORACLE_IP" ]; then
  read -rp "  Oracle VM public IP (for DNS A record): " ORACLE_IP
fi

if [ -n "$ORACLE_IP" ]; then
  # Add A record for the per-app api subdomain
  EXISTING_RECORD=$(curl -sf -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?name=$API_HOST&type=A" \
    | node -e "process.stdin.on('data',d=>{
        const r=JSON.parse(d).result;
        if(r.length) console.log(r[0].id+' '+r[0].content);
      })" 2>/dev/null || echo "")

  if [ -n "$EXISTING_RECORD" ]; then
    RECORD_ID="${EXISTING_RECORD%% *}"
    CURRENT_IP="${EXISTING_RECORD##* }"

    if [ "$CURRENT_IP" != "$ORACLE_IP" ]; then
      print_info "DNS A record $API_HOST already points to $CURRENT_IP (new IP: $ORACLE_IP)"
      echo "  Overwriting will redirect any app currently served at $API_HOST."
      read -rp "  Overwrite $API_HOST → $ORACLE_IP? [y/N]: " CONFIRM_DNS
      if [ "${CONFIRM_DNS:-n}" != "y" ] && [ "${CONFIRM_DNS:-n}" != "Y" ]; then
        print_error "Aborted — DNS record left unchanged. Re-run with API_SUBDOMAIN=<other-name> to use a different subdomain."
        exit 1
      fi
    fi

    curl -sf -X PUT \
      -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
      -H "Content-Type: application/json" \
      "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$RECORD_ID" \
      -d "{\"type\":\"A\",\"name\":\"$API_SUBDOMAIN\",\"content\":\"$ORACLE_IP\",\"proxied\":true}" >/dev/null

    print_success "Updated DNS A record: $API_HOST → $ORACLE_IP"
  else
    # Create new record
    curl -sf -X POST \
      -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
      -H "Content-Type: application/json" \
      "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
      -d "{\"type\":\"A\",\"name\":\"$API_SUBDOMAIN\",\"content\":\"$ORACLE_IP\",\"proxied\":true}" >/dev/null

    print_success "Created DNS A record: $API_HOST → $ORACLE_IP"
  fi
  print_info "Record is proxied (orange cloud) — set Cloudflare SSL/TLS mode to 'Full'. See infra/oracle/DEPLOY_GUIDE.md."
else
  print_info "Skipped DNS — no Oracle IP provided. Run provision-oracle.sh first."
fi

# =============================================================================
# Step 5: Create Cloudflare Pages Project
# =============================================================================
print_step "Step 5: Creating Cloudflare Pages project..."

# Check if project exists
PROJECT_EXISTS=$(curl -sf -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/$APP_SLUG_LOWER" \
  | node -e "process.stdin.on('data',d=>{const r=JSON.parse(d);console.log(r.success&&r.result?'yes':'no')})" 2>/dev/null || echo "no")

if [ "$PROJECT_EXISTS" = "yes" ]; then
  print_success "Pages project '$APP_SLUG_LOWER' already exists"
else
  CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN" CLOUDFLARE_ACCOUNT_ID="$ACCOUNT_ID" \
    wrangler pages project create "$APP_SLUG_LOWER" --production-branch main 2>/dev/null || true
  print_success "Pages project '$APP_SLUG_LOWER' created"
fi

WEBVIEW_URL="https://${APP_SLUG_LOWER}.pages.dev"
print_info "WebView URL: $WEBVIEW_URL"

# Record the Pages project name as the single source of truth.
# deploy-orchestrator / launch-orchestrator / setup-landing all read PAGES_PROJECT from
# here. Previously each derived its own name (workflow literal / expo.slug /
# "<slug>-webview") and they disagreed, so the legal-doc URL submitted to the stores
# could point at a different project than the one the app actually uses.
STATE_FILE="$REPO_ROOT/infra/oracle/.deploy-state"
mkdir -p "$(dirname "$STATE_FILE")"
touch "$STATE_FILE"
if grep -q '^PAGES_PROJECT=' "$STATE_FILE" 2>/dev/null; then
  TMP_STATE=$(mktemp)
  sed "s|^PAGES_PROJECT=.*|PAGES_PROJECT=${APP_SLUG_LOWER}|" "$STATE_FILE" > "$TMP_STATE"
  mv "$TMP_STATE" "$STATE_FILE"
else
  echo "PAGES_PROJECT=${APP_SLUG_LOWER}" >> "$STATE_FILE"
fi
if grep -q '^SERVER_DOMAIN=' "$STATE_FILE" 2>/dev/null; then
  TMP_STATE=$(mktemp)
  sed "s|^SERVER_DOMAIN=.*|SERVER_DOMAIN=${API_HOST}|" "$STATE_FILE" > "$TMP_STATE"
  mv "$TMP_STATE" "$STATE_FILE"
else
  echo "SERVER_DOMAIN=${API_HOST}" >> "$STATE_FILE"
fi
print_success "Deploy state updated: PAGES_PROJECT=${APP_SLUG_LOWER}, SERVER_DOMAIN=${API_HOST}"

# =============================================================================
# Step 6: Update Caddyfile domain and redeploy it to the VM
# =============================================================================
print_step "Step 6: Updating Caddyfile..."

CADDYFILE="$REPO_ROOT/infra/oracle/Caddyfile"
if [ -f "$CADDYFILE" ]; then
  if grep -q "api.example.com" "$CADDYFILE"; then
    if [[ "$OSTYPE" == darwin* ]]; then
      sed -i '' "s/api.example.com/${API_HOST}/g" "$CADDYFILE"
    else
      sed -i "s/api.example.com/${API_HOST}/g" "$CADDYFILE"
    fi
    print_success "Caddyfile updated: ${API_HOST}"
  elif grep -q "$API_HOST" "$CADDYFILE"; then
    print_info "Caddyfile already configured for ${API_HOST}"
  else
    print_error "Caddyfile serves a different domain than ${API_HOST} — update infra/oracle/Caddyfile manually"
  fi

  # Redeploy the real-domain Caddyfile to the VM (the VM was bootstrapped with
  # the placeholder before the domain was known).
  if grep -q "$API_HOST" "$CADDYFILE" && [ -n "$ORACLE_IP" ]; then
    if [ -z "$ORACLE_SSH_KEY_PATH" ] || [ ! -f "$ORACLE_SSH_KEY_PATH" ]; then
      for key in "$HOME/.ssh/oracle_${APP_SLUG_LOWER}" "$HOME/.ssh/id_ed25519" "$HOME/.ssh/id_rsa"; do
        [ -f "$key" ] && ORACLE_SSH_KEY_PATH="$key" && break
      done
    fi
    if [ -n "$ORACLE_SSH_KEY_PATH" ] && [ -f "$ORACLE_SSH_KEY_PATH" ]; then
      print_info "Deploying Caddyfile to VM ($ORACLE_IP)..."
      if scp -o ConnectTimeout=10 -o StrictHostKeyChecking=no -i "$ORACLE_SSH_KEY_PATH" \
           "$CADDYFILE" ubuntu@"$ORACLE_IP":/tmp/Caddyfile \
         && ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -i "$ORACLE_SSH_KEY_PATH" ubuntu@"$ORACLE_IP" \
           'sudo mv /tmp/Caddyfile /etc/caddy/Caddyfile && sudo systemctl reload caddy'; then
        print_success "Caddyfile deployed to VM and Caddy reloaded"
      else
        print_error "Could not deploy Caddyfile to VM. Deploy manually:"
        echo "  scp infra/oracle/Caddyfile ubuntu@$ORACLE_IP:/tmp/Caddyfile"
        echo "  ssh ubuntu@$ORACLE_IP 'sudo mv /tmp/Caddyfile /etc/caddy/Caddyfile && sudo systemctl reload caddy'"
      fi
    else
      print_info "No SSH key found — deploy Caddyfile to the VM manually (see infra/oracle/DEPLOY_GUIDE.md)"
    fi
  fi
fi

# =============================================================================
# Step 7: Set GitHub Secrets & Variables
# =============================================================================
if [ "$SKIP_GH_SECRETS" = false ] && command -v gh &>/dev/null; then
  print_step "Step 7: Setting GitHub secrets..."

  gh secret set CLOUDFLARE_API_TOKEN --body "$CLOUDFLARE_API_TOKEN"
  gh secret set CLOUDFLARE_ACCOUNT_ID --body "$ACCOUNT_ID"
  gh secret set VITE_SERVER_URL --body "$SERVER_URL"
  gh variable set CF_PAGES_PROJECT_NAME --body "$APP_SLUG_LOWER"

  print_success "GitHub secrets set: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, VITE_SERVER_URL"
  print_success "GitHub variable set: CF_PAGES_PROJECT_NAME=$APP_SLUG_LOWER"
else
  print_step "Step 7: GitHub secrets (skipped)"
  print_info "Set manually:"
  echo "  gh secret set CLOUDFLARE_API_TOKEN --body \"$CLOUDFLARE_API_TOKEN\""
  echo "  gh secret set CLOUDFLARE_ACCOUNT_ID --body \"$ACCOUNT_ID\""
  echo "  gh secret set VITE_SERVER_URL --body \"$SERVER_URL\""
  echo "  gh variable set CF_PAGES_PROJECT_NAME --body \"$APP_SLUG_LOWER\""
fi

# =============================================================================
# Summary
# =============================================================================
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Cloudflare Provisioning Complete${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Domain:       $DOMAIN"
echo "  Server URL:   $SERVER_URL"
echo "  WebView URL:  $WEBVIEW_URL"
echo "  Account ID:   $ACCOUNT_ID"
echo "  Zone ID:      $ZONE_ID"
echo ""
