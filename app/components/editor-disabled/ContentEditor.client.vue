<script setup lang="ts">
import { Editor } from '@toast-ui/vue-editor'

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
const editorRef = ref<InstanceType<typeof Editor>>()

// Editor configuration
const editorOptions = {
  initialValue: props.modelValue,
  initialEditType: 'markdown', // Use markdown mode for lossless editing
  previewStyle: 'vertical', // Split view with preview on the right
  height: 'calc(100vh - 250px)', // Take up most of the viewport
  theme: 'dark',
  usageStatistics: false,
  hideModeSwitch: false, // Allow switching between markdown and WYSIWYG
  toolbarItems: [
    ['heading', 'bold', 'italic', 'strike'],
    ['hr', 'quote'],
    ['ul', 'ol', 'task'],
    ['table', 'link'],
    ['code', 'codeblock']
    // Note: 'image' intentionally removed
  ],
  autofocus: false
}

// Watch for changes and emit
const handleChange = () => {
  if (!editorRef.value) return

  const editor = editorRef.value.invoke('getMarkdown')
  emit('update:modelValue', editor)
  updateBody(editor)
}

// Update editor when prop changes
watch(() => props.modelValue, (newValue) => {
  if (!editorRef.value) return

  const currentValue = editorRef.value.invoke('getMarkdown')
  if (currentValue !== newValue) {
    editorRef.value.invoke('setMarkdown', newValue)
  }
})

// Set up change listener after mount
onMounted(() => {
  if (!editorRef.value) return

  // Listen for changes
  const editorInstance = editorRef.value.getRootElement()
  if (editorInstance) {
    editorInstance.addEventListener('change', handleChange)
  }
})

onUnmounted(() => {
  if (!editorRef.value) return

  const editorInstance = editorRef.value.getRootElement()
  if (editorInstance) {
    editorInstance.removeEventListener('change', handleChange)
  }
})
</script>

<template>
  <div class="content-editor">
    <Editor
      ref="editorRef"
      v-bind="editorOptions"
      @change="handleChange"
    />
  </div>
</template>

<style scoped>
.content-editor {
  @apply w-full;
}

/* Ensure editor fits properly within the layout */
.content-editor :deep(.toastui-editor-defaultUI) {
  @apply border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden;
}

/* Match Nuxt UI styling for dark mode */
.content-editor :deep(.toastui-editor-dark) {
  @apply bg-gray-900;
}

.content-editor :deep(.toastui-editor-toolbar) {
  @apply bg-gray-800 border-b border-gray-700;
}

.content-editor :deep(.toastui-editor-md-container) {
  @apply bg-gray-900 text-gray-100;
}

.content-editor :deep(.toastui-editor-ww-container) {
  @apply bg-gray-900 text-gray-100;
}

/* Preview panel styling */
.content-editor :deep(.toastui-editor-md-preview) {
  @apply bg-gray-800 text-gray-100;
}

/* Scrollbar styling for dark mode */
.content-editor :deep(.toastui-editor-contents::-webkit-scrollbar) {
  @apply w-2;
}

.content-editor :deep(.toastui-editor-contents::-webkit-scrollbar-track) {
  @apply bg-gray-800;
}

.content-editor :deep(.toastui-editor-contents::-webkit-scrollbar-thumb) {
  @apply bg-gray-600 rounded;
}

.content-editor :deep(.toastui-editor-contents::-webkit-scrollbar-thumb:hover) {
  @apply bg-gray-500;
}
</style>

