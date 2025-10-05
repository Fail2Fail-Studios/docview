<script setup lang="ts">
const route = useRoute()
const { state, enableEditor, save, disableEditor } = useEditor()
const toast = useToast()

// Permission check state
const canEdit = ref(false)
const isCheckingPermission = ref(false)
const lockStatus = ref<any>(null)
const currentFilePath = ref<string>('')

// Only show on doc pages (not landing page)
const isDocPage = computed(() => {
  return route.path !== '/' && route.path !== '/login'
})

// Get the current page data to access file path
const page = ref<any>(null)

// Fetch page data when route changes to get actual file path
watch(() => route.path, async () => {
  if (isDocPage.value) {
    try {
      page.value = await queryCollection('docs').path(route.path).first()
      console.log('[EditorToggleButton] Page data:', {
        stem: page.value?.stem,
        extension: page.value?.extension
      })
      await checkPermissions()
    } catch (error) {
      console.error('Failed to fetch page data:', error)
    }
  }
}, { immediate: true })

// Check if user has edit permissions
const checkPermissions = async () => {
  if (!isDocPage.value || !page.value || isCheckingPermission.value) return

  // Construct file path from stem and extension
  const filePath = `${page.value.stem}.${page.value.extension}`

  // Skip if we already checked this file path
  if (currentFilePath.value === filePath && canEdit.value !== false) {
    return
  }

  try {
    isCheckingPermission.value = true
    currentFilePath.value = filePath

    console.log('[EditorToggleButton] Checking permissions for:', filePath)

    const response = await $fetch(`/api/editor/can-edit/${encodeURIComponent(filePath)}`)
    canEdit.value = response.canEdit
    lockStatus.value = response.lock
  } catch (error: any) {
    console.error('Permission check failed:', error)
    canEdit.value = false
  } finally {
    isCheckingPermission.value = false
  }
}

// Determine button state
const buttonIcon = computed(() => {
  if (state.value.isEnabled && state.value.isDirty) {
    return 'i-lucide-save'
  }
  if (lockStatus.value?.isLocked && !lockStatus.value?.isOwnedByCurrentUser) {
    return 'i-lucide-lock'
  }
  return 'i-lucide-pencil'
})

const buttonLabel = computed(() => {
  if (state.value.isEnabled && state.value.isDirty) {
    return 'Save Changes'
  }
  if (state.value.isEnabled) {
    return 'Exit Editor'
  }
  if (lockStatus.value?.isLocked && !lockStatus.value?.isOwnedByCurrentUser) {
    return `Locked by ${lockStatus.value.userName}`
  }
  return 'Edit Page'
})

const buttonTitle = computed(() => {
  if (state.value.isEnabled && state.value.isDirty) {
    return 'Save and publish changes'
  }
  if (state.value.isEnabled) {
    return 'Exit editor mode'
  }
  if (lockStatus.value?.isLocked && !lockStatus.value?.isOwnedByCurrentUser) {
    return `Currently being edited by ${lockStatus.value.userName}`
  }
  return 'Edit this page'
})

const isDisabled = computed(() => {
  return !canEdit.value || (lockStatus.value?.isLocked && !lockStatus.value?.isOwnedByCurrentUser)
})

const handleClick = async () => {
  if (state.value.isEnabled && state.value.isDirty) {
    // Save changes
    await save()
  } else if (state.value.isEnabled) {
    // Exit editor mode (no changes)
    disableEditor()
  } else {
    // Enable editor mode - fetch content from git repo
    try {
      if (!page.value) {
        toast.add({
          title: 'Error',
          description: 'Page data not available',
          color: 'red',
          icon: 'i-lucide-alert-circle'
        })
        return
      }

      // Construct file path from stem and extension
      // stem contains the path with numeric prefixes (e.g., '03.features/01.core-systems/index')
      const filePath = `${page.value.stem}.${page.value.extension}`

      if (!filePath || !page.value.stem) {
        toast.add({
          title: 'Error',
          description: 'Unable to determine file path',
          color: 'red',
          icon: 'i-lucide-alert-circle'
        })
        return
      }

      console.log('[EditorToggleButton] Acquiring lock for:', filePath)

      // First, try to acquire lock
      toast.add({
        title: 'Acquiring lock...',
        icon: 'i-lucide-lock',
        timeout: 2000
      })

      const lockResponse = await $fetch(`/api/editor/acquire-lock/${encodeURIComponent(filePath)}`, {
        method: 'POST'
      })

      if (!lockResponse.success) {
        toast.add({
          title: 'Failed to acquire lock',
          description: 'This file is currently being edited by someone else',
          color: 'red',
          icon: 'i-lucide-lock'
        })
        return
      }

      // Fetch content from git repo
      toast.add({
        title: 'Loading content...',
        icon: 'i-lucide-loader-2',
        timeout: 2000
      })

      const contentResponse = await $fetch(`/api/editor/content/${encodeURIComponent(filePath)}`)

      if (!contentResponse.success) {
        toast.add({
          title: 'Failed to load content',
          color: 'red',
          icon: 'i-lucide-alert-circle'
        })
        // Release lock on failure
        await $fetch(`/api/editor/release-lock/${encodeURIComponent(filePath)}`, {
          method: 'DELETE'
        })
        return
      }

      // Enable editor with real content
      enableEditor({
        title: contentResponse.content.title,
        description: contentResponse.content.description,
        body: contentResponse.content.body,
        rawMarkdown: contentResponse.content.rawMarkdown,
        filePath
      })

      toast.add({
        title: 'Editor ready',
        description: 'You can now edit this page',
        color: 'green',
        icon: 'i-lucide-pencil'
      })
    } catch (error: any) {
      console.error('Failed to start editing:', error)
      toast.add({
        title: 'Error',
        description: error.data?.message || 'Failed to start editing',
        color: 'red',
        icon: 'i-lucide-alert-circle'
      })
    }
  }
}
</script>

<template>
  <UButton
    v-if="isDocPage && canEdit"
    :icon="buttonIcon"
    variant="ghost"
    size="sm"
    :disabled="isDisabled"
    :aria-label="buttonLabel"
    :title="buttonTitle"
    @click="handleClick"
  />
</template>

