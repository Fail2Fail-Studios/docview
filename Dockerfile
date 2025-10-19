# syntax=docker/dockerfile:1.6

# ============================================
# Base Stage - Dependencies Installation
# ============================================
FROM node:20-bullseye AS base

# Install build tools for native deps (sharp, better-sqlite3, etc.)
RUN apt-get update && apt-get install -y \
    git \
    rsync \
    python3 \
    make \
    g++ \
  && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /usr/src/app

# Enable corepack and set pnpm version
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@10.18.0 --activate

# Copy only package files first for better caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# ============================================
# Development Stage - Hot-reload with volumes
# ============================================
FROM base AS development

# Copy the rest of the app (volumes will override in compose)
COPY . .

# Ensure entrypoint is executable
RUN chmod +x scripts/entrypoint.sh

# Expose dev port
EXPOSE 3000

# Dev mode uses entrypoint for git clone/sync
ENTRYPOINT ["/usr/bin/env", "bash", "/usr/src/app/scripts/entrypoint.sh"]
CMD ["pnpm", "dev", "--host", "0.0.0.0"]

# ============================================
# Builder Stage - Create production build
# ============================================
FROM base AS builder

# Build args for git content sync
ARG NUXT_GIT_REPO_URL
ARG NUXT_GIT_BRANCH=main
ARG NUXT_GIT_USERNAME
ARG NUXT_GIT_TOKEN

# Set CI mode to prevent interactive prompts and force clean exits
ENV CI=true
ENV NODE_ENV=production
# Disable file watchers and dev-only features
ENV CHOKIDAR_USEPOLLING=false
ENV WATCHPACK_POLLING=false
ENV NO_COLOR=1

# Copy all source files
COPY . .

# Ensure scripts are executable for build-time operations
RUN chmod +x scripts/entrypoint.sh scripts/docker-build.sh

# Clone content repository during build if URL provided
RUN if [ -n "${NUXT_GIT_REPO_URL}" ]; then \
      echo "[builder] ===== Starting content sync at $(date) ====="; \
      export NUXT_GIT_REPO_URL="${NUXT_GIT_REPO_URL}"; \
      export NUXT_GIT_BRANCH="${NUXT_GIT_BRANCH}"; \
      export NUXT_GIT_USERNAME="${NUXT_GIT_USERNAME}"; \
      export NUXT_GIT_TOKEN="${NUXT_GIT_TOKEN}"; \
      timeout 300 bash scripts/entrypoint.sh echo "Content synced for build" || true; \
      echo "[builder] ===== Content sync completed at $(date) ====="; \
    else \
      echo "[builder] No NUXT_GIT_REPO_URL provided, building without external content"; \
    fi

# Build the Nuxt application (content must exist before this step)
# Use wrapper script with timeout to ensure clean exit
RUN set -x && \
    echo "[builder] ===== Starting build process at $(date) =====" && \
    echo "[builder] Process list before build:" && \
    ps aux | head -20 && \
    echo "[builder] Starting build with 600s timeout..." && \
    timeout --foreground --kill-after=10s 600s bash scripts/docker-build.sh; \
    exit_code=$?; \
    echo "[builder] Build wrapper exit code: ${exit_code}" && \
    echo "[builder] ===== Build process completed at $(date) =====" && \
    echo "[builder] Process list after build:" && \
    ps aux | head -20 && \
    echo "[builder] Aggressively killing any lingering node processes..." && \
    pkill -9 -f "node.*nuxt" || true && \
    pkill -9 -f "node.*vite" || true && \
    pkill -9 node || true && \
    sleep 3 && \
    echo "[builder] Final process check:" && \
    ps aux | grep -E "node|pnpm" | grep -v grep || echo "No node processes found" && \
    echo "[builder] ===== Build stage complete at $(date) =====" && \
    if [ ${exit_code} -eq 124 ] || [ ${exit_code} -eq 137 ]; then \
      echo "[builder] ERROR: Build timed out!" && exit 1; \
    elif [ ${exit_code} -ne 0 ]; then \
      echo "[builder] ERROR: Build failed with exit code ${exit_code}" && exit ${exit_code}; \
    fi

# ============================================
# Production Stage - Serve built .output
# ============================================
FROM node:20-bullseye-slim AS production

# Install minimal runtime dependencies (git for content sync, if needed)
RUN apt-get update && apt-get install -y \
    git \
    rsync \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy built application from builder
COPY --from=builder /usr/src/app/.output ./.output

# Copy package.json for metadata (optional but good practice)
COPY --from=builder /usr/src/app/package.json ./

# Copy entrypoint script for runtime content sync
COPY --from=builder /usr/src/app/scripts/entrypoint.sh ./scripts/entrypoint.sh
RUN chmod +x scripts/entrypoint.sh

# Expose production port (3000 internally, mapped externally)
EXPOSE 3000

# Set NODE_ENV to production
ENV NODE_ENV=production

# Use entrypoint for git sync, then start the production server
ENTRYPOINT ["/usr/bin/env", "bash", "/usr/src/app/scripts/entrypoint.sh"]
CMD ["node", ".output/server/index.mjs"]
