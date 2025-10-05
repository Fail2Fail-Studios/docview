#!/usr/bin/env bash
set -euo pipefail

# Directories
APP_DIR="/usr/src/app"
DOCS_DIR="/usr/src/una"

# Environment-driven configuration
REPO_URL="${NUXT_GIT_REPO_URL:-}"
BRANCH="${NUXT_GIT_BRANCH:-main}"
USERNAME="${NUXT_GIT_USERNAME:-}"
TOKEN="${NUXT_GIT_TOKEN:-}"
COMMIT_NAME="${NUXT_GIT_COMMIT_NAME:-Docs Bot}"
COMMIT_EMAIL="${NUXT_GIT_COMMIT_EMAIL:-docs@fail2.fail}"

echo "[entrypoint] Starting container initialization..."

# Ensure directories exist
mkdir -p "$DOCS_DIR"

# Clone or update docs repository if URL provided
if [[ -n "$REPO_URL" ]]; then
  echo "[entrypoint] Docs repo URL detected: $REPO_URL"

  AUTH_URL="$REPO_URL"
  if [[ -n "$USERNAME" && -n "$TOKEN" ]]; then
    # Inject basic auth into URL for non-interactive pulls
    AUTH_URL="${REPO_URL/https:\/\//https:\/\/$USERNAME:$TOKEN@}"
  fi

  if [[ ! -d "$DOCS_DIR/.git" ]]; then
    echo "[entrypoint] Cloning docs repo into $DOCS_DIR (branch: $BRANCH)"
    git clone --branch "$BRANCH" "$AUTH_URL" "$DOCS_DIR" || {
      echo "[entrypoint] ERROR: Failed to clone repository" >&2
      exit 1
    }
    echo "[entrypoint] Clone completed successfully"
  else
    echo "[entrypoint] Updating existing docs repo in $DOCS_DIR"
    git -C "$DOCS_DIR" remote set-url origin "$AUTH_URL" || true
    git -C "$DOCS_DIR" fetch --all --prune || true
    git -C "$DOCS_DIR" checkout "$BRANCH" || true
    git -C "$DOCS_DIR" pull --rebase origin "$BRANCH" || true
  fi

  # Configure identity and mark directory safe
  git -C "$DOCS_DIR" config user.name "$COMMIT_NAME" || true
  git -C "$DOCS_DIR" config user.email "$COMMIT_EMAIL" || true
  git config --global --add safe.directory "$DOCS_DIR" || true

  echo "[entrypoint] Docs repo ready at $DOCS_DIR"

  # Sync content to app directory before starting
  SYNC_SOURCE="${NUXT_SYNC_SOURCE_PATH:-$DOCS_DIR/content}"
  SYNC_DEST="${NUXT_SYNC_DESTINATION_PATH:-$APP_DIR/content}"

  if [[ -d "$SYNC_SOURCE" ]]; then
    echo "[entrypoint] Syncing content from $SYNC_SOURCE to $SYNC_DEST"
    mkdir -p "$SYNC_DEST"
    rsync -av --delete "$SYNC_SOURCE/" "$SYNC_DEST/" || {
      echo "[entrypoint] WARNING: Content sync failed, continuing anyway" >&2
    }
    echo "[entrypoint] Content sync completed"
  else
    echo "[entrypoint] WARNING: Source content directory not found: $SYNC_SOURCE" >&2
  fi
else
  echo "[entrypoint] No NUXT_GIT_REPO_URL provided; skipping docs clone/update"
fi

echo "[entrypoint] Launching app: $*"
exec "$@"


