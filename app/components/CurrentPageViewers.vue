<script setup lang="ts">
import type { PresenceSnapshotUser } from '../../types/presence'

interface Props {
  viewers: PresenceSnapshotUser[];
  editor?: PresenceSnapshotUser | null;
}

withDefaults(defineProps<Props>(), {
  editor: null,
});
</script>

<template>
  <div v-if="viewers.length > 0" class="flex flex-col gap-2 mt-4">
    <div v-if="editor" class="flex flex-col gap-2">
      <p class="text-sm font-semibold">Currently Editing:</p>
      <div class="flex items-center gap-2">
        <UAvatar
          :key="editor.id"
          :src="editor.avatar"
          :alt="editor.name"
          :title="editor.name"
          size="sm"
          class="ring-2 ring-primary"
        />
        <p>{{ editor.name }}</p>
      </div>
    </div>
    <p class="text-sm font-semibold">All Viewers ({{ viewers.length }})</p>
    <UAvatarGroup>
      <UAvatar
        v-for="viewer in viewers"
        :key="viewer.id"
        :src="viewer.avatar"
        :alt="viewer.name"
        :title="viewer.name"
        size="sm"
        :class="{ 'ring-2 ring-primary': viewer.id === editor?.id }"
      />
    </UAvatarGroup>
  </div>
</template>

<style scoped>
.ring-primary {
  --tw-ring-color: rgb(var(--color-primary-500));
}
</style>
