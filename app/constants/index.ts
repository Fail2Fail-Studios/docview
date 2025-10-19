/**
 * Application Constants
 *
 * Centralized configuration for timeouts, intervals, and other magic numbers.
 * Many values are derived from runtime config to maintain consistency.
 */

/**
 * Editor Lock Timeouts
 *
 * The lock timeout is the base value from which other timeouts are derived:
 * - Keep-alive interval: lock_timeout / 2 (sends heartbeat at halfway point)
 * - Lock warning time: lock_timeout - 5 minutes (warns 5 minutes before expiry)
 */
export function getEditorLockTimeout(): number {
  if (import.meta.server) {
    const config = useRuntimeConfig()
    return config.editorLockTimeoutMs || 1800000 // Default: 30 minutes
  }
  // Client-side: use default, will be synced via lock response
  return 1800000 // 30 minutes
}

export function getEditorKeepAliveInterval(): number {
  return getEditorLockTimeout() / 2 // Send keep-alive at halfway point
}

export function getEditorLockWarningTime(): number {
  return getEditorLockTimeout() - 300000 // Warn 5 minutes before expiry
}

/**
 * Presence System Timeouts
 */
export function getPresenceTTL(): number {
  if (import.meta.server) {
    const config = useRuntimeConfig()
    return config.presenceTtlMs || 45000 // Default: 45 seconds
  }
  // Client-side: use default
  return 45000 // 45 seconds
}

export const PRESENCE_HEARTBEAT_INTERVAL = 30000 // 30 seconds (client-side)
export const PRESENCE_CLEANUP_INTERVAL = 30000 // 30 seconds (server-side scheduled cleanup)

/**
 * Git Operation Timeouts
 */
export function getGitTimeout(): number {
  if (import.meta.server) {
    const config = useRuntimeConfig()
    return config.gitTimeout || 60000 // Default: 60 seconds
  }
  return 60000
}

/**
 * Editor Content Update Debouncing
 */
export const EDITOR_CONTENT_DEBOUNCE_MS = 300 // 300ms debounce for content changes

/**
 * Presence Heartbeat Throttling
 */
export const PRESENCE_HEARTBEAT_THROTTLE_MS = 5000 // Max once per 5 seconds

