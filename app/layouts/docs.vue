<script setup lang="ts">
import type { Ref } from 'vue'
import type { ContentNavigationItem } from '@nuxt/content'

const navigation = inject<Ref<ContentNavigationItem[]>>('navigation')
</script>

<template>
  <UContainer class="w-full">
    <UPage>
      <template #left>
        <UPageAside>
          <UContentNavigation
            :navigation="navigation"
          />
        </UPageAside>
      </template>
      <main>
        <slot />
      </main>
    </UPage>
  </UContainer>
</template>

<style>
#main-content ul {
  padding-left: 1rem;
  line-height: 1.5;
  list-style-type: disc;
}

#main-content ul li {
  margin-top: 0.25rem;
  margin-bottom: 0.25rem;
}
</style>
