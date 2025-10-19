import { PRESENCE_HEARTBEAT_INTERVAL, PRESENCE_HEARTBEAT_THROTTLE_MS } from '~/app/constants'

export interface PresenceSnapshotUser {
  id: string
  name: string
  avatar?: string
  tabCount: number
}

export interface UsePagePresence {
  viewers: Ref<PresenceSnapshotUser[]>
  editorUserId: Ref<string | undefined>
  isEditing: Ref<boolean>
  setIsEditing: (next: boolean) => void
}

export function usePagePresence(pagePath: MaybeRefOrGetter<string>): UsePagePresence {
  const route = useRoute()
  const isEditing = ref(false)

  // Throttling state for heartbeat
  let lastHeartbeatTime = 0
  let throttledHeartbeatTimeout: NodeJS.Timeout | null = null

  // Generate or retrieve tab ID
  const getTabId = () => {
    if (import.meta.server) return ''
    const key = 'presence:tab-id'
    let tabId = sessionStorage.getItem(key)
    if (!tabId) {
      tabId = crypto.randomUUID()
      sessionStorage.setItem(key, tabId)
    }
    return tabId
  }

  const tabId = ref('')
  const currentPath = computed(() => toValue(pagePath))

  // Poll presence list
  const { data: presenceData, refresh: refreshPresence } = useFetch('/api/presence/list', {
    server: false,
    lazy: true,
    query: {
      pagePath: currentPath
    },
    default: () => ({
      pagePath: currentPath.value,
      viewers: [],
      editorUserId: undefined
    })
  })

  const viewers = computed(() => presenceData.value?.viewers || [])
  const editorUserId = computed(() => presenceData.value?.editorUserId)

  let heartbeatInterval: NodeJS.Timeout | null = null
  let pollInterval: NodeJS.Timeout | null = null

  const sendJoin = async () => {
    if (!tabId.value) return
    try {
      await $fetch('/api/presence/join', {
        method: 'POST',
        body: {
          pagePath: currentPath.value,
          tabId: tabId.value
        }
      })
    } catch (error) {
      console.error('[usePagePresence] Failed to join:', error)
    }
  }

  const sendHeartbeat = async () => {
    if (!tabId.value) return

    const now = Date.now()
    const timeSinceLastHeartbeat = now - lastHeartbeatTime

    // If enough time has passed, send immediately
    if (timeSinceLastHeartbeat >= PRESENCE_HEARTBEAT_THROTTLE_MS) {
      lastHeartbeatTime = now
      try {
        await $fetch('/api/presence/heartbeat', {
          method: 'POST',
          body: {
            pagePath: currentPath.value,
            tabId: tabId.value,
            isEditing: isEditing.value
          }
        })
      } catch (error) {
        console.error('[usePagePresence] Failed to send heartbeat:', error)
      }
    } else {
      // Otherwise, schedule for later (throttled)
      if (throttledHeartbeatTimeout) {
        clearTimeout(throttledHeartbeatTimeout)
      }

      const timeUntilNextAllowed = PRESENCE_HEARTBEAT_THROTTLE_MS - timeSinceLastHeartbeat
      throttledHeartbeatTimeout = setTimeout(async () => {
        lastHeartbeatTime = Date.now()
        try {
          await $fetch('/api/presence/heartbeat', {
            method: 'POST',
            body: {
              pagePath: currentPath.value,
              tabId: tabId.value,
              isEditing: isEditing.value
            }
          })
        } catch (error) {
          console.error('[usePagePresence] Failed to send throttled heartbeat:', error)
        }
      }, timeUntilNextAllowed)
    }
  }

  const sendLeave = async () => {
    if (!tabId.value) return
    try {
      await $fetch('/api/presence/leave', {
        method: 'POST',
        body: {
          pagePath: currentPath.value,
          tabId: tabId.value
        }
        // keepalive ensures the request completes even if page is closing
      })
    } catch (error) {
      console.error('[usePagePresence] Failed to leave:', error)
    }
  }

  const startHeartbeat = () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
    }
    heartbeatInterval = setInterval(() => {
      sendHeartbeat()
    }, PRESENCE_HEARTBEAT_INTERVAL)
  }

  const startPolling = () => {
    if (pollInterval) {
      clearInterval(pollInterval)
    }
    pollInterval = setInterval(() => {
      refreshPresence()
    }, 15_000) // Every 15 seconds
  }

  const stopIntervals = () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
      heartbeatInterval = null
    }
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
    if (throttledHeartbeatTimeout) {
      clearTimeout(throttledHeartbeatTimeout)
      throttledHeartbeatTimeout = null
    }
  }

  const setIsEditing = (next: boolean) => {
    isEditing.value = next
    // Send immediate heartbeat to update editing state
    sendHeartbeat()
  }

  // Initialize on client only
  onMounted(() => {
    tabId.value = getTabId()
    sendJoin()
    startHeartbeat()
    startPolling()
    refreshPresence()

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat()
        refreshPresence()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Handle unload
    const handleUnload = () => {
      sendLeave()
    }
    window.addEventListener('beforeunload', handleUnload)
    window.addEventListener('pagehide', handleUnload)

    // Cleanup on unmount
    onBeforeUnmount(() => {
      stopIntervals()
      sendLeave()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleUnload)
      window.removeEventListener('pagehide', handleUnload)
    })
  })

  // Watch for route changes and re-join
  watch(() => route.path, (newPath, oldPath) => {
    if (newPath !== oldPath && tabId.value) {
      sendLeave()
      sendJoin()
      refreshPresence()
    }
  })

  return {
    viewers,
    editorUserId,
    isEditing,
    setIsEditing
  }
}
