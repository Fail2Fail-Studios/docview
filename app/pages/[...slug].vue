<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content'
import { findPageHeadline } from '@nuxt/content/utils'

// Layout automatically uses default.vue

const route = useRoute()
const { toc } = useAppConfig()
const navigation = inject<Ref<ContentNavigationItem[]>>('navigation')

const { data: page } = await useAsyncData(route.path, () => queryCollection('docs').path(route.path).first())
if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

const { data: surround } = await useAsyncData(`${route.path}-surround`, () => {
  return queryCollectionItemSurroundings('docs', route.path, {
    fields: ['description']
  })
})

const title = page.value.seo?.title || page.value.title
const description = page.value.seo?.description || page.value.description

useSeoMeta({
  title,
  ogTitle: title,
  description,
  ogDescription: description
})

const headline = computed(() => findPageHeadline(navigation?.value, page.value))

defineOgImageComponent('Docs', {
  headline: headline.value
})

const links = computed(() => {
  const links = []
  if (toc?.bottom?.edit) {
    links.push({
      icon: 'i-lucide-external-link',
      label: 'Edit this page',
      to: `${toc.bottom.edit}/${page?.value?.stem}.${page?.value?.extension}`,
      target: '_blank'
    })
  }

  return [...links, ...(toc?.bottom?.links || [])].filter(Boolean)
})

// TOC collapse state
const tocCollapsed = ref(false)

// Editor state
const { state: editorState } = useEditor()

// Reactive title and description for editor mode
const editableTitle = ref(page.value.title || '')
const editableDescription = ref(page.value.description || '')
const editableBody = ref('')

// Watch for changes from the editor state
watch(() => editorState.value.currentContent, (content) => {
  editableTitle.value = content.title
  editableDescription.value = content.description
  editableBody.value = content.body
}, { deep: true })
</script>

<template>
  <UPage
    v-if="page"
    :ui="{
      root: 'flex flex-col lg:grid lg:grid-cols-12 lg:gap-4',
      left: 'lg:col-span-3',
      center: tocCollapsed ? 'lg:col-span-12' : 'lg:col-span-9',
      right: 'lg:col-span-3 order-first lg:order-last'
    }"
  >
    <!-- Always render normal view for SSR, then show editor mode on client if enabled -->
    <UPageHeader
      v-show="!editorState.isEnabled"
      :title="page.title"
      :description="page.description"
      :links="page.links"
      :headline="headline"
    />

    <UPageBody
      v-show="!editorState.isEnabled"
      id="main-content"
    >
      <ContentRenderer
        v-if="page"
        :value="page"
      />

      <USeparator v-if="surround?.length" />

      <UContentSurround :surround="surround" />
    </UPageBody>

    <!-- Editor Mode - Client Only -->
    <ClientOnly>
      <div
        v-if="editorState.isEnabled"
        class="space-y-4 px-4 py-6"
      >
        <EditorEditableTitle
          v-model="editableTitle"
          :editor-enabled="editorState.isEnabled"
        />
        <EditorEditableDescription
          v-model="editableDescription"
          :editor-enabled="editorState.isEnabled"
        />
        <div class="mt-6">
          <EditorContentEditor
            v-model="editableBody"
          />
        </div>
      </div>
    </ClientOnly>

    <template
      v-if="page?.body?.toc?.links?.length && !tocCollapsed && !editorState.isEnabled"
      #right
    >
      <div class="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto overflow-x-hidden">
        <!-- TOC Collapse Toggle -->
        <div class="relative">
          <UButton
            icon="i-lucide-chevron-right"
            variant="ghost"
            size="xs"
            :aria-label="'Collapse table of contents'"
            class="absolute -left-6 top-0 z-10"
            @click="tocCollapsed = true"
          />
        </div>

        <UContentToc
          :title="toc?.title"
          :links="page.body?.toc?.links"
        >
          <template
            v-if="toc?.bottom"
            #bottom
          >
            <div
              class="hidden lg:block space-y-6"
              :class="{ '!mt-6': page.body?.toc?.links?.length }"
            >
              <USeparator
                v-if="page.body?.toc?.links?.length"
                type="dashed"
              />

              <UPageLinks
                :title="toc.bottom.title"
                :links="links"
              />
            </div>
          </template>
        </UContentToc>
      </div>
    </template>

    <!-- TOC Expand Toggle (when collapsed) -->
    <template v-if="tocCollapsed && page?.body?.toc?.links?.length && !editorState.isEnabled" #right>
      <div class="sticky top-16">
        <UButton
          icon="i-lucide-chevron-left"
          variant="ghost"
          size="xs"
          :aria-label="'Expand table of contents'"
          class="ml-2"
          @click="tocCollapsed = false"
        />
      </div>
    </template>
  </UPage>
</template>
