<script setup lang="ts">
const props = defineProps<{
  modelValue: string
  editorEnabled: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { updateTitle } = useEditor()
const isEditing = ref(false)
const inputRef = ref<HTMLInputElement>()

const localValue = ref(props.modelValue)

watch(() => props.modelValue, (newValue) => {
  localValue.value = newValue
})

const startEditing = () => {
  if (!props.editorEnabled) return
  isEditing.value = true
  nextTick(() => {
    inputRef.value?.focus()
    inputRef.value?.select()
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
  updateTitle(localValue.value)
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    finishEditing()
  } else if (e.key === 'Escape') {
    localValue.value = props.modelValue
    isEditing.value = false
  }
}
</script>

<template>
  <div class="mb-4">
    <div
      v-if="!isEditing"
      class="flex items-center gap-2 group"
    >
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
        {{ localValue }}
      </h1>
      <UButton
        v-if="editorEnabled"
        icon="i-lucide-pencil"
        variant="ghost"
        size="xs"
        :aria-label="'Edit title'"
        class="opacity-0 group-hover:opacity-100 transition-opacity"
        @click="startEditing"
      />
    </div>
    <div
      v-else
      class="flex items-center gap-2"
    >
      <UInput
        ref="inputRef"
        v-model="localValue"
        size="xl"
        placeholder="Page title"
        class="flex-1"
        @blur="finishEditing"
        @keydown="handleKeydown"
      />
    </div>
  </div>
</template>

