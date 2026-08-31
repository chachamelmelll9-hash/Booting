# HTTPS Implementation Plan (Cloudflare)

## Overview

Add HTTPS to EC2 services using Cloudflare as a reverse proxy with free SSL, CDN, and DDoS protection.

**Domain:** example.com
**EC2 IP:** 13.209.4.205

## Architecture

```
User (HTTPS) → Cloudflare CDN → EC2 (HTTP internally)
                   │
         ┌─────────┼─────────┐
         ▼         ▼         ▼
   api.example.com  stream.example.com  mqtt.example.com
         │         │         │
         ▼         ▼         ▼
      :3000      :8888     :1883
```

---

## Setup Steps

### Step 1: Add Domain to Cloudflare

1. Go to [cloudflare.com](https://cloudflare.com) → Sign up / Login
2. Click "Add a Site" → Enter `example.com`
3. Select **Free plan**
4. Cloudflare will scan existing DNS records

### Step 2: Update Nameservers

1. Cloudflare will provide 2 nameservers (e.g., `xxx.ns.cloudflare.com`)
2. Go to your domain registrar (where you bought example.com)
3. Change nameservers to Cloudflare's
4. Wait for propagation (up to 24h, usually faster)

### Step 3: Configure DNS Records

In Cloudflare Dashboard → DNS:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | @ | 13.209.4.205 | Proxied (orange cloud) |
| A | api | 13.209.4.205 | Proxied |
| A | stream | 13.209.4.205 | Proxied |
| A | mqtt | 13.209.4.205 | Proxied |

### Step 4: SSL/TLS Settings

In Cloudflare Dashboard → SSL/TLS:

1. **Encryption Mode**: Select "Flexible"
   - Flexible: Cloudflare → EC2 is HTTP (simplest)
   - Full: Cloudflare → EC2 is HTTPS (requires origin cert)

2. **Edge Certificates**: Auto-enabled (free)

3. **Always Use HTTPS**: Enable (redirects HTTP → HTTPS)

4. **Minimum TLS Version**: TLS 1.2

### Step 5: WebSocket Support

Cloudflare Dashboard → Network:
- **WebSockets**: Enable (should be on by default)

### Step 6: Caching for HLS (Optional)

Cloudflare Dashboard → Caching → Cache Rules:

Create rule for `stream.example.com`:
- **Cache Level**: Standard
- **Edge TTL**: 5 seconds (for live HLS segments)

---

## Code Changes Required

### 1. Mobile App HLS URL

Update `apps/mobile/app/(tabs)/home/live/stream.tsx`:

```typescript
// From:
uri: 'http://13.209.4.205:8888/live/mainstream/index.m3u8'

// To:
uri: 'https://stream.example.com/live/mainstream/index.m3u8'
```

### 2. AWS Security Group (Optional)

Restrict to Cloudflare IPs only:
- Instead of 0.0.0.0/0, allow only [Cloudflare IP ranges](https://www.cloudflare.com/ips/)
- Keeps direct EC2 access blocked

### 3. No Docker/Nginx Changes Needed

Current setup works as-is!

---

## Verification

After DNS propagation:

```bash
# Test API
curl -I https://api.example.com/api

# Test HLS
curl -I https://stream.example.com/live/mainstream/index.m3u8

# Check SSL certificate
openssl s_client -connect api.example.com:443 -servername api.example.com
```

---

## Benefits

- No certificate renewal management
- Free CDN (faster HLS streaming globally)
- DDoS protection included
- Zero EC2 configuration changes
- Web dashboard for all settings
- Free analytics

---

## Timeline

| Step | Time |
|------|------|
| Add to Cloudflare | 5 min |
| Update nameservers | 5 min |
| DNS propagation | 5 min - 24h |
| Configure SSL settings | 5 min |
| Update mobile app URL | 5 min |
| **Total** | ~30 min + DNS wait |
