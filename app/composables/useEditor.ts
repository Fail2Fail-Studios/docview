interface EditorState {
  isEnabled: boolean
  filePath: string
  originalContent: {
    title: string
    description: string
    body: string
    rawMarkdown: string
  }
  currentContent: {
    title: string
    description: string
    body: string
  }
  isDirty: boolean
  isSaving: boolean
  lockExpiresAt: Date | null
  lockWarningShown: boolean
}

export const useEditor = () => {
  const state = useState<EditorState>('editor', () => ({
    isEnabled: false,
    filePath: '',
    originalContent: {
      title: '',
      description: '',
      body: '',
      rawMarkdown: ''
    },
    currentContent: {
      title: '',
      description: '',
      body: ''
    },
    isDirty: false,
    isSaving: false,
    lockExpiresAt: null,
    lockWarningShown: false
  }))

  const toast = useToast()
  let keepAliveInterval: NodeJS.Timeout | null = null
  let lockWarningTimeout: NodeJS.Timeout | null = null

  const enableEditor = (content: { title: string; description: string; body: string; rawMarkdown: string; filePath: string }) => {
    state.value.originalContent = {
      title: content.title,
      description: content.description,
      body: content.body,
      rawMarkdown: content.rawMarkdown
    }
    state.value.currentContent = {
      title: content.title,
      description: content.description,
      body: content.body
    }
    state.value.filePath = content.filePath
    state.value.isEnabled = true
    state.value.isDirty = false
    state.value.lockExpiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    state.value.lockWarningShown = false

    // Start lock keep-alive (every 60 seconds)
    startKeepAlive()

    // Set warning at 25 minutes
    lockWarningTimeout = setTimeout(() => {
      showLockWarning()
    }, 25 * 60 * 1000)
  }

  const startKeepAlive = () => {
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval)
    }

    keepAliveInterval = setInterval(async () => {
      if (!state.value.isEnabled || !state.value.filePath) {
        stopKeepAlive()
        return
      }

      try {
        const response = await $fetch(`/api/editor/extend-lock/${encodeURIComponent(state.value.filePath)}`, {
          method: 'POST'
        })

        if (response.success) {
          state.value.lockExpiresAt = new Date(response.lock.expiresAt)
          console.log('[useEditor] Lock extended successfully')
        }
      } catch (error: any) {
        console.error('[useEditor] Failed to extend lock:', error)
        toast.add({
          title: 'Lock expired',
          description: 'Your editing session has expired. Please save your work and try again.',
          color: 'red',
          icon: 'i-lucide-lock'
        })
        stopKeepAlive()
      }
    }, 60 * 1000) // Every 60 seconds
  }

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

  const updateTitle = (title: string) => {
    state.value.currentContent.title = title
    checkDirty()
  }

  const updateDescription = (description: string) => {
    state.value.currentContent.description = description
    checkDirty()
  }

  const updateBody = (body: string) => {
    state.value.currentContent.body = body
    checkDirty()
  }

  const checkDirty = () => {
    state.value.isDirty =
      state.value.currentContent.title !== state.value.originalContent.title ||
      state.value.currentContent.description !== state.value.originalContent.description ||
      state.value.currentContent.body !== state.value.originalContent.body
  }

  const save = async () => {
    if (state.value.isSaving) return

    state.value.isSaving = true

    try {
      // Call save API
      toast.add({
        title: 'Saving...',
        description: 'Committing changes to repository',
        icon: 'i-lucide-loader-2',
        timeout: 3000
      })

      const response = await $fetch(`/api/editor/save/${encodeURIComponent(state.value.filePath)}`, {
        method: 'POST',
        body: {
          title: state.value.currentContent.title,
          description: state.value.currentContent.description,
          body: state.value.currentContent.body
        }
      })

      if (response.success) {
        toast.add({
          title: 'Changes published',
          description: 'Your changes have been committed and published',
          color: 'green',
          icon: 'i-lucide-check'
        })

        // Update original content
        state.value.originalContent = {
          ...state.value.originalContent,
          title: state.value.currentContent.title,
          description: state.value.currentContent.description,
          body: state.value.currentContent.body
        }
        state.value.isDirty = false

        // Stop keep-alive and exit editor
        stopKeepAlive()
        state.value.isEnabled = false

        // Reload page to show new content
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      }
    } catch (error: any) {
      console.error('[useEditor] Save failed:', error)
      toast.add({
        title: 'Save failed',
        description: error.data?.error || 'Failed to save changes. Please try again.',
        color: 'red',
        icon: 'i-lucide-alert-circle'
      })
    } finally {
      state.value.isSaving = false
    }
  }

  const disableEditor = async () => {
    // Confirm if there are unsaved changes
    if (state.value.isDirty) {
      const confirmed = confirm('You have unsaved changes. Are you sure you want to exit without saving?')
      if (!confirmed) {
        return
      }
    }

    // Release lock
    if (state.value.filePath) {
      try {
        await $fetch(`/api/editor/release-lock/${encodeURIComponent(state.value.filePath)}`, {
          method: 'DELETE'
        })
      } catch (error) {
        console.error('[useEditor] Failed to release lock:', error)
      }
    }

    // Stop keep-alive
    stopKeepAlive()

    // Reset state
    state.value.isEnabled = false
    state.value.isDirty = false
    state.value.filePath = ''
    state.value.lockExpiresAt = null
    state.value.lockWarningShown = false
  }

  return {
    state,
    enableEditor,
    updateTitle,
    updateDescription,
    updateBody,
    save,
    disableEditor
  }
}

