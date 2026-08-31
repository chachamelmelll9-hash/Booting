# =============================================================================
# Multi-Stage Dockerfile for NestJS Server
# Build time: ~30s (cache hit) / ~3min (cold build)
# Note: Uses filtered production install to avoid pnpm prune issues
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 0: Base
# - Shared PNPM setup
# -----------------------------------------------------------------------------
FROM node:20-alpine AS base

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# - Cached independently from code changes
# - Only invalidated when package.json or lockfile changes
# -----------------------------------------------------------------------------
FROM base AS deps

ENV PNPM_CONFIG_NODE_LINKER=hoisted

# Copy only package files (layer cache optimization)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json ./apps/server/
COPY packages/supabase/package.json ./packages/supabase/

# Install all dependencies (dev included for build)
RUN pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# Stage 2: Builder
# - Compiles TypeScript to JavaScript
# - Runs Turborepo build for server and dependencies
# -----------------------------------------------------------------------------
FROM base AS builder

WORKDIR /app

# Copy dependencies from previous stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=deps /app/packages/supabase/node_modules ./packages/supabase/node_modules

# Copy source code and config files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json tsconfig.base.json ./
COPY apps/server ./apps/server
COPY packages/supabase ./packages/supabase

# Build packages using Turborepo
RUN pnpm turbo run build --filter=@product-engineer-community-service/server && \
    find apps/server/dist -type f \( -name "*.map" -o -name "*.tsbuildinfo" \) -delete 2>/dev/null || true

# -----------------------------------------------------------------------------
# Stage 3: Runner
# - Distroless runtime image with bundled deps
# -----------------------------------------------------------------------------
FROM gcr.io/distroless/nodejs20-debian12 AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy built artifacts and node_modules (webpack externalizes node_modules)
COPY --from=builder /app/apps/server/dist ./dist
COPY --from=deps /app/node_modules ./node_modules

USER 65532

EXPOSE 3000

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["node","-e","require('http').get('http://localhost:3000/api/health',res=>process.exit(res.statusCode===200?0:1)).on('error',()=>process.exit(1))"]

CMD ["dist/main.js"]
