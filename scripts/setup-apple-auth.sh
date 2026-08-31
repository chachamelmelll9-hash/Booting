#!/bin/bash

set -e

# =============================================================================
# Apple Sign-In Setup Script
# =============================================================================
# Automates Apple Sign-In configuration for new apps:
#   1. Supabase: Enable Apple provider via Management API
#   2. Apple Developer: Enable Sign in with Apple capability via App Store Connect API
#
# Prerequisites:
#   - SUPABASE_ACCESS_TOKEN env var (https://supabase.com/dashboard/account/tokens)
#   - App Store Connect API Key (.p8 file) + Key ID + Issuer ID
#     (https://appstoreconnect.apple.com/access/integrations/api)

# Colors for output
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

print_step() {
  echo -e "\n${YELLOW}▶ $1${NC}"
}

print_success() {
  echo -e "${GREEN}✔ $1${NC}"
}

print_error() {
  echo -e "${RED}✖ $1${NC}"
}

print_info() {
  echo -e "${CYAN}ℹ $1${NC}"
}

# Navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Extract bundle ID from app.json
BUNDLE_ID=$(node -e "console.log(require('./apps/mobile/app.json').expo.ios.bundleIdentifier)" 2>/dev/null)
if [ -z "$BUNDLE_ID" ]; then
  print_error "Could not read bundleIdentifier from apps/mobile/app.json"
  exit 1
fi

print_header "Apple Sign-In Setup"
echo ""
echo "  Bundle ID: ${BUNDLE_ID}"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# Part 1: Supabase — Enable Apple Provider
# ─────────────────────────────────────────────────────────────────────────────

setup_supabase() {
  print_header "1/2  Supabase Apple Provider"

  if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    print_error "SUPABASE_ACCESS_TOKEN is not set."
    print_info "Generate one at: https://supabase.com/dashboard/account/tokens"
    print_info "Then: export SUPABASE_ACCESS_TOKEN=sbp_..."
    return 1
  fi

  # Get project ref from .mcp.json (url query string, same as provision-supabase.sh) or ask
  SUPABASE_PROJECT_REF=""
  if [ -f ".mcp.json" ]; then
    SUPABASE_PROJECT_REF=$(node -e "
const d=require('./.mcp.json');
const url=(d.mcpServers||{}).supabase?.url||'';
const m=url.match(/project_ref=([^&]+)/);
if(m)console.log(m[1]);
" 2>/dev/null)
  fi

  if [ -z "$SUPABASE_PROJECT_REF" ]; then
    if [ -t 0 ]; then
      read -p "  Supabase Project Ref: " SUPABASE_PROJECT_REF
    else
      print_error "Supabase project ref not found in .mcp.json (non-interactive shell)."
      print_info "Run ./scripts/provision-supabase.sh first to configure the Supabase MCP url."
      return 1
    fi
  else
    print_info "Found project ref from .mcp.json: ${SUPABASE_PROJECT_REF}"
  fi

  print_step "Checking current Apple provider status..."
  CURRENT=$(curl -s "https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/config/auth" \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}")

  APPLE_ENABLED=$(echo "$CURRENT" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log(j.EXTERNAL_APPLE_ENABLED||false)})" 2>/dev/null)
  APPLE_CLIENT=$(echo "$CURRENT" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log(j.EXTERNAL_APPLE_CLIENT_ID||'')})" 2>/dev/null)

  if [ "$APPLE_ENABLED" = "true" ] && [ "$APPLE_CLIENT" = "$BUNDLE_ID" ]; then
    print_success "Apple provider already enabled with correct bundle ID"
    return 0
  fi

  print_step "Enabling Apple provider..."
  RESULT=$(curl -s -w "\n%{http_code}" -X PATCH \
    "https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/config/auth" \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"EXTERNAL_APPLE_ENABLED\": true, \"EXTERNAL_APPLE_CLIENT_ID\": \"${BUNDLE_ID}\"}")

  HTTP_CODE=$(echo "$RESULT" | tail -1)
  if [ "$HTTP_CODE" = "200" ]; then
    print_success "Apple provider enabled (client_id: ${BUNDLE_ID})"
  else
    BODY=$(echo "$RESULT" | sed '$d')
    print_error "Failed (HTTP ${HTTP_CODE}): ${BODY}"
    return 1
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Part 2: Apple Developer — Enable Sign in with Apple Capability
# ─────────────────────────────────────────────────────────────────────────────

generate_apple_jwt() {
  # Generate JWT for App Store Connect API using .p8 key
  local KEY_ID="$1"
  local ISSUER_ID="$2"
  local P8_PATH="$3"

  node -e "
const crypto = require('crypto');
const fs = require('fs');
const privateKey = fs.readFileSync('${P8_PATH}', 'utf8');
const now = Math.floor(Date.now() / 1000);
const header = { alg: 'ES256', kid: '${KEY_ID}' };
const payload = {
  iss: '${ISSUER_ID}',
  iat: now,
  exp: now + 1200,
  aud: 'appstoreconnect-v1',
};
function base64url(data) { return Buffer.from(data).toString('base64url'); }
const headerB64 = base64url(JSON.stringify(header));
const payloadB64 = base64url(JSON.stringify(payload));
const signingInput = headerB64 + '.' + payloadB64;
const sign = crypto.createSign('SHA256');
sign.update(signingInput);
const derSig = sign.sign(privateKey);
// DER to raw (r||s) conversion for ES256
let offset = 2;
if (derSig[1] & 0x80) offset += (derSig[1] & 0x7f);
offset++;
let rLen = derSig[offset++];
let r = derSig.slice(offset, offset + rLen);
offset += rLen; offset++;
let sLen = derSig[offset++];
let s = derSig.slice(offset, offset + sLen);
if (r.length > 32) r = r.slice(r.length - 32);
if (s.length > 32) s = s.slice(s.length - 32);
const rPad = Buffer.alloc(32); r.copy(rPad, 32 - r.length);
const sPad = Buffer.alloc(32); s.copy(sPad, 32 - s.length);
const rawSig = Buffer.concat([rPad, sPad]);
process.stdout.write(signingInput + '.' + rawSig.toString('base64url'));
" 2>/dev/null
}

setup_apple_developer() {
  print_header "2/2  Apple Developer — Sign in with Apple Capability"

  # Check for config file or env vars
  APPLE_KEY_ID="${APPLE_KEY_ID:-}"
  APPLE_ISSUER_ID="${APPLE_ISSUER_ID:-}"
  APPLE_P8_PATH="${APPLE_P8_PATH:-}"

  # Try loading from config file
  CONFIG_FILE="$HOME/.config/apple-developer/config"
  if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
    print_info "Loaded credentials from ${CONFIG_FILE}"
  fi

  # Fallback: reuse App Store Connect credentials from .appstoreconnect.env
  if [ -z "$APPLE_KEY_ID" ] || [ -z "$APPLE_ISSUER_ID" ] || [ -z "$APPLE_P8_PATH" ]; then
    ASC_CONFIG="$PROJECT_ROOT/.appstoreconnect.env"
    if [ -f "$ASC_CONFIG" ]; then
      set -a
      source "$ASC_CONFIG"
      set +a
      if [ -n "${ASC_KEY_ID:-}" ] && [ -n "${ASC_ISSUER_ID:-}" ]; then
        APPLE_KEY_ID="${APPLE_KEY_ID:-$ASC_KEY_ID}"
        APPLE_ISSUER_ID="${APPLE_ISSUER_ID:-$ASC_ISSUER_ID}"
        APPLE_P8_PATH="${APPLE_P8_PATH:-$HOME/.appstoreconnect/AuthKey_${ASC_KEY_ID}.p8}"
        print_info "Loaded credentials from .appstoreconnect.env"
      fi
    fi
  fi

  if [ -z "$APPLE_KEY_ID" ] || [ -z "$APPLE_ISSUER_ID" ] || [ -z "$APPLE_P8_PATH" ]; then
    if [ ! -t 0 ]; then
      print_error "App Store Connect API credentials missing (non-interactive shell)."
      print_info "Set APPLE_KEY_ID, APPLE_ISSUER_ID, APPLE_P8_PATH env vars,"
      print_info "or create ${CONFIG_FILE} / .appstoreconnect.env in project root."
      return 1
    fi
    echo ""
    echo "  App Store Connect API credentials required."
    echo "  Create at: https://appstoreconnect.apple.com/access/integrations/api"
    echo ""
    [ -z "$APPLE_KEY_ID" ] && read -p "  API Key ID: " APPLE_KEY_ID
    [ -z "$APPLE_ISSUER_ID" ] && read -p "  Issuer ID: " APPLE_ISSUER_ID
    [ -z "$APPLE_P8_PATH" ] && read -p "  .p8 file path: " APPLE_P8_PATH
    echo ""
    read -p "  Save credentials for future use? (y/N): " SAVE_CREDS
    if [[ "$SAVE_CREDS" =~ ^[Yy]$ ]]; then
      mkdir -p "$HOME/.config/apple-developer"
      cat > "$CONFIG_FILE" << EOF
APPLE_KEY_ID="${APPLE_KEY_ID}"
APPLE_ISSUER_ID="${APPLE_ISSUER_ID}"
APPLE_P8_PATH="${APPLE_P8_PATH}"
EOF
      chmod 600 "$CONFIG_FILE"
      print_success "Credentials saved to ${CONFIG_FILE}"
    fi
  fi

  if [ ! -f "$APPLE_P8_PATH" ]; then
    print_error ".p8 file not found: ${APPLE_P8_PATH}"
    return 1
  fi

  print_step "Generating App Store Connect API token..."
  TOKEN=$(generate_apple_jwt "$APPLE_KEY_ID" "$APPLE_ISSUER_ID" "$APPLE_P8_PATH")
  if [ -z "$TOKEN" ]; then
    print_error "Failed to generate JWT token"
    return 1
  fi

  APPLE_API="https://api.appstoreconnect.apple.com/v1"
  AUTH_HEADER="Authorization: Bearer ${TOKEN}"

  # Find Bundle ID resource
  print_step "Looking up Bundle ID: ${BUNDLE_ID}..."
  BUNDLE_RESPONSE=$(curl -s "${APPLE_API}/bundleIds?filter[identifier]=${BUNDLE_ID}" \
    -H "${AUTH_HEADER}")

  BUNDLE_RESOURCE_ID=$(echo "$BUNDLE_RESPONSE" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);if(j.data&&j.data[0])console.log(j.data[0].id)})" 2>/dev/null)

  if [ -z "$BUNDLE_RESOURCE_ID" ]; then
    print_error "Bundle ID '${BUNDLE_ID}' not found in Apple Developer account"
    print_info "Register it first at https://developer.apple.com/account/resources/identifiers"
    return 1
  fi
  print_success "Found Bundle ID resource: ${BUNDLE_RESOURCE_ID}"

  # Check existing capabilities
  print_step "Checking current capabilities..."
  CAPS_RESPONSE=$(curl -s "${APPLE_API}/bundleIds/${BUNDLE_RESOURCE_ID}/bundleIdCapabilities" \
    -H "${AUTH_HEADER}")

  HAS_APPLE_AUTH=$(echo "$CAPS_RESPONSE" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);const has=(j.data||[]).some(c=>c.attributes?.capabilityType==='APPLE_ID_AUTH');console.log(has)})" 2>/dev/null)

  if [ "$HAS_APPLE_AUTH" = "true" ]; then
    print_success "Sign in with Apple capability already enabled"
    return 0
  fi

  # Enable capability
  print_step "Enabling Sign in with Apple capability..."
  ENABLE_RESULT=$(curl -s -w "\n%{http_code}" -X POST \
    "${APPLE_API}/bundleIdCapabilities" \
    -H "${AUTH_HEADER}" \
    -H "Content-Type: application/json" \
    -d "{
      \"data\": {
        \"type\": \"bundleIdCapabilities\",
        \"attributes\": {
          \"capabilityType\": \"APPLE_ID_AUTH\"
        },
        \"relationships\": {
          \"bundleId\": {
            \"data\": {
              \"id\": \"${BUNDLE_RESOURCE_ID}\",
              \"type\": \"bundleIds\"
            }
          }
        }
      }
    }")

  HTTP_CODE=$(echo "$ENABLE_RESULT" | tail -1)
  if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    print_success "Sign in with Apple capability enabled"
  else
    BODY=$(echo "$ENABLE_RESULT" | sed '$d')
    print_error "Failed (HTTP ${HTTP_CODE}): ${BODY}"
    return 1
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Run
# ─────────────────────────────────────────────────────────────────────────────

SUPABASE_OK=0
APPLE_OK=0

setup_supabase || SUPABASE_OK=1
setup_apple_developer || APPLE_OK=1

echo ""
print_header "Summary"
if [ "$SUPABASE_OK" = "0" ]; then
  print_success "Supabase Apple provider: configured"
else
  print_error "Supabase Apple provider: failed"
fi

if [ "$APPLE_OK" = "0" ]; then
  print_success "Apple Developer capability: configured"
else
  print_error "Apple Developer capability: failed"
fi

echo ""
if [ "$SUPABASE_OK" = "0" ] && [ "$APPLE_OK" = "0" ]; then
  print_success "Apple Sign-In setup complete!"
  echo ""
  print_info "Next: build and test"
  echo "  bash scripts/build-ios.sh"
else
  print_info "Fix the failed steps above and re-run this script."
fi
echo ""
