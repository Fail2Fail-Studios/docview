import type { VersionCheckResponse, FullSyncResponse } from '~/types/sync'

export default defineNuxtPlugin(async () => {
  // Only run startup sync logic once when the app initializes
  const { syncState, updateLastSyncTime, updateLastCheckTime, updateLastRemoteCommit, setAutoSyncing, markStartupCheckComplete } = useSyncState()

  // Check if we've already done the startup check
  if (syncState.value.hasCheckedOnStartup) {
    return
  }

  // Auto-sync on startup if there are updates
  const autoSyncIfNeeded = async (): Promise<void> => {
    try {
      setAutoSyncing(true)
      console.log('Checking for documentation updates on startup...')

      // Check for version differences
      const response = await $fetch<VersionCheckResponse>('/api/check-version')
      updateLastCheckTime(Date.now()) // Record when we checked

      let hasUpdates = false

      if (response.success && response.remoteCommit) {
        updateLastRemoteCommit(response.remoteCommit)
        hasUpdates = response.hasUpdates
      }

      if (hasUpdates) {
        console.log('Updates detected, performing auto-sync...')

        // Perform git pull (content is immediately available via symlink)
        const syncResponse = await $fetch<FullSyncResponse>('/api/git-pull', {
          method: 'POST'
        })

        if (syncResponse.success) {
          updateLastSyncTime(syncResponse.timestamp)
          // No commitHash in git-pull response, but we already have remoteCommit from check-version

          // Refresh version info after successful auto-sync
          const { fetchVersionInfo } = useAppVersion()
          fetchVersionInfo()

          console.log('Auto-sync completed successfully')
        } else {
          throw new Error(syncResponse.error || 'Auto-sync failed')
        }
      } else {
        console.log('Documentation is up to date')
        // Set initial timestamp if none exists
        if (!syncState.value.lastSyncTime) {
          updateLastSyncTime(Date.now())
        }
      }
    } catch (err) {
      console.warn('Auto-sync failed:', err)
      // Set initial timestamp even if auto-sync fails
      if (!syncState.value.lastSyncTime) {
        updateLastSyncTime(Date.now())
      }
    } finally {
      setAutoSyncing(false)
      markStartupCheckComplete()
    }
  }

  // Set initial timestamps if none exist
  if (!syncState.value.lastSyncTime) {
    updateLastSyncTime(Date.now())
  }
  if (!syncState.value.lastCheckTime) {
    updateLastCheckTime(Date.now())
  }

  // Check for updates after app is fully interactive (increased from 2s to 5s)
  // This prevents blocking the UI during initial render
  setTimeout(autoSyncIfNeeded, 5000)
})
