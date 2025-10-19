/**
 * Main Editor Composable
 *
 * Orchestrates editor functionality by combining state management,
 * lock management, and navigation guards from focused modules.
 */

import { getEditorLockTimeout } from '~/app/constants'
import { useEditorState } from './editor/useEditorState'
import { useEditorLock } from './editor/useEditorLock'
import { useEditorNavigation } from './editor/useEditorNavigation'
import type { EditorContent } from './editor/useEditorState'

export const useEditor = () => {
  const toast = useToast()

  // Get functionality from focused modules
  const { state, updateTitle, updateDescription, updateBody, initializeContent, syncOriginalContent, resetState } = useEditorState()
  const { startKeepAlive, stopKeepAlive, acquireLock, releaseLock } = useEditorLock()
  const {
    showUnsavedChangesModal,
    requestUnsavedChangesConfirmation,
    handleUnsavedChangesChoice,
    setupKeyboardHandlers,
    setupNavigationGuard,
    cleanupNavigationGuard
  } = useEditorNavigation()

  // Callback for presence integration
  const presenceCallbacks = useState<{ setIsEditing?: (next: boolean) => void }>('editor-presence-callbacks', () => ({}))

  const registerPresenceCallback = (callback: (next: boolean) => void) => {
    presenceCallbacks.value.setIsEditing = callback
  }

  // Keyboard handlers cleanup function
  let cleanupKeyboardHandlers: (() => void) | null = null

  // Enable editor mode
  const enableEditor = async (content: EditorContent & { filePath: string }) => {
    // Try to acquire lock
    const lockAcquired = await acquireLock(content.filePath)
    if (!lockAcquired) {
      return // Lock acquisition failed, error already shown
    }

    // Initialize content
    initializeContent(content)

    // Enable editor
    state.value.isEnabled = true
    state.value.lockExpiresAt = new Date(Date.now() + getEditorLockTimeout())
    state.value.lockWarningShown = false

    // Notify presence system
    presenceCallbacks.value.setIsEditing?.(true)

    // Setup navigation guard and keyboard handlers
    setupNavigationGuard()
    cleanupKeyboardHandlers = setupKeyboardHandlers(() => disableEditor())

    // Start lock keep-alive
    startKeepAlive()
  }

  // Save current changes
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
        syncOriginalContent()

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

  // Disable editor mode
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
    await releaseLock(state.value.filePath)

    // Notify presence system
    presenceCallbacks.value.setIsEditing?.(false)

    // Cleanup handlers
    if (cleanupKeyboardHandlers) {
      cleanupKeyboardHandlers()
      cleanupKeyboardHandlers = null
    }
    cleanupNavigationGuard()

    // Stop keep-alive
    stopKeepAlive()

    // Reset state
    resetState()
  }

  // Wrapper for handleUnsavedChangesChoice with proper callbacks
  const handleChoice = (choice: 'save' | 'discard' | 'cancel') => {
    return handleUnsavedChangesChoice(choice, save, disableEditor)
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
    handleUnsavedChangesChoice: handleChoice
  }
}
