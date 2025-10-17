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

# Copy all source files
COPY . .

# Ensure entrypoint is executable for build-time git operations
RUN chmod +x scripts/entrypoint.sh

# Clone content repository during build if URL provided
RUN if [ -n "${NUXT_GIT_REPO_URL}" ]; then \
      echo "[builder] Cloning content for build..."; \
      export NUXT_GIT_REPO_URL="${NUXT_GIT_REPO_URL}"; \
      export NUXT_GIT_BRANCH="${NUXT_GIT_BRANCH}"; \
      export NUXT_GIT_USERNAME="${NUXT_GIT_USERNAME}"; \
      export NUXT_GIT_TOKEN="${NUXT_GIT_TOKEN}"; \
      bash scripts/entrypoint.sh echo "Content synced for build"; \
    else \
      echo "[builder] No NUXT_GIT_REPO_URL provided, building without external content"; \
    fi

# Build the Nuxt application (content must exist before this step)
RUN pnpm build

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
