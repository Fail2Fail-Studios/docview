import type { PresenceTabEntry, PresenceSnapshot, PresenceSnapshotUser } from '../../types/presence'
import { getPresenceTTL, PRESENCE_CLEANUP_INTERVAL } from '../../app/constants'

// Module-scoped singleton registry
const registry = new Map<string, Map<string, PresenceTabEntry>>()

// Scheduled cleanup interval
let cleanupInterval: NodeJS.Timeout | null = null
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  const ttl = getPresenceTTL()
  let cleanedCount = 0

  for (const [pagePath, tabs] of registry.entries()) {
    for (const [tabId, entry] of tabs.entries()) {
      if (now - entry.lastSeenAt > ttl) {
        tabs.delete(tabId)
        cleanedCount++
      }
    }
    if (tabs.size === 0) {
      registry.delete(pagePath)
    }
  }

  if (cleanedCount > 0) {
    console.log(`[PresenceRegistry] Cleaned up ${cleanedCount} expired presence entries`)
  }

  lastCleanup = now
}

// Start scheduled cleanup if not already running
function ensureCleanupScheduled() {
  if (!cleanupInterval) {
    cleanupInterval = setInterval(() => {
      cleanup()
    }, PRESENCE_CLEANUP_INTERVAL)

    console.log(`[PresenceRegistry] Started scheduled cleanup every ${PRESENCE_CLEANUP_INTERVAL / 1000}s`)
  }
}

// Initialize cleanup on first use
ensureCleanupScheduled()

export function usePresenceRegistry() {
  return {
    join(pagePath: string, tabId: string, userId: string): void {
      // No longer call cleanup on every operation - scheduled cleanup handles it
      if (!registry.has(pagePath)) {
        registry.set(pagePath, new Map())
      }
      const tabs = registry.get(pagePath)!
      tabs.set(tabId, {
        userId,
        lastSeenAt: Date.now(),
        isEditing: false
      })
    },

    heartbeat(pagePath: string, tabId: string, userId: string, isEditing: boolean): void {
      // No longer call cleanup on every operation - scheduled cleanup handles it
      if (!registry.has(pagePath)) {
        registry.set(pagePath, new Map())
      }
      const tabs = registry.get(pagePath)!
      tabs.set(tabId, {
        userId,
        lastSeenAt: Date.now(),
        isEditing
      })
    },

    leave(pagePath: string, tabId: string): void {
      // No longer call cleanup on every operation - scheduled cleanup handles it
      const tabs = registry.get(pagePath)
      if (tabs) {
        tabs.delete(tabId)
        if (tabs.size === 0) {
          registry.delete(pagePath)
        }
      }
    },

    async list(pagePath: string, getUserData: (userId: string) => Promise<{ id: string, name: string, avatar?: string }>): Promise<PresenceSnapshot> {
      // Check if cleanup needed (only if it's been a while since last cleanup)
      const now = Date.now()
      if (now - lastCleanup > PRESENCE_CLEANUP_INTERVAL) {
        cleanup()
      }

      const tabs = registry.get(pagePath)
      if (!tabs || tabs.size === 0) {
        return {
          pagePath,
          viewers: [],
          editorUserId: undefined
        }
      }

      // Aggregate by userId
      const userTabCounts = new Map<string, number>()
      let editorUserId: string | undefined

      for (const [, entry] of tabs.entries()) {
        userTabCounts.set(entry.userId, (userTabCounts.get(entry.userId) || 0) + 1)
        if (entry.isEditing) {
          editorUserId = entry.userId
        }
      }

      // Resolve user metadata
      const viewers: PresenceSnapshotUser[] = []
      for (const [userId, tabCount] of userTabCounts.entries()) {
        const userData = await getUserData(userId)
        viewers.push({
          ...userData,
          tabCount
        })
      }

      return {
        pagePath,
        viewers,
        editorUserId
      }
    },

    // Manual cleanup trigger (for testing or emergency use)
    cleanup,

    // Stop scheduled cleanup (for testing or shutdown)
    stopCleanup() {
      if (cleanupInterval) {
        clearInterval(cleanupInterval)
        cleanupInterval = null
        console.log('[PresenceRegistry] Stopped scheduled cleanup')
      }
    }
  }
}
