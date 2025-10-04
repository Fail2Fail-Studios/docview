<script setup lang="ts">
const props = defineProps<{
  modelValue: string
  editorEnabled: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { updateDescription } = useEditor()
const isEditing = ref(false)
const textareaRef = ref<HTMLTextAreaElement>()

const localValue = ref(props.modelValue)

watch(() => props.modelValue, (newValue) => {
  localValue.value = newValue
})

const startEditing = () => {
  if (!props.editorEnabled) return
  isEditing.value = true
  nextTick(() => {
    textareaRef.value?.focus()
    textareaRef.value?.select()
  })
}

const finishEditing = () => {
  isEditing.value = false
  if (localValue.value.trim() === '') {
    // Revert if empty
    localValue.value = props.modelValue
    return
  }
  emit('update:modelValue', localValue.value)
  updateDescription(localValue.value)
}

const handleKeydown = (e: KeyboardEvent) => {
  // Ctrl+Enter or Cmd+Enter to finish
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    finishEditing()
  } else if (e.key === 'Escape') {
    localValue.value = props.modelValue
    isEditing.value = false
  }
}
</script>

<template>
  <div class="editable-description-container">
    <div
      v-if="!isEditing"
      class="flex items-start gap-2 group"
    >
      <p class="text-lg text-gray-600 dark:text-gray-400">
        {{ localValue }}
      </p>
      <UButton
        v-if="editorEnabled"
        icon="i-lucide-pencil"
        variant="ghost"
        size="xs"
        :aria-label="'Edit description'"
        class="opacity-0 group-hover:opacity-100 transition-opacity mt-1"
        @click="startEditing"
      />
    </div>
    <div
      v-else
      class="flex flex-col gap-2"
    >
      <UTextarea
        ref="textareaRef"
        v-model="localValue"
        size="lg"
        :rows="3"
        placeholder="Page description"
        class="flex-1"
        @blur="finishEditing"
        @keydown="handleKeydown"
      />
      <p class="text-xs text-gray-500 dark:text-gray-400">
        Press Ctrl+Enter to save, Esc to cancel
      </p>
    </div>
  </div>
</template>

<style scoped>
.editable-description-container {
  @apply mb-6;
}
</style>

