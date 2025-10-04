<script setup lang="ts">
import Editor from '@toast-ui/editor'

// Force client-side only rendering for Toast UI Editor
defineOptions({
  name: 'ContentEditor'
})

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { updateBody } = useEditor()
const editorContainer = ref<HTMLDivElement>()
let editorInstance: Editor | null = null

// Initialize editor after mount
onMounted(() => {
  if (!editorContainer.value) return

  editorInstance = new Editor({
    el: editorContainer.value,
    initialValue: props.modelValue,
    initialEditType: 'markdown',
    previewStyle: 'tab', // Tab mode - preview in separate tab instead of split view
    height: 'calc(100vh - 250px)',
    theme: 'dark',
    usageStatistics: false,
    hideModeSwitch: false,
    toolbarItems: [
      ['heading', 'bold', 'italic', 'strike'],
      ['hr', 'quote'],
      ['ul', 'ol', 'task'],
      ['table', 'link'],
      ['code', 'codeblock']
    ],
    autofocus: false,
    events: {
      change: () => {
        if (!editorInstance) return
        const markdown = editorInstance.getMarkdown()
        emit('update:modelValue', markdown)
        updateBody(markdown)
      }
    }
  })
})

// Watch for external changes to modelValue
watch(() => props.modelValue, (newValue) => {
  if (!editorInstance) return
  const currentValue = editorInstance.getMarkdown()
  if (currentValue !== newValue) {
    editorInstance.setMarkdown(newValue)
  }
})

// Cleanup on unmount
onUnmounted(() => {
  if (editorInstance) {
    editorInstance.destroy()
    editorInstance = null
  }
})
</script>

<template>
  <div class="content-editor">
    <div ref="editorContainer" />
  </div>
</template>

<style>
/* Use standard CSS for deep styling - Tailwind v4 doesn't support @apply in scoped styles */
.content-editor {
  width: 100%;
}

/* Ensure editor fits properly within the layout */
.content-editor :deep(.toastui-editor-defaultUI) {
  border: 1px solid rgb(229 231 235);
  border-radius: 0.5rem;
  overflow: hidden;
}

.dark .content-editor :deep(.toastui-editor-defaultUI) {
  border-color: rgb(31 41 55);
}

/* Match Nuxt UI styling for dark mode */
.content-editor :deep(.toastui-editor-dark) {
  background-color: rgb(17 24 39);
}

.content-editor :deep(.toastui-editor-toolbar) {
  background-color: rgb(31 41 55);
  border-bottom: 1px solid rgb(55 65 81);
}

.content-editor :deep(.toastui-editor-md-container) {
  background-color: rgb(17 24 39);
  color: rgb(243 244 246);
}

.content-editor :deep(.toastui-editor-ww-container) {
  background-color: rgb(17 24 39);
  color: rgb(243 244 246);
}

/* Preview panel styling */
.content-editor :deep(.toastui-editor-md-preview) {
  background-color: rgb(31 41 55);
  color: rgb(243 244 246);
}

/* Scrollbar styling for dark mode */
.content-editor :deep(.toastui-editor-contents::-webkit-scrollbar) {
  width: 0.5rem;
}

.content-editor :deep(.toastui-editor-contents::-webkit-scrollbar-track) {
  background-color: rgb(31 41 55);
}

.content-editor :deep(.toastui-editor-contents::-webkit-scrollbar-thumb) {
  background-color: rgb(75 85 99);
  border-radius: 0.25rem;
}

.content-editor :deep(.toastui-editor-contents::-webkit-scrollbar-thumb:hover) {
  background-color: rgb(107 114 128);
}

/* Custom primary color theme - oklch(0.7 0.19 22.15) converted to RGB(229, 146, 90) */
/* Override Toast UI Editor's default blue accent colors */
.content-editor :deep(.toastui-editor-toolbar-icons) {
  color: rgb(229 146 90);
}

.content-editor :deep(.toastui-editor-toolbar-icons:hover) {
  background-color: rgba(229, 146, 90, 0.1);
}

.content-editor :deep(.toastui-editor-toolbar-icons.active) {
  background-color: rgba(229, 146, 90, 0.2);
  color: rgb(229 146 90);
}

.content-editor :deep(.toastui-editor-md-tab-container .tab-item.active),
.content-editor :deep(.toastui-editor-mode-switch .tab-item.active) {
  border-bottom-color: rgb(229 146 90);
  color: rgb(229 146 90);
}

.content-editor :deep(.toastui-editor-md-tab-container .tab-item:hover),
.content-editor :deep(.toastui-editor-mode-switch .tab-item:hover) {
  color: rgb(229 146 90);
}

/* Selection color in editor */
.content-editor :deep(.toastui-editor-contents ::selection) {
  background-color: rgba(229, 146, 90, 0.3);
}

/* Link color in preview */
.content-editor :deep(.toastui-editor-contents a) {
  color: rgb(229 146 90);
}

.content-editor :deep(.toastui-editor-contents a:hover) {
  color: rgb(243 172 122);
}

/* Code block accent in preview */
.content-editor :deep(.toastui-editor-contents code) {
  color: rgb(229 146 90);
}

/* Heading colors in preview for better hierarchy */
.content-editor :deep(.toastui-editor-contents h1),
.content-editor :deep(.toastui-editor-contents h2) {
  color: rgb(229 146 90);
}
</style>

