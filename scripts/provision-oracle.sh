#!/bin/bash
set -euo pipefail

# =============================================================================
# Oracle Cloud VM Provisioning Script
# =============================================================================
# Automates: VM creation, IP retrieval, SSH setup, VM bootstrap, GitHub secrets
# Prerequisites: OCI CLI configured (`oci setup config`)
#
# Usage:
#   bash scripts/provision-oracle.sh
#   bash scripts/provision-oracle.sh --skip-gh-secrets   # skip GitHub secrets step

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INFRA_DIR="$REPO_ROOT/infra/oracle"
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
# Step 0: Check & Setup OCI CLI
# =============================================================================
print_step "Step 0: Checking OCI CLI..."

if ! command -v oci &>/dev/null; then
  print_info "Installing OCI CLI..."
  if command -v brew &>/dev/null; then
    brew install oci-cli
  elif command -v pip3 &>/dev/null; then
    pip3 install oci-cli
  else
    print_error "OCI CLI not installed. Install manually:"
    echo "  brew install oci-cli    # macOS"
    echo "  pip install oci-cli     # pip"
    exit 1
  fi
fi

print_success "OCI CLI installed"

# Check if CLI is already configured with API key auth
OCI_CONFIGURED=false
if oci iam region list --output table &>/dev/null 2>&1; then
  OCI_CONFIGURED=true
  print_success "OCI CLI already configured (API key auth)"
fi

# If not configured, use browser-based session auth → then setup permanent API key
if [ "$OCI_CONFIGURED" = false ]; then
  print_info "OCI CLI not configured. Starting browser-based authentication..."
  echo ""
  echo "  A browser window will open. Log in to your Oracle Cloud account."
  echo ""

  # Session authenticate (opens browser for OAuth)
  oci session authenticate --region ap-chuncheon-1

  # Verify session works
  if ! oci iam region list --auth security_token --output table &>/dev/null 2>&1; then
    print_error "Session authentication failed."
    exit 1
  fi
  print_success "Browser authentication successful"

  # Extract tenancy from session profile
  SESSION_PROFILE=$(grep '^\[' ~/.oci/config | tail -1 | tr -d '[]')
  TENANCY_ID=$(grep tenancy ~/.oci/config | tail -1 | cut -d= -f2 | tr -d ' ')
  REGION=$(grep region ~/.oci/config | tail -1 | cut -d= -f2 | tr -d ' ')
  USER_ID=$(oci iam user list --auth security_token \
    --compartment-id "$TENANCY_ID" --query 'data[0].id' --raw-output 2>/dev/null || echo "")

  if [ -z "$USER_ID" ] || [ "$USER_ID" = "null" ]; then
    # Get current user from session
    USER_ID=$(oci session validate --query 'data."user-id"' --raw-output 2>/dev/null || echo "")
  fi

  # Generate permanent API key pair
  print_info "Generating permanent API key..."
  OCI_KEY_DIR="$HOME/.oci"
  mkdir -p "$OCI_KEY_DIR"
  API_KEY_PATH="$OCI_KEY_DIR/oci_api_key.pem"
  API_KEY_PUBLIC="$OCI_KEY_DIR/oci_api_key_public.pem"

  if [ ! -f "$API_KEY_PATH" ]; then
    openssl genrsa -out "$API_KEY_PATH" 2048 2>/dev/null
    openssl rsa -pubout -in "$API_KEY_PATH" -out "$API_KEY_PUBLIC" 2>/dev/null
    chmod 600 "$API_KEY_PATH"
    print_success "API key pair generated"
  else
    print_info "API key already exists at $API_KEY_PATH"
  fi

  # Upload public key to Oracle Cloud using session auth
  print_info "Uploading API key to Oracle Cloud..."
  FINGERPRINT=$(oci iam user api-key upload \
    --auth security_token \
    --user-id "$USER_ID" \
    --key-file "$API_KEY_PUBLIC" \
    --query 'data.fingerprint' --raw-output 2>/dev/null || echo "")

  if [ -z "$FINGERPRINT" ] || [ "$FINGERPRINT" = "null" ]; then
    # Key might already exist
    FINGERPRINT=$(openssl rsa -pubout -outform DER -in "$API_KEY_PATH" 2>/dev/null | openssl md5 -c | awk '{print $2}')
    print_info "API key may already be uploaded. Fingerprint: $FINGERPRINT"
  else
    print_success "API key uploaded. Fingerprint: $FINGERPRINT"
  fi

  # Write permanent config (DEFAULT profile)
  print_info "Writing permanent OCI config..."
  cat > "$OCI_KEY_DIR/config.bak" <<OCICFG
[DEFAULT]
user=$USER_ID
fingerprint=$FINGERPRINT
tenancy=$TENANCY_ID
region=$REGION
key_file=$API_KEY_PATH
OCICFG

  # Preserve session profile, prepend DEFAULT
  if grep -q '^\[DEFAULT\]' ~/.oci/config 2>/dev/null; then
    print_info "DEFAULT profile already exists in config, skipping overwrite"
  else
    cat "$OCI_KEY_DIR/config.bak" ~/.oci/config > "$OCI_KEY_DIR/config.tmp"
    mv "$OCI_KEY_DIR/config.tmp" ~/.oci/config
    rm -f "$OCI_KEY_DIR/config.bak"
    print_success "Permanent DEFAULT profile added to ~/.oci/config"
  fi

  # Verify permanent auth works
  if oci iam region list --output table &>/dev/null 2>&1; then
    print_success "Permanent API key auth verified"
  else
    print_info "Permanent auth not yet active (may take a moment). Continuing with session auth..."
  fi
fi

# Get tenancy/compartment
TENANCY_ID=$(oci iam compartment list --query 'data[0]."compartment-id"' --raw-output 2>/dev/null || true)
if [ -z "$TENANCY_ID" ] || [ "$TENANCY_ID" = "null" ]; then
  TENANCY_ID=$(grep tenancy ~/.oci/config | head -1 | cut -d= -f2 | tr -d ' ')
fi
COMPARTMENT_ID="${COMPARTMENT_ID:-$TENANCY_ID}"
print_info "Compartment: $COMPARTMENT_ID"

# =============================================================================
# Step 1: Check for existing VM
# =============================================================================
print_step "Step 1: Checking for existing VM..."

EXISTING_VM=$(oci compute instance list \
  --compartment-id "$COMPARTMENT_ID" \
  --display-name "${APP_SLUG_LOWER}-server" \
  --lifecycle-state RUNNING \
  --query 'data[0].id' --raw-output 2>/dev/null || echo "")

if [ -n "$EXISTING_VM" ] && [ "$EXISTING_VM" != "null" ] && [ "$EXISTING_VM" != "" ]; then
  INSTANCE_ID="$EXISTING_VM"
  print_success "Found existing VM: $INSTANCE_ID"
else
  # =============================================================================
  # Step 2: Generate SSH key
  # =============================================================================
  print_step "Step 2: Generating SSH key..."

  SSH_KEY_PATH="$HOME/.ssh/oracle_${APP_SLUG_LOWER}"
  if [ -f "$SSH_KEY_PATH" ]; then
    print_info "SSH key already exists at $SSH_KEY_PATH"
  else
    ssh-keygen -t ed25519 -f "$SSH_KEY_PATH" -N "" -C "${APP_SLUG_LOWER}@oracle"
    print_success "SSH key generated: $SSH_KEY_PATH"
  fi

  # =============================================================================
  # Step 3: Find Ubuntu image and network
  # =============================================================================
  print_step "Step 3: Finding Ubuntu image and network..."

  # Get availability domain
  AD=$(oci iam availability-domain list \
    --compartment-id "$COMPARTMENT_ID" \
    --query 'data[0].name' --raw-output)
  print_info "Availability Domain: $AD"

  # Find latest Ubuntu 22.04 image
  IMAGE_ID=$(oci compute image list \
    --compartment-id "$COMPARTMENT_ID" \
    --operating-system "Canonical Ubuntu" \
    --operating-system-version "22.04" \
    --shape "VM.Standard.E2.1.Micro" \
    --sort-by TIMECREATED --sort-order DESC \
    --query 'data[0].id' --raw-output 2>/dev/null || echo "")

  if [ -z "$IMAGE_ID" ] || [ "$IMAGE_ID" = "null" ]; then
    # Fallback: any Ubuntu image
    IMAGE_ID=$(oci compute image list \
      --compartment-id "$COMPARTMENT_ID" \
      --operating-system "Canonical Ubuntu" \
      --sort-by TIMECREATED --sort-order DESC \
      --query 'data[0].id' --raw-output)
  fi
  print_info "Image: $IMAGE_ID"

  # Find or create VCN and subnet
  VCN_ID=$(oci network vcn list \
    --compartment-id "$COMPARTMENT_ID" \
    --query 'data[0].id' --raw-output 2>/dev/null || echo "")

  if [ -z "$VCN_ID" ] || [ "$VCN_ID" = "null" ]; then
    print_info "Creating VCN..."
    VCN_ID=$(oci network vcn create \
      --compartment-id "$COMPARTMENT_ID" \
      --display-name "${APP_SLUG_LOWER}-vcn" \
      --cidr-blocks '["10.0.0.0/16"]' \
      --query 'data.id' --raw-output)

    # Create internet gateway
    IG_ID=$(oci network internet-gateway create \
      --compartment-id "$COMPARTMENT_ID" \
      --vcn-id "$VCN_ID" \
      --display-name "${APP_SLUG_LOWER}-ig" \
      --is-enabled true \
      --query 'data.id' --raw-output)

    # Update route table
    RT_ID=$(oci network route-table list \
      --compartment-id "$COMPARTMENT_ID" \
      --vcn-id "$VCN_ID" \
      --query 'data[0].id' --raw-output)

    oci network route-table update \
      --rt-id "$RT_ID" \
      --route-rules "[{\"destination\": \"0.0.0.0/0\", \"networkEntityId\": \"$IG_ID\", \"destinationType\": \"CIDR_BLOCK\"}]" \
      --force &>/dev/null

    print_success "VCN created"
  fi

  SUBNET_ID=$(oci network subnet list \
    --compartment-id "$COMPARTMENT_ID" \
    --vcn-id "$VCN_ID" \
    --query 'data[0].id' --raw-output 2>/dev/null || echo "")

  if [ -z "$SUBNET_ID" ] || [ "$SUBNET_ID" = "null" ]; then
    print_info "Creating subnet..."
    SUBNET_ID=$(oci network subnet create \
      --compartment-id "$COMPARTMENT_ID" \
      --vcn-id "$VCN_ID" \
      --display-name "${APP_SLUG_LOWER}-subnet" \
      --cidr-block "10.0.0.0/24" \
      --availability-domain "$AD" \
      --query 'data.id' --raw-output)
    print_success "Subnet created"
  fi

  # Open ports 22, 80, 443 in security list
  SL_ID=$(oci network security-list list \
    --compartment-id "$COMPARTMENT_ID" \
    --vcn-id "$VCN_ID" \
    --query 'data[0].id' --raw-output)

  oci network security-list update \
    --security-list-id "$SL_ID" \
    --ingress-security-rules "[
      {\"protocol\": \"6\", \"source\": \"0.0.0.0/0\", \"tcpOptions\": {\"destinationPortRange\": {\"min\": 22, \"max\": 22}}},
      {\"protocol\": \"6\", \"source\": \"0.0.0.0/0\", \"tcpOptions\": {\"destinationPortRange\": {\"min\": 80, \"max\": 80}}},
      {\"protocol\": \"6\", \"source\": \"0.0.0.0/0\", \"tcpOptions\": {\"destinationPortRange\": {\"min\": 443, \"max\": 443}}}
    ]" \
    --egress-security-rules "[{\"protocol\": \"all\", \"destination\": \"0.0.0.0/0\"}]" \
    --force &>/dev/null
  print_success "Security rules configured (22, 80, 443)"

  # =============================================================================
  # Step 4: Create VM
  # =============================================================================
  print_step "Step 4: Creating VM..."

  INSTANCE_ID=$(oci compute instance launch \
    --compartment-id "$COMPARTMENT_ID" \
    --availability-domain "$AD" \
    --shape "VM.Standard.E2.1.Micro" \
    --image-id "$IMAGE_ID" \
    --subnet-id "$SUBNET_ID" \
    --display-name "${APP_SLUG_LOWER}-server" \
    --ssh-authorized-keys-file "${SSH_KEY_PATH}.pub" \
    --assign-public-ip true \
    --query 'data.id' --raw-output)

  print_info "Instance ID: $INSTANCE_ID"
  print_info "Waiting for VM to be RUNNING..."

  oci compute instance get --instance-id "$INSTANCE_ID" --wait-for-state RUNNING &>/dev/null
  print_success "VM is running"
fi

# =============================================================================
# Step 5: Get Public IP
# =============================================================================
print_step "Step 5: Retrieving public IP..."

VNIC_ID=$(oci compute instance list-vnics \
  --instance-id "$INSTANCE_ID" \
  --query 'data[0].id' --raw-output)

PUBLIC_IP=$(oci network vnic get \
  --vnic-id "$VNIC_ID" \
  --query 'data."public-ip"' --raw-output)

print_success "Public IP: $PUBLIC_IP"

# Determine SSH key path
SSH_KEY_PATH="${SSH_KEY_PATH:-$HOME/.ssh/oracle_${APP_SLUG_LOWER}}"
if [ ! -f "$SSH_KEY_PATH" ]; then
  # Try default key
  for key in ~/.ssh/id_ed25519 ~/.ssh/id_rsa; do
    if [ -f "$key" ]; then
      SSH_KEY_PATH="$key"
      break
    fi
  done
fi

# Record local deploy state so later scripts (setup-deploy.sh, provision-cloudflare.sh)
# can reach the VM without re-querying OCI. Gitignored — never commit.
STATE_FILE="$INFRA_DIR/.deploy-state"
cat > "$STATE_FILE" <<STATE_EOF
ORACLE_HOST=$PUBLIC_IP
SSH_KEY_PATH=$SSH_KEY_PATH
INSTANCE_ID=$INSTANCE_ID
STATE_EOF
print_success "Deploy state written: $STATE_FILE"

# =============================================================================
# Step 6: Wait for SSH and bootstrap VM
# =============================================================================
print_step "Step 6: Bootstrapping VM..."

print_info "Waiting for SSH access..."
for i in $(seq 1 30); do
  if ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" ubuntu@"$PUBLIC_IP" "echo OK" &>/dev/null; then
    break
  fi
  sleep 5
done

if ! ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" ubuntu@"$PUBLIC_IP" "echo OK" &>/dev/null; then
  print_error "Cannot SSH into VM at $PUBLIC_IP"
  echo "  Try manually: ssh -i $SSH_KEY_PATH ubuntu@$PUBLIC_IP"
  exit 1
fi

print_success "SSH access confirmed"

# Run setup.sh on VM
print_info "Running setup.sh on VM (Docker + Caddy + UFW)..."
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" ubuntu@"$PUBLIC_IP" 'bash -s' < "$INFRA_DIR/setup.sh"
print_success "VM bootstrap complete"

# =============================================================================
# Step 7: Deploy config files to VM
# =============================================================================
print_step "Step 7: Deploying config files..."

# Copy docker-compose.yml
scp -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" \
  "$INFRA_DIR/docker-compose.yml" ubuntu@"$PUBLIC_IP":/home/ubuntu/app/docker-compose.yml
print_success "docker-compose.yml deployed"

# Copy .env.example (kept as-is); seed .env from it only if .env does not exist yet
scp -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" \
  "$INFRA_DIR/.env.example" ubuntu@"$PUBLIC_IP":/home/ubuntu/app/.env.example
if ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" ubuntu@"$PUBLIC_IP" \
  'test -f /home/ubuntu/app/.env'; then
  print_info "Existing /home/ubuntu/app/.env preserved (not overwritten)"
else
  ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" ubuntu@"$PUBLIC_IP" \
    'cp /home/ubuntu/app/.env.example /home/ubuntu/app/.env'
  print_info ".env seeded from .env.example — fill real values later"
fi

# Copy Caddyfile
scp -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" \
  "$INFRA_DIR/Caddyfile" ubuntu@"$PUBLIC_IP":/tmp/Caddyfile
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" ubuntu@"$PUBLIC_IP" \
  'sudo mv /tmp/Caddyfile /etc/caddy/Caddyfile && sudo systemctl reload caddy'
print_success "Caddyfile deployed"

# =============================================================================
# Step 8: Set GitHub Secrets
# =============================================================================
if [ "$SKIP_GH_SECRETS" = false ] && command -v gh &>/dev/null; then
  print_step "Step 8: Setting GitHub secrets..."

  SSH_KEY_CONTENT=$(cat "$SSH_KEY_PATH")

  gh secret set ORACLE_HOST --body "$PUBLIC_IP"
  gh secret set ORACLE_SSH_USER --body "ubuntu"
  gh secret set ORACLE_SSH_KEY --body "$SSH_KEY_CONTENT"

  print_success "GitHub secrets set: ORACLE_HOST, ORACLE_SSH_USER, ORACLE_SSH_KEY"
else
  print_step "Step 8: GitHub secrets (skipped)"
  if [ "$SKIP_GH_SECRETS" = true ]; then
    print_info "Skipped by --skip-gh-secrets flag"
  else
    print_info "gh CLI not found. Set secrets manually:"
    echo "  gh secret set ORACLE_HOST --body \"$PUBLIC_IP\""
    echo "  gh secret set ORACLE_SSH_USER --body \"ubuntu\""
    echo "  gh secret set ORACLE_SSH_KEY < $SSH_KEY_PATH"
  fi
fi

# =============================================================================
# Summary
# =============================================================================
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Oracle VM Provisioning Complete${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Instance ID:  $INSTANCE_ID"
echo "  Public IP:    $PUBLIC_IP"
echo "  SSH Key:      $SSH_KEY_PATH"
echo "  SSH Command:  ssh -i $SSH_KEY_PATH ubuntu@$PUBLIC_IP"
echo "  State File:   $STATE_FILE"
echo ""
echo -e "${YELLOW}  Next steps:${NC}"
echo "  1. Run scripts/provision-cloudflare.sh — sets DNS A record and deploys"
echo "     the real-domain Caddyfile to the VM"
echo "  2. Run scripts/setup-deploy.sh — pushes Supabase values into VM .env"
echo "     (or edit manually: ssh -i $SSH_KEY_PATH ubuntu@$PUBLIC_IP 'nano /home/ubuntu/app/.env')"
echo ""
