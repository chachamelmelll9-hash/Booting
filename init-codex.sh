#!/bin/bash

set -euo pipefail

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

usage() {
  cat <<'EOF'
Usage: ./init-codex.sh [options]

Options:
  --yes, -y                    Run with defaults where possible
  --skip-supabase              Skip Supabase MCP setup
  --supabase-project-ref REF   Supabase project ref to register
  --supabase-name NAME         MCP server name (default: supabase_<repo>)
  --login-supabase             Run `codex mcp login <name>` after adding the server
  --skip-agent-browser         Skip agent-browser skill setup
  --global-agent-browser       Install agent-browser skill globally instead of project-local
  --help, -h                   Show this help

Examples:
  ./init-codex.sh
  ./init-codex.sh -y --supabase-project-ref abcdefghijklmnop
  ./init-codex.sh -y --skip-supabase --global-agent-browser
EOF
}

check_command() {
  local name="$1"
  if ! command -v "$name" >/dev/null 2>&1; then
    print_error "$name is not installed."
    exit 1
  fi
  print_success "$name found"
}

confirm() {
  local prompt="$1"
  if [ "${ASSUME_YES}" = true ]; then
    return 0
  fi

  read -r -p "$prompt (y/N): " answer
  [[ "$answer" =~ ^[Yy]$ ]]
}

slugify_repo_name() {
  basename "$REPO_ROOT" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '_'
}

setup_supabase_mcp() {
  local default_name="supabase_$(slugify_repo_name)"
  local server_name="${SUPABASE_NAME:-$default_name}"
  local project_ref="${SUPABASE_PROJECT_REF:-}"

  if [ -z "$project_ref" ]; then
    if ! confirm "Configure a Supabase MCP server for Codex?"; then
      print_info "Skipping Supabase MCP setup."
      return 0
    fi

    read -r -p "Supabase project ref: " project_ref
    if [ -z "$project_ref" ]; then
      print_error "Supabase project ref is required."
      return 1
    fi
  fi

  if [ -z "${SUPABASE_NAME:-}" ] && [ "${ASSUME_YES}" = false ]; then
    read -r -p "MCP server name [$server_name]: " custom_name
    if [ -n "$custom_name" ]; then
      server_name="$custom_name"
    fi
  fi

  if codex mcp get "$server_name" >/dev/null 2>&1; then
    print_info "MCP server '$server_name' already exists. Skipping add."
  else
    local url="https://mcp.supabase.com/mcp?project_ref=${project_ref}"
    print_step "Adding Supabase MCP server '$server_name'..."
    codex mcp add "$server_name" --url "$url"
    print_success "Supabase MCP added: $server_name"
  fi

  if [ "${LOGIN_SUPABASE}" = true ]; then
    print_step "Starting OAuth login for '$server_name'..."
    codex mcp login "$server_name"
    print_success "OAuth flow completed for '$server_name'"
  else
    print_info "You can authenticate later with: codex mcp login $server_name"
  fi
}

setup_agent_browser_skill() {
  local scope_args=()

  if [ "${GLOBAL_AGENT_BROWSER}" = true ]; then
    scope_args+=(--global)
  fi

  print_step "Checking agent-browser CLI..."
  if command -v agent-browser >/dev/null 2>&1; then
    print_success "agent-browser found: $(agent-browser --version)"
  else
    print_info "agent-browser CLI is not installed globally."
    print_info "The skill will still be installed; runtime usage can use npx if needed."
  fi

  if [ "${GLOBAL_AGENT_BROWSER}" = true ]; then
    print_step "Installing agent-browser skill globally via skills CLI..."
  else
    print_step "Vendoring agent-browser skill into this project via skills CLI..."
  fi

  npx -y skills add vercel-labs/agent-browser -y --copy "${scope_args[@]}"

  if [ "${GLOBAL_AGENT_BROWSER}" = true ]; then
    print_success "agent-browser skill installed globally"
  else
    print_success "agent-browser skill vendored into this project"
  fi
}

ASSUME_YES=false
SKIP_SUPABASE=false
SUPABASE_PROJECT_REF=""
SUPABASE_NAME=""
LOGIN_SUPABASE=false
SKIP_AGENT_BROWSER=false
GLOBAL_AGENT_BROWSER=false

while [ "$#" -gt 0 ]; do
  case "$1" in
    --yes|-y)
      ASSUME_YES=true
      ;;
    --skip-supabase)
      SKIP_SUPABASE=true
      ;;
    --supabase-project-ref)
      shift
      SUPABASE_PROJECT_REF="${1:-}"
      ;;
    --supabase-name)
      shift
      SUPABASE_NAME="${1:-}"
      ;;
    --login-supabase)
      LOGIN_SUPABASE=true
      ;;
    --skip-agent-browser)
      SKIP_AGENT_BROWSER=true
      ;;
    --global-agent-browser)
      GLOBAL_AGENT_BROWSER=true
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      print_error "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
  shift
done

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CODEX_HOME_DIR="${CODEX_HOME:-$HOME/.codex}"
CONFIG_TOML="${CODEX_HOME_DIR}/config.toml"

print_header "Codex Project Setup"
print_info "Repo: $REPO_ROOT"
print_info "Codex home: $CODEX_HOME_DIR"

print_step "Checking required tools..."
check_command "codex"
check_command "node"
check_command "npx"

mkdir -p "$CODEX_HOME_DIR"
if [ ! -f "$CONFIG_TOML" ]; then
  touch "$CONFIG_TOML"
  print_success "Created $CONFIG_TOML"
else
  print_success "Using $CONFIG_TOML"
fi

if [ "${SKIP_SUPABASE}" = false ]; then
  setup_supabase_mcp
else
  print_info "Skipping Supabase MCP setup."
fi

if [ "${SKIP_AGENT_BROWSER}" = false ]; then
  setup_agent_browser_skill
else
  print_info "Skipping agent-browser skill setup."
fi

print_header "Done"
print_info "Next steps:"
echo "  1. Restart Codex if you installed or updated skills."
echo "  2. Run: codex mcp list"
echo "  3. If needed, run: codex mcp login <server-name>"

