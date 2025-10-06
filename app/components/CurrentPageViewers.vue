<script setup>
const props = defineProps({
  viewers: {
    type: Array,
    required: true
  },
  editor: {
    type: String,
    required: false,
    default: false
  }
});
</script>

<template>
  <div class="flex flex-col gap-2">
    <UAvatarGroup>
      <UAvatar v-for="viewer in viewers" :key="viewer.id" :src="viewer.avatar" :alt="viewer.name" :class="{ editor: viewer.id === (editor?.id ?? editor) }" />
    </UAvatarGroup>
    <UAlert
      v-if="editor"
      :title="`${editor.name} is editing this page`"
      color="primary"
      :avatar="{
        src: editor.avatar
      }"
    />
  </div>
</template>

<style>

</style>
