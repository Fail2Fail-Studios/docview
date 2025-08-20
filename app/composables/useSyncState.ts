interface SyncState {
  lastSyncTime: number | null
  lastCheckTime: number | null
  lastRemoteCommit: string | null
  isAutoSyncing: boolean
  hasCheckedOnStartup: boolean
}

export const useSyncState = () => {
  // Global state using Nuxt's useState
  const syncState = useState<SyncState>('sync-state', () => ({
    lastSyncTime: null,
    lastCheckTime: null,
    lastRemoteCommit: null,
    isAutoSyncing: false,
    hasCheckedOnStartup: false
  }))

  // Update last sync time
  const updateLastSyncTime = (timestamp: number): void => {
    syncState.value.lastSyncTime = timestamp
  }

  // Update last check time
  const updateLastCheckTime = (timestamp: number): void => {
    syncState.value.lastCheckTime = timestamp
  }

  // Update last remote commit
  const updateLastRemoteCommit = (commit: string): void => {
    syncState.value.lastRemoteCommit = commit
  }

  // Set auto-syncing state
  const setAutoSyncing = (isAutoSyncing: boolean): void => {
    syncState.value.isAutoSyncing = isAutoSyncing
  }

  // Mark startup check as completed
  const markStartupCheckComplete = (): void => {
    syncState.value.hasCheckedOnStartup = true
  }

  // Format last sync time for display
  const lastSyncFormatted = computed(() => {
    if (!syncState.value.lastSyncTime) return 'Never synced'

    const date = new Date(syncState.value.lastSyncTime)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`

    return date.toLocaleDateString()
  })

  // Format last check time for display
  const lastCheckedFormatted = computed(() => {
    if (!syncState.value.lastCheckTime) return 'Never checked'

    const date = new Date(syncState.value.lastCheckTime)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`

    return date.toLocaleDateString()
  })

  return {
    // State (readonly)
    syncState: readonly(syncState),
    lastSyncFormatted: readonly(lastSyncFormatted),
    lastCheckedFormatted: readonly(lastCheckedFormatted),

    // Actions
    updateLastSyncTime,
    updateLastCheckTime,
    updateLastRemoteCommit,
    setAutoSyncing,
    markStartupCheckComplete
  }
}
