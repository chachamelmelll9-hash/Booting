# CI/CD Optimization Summary

This document summarizes the CI/CD and Docker optimization work done for the
product-engineer-community-service monorepo.

## Goals

- Replace SSH-based deploy with SSM-based deploy.
- Keep Docker images small while preserving runtime correctness.
- Make main branch pushes fully automated: build, push, deploy, verify.

## Deployment Flow (current)

Trigger: push to main branch

1. GitHub Actions builds and pushes the server image to GHCR.
2. GitHub Actions uses AWS SSM to run a deploy script on the EC2 instance.
3. EC2 pulls the latest image and recreates only the server container.
4. A readiness loop checks the API endpoint before reporting success.

## Key Files

- `.github/workflows/deploy.yml`
- `apps/server/Dockerfile`
- `apps/server/package.json`
- `pnpm-lock.yaml`
- `infra/deploy/docker-compose.ec2.yml`

## SSM Deploy Details

SSM runs a shell script that:

- Creates `/home/ubuntu/deploy` and writes:
  - `docker-compose.ec2.yml`
  - `mosquitto.conf`
  - `mediamtx.yml`
- Stops and removes only the `myapp-server` container.
- Removes the current server image and runs `docker system prune -af` to free space.
- Logs in to GHCR using `GHCR_USERNAME` and `GHCR_TOKEN`.
- Pulls and recreates only the `server` service.
- Verifies readiness with a curl retry loop.

## Docker Image Optimization

### Why pnpm prune alone failed

The workspace package `@chachamelmelll9-hash-service/supabase` depends on `@supabase/supabase-js`.
When using pruned lockfile + workspace_modules, pnpm placed that dependency under:

`/app/workspace_modules/@chachamelmelll9-hash-service/supabase/node_modules`

But the runtime module resolution for the server expects that package to be
resolvable from the root `node_modules` chain. This caused:

`Error: Cannot find module '@supabase/supabase-js'`

### Fixes applied

1. **Add direct dependency in server**

   - Added `@supabase/supabase-js` to `apps/server/package.json`.
   - Ensures it exists in root `node_modules` for runtime resolution.

2. **Use Nx prune outputs for build**

   - Produces:
     - `apps/server/dist/package.json`
     - `apps/server/dist/pnpm-lock.yaml`
     - `apps/server/dist/workspace_modules`
   - Keeps build inputs minimal and predictable.

3. **Bundle dependencies into the server build**

   - Webpack bundles most dependencies into `dist/`.
   - Externalized only:
     - `file-type`
     - optional native websocket deps (`bufferutil`, `utf-8-validate`)
     - optional Nest microservices/websocket modules
   - Runtime `node_modules` is now minimal.

4. **Remove non-runtime artifacts**

   - Strips `.map`, `.tsbuildinfo`, and non-runtime workspace module files.

5. **Tightened Docker build context**

   - Excluded additional non-server apps and packages in `.dockerignore`.

6. **Distroless runtime image**

   - Uses `gcr.io/distroless/nodejs20-debian12` for a smaller, leaner base.

### Result

Final server image size: 182MB (measured on EC2 with
`docker image ls ghcr.io/product-engineer-community/product-engineer-community-service/server:latest`).

### Size Comparison

- Before optimization: 1.62GB (previous EC2 image size)
- After optimization: 182MB (current EC2 image size)
- Reduction: 1.438GB (~88.8% smaller)

### Optimization Iterations

- Baseline (Nx prune + direct supabase dep): 275MB
- Docker build context trim + build fixes: 277MB
- Bundle deps + minimal runtime `node_modules`: 199MB
- Distroless runtime (fixed CMD): 185MB
- Webpack prod optimization (minify): 183MB
- Bundle `file-type` + drop runtime `node_modules`: 182MB
- Attempted `node:20-alpine` runtime: 199MB (regression, reverted)

## Readiness Check

Replaced a single `sleep 5` check with a retry loop:

- Up to 30 attempts, 2s interval.
- Final `curl -f http://localhost:3000/api` gate.

## Secrets Used (names only)

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `EC2_INSTANCE_ID`
- `GHCR_USERNAME`
- `GHCR_TOKEN`

## Operational Notes

- EC2 deploy directory: `/home/ubuntu/deploy`
- The server uses `.env` in that directory.
- Docker compose chooses `docker compose` if available, otherwise `docker-compose`.

## Known Risks / Follow-ups

- Running `docker system prune -af` during deploy is destructive for unused data.
  Consider a more targeted cleanup if needed.
- If the server startup time grows, readiness retries may need tuning.
- Further image size reduction may be possible by bundling or externalizing
  shared dependencies more aggressively.

## TODO: Additional Optimization Ideas

- Evaluate a custom `node:20-alpine` runtime that removes `npm`/`corepack`
  to see if it can beat the distroless size without breaking runtime.
- Test `esbuild` or SWC minification settings for further `dist/` shrink.
