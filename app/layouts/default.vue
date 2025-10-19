<script setup lang="ts">
import type { Ref } from 'vue'
import type { ContentNavigationItem } from '@nuxt/content'

const navigation = inject<Ref<ContentNavigationItem[]>>('navigation')

const processedNavigation = computed(() => {
  if (!navigation?.value) return []
  const sanitizeTitle = (title: string): string => {
    const dashIndex = title.indexOf(' - ')
    return dashIndex > -1 ? title.substring(0, dashIndex) : title
  }
  const processItem = (item: ContentNavigationItem): ContentNavigationItem => ({
    ...item,
    title: sanitizeTitle(item.title),
    children: item.children ? item.children.map(processItem) : undefined
  })
  return navigation.value.map(processItem)
})
</script>

<template>
  <UPage
    :ui="{
      root: 'flex flex-col lg:grid lg:grid-cols-12 lg:gap-6',
      left: 'lg:col-span-3',
      center: 'lg:col-span-9 mr-auto sm:mx-4',
      right: 'lg:col-span-3 order-first lg:order-last'
    }"
  >
    <template #left>
      <UPageAside>
        <UContentNavigation :navigation="processedNavigation" class="pl-4" />
      </UPageAside>
    </template>
    <main>
      <slot />
    </main>
  </UPage>
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
