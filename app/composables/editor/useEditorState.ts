/**
 * Editor State Management
 *
 * Handles core editor state, content updates, and dirty state tracking.
 */

export interface EditorContent {
  title: string
  description: string
  body: string
  rawMarkdown: string
}

export interface EditorState {
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

export const useEditorState = () => {
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

  // Ensure tabId is set on client
  if (import.meta.client && !state.value.tabId) {
    state.value.tabId = getTabId()
  }

  // Check if content has been modified
  const checkDirty = () => {
    state.value.isDirty
      = state.value.currentContent.title !== state.value.originalContent.title
        || state.value.currentContent.description !== state.value.originalContent.description
        || state.value.currentContent.body !== state.value.originalContent.body
  }

  // Update individual content fields
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

  // Initialize editor state with content
  const initializeContent = (content: EditorContent & { filePath: string }) => {
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
    state.value.isDirty = false
  }

  // Update original content after successful save
  const syncOriginalContent = () => {
    state.value.originalContent = {
      ...state.value.originalContent,
      title: state.value.currentContent.title,
      description: state.value.currentContent.description,
      body: state.value.currentContent.body
    }
    state.value.isDirty = false
  }

  // Reset state
  const resetState = () => {
    state.value.isEnabled = false
    state.value.isDirty = false
    state.value.filePath = ''
    state.value.lockExpiresAt = null
    state.value.lockWarningShown = false
  }

  return {
    state,
    updateTitle,
    updateDescription,
    updateBody,
    checkDirty,
    initializeContent,
    syncOriginalContent,
    resetState
  }
}

