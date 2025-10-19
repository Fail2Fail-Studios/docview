interface EditorState {
  isEnabled: boolean
  filePath: string
  tabId: string
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

// Generate or retrieve tab ID
const getTabId = () => {
  if (import.meta.server) return ''
  const key = 'editor:tab-id'
  let tabId = sessionStorage.getItem(key)
  if (!tabId) {
    tabId = crypto.randomUUID()
    sessionStorage.setItem(key, tabId)
  }
  return tabId
}

export const useEditor = () => {
  const state = useState<EditorState>('editor', () => ({
    isEnabled: false,
    filePath: '',
    tabId: import.meta.client ? getTabId() : '',
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

  // Ensure tabId is set on client
  if (import.meta.client && !state.value.tabId) {
    state.value.tabId = getTabId()
  }

  // Callback for presence integration
  const presenceCallbacks = useState<{ setIsEditing?: (next: boolean) => void }>('editor-presence-callbacks', () => ({}))

  const registerPresenceCallback = (callback: (next: boolean) => void) => {
    presenceCallbacks.value.setIsEditing = callback
  }

  // ===== Unsaved Changes Modal Management =====
  const showUnsavedChangesModal = ref(false)
  let unsavedChangesResolve: ((value: 'save' | 'discard' | 'cancel') => void) | null = null
  let pendingNavigation: (() => void) | null = null

  // Navigation block registration for the global router guard
  const navigationBlock = useState<{ trigger?: (next: () => void) => void }>('editor-navigation-block', () => ({}))

  const requestUnsavedChangesConfirmation = (): Promise<'save' | 'discard' | 'cancel'> => {
    return new Promise((resolve) => {
      unsavedChangesResolve = resolve
      showUnsavedChangesModal.value = true
    })
  }

  const handleUnsavedChangesChoice = async (choice: 'save' | 'discard' | 'cancel') => {
    showUnsavedChangesModal.value = false

    if (choice === 'save') {
      // Handle navigation case
      if (pendingNavigation) {
        await save()
        pendingNavigation()
        pendingNavigation = null
      }
      // Handle manual cancel button case
      else if (unsavedChangesResolve) {
        unsavedChangesResolve(choice)
        unsavedChangesResolve = null
      }
    } else if (choice === 'discard') {
      // Cleanup editor state
      await disableEditor(true)
      // Handle navigation case
      if (pendingNavigation) {
        pendingNavigation()
        pendingNavigation = null
      }
      // Handle manual cancel button case
      else if (unsavedChangesResolve) {
        unsavedChangesResolve(choice)
        unsavedChangesResolve = null
      }
    } else {
      // Cancel - navigation already blocked by next(false)
      pendingNavigation = null
      // Handle manual cancel button case
      if (unsavedChangesResolve) {
        unsavedChangesResolve(choice)
        unsavedChangesResolve = null
      }
    }
  }

  // ===== Keyboard and Lifecycle Event Handlers =====
  const handleEscapeKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && state.value.isEnabled) {
      // Only close editor if not actively editing an input/textarea
      const activeElement = document.activeElement
      const isEditingTitleOrDescription =
        (activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA') &&
        (activeElement?.closest('[data-editable-title]') || activeElement?.closest('[data-editable-description]'))

      // If editing title or description, let their own Esc handlers deal with it
      if (isEditingTitleOrDescription) {
        return
      }

      // Otherwise, try to close the editor (will show modal if dirty)
      disableEditor()
    }
  }

  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (state.value.isEnabled && state.value.isDirty) {
      e.preventDefault()
      e.returnValue = ''
      return ''
    }
  }

  const setupKeyboardHandlers = () => {
    if (import.meta.server) return

    window.addEventListener('keydown', handleEscapeKey)
    window.addEventListener('beforeunload', handleBeforeUnload)
  }

  const cleanupKeyboardHandlers = () => {
    if (import.meta.server) return

    window.removeEventListener('keydown', handleEscapeKey)
    window.removeEventListener('beforeunload', handleBeforeUnload)
  }

  const setupNavigationGuard = () => {
    navigationBlock.value = {
      trigger: (next: () => void) => {
        pendingNavigation = next
        showUnsavedChangesModal.value = true
      }
    }
  }

  const cleanupNavigationGuard = () => {
    navigationBlock.value = {}
  }

  const enableEditor = (content: { title: string, description: string, body: string, rawMarkdown: string, filePath: string }) => {
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

    // Notify presence system
    presenceCallbacks.value.setIsEditing?.(true)

    // Setup navigation guard and keyboard handlers
    setupNavigationGuard()
    setupKeyboardHandlers()

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
          method: 'POST',
          body: {
            tabId: state.value.tabId
          }
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
    state.value.isDirty
      = state.value.currentContent.title !== state.value.originalContent.title
        || state.value.currentContent.description !== state.value.originalContent.description
        || state.value.currentContent.body !== state.value.originalContent.body
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

        // Notify presence system
        presenceCallbacks.value.setIsEditing?.(false)

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

  const disableEditor = async (force: boolean = false) => {
    // Confirm if there are unsaved changes
    if (state.value.isDirty && !force) {
      // Use the internal modal system
      const result = await requestUnsavedChangesConfirmation()
      if (result === 'cancel') {
        return
      }
      if (result === 'save') {
        await save()
        return // save() already disables editor after saving
      }
      // result === 'discard' continues below
    }

    // Release lock
    if (state.value.filePath) {
      try {
        await $fetch(`/api/editor/release-lock/${encodeURIComponent(state.value.filePath)}`, {
          method: 'DELETE',
          body: {
            tabId: state.value.tabId
          }
        })
      } catch (error) {
        console.error('[useEditor] Failed to release lock:', error)
      }
    }

    // Notify presence system
    presenceCallbacks.value.setIsEditing?.(false)

    // Cleanup handlers
    cleanupKeyboardHandlers()
    cleanupNavigationGuard()

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
    disableEditor,
    registerPresenceCallback,
    showUnsavedChangesModal,
    handleUnsavedChangesChoice
  }
}
