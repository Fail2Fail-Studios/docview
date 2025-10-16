export default defineNuxtPlugin(() => {
  const router = useRouter()

  router.beforeEach((to, from, next) => {
    // Only check on client-side
    if (import.meta.server) {
      next()
      return
    }

    // Get editor state
    const editorState = useState<any>('editor')

    // Check if editor has unsaved changes
    if (editorState.value?.isEnabled && editorState.value?.isDirty) {
      // Get the modal trigger function from global state
      const navigationBlock = useState<{ trigger?: (next: () => void) => void }>('editor-navigation-block')

      if (navigationBlock.value?.trigger) {
        // Show modal and store navigation callback
        navigationBlock.value.trigger(() => next())
        next(false)
      } else {
        // Fallback to native confirm if modal not available
        const confirmed = confirm('You have unsaved changes. Are you sure you want to leave?')
        if (confirmed) {
          // Force disable editor
          const { disableEditor } = useEditor()
          disableEditor(true).then(() => next())
        } else {
          next(false)
        }
      }
    } else if (editorState.value?.isEnabled) {
      // Editor active but no unsaved changes - clean up
      const { disableEditor } = useEditor()
      disableEditor(true).then(() => next())
    } else {
      // No editor active, allow navigation
      next()
    }
  })
})

