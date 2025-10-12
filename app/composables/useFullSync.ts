interface FullSyncResponse {
  success: boolean
  message: string
  timestamp: number
  commitHash?: string
  gitOutput?: string
  syncOutput?: string
  error?: string
}

interface VersionCheckResponse {
  success: boolean
  localCommit: string | null
  remoteCommit: string | null
  hasUpdates: boolean
  error?: string
}

interface FullSyncStatus {
  isLoading: boolean
  error: string | null
  lastSyncTime: number | null
  currentStep: string | null
}

export const useFullSync = () => {
  // Use shared state
  const { syncState, lastSyncFormatted, lastCheckedFormatted, updateLastSyncTime, updateLastCheckTime, updateLastRemoteCommit, setAutoSyncing, markStartupCheckComplete } = useSyncState()

  // Version management
  const { fetchVersionInfo } = useAppVersion()

  // Reactive state
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const currentStep = ref<string | null>(null)

  // Check for version differences (for manual checks)
  const checkForUpdates = async (): Promise<boolean> => {
    try {
      const response = await $fetch<VersionCheckResponse>('/api/check-version')
      updateLastCheckTime(Date.now()) // Record when we checked

      if (response.success && response.remoteCommit) {
        updateLastRemoteCommit(response.remoteCommit)
        return response.hasUpdates
      }

      return false
    } catch (err) {
      console.warn('Failed to check for updates:', err)
      updateLastCheckTime(Date.now()) // Record check time even on failure
      return false
    }
  }

  // Clear error state
  const clearError = (): void => {
    error.value = null
  }

  // Perform full sync (git pull + content sync)
  const performFullSync = async (isAutoSync = false): Promise<void> => {
    if (isLoading.value && !syncState.value.isAutoSyncing) {
      console.warn('Full sync already in progress, ignoring request')
      return
    }

    try {
      isLoading.value = true
      error.value = null
      currentStep.value = 'Pulling from repository...'

      console.log(isAutoSync ? 'Starting auto-sync process...' : 'Starting manual sync process...')

      const response = await $fetch<FullSyncResponse>('/api/full-sync', {
        method: 'POST'
      })

      if (response.success) {
        updateLastSyncTime(response.timestamp)

        if (response.commitHash) {
          updateLastRemoteCommit(response.commitHash)
        }

        // Refresh version info after successful sync
        fetchVersionInfo()

        // Show success notification (only for manual sync)
        if (!isAutoSync) {
          const toast = useToast()
          toast.add({
            title: 'Documentation Updated',
            description: response.message,
            icon: 'i-lucide-check-circle',
            color: 'success'
          })
        }

        console.log(isAutoSync ? 'Auto-sync completed successfully' : 'Manual sync completed successfully')
      } else {
        throw new Error(response.error || 'Full sync failed')
      }
    } catch (err: any) {
      console.error('Full sync failed:', err)

      // Extract error message
      const errorMessage = err?.data?.message || err?.message || 'Failed to update documentation'
      error.value = errorMessage

      // Show error notification (only for manual sync or important auto-sync errors)
      if (!isAutoSync || errorMessage.includes('Authentication') || errorMessage.includes('Permission')) {
        const toast = useToast()
        toast.add({
          title: isAutoSync ? 'Auto-Sync Failed' : 'Sync Failed',
          description: errorMessage,
          icon: 'i-lucide-alert-circle',
          color: 'error'
        })
      }
    } finally {
      isLoading.value = false
      currentStep.value = null
    }
  }

  // Computed status object
  const fullSyncStatus = computed<FullSyncStatus>(() => ({
    isLoading: isLoading.value,
    error: error.value,
    lastSyncTime: syncState.value.lastSyncTime,
    currentStep: currentStep.value
  }))

  return {
    // State
    isLoading: readonly(isLoading),
    error: readonly(error),
    lastSyncFormatted: readonly(lastSyncFormatted),
    lastCheckedFormatted: readonly(lastCheckedFormatted),
    currentStep: readonly(currentStep),
    fullSyncStatus: readonly(fullSyncStatus),

    // Actions
    performFullSync,
    clearError,
    checkForUpdates
  }
}
