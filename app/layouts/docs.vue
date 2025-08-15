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
#main-content ul,
#main-content ol {
  padding-left: 1rem;

}

#main-content ul {
  list-style-type: disc;
}

#main-content ol {
  list-style-type: decimal;
}

#main-content li {
  line-height: 1.8;
}
</style>
