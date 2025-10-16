#!/usr/bin/env bash
set -euo pipefail

# Directories
APP_DIR="/usr/src/app"
UNA_REPO_DIR="/usr/src/app/una-repo"
CONTENT_SYMLINK="/usr/src/app/content"

# Environment-driven configuration
REPO_URL="${NUXT_GIT_REPO_URL:-}"
BRANCH="${NUXT_GIT_BRANCH:-main}"
USERNAME="${NUXT_GIT_USERNAME:-}"
TOKEN="${NUXT_GIT_TOKEN:-}"
COMMIT_NAME="${NUXT_GIT_COMMIT_NAME:-Docs Bot}"
COMMIT_EMAIL="${NUXT_GIT_COMMIT_EMAIL:-docs@fail2.fail}"

echo "[entrypoint] Starting container initialization..."

# Ensure directories exist
mkdir -p "$UNA_REPO_DIR"

# Clone or update docs repository if URL provided
if [[ -n "$REPO_URL" ]]; then
  echo "[entrypoint] Docs repo URL detected: $REPO_URL"

  AUTH_URL="$REPO_URL"
  if [[ -n "$USERNAME" && -n "$TOKEN" ]]; then
    # Inject basic auth into URL for non-interactive pulls
    AUTH_URL="${REPO_URL/https:\/\//https:\/\/$USERNAME:$TOKEN@}"
  fi

  if [[ ! -d "$UNA_REPO_DIR/.git" ]]; then
    echo "[entrypoint] Cloning docs repo into $UNA_REPO_DIR (branch: $BRANCH)"
    git clone --branch "$BRANCH" "$AUTH_URL" "$UNA_REPO_DIR" || {
      echo "[entrypoint] ERROR: Failed to clone repository" >&2
      exit 1
    }
    echo "[entrypoint] Clone completed successfully"
  else
    echo "[entrypoint] Updating existing docs repo in $UNA_REPO_DIR"
    git -C "$UNA_REPO_DIR" remote set-url origin "$AUTH_URL" || true
    git -C "$UNA_REPO_DIR" fetch --all --prune || true
    git -C "$UNA_REPO_DIR" checkout "$BRANCH" || true
    git -C "$UNA_REPO_DIR" pull --rebase origin "$BRANCH" || true
  fi

  # Configure identity and mark directory safe
  git -C "$UNA_REPO_DIR" config user.name "$COMMIT_NAME" || true
  git -C "$UNA_REPO_DIR" config user.email "$COMMIT_EMAIL" || true
  git config --global --add safe.directory "$UNA_REPO_DIR" || true

  echo "[entrypoint] Docs repo ready at $UNA_REPO_DIR"

  # Create symlink from app/content to una-repo/content
  if [[ -L "$CONTENT_SYMLINK" ]]; then
    echo "[entrypoint] Symlink already exists at $CONTENT_SYMLINK"
  elif [[ -d "$CONTENT_SYMLINK" ]]; then
    echo "[entrypoint] Moving existing content directory to content.old"
    mv "$CONTENT_SYMLINK" "${CONTENT_SYMLINK}.old"
    ln -sf "$UNA_REPO_DIR/content" "$CONTENT_SYMLINK"
    echo "[entrypoint] Created symlink: $CONTENT_SYMLINK -> $UNA_REPO_DIR/content"
  else
    ln -sf "$UNA_REPO_DIR/content" "$CONTENT_SYMLINK"
    echo "[entrypoint] Created symlink: $CONTENT_SYMLINK -> $UNA_REPO_DIR/content"
  fi

  # Verify symlink
  if [[ -L "$CONTENT_SYMLINK" && -d "$UNA_REPO_DIR/content" ]]; then
    echo "[entrypoint] Content symlink verified successfully"
  else
    echo "[entrypoint] WARNING: Content symlink verification failed" >&2
  fi
else
  echo "[entrypoint] No NUXT_GIT_REPO_URL provided; skipping docs clone/update"
fi

echo "[entrypoint] Launching app: $*"
exec "$@"


