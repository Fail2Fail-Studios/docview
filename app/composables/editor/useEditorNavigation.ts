/**
 * Editor Navigation Guards
 *
 * Handles navigation blocking, unsaved changes modal, and keyboard shortcuts.
 */

import type { EditorState } from './useEditorState'

export const useEditorNavigation = () => {
  const state = useState<EditorState>('editor')

  // Unsaved changes modal state
  const showUnsavedChangesModal = ref(false)
  let unsavedChangesResolve: ((value: 'save' | 'discard' | 'cancel') => void) | null = null
  let pendingNavigation: (() => void) | null = null

  // Navigation block registration for the global router guard
  const navigationBlock = useState<{ trigger?: (next: () => void) => void }>('editor-navigation-block', () => ({}))

  // Request user confirmation for unsaved changes
  const requestUnsavedChangesConfirmation = (): Promise<'save' | 'discard' | 'cancel'> => {
    return new Promise((resolve) => {
      unsavedChangesResolve = resolve
      showUnsavedChangesModal.value = true
    })
  }

  // Handle user's choice in unsaved changes modal
  const handleUnsavedChangesChoice = async (
    choice: 'save' | 'discard' | 'cancel',
    saveCallback: () => Promise<void>,
    disableCallback: (force: boolean) => Promise<void>
  ) => {
    showUnsavedChangesModal.value = false

    if (choice === 'save') {
      // Handle navigation case
      if (pendingNavigation) {
        await saveCallback()
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
      await disableCallback(true)
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

  // Escape key handler
  const handleEscapeKey = (e: KeyboardEvent, disableCallback: () => void) => {
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
      disableCallback()
    }
  }

  // Before unload handler
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (state.value.isEnabled && state.value.isDirty) {
      e.preventDefault()
      e.returnValue = ''
      return ''
    }
  }

  // Setup keyboard event handlers
  const setupKeyboardHandlers = (disableCallback: () => void) => {
    if (import.meta.server) return

    const escapeHandler = (e: KeyboardEvent) => handleEscapeKey(e, disableCallback)
    window.addEventListener('keydown', escapeHandler)
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Return cleanup function
    return () => {
      window.removeEventListener('keydown', escapeHandler)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }

  // Setup navigation guard
  const setupNavigationGuard = () => {
    navigationBlock.value = {
      trigger: (next: () => void) => {
        pendingNavigation = next
        showUnsavedChangesModal.value = true
      }
    }
  }

  // Cleanup navigation guard
  const cleanupNavigationGuard = () => {
    navigationBlock.value = {}
  }

  return {
    showUnsavedChangesModal,
    requestUnsavedChangesConfirmation,
    handleUnsavedChangesChoice,
    setupKeyboardHandlers,
    setupNavigationGuard,
    cleanupNavigationGuard
  }
}

