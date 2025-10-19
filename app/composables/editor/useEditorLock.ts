/**
 * Editor Lock Management
 *
 * Handles lock acquisition, extension (keep-alive), and release.
 */

import { getEditorLockTimeout, getEditorKeepAliveInterval, getEditorLockWarningTime } from '~/app/constants'
import type { EditorState } from './useEditorState'

export const useEditorLock = () => {
  const toast = useToast()
  let keepAliveInterval: NodeJS.Timeout | null = null
  let lockWarningTimeout: NodeJS.Timeout | null = null

  // Get state from useEditorState
  const state = useState<EditorState>('editor')

  // Start lock keep-alive interval
  const startKeepAlive = () => {
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval)
    }

    const keepAliveIntervalMs = getEditorKeepAliveInterval()
    const lockTimeoutMs = getEditorLockTimeout()
    const lockWarningMs = getEditorLockWarningTime()

    keepAliveInterval = setInterval(async () => {
      if (!state.value.isEnabled || !state.value.filePath) {
        stopKeepAlive()
        return
      }

      try {
        const response = await $fetch(`/api/editor/extend-lock/${encodeURIComponent(state.value.filePath)}`, {
          method: 'POST',
          body: {
            tabId: state.value.tabId
          }
        })

        if (response.success) {
          state.value.lockExpiresAt = new Date(response.lock.expiresAt)
          console.log('[useEditorLock] Lock extended successfully')
        }
      } catch (error: any) {
        console.error('[useEditorLock] Failed to extend lock:', error)
        toast.add({
          title: 'Lock expired',
          description: 'Your editing session has expired. Please save your work and try again.',
          color: 'red',
          icon: 'i-lucide-lock'
        })
        stopKeepAlive()
      }
    }, keepAliveIntervalMs)

    // Set warning timeout (5 minutes before lock expires)
    const warningTime = lockTimeoutMs - lockWarningMs
    lockWarningTimeout = setTimeout(() => {
      showLockWarning()
    }, warningTime)
  }

  // Stop keep-alive interval
  const stopKeepAlive = () => {
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval)
      keepAliveInterval = null
    }
    if (lockWarningTimeout) {
      clearTimeout(lockWarningTimeout)
      lockWarningTimeout = null
    }
  }

  // Show lock expiration warning
  const showLockWarning = () => {
    if (state.value.lockWarningShown) return

    state.value.lockWarningShown = true
    toast.add({
      title: 'Lock expiring soon',
      description: 'Your editing session will expire in 5 minutes. Save your work or it will be extended automatically.',
      color: 'amber',
      icon: 'i-lucide-clock',
      timeout: 10000
    })
  }

  // Acquire lock for a file
  const acquireLock = async (filePath: string): Promise<boolean> => {
    try {
      const response = await $fetch(`/api/editor/acquire-lock/${encodeURIComponent(filePath)}`, {
        method: 'POST',
        body: {
          tabId: state.value.tabId
        }
      })

      if (response.success) {
        state.value.lockExpiresAt = new Date(response.lock.expiresAt)
        state.value.lockWarningShown = false
        console.log('[useEditorLock] Lock acquired successfully')
        return true
      }

      return false
    } catch (error: any) {
      console.error('[useEditorLock] Failed to acquire lock:', error)

      // Handle specific lock errors
      if (error.statusCode === 423) {
        const lockedBy = error.data?.lockedBy
        if (lockedBy) {
          toast.add({
            title: 'File is locked',
            description: `This file is currently being edited by ${lockedBy.userName}`,
            color: 'amber',
            icon: 'i-lucide-lock'
          })
        }
      } else {
        toast.add({
          title: 'Failed to acquire lock',
          description: error.data?.error || 'Unable to start editing. Please try again.',
          color: 'red',
          icon: 'i-lucide-alert-circle'
        })
      }

      return false
    }
  }

  // Release lock
  const releaseLock = async (filePath: string): Promise<void> => {
    if (!filePath) return

    try {
      await $fetch(`/api/editor/release-lock/${encodeURIComponent(filePath)}`, {
        method: 'DELETE',
        body: {
          tabId: state.value.tabId
        }
      })
      console.log('[useEditorLock] Lock released successfully')
    } catch (error) {
      console.error('[useEditorLock] Failed to release lock:', error)
    }
  }

  return {
    startKeepAlive,
    stopKeepAlive,
    acquireLock,
    releaseLock
  }
}

