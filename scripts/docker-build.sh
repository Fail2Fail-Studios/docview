#!/usr/bin/env bash
set -euo pipefail

echo "[docker-build] Starting Nuxt build at $(date)"
echo "[docker-build] Current working directory: $(pwd)"
echo "[docker-build] Node version: $(node --version)"
echo "[docker-build] pnpm version: $(pnpm --version)"

# Run the build
pnpm build

# Get the exit code
BUILD_EXIT_CODE=$?

echo "[docker-build] Build completed with exit code: ${BUILD_EXIT_CODE}"

# Force kill any background processes that might be lingering
echo "[docker-build] Checking for lingering processes..."
ps aux | grep node | grep -v grep || true

# Explicitly exit with the build's exit code
echo "[docker-build] Exiting cleanly at $(date)"
exit ${BUILD_EXIT_CODE}

