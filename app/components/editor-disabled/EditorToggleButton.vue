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

const handleClick = () => {
  if (state.value.isEnabled && state.value.isDirty) {
    // Save changes
    save()
  } else if (state.value.isEnabled) {
    // Exit editor mode (no changes)
    disableEditor()
  } else {
    // Enable editor mode - use the enableEditor function
    enableEditor({
      title: '',
      description: '',
      body: '',
      rawMarkdown: ''
    })
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

