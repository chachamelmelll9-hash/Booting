# Oracle Cloud Deploy Guide

This repository deploys the NestJS server to an Oracle Cloud Ubuntu VM and serves it through Caddy.

The automated path is `scripts/setup-deploy.sh`, which runs `scripts/provision-oracle.sh` and `scripts/provision-cloudflare.sh`. The sections below describe the same steps for manual setup or debugging.

## Files In This Directory

- `Caddyfile`
  The placeholder `api.example.com` is replaced with the real API domain by `scripts/provision-cloudflare.sh`, which also copies the file to `/etc/caddy/Caddyfile` on the VM and reloads Caddy. For manual setup, replace the domain yourself and copy it (see step 3).
- `.env.example`
  Uploaded to the VM as `/home/ubuntu/app/.env.example`. It is copied to `.env` only on the first provisioning run — an existing `.env` is never overwritten. `scripts/setup-deploy.sh` fills the real Supabase values and `SERVER_IMAGE` into the VM `.env`.
- `docker-compose.yml`
  Copied to `/home/ubuntu/app/docker-compose.yml` by `scripts/provision-oracle.sh`. The server image is resolved from the `SERVER_IMAGE` environment variable: the deploy workflow injects `ghcr.io/<repo-owner>/<app>-server:latest` on every deploy, and `scripts/setup-deploy.sh` writes the same value into the VM `.env` so manual `docker compose` runs work too. The fallback placeholder inside the file is rewritten by `scripts/initial-setup.sh` (org) and `scripts/branding.sh` (app name).
- `.deploy-state` (gitignored, created by `scripts/provision-oracle.sh`)
  Local record of the VM public IP, SSH key path, and instance ID. `setup-deploy.sh` and `provision-cloudflare.sh` read it to reach the VM — GitHub secrets are write-only and cannot be read back.
- `setup.sh`
  Base VM bootstrap for Docker, Caddy, and firewall rules.

## 1. Create The VM

1. Provision an Ubuntu VM on Oracle Cloud (`scripts/provision-oracle.sh` automates this).
2. Open ports `22`, `80`, and `443`.
3. SSH as the `ubuntu` user.

### Free Tier limit & multiple apps

Oracle Free Tier allows **2 AMD Micro VMs (VM.Standard.E2.1.Micro) per account**. Each app template instance provisions its own VM named `<app-slug>-server`, so one Oracle account can host **at most two apps** this way. For a third app, use a paid shape, a second Oracle account, or share one VM manually (not automated by these scripts).

## 2. Bootstrap The VM

From the repository root on your local machine:

```bash
ssh ubuntu@<ORACLE_HOST> 'bash -s' < infra/oracle/setup.sh
```

## 3. Install The Reverse Proxy

`scripts/provision-cloudflare.sh` does this automatically after DNS setup. Manual equivalent — replace the placeholder domain in `infra/oracle/Caddyfile`, then copy it to the VM:

```bash
scp infra/oracle/Caddyfile ubuntu@<ORACLE_HOST>:/tmp/Caddyfile
ssh ubuntu@<ORACLE_HOST> 'sudo mv /tmp/Caddyfile /etc/caddy/Caddyfile && sudo systemctl reload caddy'
```

## 4. DNS & Cloudflare SSL

Each app gets its own API subdomain: **`api-<app-slug>.<domain>`** (override with `API_SUBDOMAIN=api` for a single-app zone). This prevents a second app from silently re-pointing the first app's DNS record. If an existing A record with a different IP is found, `provision-cloudflare.sh` asks for explicit confirmation before overwriting.

The A record is created **proxied** (orange cloud). With the Cloudflare proxy in front of Caddy:

- Set the zone's **SSL/TLS mode to "Full"** (Dashboard → SSL/TLS → Overview). "Flexible" causes redirect loops with Caddy's automatic HTTPS.
- Caddy obtains a Let's Encrypt certificate via HTTP-01, which normally works through the proxy. If certificate issuance fails, temporarily switch the record to **DNS-only** (grey cloud), let Caddy obtain the certificate, then re-enable the proxy — or install a Cloudflare Origin Certificate on the VM and use SSL mode "Full (strict)".
- If you prefer no proxy at all, switch the record to DNS-only; Caddy then serves its Let's Encrypt certificate directly.

## 5. Copy App Runtime Files

`scripts/provision-oracle.sh` does this automatically and never overwrites an existing `.env`. Manual equivalent:

```bash
scp infra/oracle/docker-compose.yml ubuntu@<ORACLE_HOST>:/home/ubuntu/app/docker-compose.yml
scp infra/oracle/.env.example ubuntu@<ORACLE_HOST>:/home/ubuntu/app/.env.example
ssh ubuntu@<ORACLE_HOST> 'test -f /home/ubuntu/app/.env || cp /home/ubuntu/app/.env.example /home/ubuntu/app/.env'
```

Then edit `/home/ubuntu/app/.env` on the VM with real values (or run `scripts/setup-deploy.sh`).

> **Supabase dev/prod note:** by default the VM `.env` receives the same Supabase project credentials used in development (`provision-supabase.sh` also disables email confirmation for dev convenience). For production, a separate Supabase project is recommended — create one, put its credentials in the VM `.env`, and re-enable email confirmation in the dev project if you keep sharing it.

## 6. Configure GitHub Secrets

Server deploy workflow:

- `ORACLE_HOST`
- `ORACLE_SSH_USER`
- `ORACLE_SSH_KEY`

WebView deploy workflow:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_KEY`
- `VITE_SERVER_URL`

GitHub variable:

- `CF_PAGES_PROJECT_NAME`

Mobile build workflow:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
- `PRODUCTION_SERVER_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `WEBVIEW_URL`
- `ASC_API_KEY_P8`
- `ASC_KEY_ID`
- `ASC_ISSUER_ID`
- `APPLE_TEAM_ID`

Optional launch secrets:

- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`

## 7. Deploy Server

The default path is the GitHub Actions workflow:

```bash
gh workflow run deploy.yml
```

The workflow builds the Docker image, pushes it to GHCR as `ghcr.io/<repo-owner>/<app>-server:latest`, SSHes into the VM, exports `SERVER_IMAGE`, runs `docker compose pull` and `docker compose up -d --force-recreate`, then verifies the server responds on `/api`. The deploy step fails (and prints container logs) if the health check does not pass.

## 8. Verify Server Health

```bash
curl -sf https://api-<app-slug>.<domain>/api
```

The expected response is the NestJS root health payload. The deploy workflow already performs this check against `http://127.0.0.1:3000/api` on the VM after every deploy.
