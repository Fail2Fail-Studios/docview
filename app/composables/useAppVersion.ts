interface AppVersionInfo {
  version: string
  commit: string
  lastUpdated: number | null
}

interface VersionResponse {
  success: boolean
  version: string
  commit: string
  timestamp: number
  error?: string
}

export const useAppVersion = () => {
  // Reactive state for version info
  const versionInfo = ref<AppVersionInfo>({
    version: 'v1.0.0', // fallback version
    commit: '',
    lastUpdated: null
  })

  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Fetch version information from server
  const fetchVersionInfo = async (): Promise<void> => {
    if (isLoading.value) {
      return
    }

    try {
      isLoading.value = true
      error.value = null

      const response = await $fetch<VersionResponse>('/api/app-version')

      if (response.success) {
        versionInfo.value = {
          version: response.version,
          commit: response.commit,
          lastUpdated: response.timestamp
        }
      } else {
        throw new Error(response.error || 'Failed to fetch version info')
      }

    } catch (err: any) {
      console.warn('Failed to fetch version info:', err)
      error.value = err?.message || 'Failed to fetch version'

      // Keep existing version info on error, just update timestamp
      if (versionInfo.value.lastUpdated === null) {
        versionInfo.value.lastUpdated = Date.now()
      }

    } finally {
      isLoading.value = false
    }
  }

  // Update version info (called after sync operations)
  const updateVersionInfo = (newVersion: string, newCommit: string): void => {
    versionInfo.value = {
      version: newVersion,
      commit: newCommit,
      lastUpdated: Date.now()
    }
  }

  // Computed display version
  const displayVersion = computed(() => {
    return versionInfo.value.version
  })

  // Computed short commit hash (7 characters)
  const shortCommit = computed(() => {
    return versionInfo.value.commit ? versionInfo.value.commit.substring(0, 7) : ''
  })

  // Computed full version string with commit
  const fullVersionString = computed(() => {
    const commit = shortCommit.value
    return commit ? `${versionInfo.value.version} (${commit})` : versionInfo.value.version
  })

  return {
    // State
    versionInfo: readonly(versionInfo),
    isLoading: readonly(isLoading),
    error: readonly(error),

    // Actions
    fetchVersionInfo,
    updateVersionInfo,

    // Computed
    displayVersion,
    shortCommit,
    fullVersionString
  }
}
