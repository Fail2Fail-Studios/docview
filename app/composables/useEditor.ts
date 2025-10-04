interface EditorState {
  isEnabled: boolean
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
}

export const useEditor = () => {
  const state = useState<EditorState>('editor', () => ({
    isEnabled: false,
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
    isDirty: false
  }))

  const toast = useToast()

  const enableEditor = (content: { title: string; description: string; body: string; rawMarkdown: string }) => {
    state.value.originalContent = { ...content }
    state.value.currentContent = {
      title: content.title,
      description: content.description,
      body: content.body
    }
    state.value.isEnabled = true
    state.value.isDirty = false
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

  const save = () => {
    // Stage 1: Just show toast and update "original" to current
    state.value.originalContent = {
      ...state.value.originalContent,
      title: state.value.currentContent.title,
      description: state.value.currentContent.description,
      body: state.value.currentContent.body
    }
    state.value.isDirty = false

    toast.add({
      title: 'Changes saved',
      description: 'Your changes have been saved to memory (Stage 1 - no persistence)',
      color: 'green',
      icon: 'i-lucide-check'
    })

    // Exit editor mode after saving
    state.value.isEnabled = false
  }

  const disableEditor = () => {
    // Revert to original if dirty
    if (state.value.isDirty) {
      state.value.currentContent = {
        title: state.value.originalContent.title,
        description: state.value.originalContent.description,
        body: state.value.originalContent.body
      }
    }
    state.value.isEnabled = false
    state.value.isDirty = false
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

