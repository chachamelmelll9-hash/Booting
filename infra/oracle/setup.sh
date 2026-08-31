#!/usr/bin/env bash
set -euo pipefail

if [ "$(id -u)" -eq 0 ]; then
  echo "Run this script as the ubuntu user, not as root."
  exit 1
fi

sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release software-properties-common ufw

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

if ! command -v caddy >/dev/null 2>&1; then
  sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  sudo apt-get update
  sudo apt-get install -y caddy
fi

sudo usermod -aG docker "$USER"
mkdir -p /home/ubuntu/app

sudo systemctl enable --now docker
sudo systemctl enable --now caddy

sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo ""
echo "Base setup complete."
echo "Next steps:"
echo "1. Copy infra/oracle/Caddyfile to /etc/caddy/Caddyfile and replace api.example.com."
echo "2. Copy infra/oracle/docker-compose.yml to /home/ubuntu/app/docker-compose.yml."
echo "3. Copy infra/oracle/.env.example to /home/ubuntu/app/.env and fill real values."
echo "4. Restart Caddy: sudo systemctl reload caddy"
