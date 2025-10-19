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

// Get shared TOC data from pages via useState
const tocData = useState<any>('tocData', () => null)
const tocCollapsed = useState<boolean>('tocCollapsed', () => false)
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
    <template
      v-if="tocData?.hasToc && !tocData?.isEditorEnabled"
      #right
    >
      <!-- TOC Expanded View -->
      <div
        v-if="!tocCollapsed"
        class="sticky top-[var(--ui-header-height)] max-h-[calc(100vh-var(--ui-header-height))] overflow-y-auto py-8"
      >
        <!-- TOC Collapse Toggle -->
        <UButton
          icon="i-lucide-chevron-right"
          variant="ghost"
          size="xs"
          :aria-label="'Collapse table of contents'"
          class="mb-2"
          @click="tocCollapsed = true"
        />

        <UContentToc
          :title="tocData.tocTitle"
          :links="tocData.tocLinks"
        >
          <template
            v-if="tocData.tocBottom"
            #bottom
          >
            <div
              class="hidden lg:block space-y-6"
              :class="{ '!mt-6': tocData.tocLinks?.length }"
            >
              <USeparator
                v-if="tocData.tocLinks?.length"
                type="dashed"
              />

              <UPageLinks
                :title="tocData.tocBottom?.title"
                :links="tocData.links"
              />
            </div>
          </template>
        </UContentToc>
        <ClientOnly>
          <CurrentPageViewers
            :viewers="tocData.viewers"
            :editor="tocData.currentEditor"
            class="mt-14"
          />
        </ClientOnly>
      </div>

      <!-- TOC Collapsed View -->
      <div
        v-else
        class="sticky top-[var(--ui-header-height)] py-8"
      >
        <UButton
          icon="i-lucide-chevron-left"
          variant="ghost"
          size="xs"
          :aria-label="'Expand table of contents'"
          @click="tocCollapsed = false"
        />
      </div>
    </template>
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
