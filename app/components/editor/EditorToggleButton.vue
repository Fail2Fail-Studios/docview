<script setup lang="ts">
const route = useRoute()
const { state, enableEditor, save, disableEditor } = useEditor()

// Only show on doc pages (not landing page)
const isDocPage = computed(() => {
  return route.path !== '/' && route.path !== '/login'
})

// Determine button state
const buttonIcon = computed(() => {
  if (state.value.isEnabled && state.value.isDirty) {
    return 'i-lucide-save'
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
  return 'Edit Page'
})

const buttonTitle = computed(() => {
  if (state.value.isEnabled && state.value.isDirty) {
    return 'Save changes (Stage 1 - memory only)'
  }
  if (state.value.isEnabled) {
    return 'Exit editor mode'
  }
  return 'Edit this page'
})

const handleClick = async () => {
  if (state.value.isEnabled && state.value.isDirty) {
    // Save changes
    save()
  } else if (state.value.isEnabled) {
    // Exit editor mode (no changes)
    disableEditor()
  } else {
    // Enable editor mode - fetch current page content
    try {
      const page = await queryCollection('docs').path(route.path).first()
      if (!page) {
        console.error('Page not found:', route.path)
        return
      }

      // For Stage 1: Create placeholder markdown content
      // In future phases, we'll read the raw markdown from the git repo
      const placeholderMarkdown = `# ${page.title || 'Untitled'}

> **Note**: This is Stage 1 - editing raw markdown from the parsed AST is not yet implemented.
> You can test the editor interface here. Changes are saved to memory only.

## Content Preview

${page.description || 'No description available.'}

## Body Content

<!-- The actual page content will be loaded from the raw markdown file in future phases -->

You can edit this placeholder content to test the editor functionality.`

      enableEditor({
        title: page.title || '',
        description: page.description || '',
        body: placeholderMarkdown,
        rawMarkdown: placeholderMarkdown
      })
    } catch (error) {
      console.error('Failed to load page content:', error)
    }
  }
}
</script>

<template>
  <UButton
    v-if="isDocPage"
    :icon="buttonIcon"
    variant="ghost"
    size="sm"
    :aria-label="buttonLabel"
    :title="buttonTitle"
    @click="handleClick"
  />
</template>

