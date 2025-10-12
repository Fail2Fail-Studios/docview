import type { PresenceTabEntry, PresenceSnapshot, PresenceSnapshotUser } from '../../types/presence'

const PRESENCE_TTL_MS = 45_000 // 45 seconds

// Module-scoped singleton registry
const registry = new Map<string, Map<string, PresenceTabEntry>>()

function cleanup() {
  const now = Date.now()
  for (const [pagePath, tabs] of registry.entries()) {
    for (const [tabId, entry] of tabs.entries()) {
      if (now - entry.lastSeenAt > PRESENCE_TTL_MS) {
        tabs.delete(tabId)
      }
    }
    if (tabs.size === 0) {
      registry.delete(pagePath)
    }
  }
}

export function usePresenceRegistry() {
  return {
    join(pagePath: string, tabId: string, userId: string): void {
      cleanup()
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
      cleanup()
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
      cleanup()
      const tabs = registry.get(pagePath)
      if (tabs) {
        tabs.delete(tabId)
        if (tabs.size === 0) {
          registry.delete(pagePath)
        }
      }
    },

    async list(pagePath: string, getUserData: (userId: string) => Promise<{ id: string, name: string, avatar?: string }>): Promise<PresenceSnapshot> {
      cleanup()
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

    cleanup
  }
}
